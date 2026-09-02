import { getDb } from "./connection";
import { pageViews } from "@db/schema";
import { sql, gte } from "drizzle-orm";

export async function recordPageView(path: string) {
  await getDb().insert(pageViews).values({ path });
}

export type StatsSummary = {
  total: number;
  today: number;
  week: number;
  byDay: { day: string; count: number }[];
};

export async function getStatsSummary(): Promise<StatsSummary> {
  const db = getDb();

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pageViews);
  const total = Number(totalRow?.count ?? 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [todayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pageViews)
    .where(gte(pageViews.createdAt, startOfToday));
  const today = Number(todayRow?.count ?? 0);

  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  weekAgo.setHours(0, 0, 0, 0);
  const recent = await db
    .select({ createdAt: pageViews.createdAt })
    .from(pageViews)
    .where(gte(pageViews.createdAt, weekAgo));

  const counts = new Map<string, number>();
  for (const r of recent) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Remplit les jours sans visite avec 0 pour un graphe continu
  const byDay: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ day: key, count: counts.get(key) ?? 0 });
  }

  return { total, today, week: byDay.reduce((s, d) => s + d.count, 0), byDay };
}
