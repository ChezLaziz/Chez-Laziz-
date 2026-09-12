import { getDb } from "./connection";
import { orders, contactMessages, type InsertOrder } from "@db/schema";
import { and, desc, eq, isNull, notInArray, or } from "drizzle-orm";
import { SEND_STATUS } from "@contracts/tpeShipment";
import type { PaymentMethod, WeightKg } from "@contracts/shop";

export type OrderItemContent = { name: string; weightKg: WeightKg; productId?: number };

/** Une ligne de commande : produit au poids (kind absent = anciennes
 * commandes), pack prêt, ou Custom Pack. `contents` détaille les produits
 * d'un pack pour l'admin et l'e-mail. */
export type OrderItem = {
  kind?: "product" | "pack" | "custom";
  productId?: number;
  packId?: string;
  name: string;
  weightKg: WeightKg;
  qty: number;
  unitPriceMillimes: number;
  contents?: OrderItemContent[];
  /** Custom Pack : part « packaging personnalisé » incluse dans unitPriceMillimes. */
  packagingMillimes?: number;
};

export async function createOrder(data: {
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  delegationExternalId?: string;
  items: OrderItem[];
  subtotalMillimes: number;
  deliveryFeeMillimes: number;
  totalMillimes: number;
  paymentMethod: PaymentMethod;
  paymentStatus: (typeof orders.$inferSelect)["paymentStatus"];
  paymentProofKey?: string;
  idempotencyKey?: string;
  note?: string;
  acquisitionSource?: string;
  acquisitionCampaign?: string;
  acquisitionContent?: string;
  deviceType?: string;
  /** Signaux de reconnaissance Meta — voir contracts/metaSignals.ts.
   * Absents dès que le visiteur a refusé les cookies. */
  metaFbc?: string;
  metaFbp?: string;
  metaClientIp?: string;
  metaClientUserAgent?: string;
}) {
  // Double clic / nouvelle tentative réseau : même clé → même commande.
  if (data.idempotencyKey) {
    const existing = await findOrderByIdempotencyKey(data.idempotencyKey);
    if (existing) return existing;
  }
  let id: number;
  try {
    [{ id }] = await getDb()
      .insert(orders)
      .values({
        customerName: data.customerName,
        phone: data.phone,
        governorate: data.governorate,
        city: data.city,
        address: data.address,
        delegationExternalId: data.delegationExternalId,
        items: JSON.stringify(data.items),
        subtotalMillimes: data.subtotalMillimes,
        deliveryFeeMillimes: data.deliveryFeeMillimes,
        totalMillimes: data.totalMillimes,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        paymentProofKey: data.paymentProofKey,
        idempotencyKey: data.idempotencyKey,
        note: data.note,
        acquisitionSource: data.acquisitionSource,
        acquisitionCampaign: data.acquisitionCampaign,
        acquisitionContent: data.acquisitionContent,
        deviceType: data.deviceType,
        metaFbc: data.metaFbc,
        metaFbp: data.metaFbp,
        metaClientIp: data.metaClientIp,
        metaClientUserAgent: data.metaClientUserAgent,
      } satisfies Omit<InsertOrder, "id" | "createdAt" | "updatedAt" | "status">)
      .returning({ id: orders.id });
  } catch (err) {
    // Deux requêtes strictement simultanées avec la même clé : la seconde
    // échoue sur la contrainte unique — on renvoie la commande de la première.
    if (data.idempotencyKey) {
      const existing = await findOrderByIdempotencyKey(data.idempotencyKey);
      if (existing) return existing;
    }
    throw err;
  }
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
}

async function findOrderByIdempotencyKey(key: string) {
  return getDb().query.orders.findFirst({ where: eq(orders.idempotencyKey, key) });
}

export async function listOrders() {
  return getDb().query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
  });
}

/** Une commande par son identifiant.
 *
 * Utilisée avant un envoi au transporteur : celui-ci doit travailler sur
 * l'état RÉEL en base, pas sur ce que l'écran croit afficher. */
export async function getOrderById(id: number) {
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
}

export async function deleteOrder(id: number) {
  await getDb().delete(orders).where(eq(orders.id, id));
}

/** Enregistre POURQUOI une commande est annulée. Posé juste avant le passage
 * en « annulee », pour qu'aucune annulation faite depuis Telegram n'existe
 * sans sa raison. */
export async function setCancelReason(id: number, reason: string): Promise<void> {
  await getDb().update(orders).set({ cancelReason: reason }).where(eq(orders.id, id));
}

export async function updateOrderStatus(
  id: number,
  status: (typeof orders.$inferSelect)["status"],
) {
  await getDb()
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id));
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
}

/** Met à jour l'état de paiement d'une commande.
 *
 * Deux valeurs depuis le retrait de D17 : "paid" quand l'argent est rentré,
 * "pending" quand il reste à encaisser. "approved" et "rejected" décrivaient
 * la décision d'un administrateur sur une capture de virement ; elles
 * restent dans l'énumération de la base — on ne détruit pas d'historique —
 * mais plus personne ne peut les poser. */
