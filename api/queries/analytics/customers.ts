/** Métriques clients.
 *
 * L'identité repose sur le téléphone normalisé (voir normalizePhone) : il
 * n'existe ni table clients ni e-mail. Toute métrique de fidélité se calcule
 * donc sur l'historique COMPLET, pas seulement sur la période affichée —
 * savoir qu'un client est « revenant » suppose de regarder avant. */

import { normalizePhone, orderRevenueMillimes, type AnalyticsOrder } from "./metrics";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Historique d'un client, tous ordres valides confondus. */
export type CustomerHistory = {
  id: string;
  name: string;
  orders: number;
  revenueMillimes: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
  /** Écarts entre commandes successives, en jours. Vide si une seule commande. */
  gapsDays: number[];
};

/** Regroupe toutes les commandes valides par client. */
export function buildCustomerHistories(
  allValidOrders: AnalyticsOrder[],
): Map<string, CustomerHistory> {
  const byCustomer = new Map<string, AnalyticsOrder[]>();
  for (const o of allValidOrders) {
    const id = normalizePhone(o.phone);
    if (!id) continue;
    const list = byCustomer.get(id);
    if (list) list.push(o);
    else byCustomer.set(id, [o]);
  }

  const out = new Map<string, CustomerHistory>();
  for (const [id, list] of byCustomer) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const gapsDays: number[] = [];
    for (let i = 1; i < list.length; i++) {
      const prev = new Date(list[i - 1]!.createdAt).getTime();
      const curr = new Date(list[i]!.createdAt).getTime();
      gapsDays.push((curr - prev) / DAY_MS);
    }
    out.set(id, {
      id,
      // Le nom peut varier d'une commande à l'autre : on garde le plus récent.
      name: list[list.length - 1]!.customerName,
      orders: list.length,
      revenueMillimes: list.reduce((s, o) => s + orderRevenueMillimes(o), 0),
      firstOrderAt: new Date(list[0]!.createdAt),
      lastOrderAt: new Date(list[list.length - 1]!.createdAt),
      gapsDays,
    });
  }
  return out;
}

export type CustomerMetrics = {
  /** Clients distincts ayant commandé pendant la période. */
  periodCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgOrdersPerCustomer: number;
  avgCustomerValueMillimes: number;
  /** Part des clients de la période ayant 2 commandes ou plus au total. */
  repeatPurchaseRate: number;
  /** Délai moyen entre deux commandes d'un même client, en jours.
   * null si personne n'a encore recommandé — l'interface le dit alors
   * plutôt que d'afficher 0, qui se lirait « ils recommandent le jour même ». */
  avgDaysBetweenPurchases: number | null;
  /** Répartition par nombre de commandes à vie, sur les clients de la période. */
  ordersDistribution: { oneOrder: number; twoOrders: number; threePlus: number };
  topCustomers: {
    id: string;
    name: string;
    orders: number;
    revenueMillimes: number;
    lastOrderAt: string;
  }[];
  /** Jours couverts par l'historique complet. Sert à masquer les segments
   * d'ancienneté (dormant, à risque) tant que la boutique est trop jeune
   * pour que « pas de commande depuis 90 jours » veuille dire quelque chose. */
  historyDays: number;
};

export function computeCustomerMetrics(
  periodValidOrders: AnalyticsOrder[],
  histories: Map<string, CustomerHistory>,
  periodStart: Date,
): CustomerMetrics {
  const periodIds = new Set<string>();
  for (const o of periodValidOrders) {
    const id = normalizePhone(o.phone);
    if (id) periodIds.add(id);
  }

  let newCustomers = 0;
  let returningCustomers = 0;
  let totalOrders = 0;
  let totalRevenue = 0;
  const distribution = { oneOrder: 0, twoOrders: 0, threePlus: 0 };
  const allGaps: number[] = [];

  for (const id of periodIds) {
    const h = histories.get(id);
    if (!h) continue;
    // Nouveau = sa toute première commande tombe dans la période.
    if (h.firstOrderAt >= periodStart) newCustomers++;
    else returningCustomers++;
    totalOrders += h.orders;
    totalRevenue += h.revenueMillimes;
    if (h.orders === 1) distribution.oneOrder++;
    else if (h.orders === 2) distribution.twoOrders++;
    else distribution.threePlus++;
    allGaps.push(...h.gapsDays);
  }

  const n = periodIds.size;
  const repeatCustomers = distribution.twoOrders + distribution.threePlus;

  let earliest: number | null = null;
  let latest: number | null = null;
  for (const h of histories.values()) {
    const first = h.firstOrderAt.getTime();
    const last = h.lastOrderAt.getTime();
    if (earliest === null || first < earliest) earliest = first;
    if (latest === null || last > latest) latest = last;
  }

  return {
    periodCustomers: n,
    newCustomers,
    returningCustomers,
    avgOrdersPerCustomer: n === 0 ? 0 : totalOrders / n,
    avgCustomerValueMillimes: n === 0 ? 0 : Math.round(totalRevenue / n),
    repeatPurchaseRate: n === 0 ? 0 : repeatCustomers / n,
    avgDaysBetweenPurchases:
      allGaps.length === 0 ? null : allGaps.reduce((s, g) => s + g, 0) / allGaps.length,
    ordersDistribution: distribution,
    topCustomers: Array.from(histories.values())
      .filter((h) => periodIds.has(h.id))
      .sort((a, b) => b.revenueMillimes - a.revenueMillimes)
      .slice(0, 8)
      .map((h) => ({
        id: h.id,
        name: h.name,
        orders: h.orders,
        revenueMillimes: h.revenueMillimes,
        lastOrderAt: h.lastOrderAt.toISOString(),
      })),
    historyDays:
      earliest === null || latest === null ? 0 : Math.round((latest - earliest) / DAY_MS),
  };
}
