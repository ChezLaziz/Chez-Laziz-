import { getDb } from "./connection";
import { carrierDelegations } from "@db/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { Delegation } from "../lib/tpe";

/** Enregistre la table des délégations d'un transporteur.
 *
 * Réécriture par identifiant : une resynchronisation met à jour les lignes
 * existantes au lieu d'en créer des doublons. Rien n'est supprimé — si le
 * transporteur retire une délégation, la nôtre reste, et une commande déjà
 * partie avec cet identifiant garde son sens. */
export async function saveDelegations(carrier: string, rows: Delegation[]) {
  if (rows.length === 0) return 0;
  const now = new Date();
  // Par lots : une liste de plusieurs centaines de lignes dépasse la limite
  // de paramètres d'une seule requête.
  const CHUNK = 200;
  let saved = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await getDb()
      .insert(carrierDelegations)
      .values(
        chunk.map((d) => ({
          carrier,
          externalId: d.externalId,
          name: d.name,
          governorate: d.governorate,
          raw: d.raw,
          syncedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [carrierDelegations.carrier, carrierDelegations.externalId],
        set: {
          name: sql`excluded.name`,
          governorate: sql`excluded.governorate`,
          raw: sql`excluded.raw`,
          syncedAt: now,
        },
      });
    saved += chunk.length;
  }
  return saved;
}

export async function countDelegations(carrier: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(carrierDelegations)
    .where(eq(carrierDelegations.carrier, carrier));
  return Number(row?.count ?? 0);
}

/** Délégations stockées, filtrées par nom ou gouvernorat. Bornée : cette
 * liste sert à vérifier une correspondance, pas à tout parcourir. */
export async function listDelegations(carrier: string, search?: string) {
  const term = search?.trim();
  const where = term
    ? and(
        eq(carrierDelegations.carrier, carrier),
        or(
          ilike(carrierDelegations.name, `%${term}%`),
          ilike(carrierDelegations.governorate, `%${term}%`),
        ),
      )
    : eq(carrierDelegations.carrier, carrier);

  return getDb()
    .select({
      externalId: carrierDelegations.externalId,
      name: carrierDelegations.name,
      governorate: carrierDelegations.governorate,
    })
    .from(carrierDelegations)
    .where(where)
    .orderBy(carrierDelegations.governorate, carrierDelegations.name)
    .limit(200);
}
