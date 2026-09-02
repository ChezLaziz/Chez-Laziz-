import { getDb } from "./connection";
import { socialStats } from "@db/schema";
import { desc, eq } from "drizzle-orm";

export type NetworkKey = "instagram" | "facebook" | "tiktok" | "google";

/** Ajoute un relevé (abonnés + messages) pour un réseau. */
export async function addSocialStat(
  network: NetworkKey,
  followers: number,
  messages: number,
) {
  await getDb().insert(socialStats).values({ network, followers, messages });
}

/** Dernier relevé de chaque réseau. */
export async function getLatestSocialStats() {
  const all = await getDb().query.socialStats.findMany({
    orderBy: [desc(socialStats.createdAt), desc(socialStats.id)],
  });
  const latest = new Map<string, (typeof all)[number]>();
  for (const row of all) {
    if (!latest.has(row.network)) latest.set(row.network, row);
  }
  return Array.from(latest.values());
}

/** Historique complet d'un réseau (du plus ancien au plus récent). */
export async function getSocialHistory(network: NetworkKey) {
  const rows = await getDb().query.socialStats.findMany({
    where: eq(socialStats.network, network),
    orderBy: [desc(socialStats.createdAt), desc(socialStats.id)],
  });
  return rows.reverse();
}
