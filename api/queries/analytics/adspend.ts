/** Dépenses publicitaires saisies à la main, et ce qu'elles ont rapporté.
 *
 * AUCUNE API PUBLICITAIRE N'EST CONNECTÉE. Les montants viennent de la
 * saisie de l'admin (table ad_spend) : ce module ne fait que les rapprocher
 * des commandes dont l'origine a été captée.
 *
 * LE MOIS ENTIER EST L'UNITÉ, et ce n'est pas un raccourci. Découper un
 * budget mensuel au prorata des jours pour le faire coïncider avec le
 * sélecteur de période supposerait une dépense étale sur le mois — ce qui
 * est faux dès qu'on booste une publication trois jours. Les bornes sont
 * donc des bornes de mois réelles, et cette vue ignore volontairement le
 * sélecteur global : mieux vaut une période imposée et exacte qu'une
 * période choisie et estimée.
 *
 * DEUX LIMITES À GARDER EN TÊTE, portées jusque dans l'interface :
 *   1. le CA rapproché est le CA ATTRIBUÉ. Tant que la couverture n'est pas
 *      totale, le ROAS calculé est un PLANCHER, jamais la valeur vraie ;
 *   2. l'attribution est au premier contact d'une session. Une commande
 *      passée en octobre après une publicité vue en septembre compte en
 *      octobre. Sur un cycle d'achat court (alimentaire) l'écart est faible,
 *      il n'est pas nul. */

import { orderRevenueMillimes, type AnalyticsOrder } from "./metrics";

/** Plateformes sur lesquelles une dépense peut être saisie.
 *
 * `direct` en est volontairement absent : on n'achète pas du trafic direct.
 * L'y autoriser inviterait à ranger une dépense là où elle ne peut rien
 * expliquer. */
export const SPEND_SOURCES = ["instagram", "facebook", "tiktok", "google", "autre"] as const;
export type SpendSource = (typeof SPEND_SOURCES)[number];

/** Les seuls champs de commande dont ce module a besoin. */
export type AdOrder = Pick<
  AnalyticsOrder,
  "status" | "paymentStatus" | "subtotalMillimes" | "acquisitionSource" | "createdAt"
>;

export type SpendEntry = {
  source: string;
  /** `YYYY-MM`, en mois LOCAL. */
  month: string;
  amountMillimes: number;
};

/** Pourquoi une ligne n'a pas de résultat mesuré. La distinction décide de
 * l'action : couper le budget, ou étiqueter ses liens d'abord. */
export type SourceVerdict =
  /** Des commandes sont rattachées à cette source. */
  | "measured"
  /** Aucune commande du mois ne porte d'origine : la dépense a peut-être
   * très bien marché, rien ne permet de le savoir. Ne pas couper. */
  | "no_attribution"
  /** Le mois a des origines connues, aucune ne vient de cette source. */
  | "no_orders_from_source"
  /** Source sans dépense saisie : ce qu'elle rapporte est organique, ou la
   * dépense n'a pas encore été renseignée. */
  | "organic";

export type SourcePerf = {
  source: string;
  spendMillimes: number;
  orders: number;
  revenueMillimes: number;
  /** Coût par commande. null si aucune commande rattachée : diviser par zéro
   * donnerait « coût infini », qui n'est pas une information. */
  cpaMillimes: number | null;
  /** CA attribué ÷ dépense. null sans dépense saisie, et null quand le mois
   * n'a aucune attribution du tout — 0 se lirait « ça n'a rien rapporté »
   * alors que la mesure est simplement absente. */
  roas: number | null;
  verdict: SourceVerdict;
};

export type MonthPerf = {
  /** `YYYY-MM`. */
  month: string;
  spendMillimes: number;
  /** Commandes et CA attribués AUX SEULES sources où de l'argent a été
   * dépensé ce mois-là. Y mêler le CA d'une source gratuite gonflerait le
   * ROAS d'une dépense qui n'y est pour rien. */
  paidOrders: number;
  paidRevenueMillimes: number;
  cpaMillimes: number | null;
  roas: number | null;
  /** Tout le mois, origine connue ou non. */
  totalOrders: number;
  totalRevenueMillimes: number;
  attributedOrders: number;
  /** Commandes d'origine connue ÷ commandes du mois. Qualifie le ROAS :
   * en dessous de 1, celui-ci est un plancher. */
  orderCoverage: number;
  bySource: SourcePerf[];
};

/** Clé de mois en heure LOCALE — comme dayKey, et pour la même raison :
 * `toISOString()` rattacherait une commande du 1ᵉʳ à 00:30 au mois
 * précédent. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Bornes locales d'un mois `YYYY-MM` : début inclus, fin exclue. */
export function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0, 0);
  return { start, end: new Date(y!, m!, 1, 0, 0, 0, 0) };
}

/** Vrai pour `YYYY-MM` avec un mois réel. Le mois vient d'un formulaire. */
export function isValidMonth(month: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;
  const year = Number(month.slice(0, 4));
  return year >= 2000 && year <= 2100;
}

