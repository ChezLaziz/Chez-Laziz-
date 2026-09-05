import { getDb } from "./connection";
import { orders, contactMessages, type InsertOrder } from "@db/schema";
import { desc, eq } from "drizzle-orm";
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
  postalCode?: string;
  items: OrderItem[];
  subtotalMillimes: number;
  deliveryFeeMillimes: number;
  totalMillimes: number;
  paymentMethod: PaymentMethod;
  paymentStatus: (typeof orders.$inferSelect)["paymentStatus"];
  paymentProofKey?: string;
  idempotencyKey?: string;
  note?: string;
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
        postalCode: data.postalCode,
        items: JSON.stringify(data.items),
        subtotalMillimes: data.subtotalMillimes,
        deliveryFeeMillimes: data.deliveryFeeMillimes,
        totalMillimes: data.totalMillimes,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        paymentProofKey: data.paymentProofKey,
        idempotencyKey: data.idempotencyKey,
        note: data.note,
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

export async function deleteOrder(id: number) {
  await getDb().delete(orders).where(eq(orders.id, id));
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
 * D17 : "approved"/"rejected" = décision de l'admin sur la capture d'écran.
 * Espèces à la livraison : "paid"/"pending" = argent encaissé ou non, ce
 * qui était jusqu'ici impossible à enregistrer (la fonction sortait
 * immédiatement pour toute commande non-D17, donc une commande en espèces
 * restait "pending" pour toujours). Chaque moyen de paiement n'accepte que
 * les valeurs qui ont un sens pour lui. */
export async function updatePaymentStatus(
  id: number,
  paymentStatus: "approved" | "rejected" | "paid" | "pending",
) {
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;
  const allowed =
    order.paymentMethod === "d17"
      ? ["approved", "rejected"]
      : ["paid", "pending"];
  if (!allowed.includes(paymentStatus)) return order;
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
