import { getDb } from "./connection";
import { orders } from "@db/schema";
import { ne } from "drizzle-orm";

type OrderItem = {
  productId: number;
  name: string;
  qty: number;
  priceMillimes: number;
};

function parseItems(json: string): OrderItem[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export type RevenueSummary = {
  todayMillimes: number;
  weekMillimes: number;
  totalMillimes: number;
};

/** Chiffre d'affaires (commandes annulées exclues). */
export async function getRevenueSummary(): Promise<RevenueSummary> {
  const rows = await getDb().query.orders.findMany({
    where: ne(orders.status, "annulee"),
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  weekAgo.setHours(0, 0, 0, 0);

  let today = 0;
  let week = 0;
  let total = 0;
  for (const o of rows) {
    total += o.totalMillimes;
    const created = new Date(o.createdAt);
    if (created >= weekAgo) week += o.totalMillimes;
    if (created >= startOfToday) today += o.totalMillimes;
  }
  return { todayMillimes: today, weekMillimes: week, totalMillimes: total };
}

export type StatusCounts = Record<string, number>;

/** Nombre de commandes par statut (toutes, y compris annulées). */
export async function getOrderStatusCounts(): Promise<StatusCounts> {
  const rows = await getDb().query.orders.findMany();
  const counts: StatusCounts = {
    nouvelle: 0,
    en_preparation: 0,
    prete: 0,
    terminee: 0,
    annulee: 0,
  };
  for (const o of rows) counts[o.status] = (counts[o.status] ?? 0) + 1;
  return counts;
}

export type TopProduct = {
  productId: number;
  name: string;
  qtySold: number;
  revenueMillimes: number;
};

/** Produits les plus vendus, par quantité (commandes annulées exclues). */
export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const rows = await getDb().query.orders.findMany({
    where: ne(orders.status, "annulee"),
  });

  const map = new Map<number, TopProduct>();
  for (const o of rows) {
    for (const it of parseItems(o.items)) {
      const existing = map.get(it.productId);
      if (existing) {
        existing.qtySold += it.qty;
        existing.revenueMillimes += it.qty * it.priceMillimes;
      } else {
        map.set(it.productId, {
          productId: it.productId,
          name: it.name,
          qtySold: it.qty,
          revenueMillimes: it.qty * it.priceMillimes,
        });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, limit);
}
