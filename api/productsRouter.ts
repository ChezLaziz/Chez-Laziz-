import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  createProduct,
  deleteProduct,
  listAvailableProducts,
  listProducts,
  updateProduct,
} from "./queries/products";
import { assertAdmin } from "./queries/admin";

const productInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  priceMillimes: z.number().int().min(0),
  category: z.string().min(1).max(100),
  badge: z.string().max(50).optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productsRouter = createRouter({
  /** Catalogue public (produits disponibles uniquement) */
  list: publicQuery.query(() => listAvailableProducts()),

  /** Liste complète pour l'admin */
  listAll: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return listProducts();
    }),

  create: publicQuery
    .input(z.object({ token: z.string(), data: productInput }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      return createProduct({
        name: input.data.name,
        description: input.data.description ?? null,
        priceMillimes: input.data.priceMillimes,
        category: input.data.category,
        badge: input.data.badge ?? null,
        imageUrl: input.data.imageUrl ?? null,
        available: input.data.available ?? true,
        sortOrder: input.data.sortOrder ?? 0,
      });
    }),

  update: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int(),
        data: productInput.partial(),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      const data = { ...input.data };
      if (data.description === undefined) delete data.description;
      if (data.badge === undefined) delete data.badge;
      if (data.imageUrl === undefined) delete data.imageUrl;
      return updateProduct(input.id, data);
    }),

  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await deleteProduct(input.id);
      return { ok: true };
    }),
});
