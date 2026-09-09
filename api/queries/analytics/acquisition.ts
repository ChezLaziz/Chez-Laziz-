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

import { orderRevenueMillimes, type AnalyticsOrder } from "./metrics";

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
