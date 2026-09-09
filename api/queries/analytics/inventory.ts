/** Stock et rythme d'écoulement.
 *
 * Deux règles, les mêmes que pour le coût de revient :
 *
 * 1. Un stock NULL n'est pas un stock nul. Zéro veut dire « en rupture »,
 *    null veut dire « pas encore suivi » — deux situations qui appellent
 *    des décisions opposées.
 * 2. Une projection ne s'affiche que si l'historique la porte. En dessous
 *    de MIN_HISTORY_DAYS de ventes observées, « il reste 3 jours de stock »
 *    ne serait qu'une division déguisée en prévision. */

import type { AnalyticsOrder } from "./metrics";

export { MIN_HISTORY_DAYS, LOW_STOCK_DAYS } from "@contracts/inventory";
import { MIN_HISTORY_DAYS, LOW_STOCK_DAYS } from "@contracts/inventory";

export type ProductStock = {
  productId: number;
  name: string;
  /** null = stock non suivi pour ce produit. */
  stockGrams: number | null;
  /** Grammes écoulés sur la période observée. */
  soldGrams: number;
  /** Grammes par jour, sur la période observée. */
  dailyGrams: number;
  /** Jours de stock restants au rythme actuel. null si le stock n'est pas
   * suivi, si rien ne s'est vendu, ou si l'historique est trop court. */
  daysOfCover: number | null;
  status: "rupture" | "faible" | "ok" | "dormant" | "non_suivi";
};

export type InventorySummary = {
  /** Jours réellement couverts par l'historique des ventes analysé. */
  historyDays: number;
  /** true quand historyDays >= MIN_HISTORY_DAYS : seule condition pour que
   * daysOfCover soit renseigné. */
  forecastAvailable: boolean;
  products: ProductStock[];
  outOfStock: number;
  lowStock: number;
  untracked: number;
};

/** Poids écoulé par produit, en grammes.
 *
 * Ne compte que les lignes portant un productId : les packs prêts et les
 * packs personnalisés consomment bien du stock, mais l'imputer au bon
 * produit demanderait de décomposer chaque pack — les packs prêts n'en
 * donnent pas les identifiants. Plutôt que d'imputer à moitié, on écarte,
 * et le rythme affiché est donc un MINIMUM. L'interface le dit. */
export function soldGramsByProduct(validOrders: AnalyticsOrder[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const o of validOrders) {
    for (const it of o.items) {
      if (it.productId == null) continue;
      const grams = Math.round((it.weightKg ?? 0) * 1000) * it.qty;
      out.set(it.productId, (out.get(it.productId) ?? 0) + grams);
    }
  }
  return out;
}

export function computeInventory(
  catalogue: { id: number; name: string; stockGrams: number | null }[],
  validOrders: AnalyticsOrder[],
  historyDays: number,
): InventorySummary {
  const sold = soldGramsByProduct(validOrders);
  const forecastAvailable = historyDays >= MIN_HISTORY_DAYS;

  const products: ProductStock[] = catalogue.map((p) => {
    const soldGrams = sold.get(p.id) ?? 0;
    const dailyGrams = historyDays > 0 ? soldGrams / historyDays : 0;

    // Une projection suppose un historique suffisant ET un écoulement réel :
    // diviser par zéro donnerait « stock infini », ce qui est faux dès la
    // première vente.
    const daysOfCover =
      p.stockGrams === null || !forecastAvailable || dailyGrams <= 0
        ? null
        : p.stockGrams / dailyGrams;

    let status: ProductStock["status"];
    if (p.stockGrams === null) status = "non_suivi";
    else if (p.stockGrams <= 0) status = "rupture";
    else if (daysOfCover !== null && daysOfCover < LOW_STOCK_DAYS) status = "faible";
    else if (soldGrams === 0) status = "dormant";
    else status = "ok";

    return {
      productId: p.id,
      name: p.name,
      stockGrams: p.stockGrams,
      soldGrams,
      dailyGrams,
      daysOfCover,
      status,
    };
  });

  // Le plus urgent d'abord : rupture, puis faible par couverture croissante,
  // puis le reste. Un tableau de stock se lit pour agir, pas par ordre
  // alphabétique.
  const rank: Record<ProductStock["status"], number> = {
    rupture: 0,
    faible: 1,
    ok: 2,
    dormant: 3,
    non_suivi: 4,
  };
  products.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.daysOfCover !== null && b.daysOfCover !== null) return a.daysOfCover - b.daysOfCover;
    return b.soldGrams - a.soldGrams;
  });

  return {
    historyDays,
    forecastAvailable,
    products,
    outOfStock: products.filter((p) => p.status === "rupture").length,
    lowStock: products.filter((p) => p.status === "faible").length,
    untracked: products.filter((p) => p.status === "non_suivi").length,
  };
}

/** Part du chiffre d'affaires réalisée par des produits dont le stock est
 * suivi — même logique de couverture que pour le coût de revient. */
export function stockCoverage(
  catalogue: { id: number; stockGrams: number | null }[],
  validOrders: AnalyticsOrder[],
): number {
  const tracked = new Set(
    catalogue.filter((p) => p.stockGrams !== null).map((p) => p.id),
  );
  let total = 0;
  let covered = 0;
  for (const o of validOrders) {
    for (const it of o.items) {
      const revenue = it.qty * it.unitPriceMillimes;
      total += revenue;
      if (it.productId != null && tracked.has(it.productId)) covered += revenue;
    }
  }
  return total === 0 ? 0 : covered / total;
}
