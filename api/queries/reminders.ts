// Les deux questions que personne ne posait à la base de données.

import { getDb } from "./connection";
import { orders } from "@db/schema";
import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import {
  RETARD_CONFIRMATION_H,
  RETARD_REMISE_H,
  type StalledOrder,
  type UnshippedOrder,
} from "@contracts/stalledOrders";

function heuresDepuis(date: Date, maintenant: number): number {
  return (maintenant - date.getTime()) / 3_600_000;
}

/** Commandes que personne n'a encore appelées. `created_at` est le bon repère :
 * c'est le moment où le client a cliqué, pas un état interne. */
export async function listOrdersAwaitingCall(now = new Date()): Promise<StalledOrder[]> {
  const seuil = new Date(now.getTime() - RETARD_CONFIRMATION_H * 3_600_000);
  const rows = await getDb()
    .select({
      id: orders.id,
      customerName: orders.customerName,
      phone: orders.phone,
      totalMillimes: orders.totalMillimes,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.status, "nouvelle"), lt(orders.createdAt, seuil)))
    .orderBy(asc(orders.createdAt));
  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    phone: r.phone,
    totalMillimes: r.totalMillimes,
    ageHours: heuresDepuis(r.createdAt, now.getTime()),
  }));
}

/** Commandes confirmées qu'aucun transporteur n'a jamais prises en charge.
 *
 * `updated_at` sert de repère de confirmation : c'est le dernier changement
 * d'état, donc au plus tôt le moment où un humain a validé. Approximatif, et
 * assez bon pour un rappel — l'inverse (ne rien dire) laisse un carton dans
 * un coin pendant des jours.
 *
 * « terminee » est exclu : une commande livrée avant que les colonnes
 * transporteur n'existent n'a aucun numéro à montrer, et la rappeler
 * éternellement rendrait le rappel inutile. */
export async function listOrdersAwaitingHandover(now = new Date()): Promise<UnshippedOrder[]> {
  const seuil = new Date(now.getTime() - RETARD_REMISE_H * 3_600_000);
  const rows = await getDb()
    .select({ id: orders.id, customerName: orders.customerName, updatedAt: orders.updatedAt })
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["en_preparation", "prete"]),
        isNull(orders.trackingNumber),
        lt(orders.updatedAt, seuil),
      ),
    )
    .orderBy(asc(orders.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    ageHours: heuresDepuis(r.updatedAt, now.getTime()),
  }));
}
