/** D'où viennent les commandes.
 *
 * L'origine est captée à l'arrivée du visiteur (UTM du lien publicitaire, à
 * défaut domaine référent — voir src/lib/attribution.ts), sans jamais rien
 * lui demander. Elle est donc souvent ABSENTE : un lien non étiqueté, un
 * navigateur intégré qui masque le référent, une adresse tapée à la main.
 *
 * Une origine absente est comptée « inconnue » et sortie du taux de
 * couverture — jamais rangée en « direct ». Confondre les deux ferait passer
 * une mesure manquante pour une acquisition directe, et donnerait à croire
 * que la publicité ne sert à rien.
 *
 * Ce module ne calcule NI CPA NI ROAS : la dépense publicitaire n'est
 * enregistrée nulle part. Un ROAS sans dépense réelle serait une invention. */

import { isValidOrder, orderRevenueMillimes, type AnalyticsOrder } from "./metrics";

export type SourceStats = {
  source: string;
  orders: number;
  revenueMillimes: number;
  aovMillimes: number;
  /** Part du chiffre d'affaires ATTRIBUÉ (pas du total), sinon le
   * pourcentage dépendrait du taux de couverture et bougerait sans qu'aucune
   * vente ne change. */
  revenueShare: number;
};

export type LabelStats = {
  /** Clé unique `source|label`. Deux plateformes utilisent volontiers la
   * même étiquette — « bio » sur TikTok et « bio » sur Facebook sont deux
   * campagnes différentes, et les fusionner sous le seul libellé rendait
   * l'une des deux invisible. */
  key: string;
  label: string;
  source: string | null;
  orders: number;
  revenueMillimes: number;
};

export type AcquisitionSummary = {
  bySource: SourceStats[];
  byCampaign: LabelStats[];
  byCreative: LabelStats[];
  byDevice: { device: string; orders: number; revenueMillimes: number; share: number }[];
  /** Commandes dont l'origine est connue ÷ commandes totales. */
  orderCoverage: number;
  revenueCoverage: number;
  attributedOrders: number;
  unknownOrders: number;
  totalOrders: number;
  /** true dès qu'une seule commande porte une origine : sert à distinguer
   * « personne ne clique sur vos liens » de « rien n'est encore étiqueté ». */
  hasAnyAttribution: boolean;
};

function aggregate<T extends { orders: number; revenueMillimes: number }>(
  map: Map<string, T>,
): T[] {
  return Array.from(map.values()).sort((a, b) => b.revenueMillimes - a.revenueMillimes);
}

export function computeAcquisition(validOrders: AnalyticsOrder[]): AcquisitionSummary {
  const sources = new Map<string, { source: string; orders: number; revenueMillimes: number }>();
  const campaigns = new Map<string, LabelStats>();
  const creatives = new Map<string, LabelStats>();
  const devices = new Map<string, { device: string; orders: number; revenueMillimes: number }>();

  let attributedRevenue = 0;
  let attributedOrders = 0;
  let totalRevenue = 0;

  for (const o of validOrders) {
    const revenue = orderRevenueMillimes(o);
    totalRevenue += revenue;

    if (o.deviceType) {
      const d = devices.get(o.deviceType) ?? {
        device: o.deviceType,
        orders: 0,
        revenueMillimes: 0,
      };
      d.orders++;
      d.revenueMillimes += revenue;
      devices.set(o.deviceType, d);
    }

    if (!o.acquisitionSource) continue; // origine inconnue : hors attribution

    attributedOrders++;
    attributedRevenue += revenue;

    const s = sources.get(o.acquisitionSource) ?? {
      source: o.acquisitionSource,
      orders: 0,
      revenueMillimes: 0,
    };
    s.orders++;
    s.revenueMillimes += revenue;
    sources.set(o.acquisitionSource, s);

    if (o.acquisitionCampaign) {
      const key = `${o.acquisitionSource}|${o.acquisitionCampaign}`;
      const c = campaigns.get(key) ?? {
        key,
        label: o.acquisitionCampaign,
        source: o.acquisitionSource,
        orders: 0,
        revenueMillimes: 0,
      };
      c.orders++;
      c.revenueMillimes += revenue;
      campaigns.set(key, c);
    }

    if (o.acquisitionContent) {
      const key = `${o.acquisitionSource}|${o.acquisitionContent}`;
      const c = creatives.get(key) ?? {
        key,
        label: o.acquisitionContent,
        source: o.acquisitionSource,
        orders: 0,
        revenueMillimes: 0,
      };
      c.orders++;
      c.revenueMillimes += revenue;
      creatives.set(key, c);
    }
  }

  const totalDeviceRevenue = Array.from(devices.values()).reduce(
    (s, d) => s + d.revenueMillimes,
    0,
  );

  return {
    bySource: aggregate(sources).map((s) => ({
      ...s,
      aovMillimes: s.orders === 0 ? 0 : Math.round(s.revenueMillimes / s.orders),
      revenueShare: attributedRevenue === 0 ? 0 : s.revenueMillimes / attributedRevenue,
    })),
    byCampaign: aggregate(campaigns),
    byCreative: aggregate(creatives),
    byDevice: aggregate(devices).map((d) => ({
      ...d,
      share: totalDeviceRevenue === 0 ? 0 : d.revenueMillimes / totalDeviceRevenue,
    })),
    orderCoverage: validOrders.length === 0 ? 0 : attributedOrders / validOrders.length,
    revenueCoverage: totalRevenue === 0 ? 0 : attributedRevenue / totalRevenue,
    attributedOrders,
    unknownOrders: validOrders.length - attributedOrders,
    totalOrders: validOrders.length,
    hasAnyAttribution: attributedOrders > 0,
  };
}

