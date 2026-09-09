/** Découpages du chiffre d'affaires : par mode de paiement, par produit ×
 * gouvernorat, et croissance d'une période à l'autre.
 *
 * Toutes ces fonctions consomment des commandes DÉJÀ filtrées valides et
 * réutilisent orderRevenueMillimes : aucune ne redéfinit ce qu'est un
 * chiffre d'affaires. */

import {
  itemKey,
  orderRevenueMillimes,
  type AnalyticsOrder,
  type GovernorateStats,
  type ProductStats,
} from "./metrics";

export type PaymentBreakdown = {
  method: string;
  orders: number;
  revenueMillimes: number;
  share: number;
};

export function computePaymentBreakdown(validOrders: AnalyticsOrder[]): PaymentBreakdown[] {
  const map = new Map<string, { orders: number; revenueMillimes: number }>();
  let total = 0;
  for (const o of validOrders) {
    const revenue = orderRevenueMillimes(o);
    total += revenue;
    const entry = map.get(o.paymentMethod) ?? { orders: 0, revenueMillimes: 0 };
    entry.orders++;
    entry.revenueMillimes += revenue;
    map.set(o.paymentMethod, entry);
  }
  return Array.from(map.entries())
    .map(([method, e]) => ({
      method,
      ...e,
      share: total === 0 ? 0 : e.revenueMillimes / total,
    }))
    .sort((a, b) => b.revenueMillimes - a.revenueMillimes);
}

/** Croissance par ligne, en rapprochant deux périodes sur une clé commune.
 *
 * `changePercent` est null quand la ligne n'existait pas avant : une
 * nouveauté n'a pas « augmenté de 100 % », elle vient d'apparaître, et
 * `isNew` le dit explicitement plutôt que de laisser lire un pourcentage. */
export type WithGrowth<T> = T & {
  previousRevenueMillimes: number;
  changePercent: number | null;
  isNew: boolean;
};

export function attachGrowth<T extends { revenueMillimes: number }>(
  current: T[],
  previous: T[],
  keyOf: (row: T) => string,
): WithGrowth<T>[] {
  const prevByKey = new Map(previous.map((p) => [keyOf(p), p.revenueMillimes]));
  return current.map((row) => {
    const prev = prevByKey.get(keyOf(row));
    return {
      ...row,
      previousRevenueMillimes: prev ?? 0,
      changePercent:
        prev === undefined || prev === 0
          ? null
          : ((row.revenueMillimes - prev) / prev) * 100,
      isNew: prev === undefined,
    };
  });
}

export const productKey = (p: ProductStats) => p.key;
export const governorateKey = (g: GovernorateStats) => g.governorate;

/** Produits vendus dans chaque gouvernorat.
 *
 * Répond aux deux sens de la question — « que préfère Sousse ? » et « où se
 * vend le mieux la Pistache ? » — à partir d'une seule structure, plutôt
 * que de recalculer deux agrégats séparés qui pourraient diverger. */
export type ProductGovernorateCell = {
  productKey: string;
  productName: string;
  governorate: string;
  unitsSold: number;
  revenueMillimes: number;
  orders: number;
};

export function computeProductGovernorateMatrix(
  validOrders: AnalyticsOrder[],
): ProductGovernorateCell[] {
  const map = new Map<string, ProductGovernorateCell>();

  for (const o of validOrders) {
    const seen = new Set<string>();
    for (const it of o.items) {
      const pk = itemKey(it);
      const cellKey = `${pk}@@${o.governorate}`;
      const cell = map.get(cellKey);
      const revenue = it.qty * it.unitPriceMillimes;
      if (cell) {
        cell.unitsSold += it.qty;
        cell.revenueMillimes += revenue;
        if (!seen.has(cellKey)) cell.orders++;
      } else {
        map.set(cellKey, {
          productKey: pk,
          productName: it.name,
          governorate: o.governorate,
          unitsSold: it.qty,
          revenueMillimes: revenue,
          orders: 1,
        });
      }
      seen.add(cellKey);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.revenueMillimes - a.revenueMillimes);
}

/** Impact de la livraison par gouvernorat.
 *
 * Mesure business uniquement : où l'entreprise perd des commandes, pas la
 * gestion des tournées — le transport est sous-traité. */
export type GovernorateDelivery = {
  governorate: string;
  total: number;
  cancelled: number;
  cancellationRate: number;
  lostRevenueMillimes: number;
};

export function computeGovernorateDelivery(allOrders: AnalyticsOrder[]): GovernorateDelivery[] {
  const map = new Map<string, { total: number; cancelled: number; lost: number }>();
  for (const o of allOrders) {
    const entry = map.get(o.governorate) ?? { total: 0, cancelled: 0, lost: 0 };
    entry.total++;
    if (o.status === "annulee") {
      entry.cancelled++;
      entry.lost += orderRevenueMillimes(o);
    }
    map.set(o.governorate, entry);
  }
  return Array.from(map.entries())
    .map(([governorate, e]) => ({
      governorate,
      total: e.total,
      cancelled: e.cancelled,
      cancellationRate: e.total === 0 ? 0 : e.cancelled / e.total,
      lostRevenueMillimes: e.lost,
    }))
    .sort((a, b) => b.cancellationRate - a.cancellationRate);
}