export async function updatePaymentStatus(
  id: number,
  paymentStatus: "paid" | "pending",
) {
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;
  await getDb()
    .update(orders)
    .set({
      paymentStatus,
      paidAt: paymentStatus === "paid" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id));
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
}

/** Enregistre chez qui part le colis, et sous quel numéro.
 *
 * Rien n'est envoyé à quiconque ici : aucune API transporteur n'est
 * accessible aujourd'hui (voir contracts/carriers.ts). Cette fonction ne fait
 * qu'inscrire ce que l'admin a fait de la commande.
 *
 * Le numéro de suivi ne s'écrase PAS en silence. Une fois un colis remis, le
 * numéro est la seule trace qui relie la commande au transporteur : l'effacer
 * par un double clic ferait perdre le colis dans le système. Pour le changer,
 * il faut d'abord le retirer explicitement (`clear`). */
export async function setOrderCarrier(
  id: number,
  input: { carrier: string | null; trackingNumber?: string | null; clear?: boolean },
) {
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;

  if (input.clear) {
    await getDb()
      .update(orders)
      .set({
        carrier: null,
        trackingNumber: null,
        carrierStatus: null,
        carrierSyncedAt: null,
        labelUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));
    return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  }

  const tracking = input.trackingNumber?.trim() || null;
  // Un numéro déjà posé ne se remplace pas par une nouvelle valeur.
  if (order.trackingNumber && tracking && tracking !== order.trackingNumber) {
    return order;
  }

  await getDb()
    .update(orders)
    .set({
      carrier: input.carrier,
      trackingNumber: tracking ?? order.trackingNumber,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id));
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
}

/* ------------------------- Envoi au transporteur ------------------------- */

/** RÉSERVE la commande pour un envoi, atomiquement.
 *
 * C'est la garde contre le double colis. Vérifier « pas encore de numéro »
 * puis appeler le transporteur laisse une fenêtre où deux clics simultanés
 * passent tous les deux la vérification. Ici la vérification ET la
 * réservation sont une seule instruction SQL : la base ne laisse passer
 * qu'un seul des deux. Renvoie faux si quelqu'un d'autre l'a réservée, si
 * elle est déjà partie, ou si un envoi précédent est resté incertain. */
export async function claimOrderForSending(id: number): Promise<boolean> {
  const rows = await getDb()
    .update(orders)
    .set({ carrierStatus: SEND_STATUS.inFlight, carrierSyncedAt: new Date() })
    .where(
      and(
        eq(orders.id, id),
        isNull(orders.trackingNumber),
        or(
          isNull(orders.carrierStatus),
          notInArray(orders.carrierStatus, [SEND_STATUS.inFlight, SEND_STATUS.uncertain]),
        ),
      ),
    )
    .returning({ id: orders.id });
  return rows.length === 1;
}

/** Conclut une réservation, quel qu'en soit le sort.
 *
 * `created` pose le numéro ; `rejected` rend la commande envoyable à
 * nouveau (rien n'a été créé chez eux) ; `unknown` la BLOQUE jusqu'à ce
 * qu'un humain aille voir — retirer le transporteur ou saisir le numéro
 * trouvé chez eux lève le blocage (voir setOrderCarrier). */
export async function settleSendClaim(
  id: number,
  outcome: { kind: "created"; trackingNumber: string } | { kind: "rejected" } | { kind: "unknown" },
) {
  const now = new Date();
  const set =
    outcome.kind === "created"
      ? {
          carrier: "tpe",
          trackingNumber: outcome.trackingNumber,
          carrierStatus: SEND_STATUS.created,
          carrierSyncedAt: now,
          updatedAt: now,
        }
      : outcome.kind === "rejected"
        ? { carrierStatus: null, carrierSyncedAt: now }
        : { carrier: "tpe", carrierStatus: SEND_STATUS.uncertain, carrierSyncedAt: now };
  await getDb().update(orders).set(set).where(eq(orders.id, id));
}

/** Marque la commande comme déjà signalée à Meta (Purchase) — empêche un
 * second envoi si son statut ou son paiement change encore ensuite. */
export async function markMetaPurchaseReported(id: number) {
  await getDb()
    .update(orders)
    .set({ metaPurchaseReportedAt: new Date() })
    .where(eq(orders.id, id));
}

export async function createContactMessage(data: {
  name: string;
  phone?: string;
  message: string;
}) {
  await getDb().insert(contactMessages).values(data);
}

export async function listContactMessages() {
  return getDb().query.contactMessages.findMany({
    orderBy: [desc(contactMessages.createdAt)],
  });
}

export async function markMessageRead(id: number, isRead: boolean) {
  await getDb()
    .update(contactMessages)
    .set({ isRead })
    .where(eq(contactMessages.id, id));
}