/* ------------------------- Publicité par publicité ------------------------- */

/** Une publicité, lue sur les commandes elles-mêmes.
 *
 * POURQUOI CE TABLEAU EXISTE. Le Gestionnaire de publicités ne voit qu'une
 * partie des ventes : celles passées après « Accepter », et encore, avec le
 * retard de la livraison pour l'événement « Purchase ». Sur les commandes
 * d'octobre et de novembre, à peine quatre sur dix portaient les cookies du
 * Pixel. Juger une publicité sur ce que Meta lui attribue, c'est la juger
 * sur une minorité de ses ventes.
 *
 * La commande, elle, sait d'où elle vient : le lien publicitaire porte
 * `utm_content` (l'identifiant de la publicité) et le site l'enregistre à
 * l'arrivée, consentement ou non — une étiquette de lien n'identifie
 * personne. C'est la seule mesure complète, et elle est disponible le jour
 * même.
 *
 * TOUJOURS NI CPA NI ROAS : la dépense n'est enregistrée nulle part (voir
 * l'en-tête du fichier). Ce tableau dit combien une publicité a VENDU ; ce
 * qu'elle a coûté se lit chez Meta. */
export type AdRow = {
  /** `utm_content` tel que reçu. `null` = les commandes sans étiquette de
   * publicité (lien non étiqueté, partage, accès direct) — une ligne à part
   * entière, pour que le total reste le total. */
  label: string | null;
  /** Plateformes d'arrivée : une même publicité Meta tourne sur Facebook ET
   * Instagram, et c'est bien une seule publicité. */
  sources: string[];
  /** L'étiquette de campagne la plus fréquente pour cette publicité. */
  campaign: string | null;
  /** Commandes PASSÉES, annulées comprises : ce que la publicité a déclenché. */
  placed: number;
  /** Commandes valides : ce qu'elle a réellement vendu. */
  orders: number;
  cancelled: number;
  /** Chiffre d'affaires des commandes valides, hors livraison. */
  revenueMillimes: number;
  aovMillimes: number;
  /** Commandes passées avec les cookies du Pixel — les seules que Meta peut
   * rattacher à la publicité autrement que par le téléphone haché. */
  pixelSeen: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export type AdPerformance = {
  /** Triées par commandes passées, la ligne « sans étiquette » en dernier. */
  rows: AdRow[];
  placed: number;
  pixelSeen: number;
  /** Part des commandes passées que le Pixel a vues. */
  pixelCoverage: number;
};

/** Prend TOUTES les commandes de la période, annulées comprises : une
 * publicité qui déclenche des commandes annulées doit se voir. */
export function computeAdPerformance(allOrders: AnalyticsOrder[]): AdPerformance {
  type Acc = AdRow & { _sources: Set<string>; _campaigns: Map<string, number>; _first: number; _last: number };
  const map = new Map<string, Acc>();
  let pixelSeenTotal = 0;

  for (const o of allOrders) {
    const label = o.acquisitionContent?.trim() || null;
    const key = label ?? "\u0000sans-etiquette";
    const t = new Date(o.createdAt).getTime();
    const row =
      map.get(key) ??
      ({
        label,
        sources: [],
        campaign: null,
        placed: 0,
        orders: 0,
        cancelled: 0,
        revenueMillimes: 0,
        aovMillimes: 0,
        pixelSeen: 0,
        firstOrderAt: "",
        lastOrderAt: "",
        _sources: new Set<string>(),
        _campaigns: new Map<string, number>(),
        _first: t,
        _last: t,
      } satisfies Acc);

    row.placed++;
    if (isValidOrder(o)) {
      row.orders++;
      row.revenueMillimes += orderRevenueMillimes(o);
    } else {
      row.cancelled++;
    }
    if (o.pixelSeen) {
      row.pixelSeen++;
      pixelSeenTotal++;
    }
    if (o.acquisitionSource) row._sources.add(o.acquisitionSource);
    if (o.acquisitionCampaign) {
      row._campaigns.set(o.acquisitionCampaign, (row._campaigns.get(o.acquisitionCampaign) ?? 0) + 1);
    }
    if (t < row._first) row._first = t;
    if (t > row._last) row._last = t;
    map.set(key, row);
  }

  const rows: AdRow[] = Array.from(map.values())
    .map(({ _sources, _campaigns, _first, _last, ...row }) => ({
      ...row,
      sources: Array.from(_sources).sort(),
      campaign:
        Array.from(_campaigns.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
        null,
      aovMillimes: row.orders === 0 ? 0 : Math.round(row.revenueMillimes / row.orders),
      firstOrderAt: new Date(_first).toISOString(),
      lastOrderAt: new Date(_last).toISOString(),
    }))
    // La ligne sans étiquette ferme le tableau, quel que soit son volume :
    // ce n'est pas une publicité, et la mettre en tête la ferait prendre
    // pour la meilleure.
    .sort(
      (a, b) =>
        Number(a.label === null) - Number(b.label === null) ||
        b.placed - a.placed ||
        b.revenueMillimes - a.revenueMillimes,
    );

  return {
    rows,
    placed: allOrders.length,
    pixelSeen: pixelSeenTotal,
    pixelCoverage: allOrders.length === 0 ? 0 : pixelSeenTotal / allOrders.length,
  };
}
