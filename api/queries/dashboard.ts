import { getDb } from "./connection";
import { orders } from "@db/schema";
import { ne } from "drizzle-orm";

type OrderItem = {
  kind?: "product" | "pack" | "custom";
  productId?: number;
  packId?: string;
  name: string;
  qty: number;
  unitPriceMillimes: number;
};

/** Clé de regroupement d'une ligne de commande.
 *
 * Une ligne de pack ne porte pas de productId et une ligne de Custom Pack
 * n'en porte aucun des deux : regrouper sur le seul productId faisait
 * tomber TOUS les packs et tous les Custom Packs dans la même entrée
 * `undefined`, fusionnés sous le nom du premier rencontré — le classement
 * des meilleures ventes devenait faux dès qu'un pack se vendait, et les
 * packs sont justement les articles les plus chers. */
function itemKey(it: OrderItem): string {
  if (it.packId) return `pack:${it.packId}`;
  if (it.productId != null) return `product:${it.productId}`;
  // Custom Pack (et anciennes lignes sans identifiant) : le nom fait foi.
  return `name:${it.name}`;
}

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

/** Agrégation pure (testable sans base) des lignes de toutes les commandes. */
export function aggregateTopProducts(
  itemsPerOrder: OrderItem[][],
  limit = 5,
): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const items of itemsPerOrder) {
    for (const it of items) {
      const key = itemKey(it);
      const existing = map.get(key);
      if (existing) {
        existing.qtySold += it.qty;
        existing.revenueMillimes += it.qty * it.unitPriceMillimes;
      } else {
        map.set(key, {
          productId: it.productId ?? 0,
          name: it.name,
          qtySold: it.qty,
          revenueMillimes: it.qty * it.unitPriceMillimes,
        });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, limit);
}

/** Produits les plus vendus, par quantité (commandes annulées exclues). */
export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const rows = await getDb().query.orders.findMany({
    where: ne(orders.status, "annulee"),
  });
  return aggregateTopProducts(rows.map((o) => parseItems(o.items)), limit);
}
