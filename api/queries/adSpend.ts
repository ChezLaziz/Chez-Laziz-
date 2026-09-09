import { getDb } from "./connection";
import { adSpend, orders } from "@db/schema";
import { and, gte, lt, sql } from "drizzle-orm";
import {
  computeAdPerformance,
  isValidMonth,
  monthBounds,
  monthKey,
  type AdOrder,
  type MonthPerf,
  type SpendSource,
} from "./analytics/adspend";
import { isValidOrder } from "./analytics/metrics";

/** Montants saisis, du mois le plus récent au plus ancien. */
export async function listAdSpend() {
  return getDb()
    .select({
      source: adSpend.source,
      month: adSpend.month,
      amountMillimes: adSpend.amountMillimes,
      updatedAt: adSpend.updatedAt,
    })
    .from(adSpend)
    .orderBy(sql`${adSpend.month} desc`, adSpend.source);
}

/** Enregistre le montant dépensé sur une plateforme pour un mois.
 *
 * Une mise à jour, pas un ajout : ressaisir un mois corrige le montant au
 * lieu d'en empiler un deuxième, sans quoi une correction doublerait la
 * dépense et diviserait le ROAS par deux. */
export async function setAdSpend(
  source: SpendSource,
  month: string,
  amountMillimes: number,
) {
  await getDb()
    .insert(adSpend)
    .values({ source, month, amountMillimes })
    .onConflictDoUpdate({
      target: [adSpend.source, adSpend.month],
      set: { amountMillimes, updatedAt: new Date() },
    });
}

export async function removeAdSpend(source: string, month: string) {
  await getDb()
    .delete(adSpend)
    .where(and(sql`${adSpend.source} = ${source}`, sql`${adSpend.month} = ${month}`));
}

/** Commandes du mois le plus ancien concerné jusqu'à la fin du mois en cours.
 *
 * Bornée : sans dépense saisie ni origine connue, on ne charge que le mois en
 * cours. Ne ramène que les colonnes nécessaires — ni adresse, ni téléphone,
 * ni articles. */
async function fetchOrdersFrom(earliestMonth: string): Promise<AdOrder[]> {
  const start = monthBounds(earliestMonth).start;
  const end = monthBounds(monthKey(new Date())).end;
  const rows = await getDb()
    .select({
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      subtotalMillimes: orders.subtotalMillimes,
      acquisitionSource: orders.acquisitionSource,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)));
  return rows;
}

export type AdPerformance = {
  months: MonthPerf[];
  /** Vrai dès qu'un montant est saisi : distingue « rien dépensé » de
   * « dépensé mais rien saisi ». */
  hasAnySpend: boolean;
};

/** Performance publicitaire mois par mois. */
export async function getAdPerformance(now = new Date()): Promise<AdPerformance> {
  const spend = await listAdSpend();
  const valid = spend.filter((s) => isValidMonth(s.month));

  // Le plus ancien mois utile : celui de la première dépense, sinon le mois
  // en cours. La couverture d'attribution n'existant que depuis peu, remonter
  // plus loin ne ramènerait que des commandes sans origine.
  const earliest = valid.reduce(
    (min, s) => (s.month < min ? s.month : min),
    monthKey(now),
  );

  const rows = await fetchOrdersFrom(earliest);
  return {
    months: computeAdPerformance(rows.filter(isValidOrder), valid, now),
    hasAnySpend: valid.length > 0,
  };
}
