import { getDb } from "./connection";
import { orders, contactMessages, type InsertOrder } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import type { PaymentMethod, WeightKg } from "@contracts/shop";

export type OrderItem = {
  productId: number;
  name: string;
  weightKg: WeightKg;
  qty: number;
  unitPriceMillimes: number;
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
  note?: string;
}) {
  const [{ id }] = await getDb()
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
      note: data.note,
    } satisfies Omit<InsertOrder, "id" | "createdAt" | "updatedAt" | "status">)
    .returning({ id: orders.id });
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
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

/** Approuve/rejette une preuve de paiement D17 — n'a de sens que pour une
 * commande payée par D17, jamais pour une commande "cash on delivery". */
export async function updatePaymentStatus(
  id: number,
  paymentStatus: "approved" | "rejected",
) {
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order || order.paymentMethod !== "d17") return order ?? null;
  await getDb()
    .update(orders)
    .set({ paymentStatus, updatedAt: new Date() })
    .where(eq(orders.id, id));
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
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
