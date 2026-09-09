/** Marge brute produit.
 *
 * PÉRIMÈTRE, à lire avant d'utiliser ces chiffres : ceci est une marge
 * PRODUIT, pas un bénéfice net. Elle vaut chiffre d'affaires moins coût de
 * revient des articles, et rien d'autre. Sont hors calcul, faute d'être
 * enregistrés nulle part : l'emballage, le coût réel payé au transporteur
 * (la base ne connaît que les 8 DT facturés au client, pas ce que
 * l'entreprise verse), les frais de paiement, la publicité et les charges
 * fixes. Appeler cela « profit » serait faux.
 *
 * RÈGLE ABSOLUE : un coût absent n'est jamais traité comme un coût nul.
 * Une ligne sans coût connu est exclue du calcul et comptabilisée dans la
 * couverture, jamais estimée — sinon le produit afficherait 100 % de marge
 * et serait classé « le plus rentable » précisément parce qu'on ignore ce
 * qu'il coûte. */

import { itemKey, type AnalyticsOrder, type OrderItem } from "./metrics";

/** Coût de revient au kilo, par identifiant de produit. Une entrée absente
 * signifie « coût inconnu », ce qui n'est pas la même chose que zéro. */
export type CostsByProductId = Map<number, number>;

/** Coût d'une ligne de commande, ou null si une part quelconque en est
 * inconnue.
 *
 * Un pack composé n'a de coût que si TOUS ses composants en ont un : à un
 * seul manquant, le total serait sous-estimé et la marge surévaluée. */
export function lineCostMillimes(it: OrderItem, costs: CostsByProductId): number | null {
  // Article simple : identifiant direct, coût au kilo × poids × quantité.
  if (it.productId != null) {
    const perKg = costs.get(it.productId);
    if (perKg === undefined) return null;
    return Math.round(perKg * (it.weightKg ?? 0) * it.qty);
  }

  // Pack composé : la somme de ses composants, à condition qu'ils portent
  // tous un productId. Les packs prêts (Laziz VIP) ne listent que des noms,
  // donc leur coût reste inconnu plutôt que deviné par correspondance de
  // libellé — deux produits peuvent porter des noms proches.
  const contents = it.contents;
  if (!contents || contents.length === 0) return null;
  let total = 0;
  for (const c of contents) {
    if (c.productId == null) return null;
    const perKg = costs.get(c.productId);
    if (perKg === undefined) return null;
    total += perKg * (c.weightKg ?? 0);
  }
  return Math.round(total * it.qty);
}

export type ProductMargin = {
  key: string;
  name: string;
  revenueMillimes: number;
  costMillimes: number;
  marginMillimes: number;
  /** Marge ÷ chiffre d'affaires, entre 0 et 1. */
  marginRate: number;
  unitsSold: number;
};

export type MarginSummary = {
  /** Chiffre d'affaires dont le coût est connu — seule base légitime des
   * pourcentages ci-dessous. */
  coveredRevenueMillimes: number;
  /** Chiffre d'affaires total de la période, couvert ou non. */
  totalRevenueMillimes: number;
  /** coveredRevenue ÷ totalRevenue. En dessous de 1, la marge ne décrit
   * qu'une partie de l'activité et l'interface doit le dire. */
  revenueCoverage: number;
  costMillimes: number;
  marginMillimes: number;
  marginRate: number;
  byProduct: ProductMargin[];
  /** Produits vendus sans coût saisi — la liste de ce qu'il reste à
   * renseigner pour que le calcul devienne complet. */
  missingCost: { key: string; name: string; revenueMillimes: number }[];
};

export function computeMargins(
  validOrders: AnalyticsOrder[],
  costs: CostsByProductId,
): MarginSummary {
  const covered = new Map<string, ProductMargin>();
  const missing = new Map<string, { key: string; name: string; revenueMillimes: number }>();
  let totalRevenue = 0;

  for (const o of validOrders) {
    for (const it of o.items) {
      const key = itemKey(it);
      const revenue = it.qty * it.unitPriceMillimes;
      totalRevenue += revenue;

      const cost = lineCostMillimes(it, costs);
      if (cost === null) {
        const m = missing.get(key);
        if (m) m.revenueMillimes += revenue;
        else missing.set(key, { key, name: it.name, revenueMillimes: revenue });
        continue;
      }

      const existing = covered.get(key);
      if (existing) {
        existing.revenueMillimes += revenue;
        existing.costMillimes += cost;
        existing.unitsSold += it.qty;
      } else {
        covered.set(key, {
          key,
          name: it.name,
          revenueMillimes: revenue,
          costMillimes: cost,
          marginMillimes: 0,
          marginRate: 0,
          unitsSold: it.qty,
        });
      }
    }
  }

  const byProduct = Array.from(covered.values())
    .map((p) => {
      const marginMillimes = p.revenueMillimes - p.costMillimes
      return {
        ...p,
        marginMillimes,
        marginRate: p.revenueMillimes === 0 ? 0 : marginMillimes / p.revenueMillimes,
      }
    })
    // Classé par marge en dinars, pas par taux : 40 % sur un produit qui se
    // vend peu rapporte moins que 20 % sur le produit phare.
    .sort((a, b) => b.marginMillimes - a.marginMillimes);

  const coveredRevenue = byProduct.reduce((s, p) => s + p.revenueMillimes, 0);
  const cost = byProduct.reduce((s, p) => s + p.costMillimes, 0);
  const margin = coveredRevenue - cost;

  return {
    coveredRevenueMillimes: coveredRevenue,
    totalRevenueMillimes: totalRevenue,
    revenueCoverage: totalRevenue === 0 ? 0 : coveredRevenue / totalRevenue,
    costMillimes: cost,
    marginMillimes: margin,
    marginRate: coveredRevenue === 0 ? 0 : margin / coveredRevenue,
    byProduct,
    missingCost: Array.from(missing.values()).sort(
      (a, b) => b.revenueMillimes - a.revenueMillimes,
    ),
  };
}