type MonthAgg = {
  totalOrders: number;
  totalRevenueMillimes: number;
  attributedOrders: number;
  bySource: Map<string, { orders: number; revenueMillimes: number }>;
};

function emptyAgg(): MonthAgg {
  return { totalOrders: 0, totalRevenueMillimes: 0, attributedOrders: 0, bySource: new Map() };
}

/**
 * @param validOrders commandes DÉJÀ filtrées par isValidOrder.
 * @param spend       montants saisis, un par (source, mois).
 * @param now         sert à toujours inclure le mois en cours, même sans
 *                    dépense saisie : c'est la ligne où l'admin ira saisir.
 */
export function computeAdPerformance(
  validOrders: AdOrder[],
  spend: SpendEntry[],
  now: Date = new Date(),
): MonthPerf[] {
  const spendByMonth = new Map<string, Map<string, number>>();
  for (const s of spend) {
    if (!isValidMonth(s.month)) continue;
    const forMonth = spendByMonth.get(s.month) ?? new Map<string, number>();
    // Additionne au lieu d'écraser : la base garantit l'unicité, mais ce
    // module doit rester juste même appelé sur des lignes non dédoublonnées.
    forMonth.set(s.source, (forMonth.get(s.source) ?? 0) + s.amountMillimes);
    spendByMonth.set(s.month, forMonth);
  }

  const ordersByMonth = new Map<string, MonthAgg>();
  for (const o of validOrders) {
    const key = monthKey(new Date(o.createdAt));
    const agg = ordersByMonth.get(key) ?? emptyAgg();
    const revenue = orderRevenueMillimes(o);
    agg.totalOrders++;
    agg.totalRevenueMillimes += revenue;
    if (o.acquisitionSource) {
      agg.attributedOrders++;
      const s = agg.bySource.get(o.acquisitionSource) ?? { orders: 0, revenueMillimes: 0 };
      s.orders++;
      s.revenueMillimes += revenue;
      agg.bySource.set(o.acquisitionSource, s);
    }
    ordersByMonth.set(key, agg);
  }

  // Mois affichés : ceux où de l'argent a été engagé, le mois en cours (la
  // ligne où l'admin ira saisir), et ceux où au moins une commande porte une
  // origine — sinon un mois avec des ventes attribuées mais dont la dépense
  // n'a pas encore été saisie disparaîtrait de la vue, et l'oubli passerait
  // inaperçu. Les mois sans dépense ET sans attribution n'apportent rien et
  // restent hors de la liste.
  const months = new Set<string>([...spendByMonth.keys(), monthKey(now)]);
  for (const [month, agg] of ordersByMonth) {
    if (agg.attributedOrders > 0) months.add(month);
  }

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a)) // le plus récent en premier
    .map((month) => {
      const spends = spendByMonth.get(month) ?? new Map<string, number>();
      const agg = ordersByMonth.get(month) ?? emptyAgg();
      const hasAttribution = agg.attributedOrders > 0;

      const bySource: SourcePerf[] = Array.from(
        new Set([...spends.keys(), ...agg.bySource.keys()]),
      ).map((source) => {
        const spendMillimes = spends.get(source) ?? 0;
        const got = agg.bySource.get(source) ?? { orders: 0, revenueMillimes: 0 };

        const verdict: SourceVerdict =
          spendMillimes === 0
            ? "organic"
            : got.orders > 0
              ? "measured"
              : hasAttribution
                ? "no_orders_from_source"
                : "no_attribution";

        return {
          source,
          verdict,
          spendMillimes,
          orders: got.orders,
          revenueMillimes: got.revenueMillimes,
          cpaMillimes:
            spendMillimes > 0 && got.orders > 0 ? Math.round(spendMillimes / got.orders) : null,
          roas:
            spendMillimes > 0 && hasAttribution ? got.revenueMillimes / spendMillimes : null,
        };
      });

      // Tri : la dépense d'abord (c'est l'argent engagé qui décide), puis le
      // CA pour départager les lignes organiques.
      bySource.sort(
        (a, b) => b.spendMillimes - a.spendMillimes || b.revenueMillimes - a.revenueMillimes,
      );

      const spendMillimes = bySource.reduce((s, r) => s + r.spendMillimes, 0);
      const paid = bySource.filter((r) => r.spendMillimes > 0);
      const paidOrders = paid.reduce((s, r) => s + r.orders, 0);
      const paidRevenueMillimes = paid.reduce((s, r) => s + r.revenueMillimes, 0);

      return {
        month,
        spendMillimes,
        paidOrders,
        paidRevenueMillimes,
        cpaMillimes:
          spendMillimes > 0 && paidOrders > 0 ? Math.round(spendMillimes / paidOrders) : null,
        roas: spendMillimes > 0 && hasAttribution ? paidRevenueMillimes / spendMillimes : null,
        totalOrders: agg.totalOrders,
        totalRevenueMillimes: agg.totalRevenueMillimes,
        attributedOrders: agg.attributedOrders,
        orderCoverage: agg.totalOrders === 0 ? 0 : agg.attributedOrders / agg.totalOrders,
        bySource,
      };
    });
}
