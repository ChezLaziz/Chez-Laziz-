import { getDb } from "./connection";
import { products, type InsertProduct } from "@db/schema";
import { asc, eq } from "drizzle-orm";

export async function listProducts() {
  return getDb().query.products.findMany({
    orderBy: [asc(products.sortOrder), asc(products.id)],
  });
}

export async function listAvailableProducts() {
  return getDb().query.products.findMany({
    where: eq(products.available, true),
    orderBy: [asc(products.sortOrder), asc(products.id)],
  });
}

export async function createProduct(
  data: Omit<InsertProduct, "id" | "createdAt">,
) {
  const [{ id }] = await getDb().insert(products).values(data).$returningId();
  return getDb().query.products.findFirst({ where: eq(products.id, id) });
}

export async function updateProduct(
  id: number,
  data: Partial<Omit<InsertProduct, "id" | "createdAt">>,
) {
  await getDb().update(products).set(data).where(eq(products.id, id));
  return getDb().query.products.findFirst({ where: eq(products.id, id) });
}

export async function deleteProduct(id: number) {
  await getDb().delete(products).where(eq(products.id, id));
}
