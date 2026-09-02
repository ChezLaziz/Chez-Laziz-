import { getDb } from "./connection";
import { orders, contactMessages, type InsertOrder } from "@db/schema";
import { desc, eq } from "drizzle-orm";

export type OrderItem = {
  productId: number;
  name: string;
  qty: number;
  priceMillimes: number;
};

export async function createOrder(data: {
  customerName: string;
  phone: string;
  items: OrderItem[];
  totalMillimes: number;
  note?: string;
}) {
  const [{ id }] = await getDb()
    .insert(orders)
    .values({
      customerName: data.customerName,
      phone: data.phone,
      items: JSON.stringify(data.items),
      totalMillimes: data.totalMillimes,
      note: data.note,
    } satisfies Omit<InsertOrder, "id" | "createdAt" | "status">)
    .returning({ id: orders.id });
  return getDb().query.orders.findFirst({ where: eq(orders.id, id) });
}

export async function listOrders() {
  return getDb().query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
  });
}

export async function updateOrderStatus(
  id: number,
  status: (typeof orders.$inferSelect)["status"],
) {
  await getDb().update(orders).set({ status }).where(eq(orders.id, id));
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
