import { getDb } from "./connection";
import { carrierCityAliases, carrierDelegations, orders } from "@db/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { Delegation } from "../lib/tpe";
import {
  cityKey,
  governorateKey,
  matchDelegation,
  resolvedDelegationId,
  type DelegationMatch,
  type DelegationRef,
} from "@contracts/delegations";
import type { TpeDestination } from "@contracts/tpeShipment";

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
          governorateExternalId: d.governorateExternalId,
          raw: d.raw,
          syncedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [carrierDelegations.carrier, carrierDelegations.externalId],
        set: {
          name: sql`excluded.name`,
          governorate: sql`excluded.governorate`,
          governorateExternalId: sql`excluded.governorate_external_id`,
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

/** Toute la table, pour la mise en correspondance.
 *
 * Non bornée, contrairement à `listDelegations` : rapprocher une ville
 * suppose de pouvoir la chercher partout. Quelques centaines de lignes très
 * courtes — le coût est négligeable, l'exhaustivité ne l'est pas. */
export async function allDelegations(carrier: string): Promise<StoredDelegation[]> {
  return getDb()
    .select({
      externalId: carrierDelegations.externalId,
      name: carrierDelegations.name,
      governorate: carrierDelegations.governorate,
      governorateExternalId: carrierDelegations.governorateExternalId,
    })
    .from(carrierDelegations)
    .where(eq(carrierDelegations.carrier, carrier));
}

/** Les décisions humaines déjà prises, prêtes pour `matchDelegation`. */
export async function aliasMap(carrier: string): Promise<Map<string, string>> {
  const rows = await getDb()
    .select({
      governorateKey: carrierCityAliases.governorateKey,
      cityKey: carrierCityAliases.cityKey,
      delegationExternalId: carrierCityAliases.delegationExternalId,
    })
    .from(carrierCityAliases)
    .where(eq(carrierCityAliases.carrier, carrier));
  return new Map(rows.map((r) => [`${r.governorateKey}|${r.cityKey}`, r.delegationExternalId]));
}

/** Enregistre — ou corrige — le rapprochement décidé pour une ville.
 *
 * Une seule ligne par ville : re-décider remplace, ne s'empile pas. Les
 * libellés bruts sont conservés pour que la liste reste relisible par la
 * personne qui l'a remplie. */
export async function saveAlias(
  carrier: string,
  input: { governorate: string; city: string; delegationExternalId: string },
) {
  const govKey = governorateKey(input.governorate);
  const cKey = cityKey(input.city);
  await getDb()
    .insert(carrierCityAliases)
    .values({
      carrier,
      governorateKey: govKey,
      cityKey: cKey,
      delegationExternalId: input.delegationExternalId,
      governorateLabel: input.governorate.trim().slice(0, 160),
      cityLabel: input.city.trim().slice(0, 160),
      decidedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        carrierCityAliases.carrier,
        carrierCityAliases.governorateKey,
        carrierCityAliases.cityKey,
      ],
      set: {
        delegationExternalId: input.delegationExternalId,
        governorateLabel: input.governorate.trim().slice(0, 160),
        cityLabel: input.city.trim().slice(0, 160),
        decidedAt: new Date(),
      },
    });
}

/** Retire un rapprochement : la ville redevient « à décider ». */
export async function deleteAlias(carrier: string, governorate: string, city: string) {
  await getDb()
    .delete(carrierCityAliases)
    .where(
      and(
        eq(carrierCityAliases.carrier, carrier),
        eq(carrierCityAliases.governorateKey, governorateKey(governorate)),
        eq(carrierCityAliases.cityKey, cityKey(city)),
      ),
    );
}

/** Une délégation telle qu'on la range : le couple d'identifiants qu'exige
 * la création d'un colis, plus les noms qui servent à la reconnaître. */
export type StoredDelegation = DelegationRef & { governorateExternalId: string };

export type CityLine = {
  governorate: string;
  city: string;
  /** Nombre de commandes qui portent exactement cette ville. */
  orders: number;
  match: DelegationMatch;
};

/** L'état de la correspondance, ville par ville, pour toutes nos commandes.
 *
 * C'est la vue dont un humain a besoin pour savoir ce qu'il reste à décider :
 * les villes déjà reliées, et celles qui bloquent une remise au transporteur.
 * Les villes non résolues remontent en premier, les plus fréquentes d'abord —
 * décider une seule ligne peut débloquer plusieurs commandes. */
export async function cityReport(carrier: string): Promise<CityLine[]> {
  const [pairs, delegations, aliases] = await Promise.all([
    getDb()
      .select({
        governorate: orders.governorate,
        city: orders.city,
        count: sql<number>`count(*)`,
      })
      .from(orders)
      .groupBy(orders.governorate, orders.city),
    allDelegations(carrier),
    aliasMap(carrier),
  ]);

  return pairs
    .map((p) => ({
      governorate: p.governorate,
      city: p.city,
      orders: Number(p.count),
      match: matchDelegation(
        { governorate: p.governorate, city: p.city },
        delegations,
        aliases,
      ),
    }))
    .sort((a, b) => {
      const aDone = resolvedDelegationId(a.match) !== null;
      const bDone = resolvedDelegationId(b.match) !== null;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return b.orders - a.orders || a.city.localeCompare(b.city);
    });
}


/** La destination du transporteur pour une commande — ou rien.
 *
 * SEUL point du serveur d'où sort un couple d'identifiants destiné à un
 * envoi. Il applique la même règle que l'écran de liaison : correspondance
 * certaine ou décision humaine, jamais une approximation. Un gouvernorat
 * manquant chez le transporteur annule aussi la destination — envoyer une
 * délégation sans son gouvernorat serait une requête à moitié remplie. */
export async function destinationForOrder(
  carrier: string,
  order: { governorate: string; city: string },
): Promise<TpeDestination | null> {
  const [delegations, aliases] = await Promise.all([
    allDelegations(carrier),
    aliasMap(carrier),
  ]);
  const id = resolvedDelegationId(matchDelegation(order, delegations, aliases));
  if (id === null) return null;

  const found = delegations.find((d) => d.externalId === id);
  if (!found || found.governorateExternalId === "") return null;
  return { governorateId: found.governorateExternalId, delegationId: found.externalId };
}
