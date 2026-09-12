import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  createProduct,
  deleteProduct,
  listAvailableProducts,
  listProducts,
  updateProduct, getProductById } from "./queries/products";
import { assertAdmin } from "./queries/admin";

const productInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  nameAr: z.string().max(255).optional().nullable(),
  descriptionAr: z.string().max(2000).optional().nullable(),
  priceMillimes: z.number().int().min(0),
  // Nullable et non simplement optionnel : vider le champ doit effacer le
  // coût, pas le laisser à son ancienne valeur.
  costPerKgMillimes: z.number().int().min(0).optional().nullable(),
  category: z.string().min(1).max(100),
  badge: z.string().max(50).optional().nullable(),
  badgeAr: z.string().max(50).optional().nullable(),
  imageUrl: z.string().max(255).optional().nullable(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isExclusiveCreation: z.boolean().optional(),
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
        nameAr: input.data.nameAr ?? null,
        descriptionAr: input.data.descriptionAr ?? null,
        priceMillimes: input.data.priceMillimes,
        costPerKgMillimes: input.data.costPerKgMillimes ?? null,
        category: input.data.category,
        badge: input.data.badge ?? null,
        badgeAr: input.data.badgeAr ?? null,
        imageUrl: input.data.imageUrl ?? null,
        available: input.data.available ?? true,
        sortOrder: input.data.sortOrder ?? 0,
        isExclusiveCreation: input.data.isExclusiveCreation ?? false,
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
      // Un champ absent de la requête n'est pas une demande d'effacement :
      // on ne met à jour que ce qui a été explicitement envoyé.
      const data = { ...input.data };
      for (const key of Object.keys(data) as (keyof typeof data)[]) {
        if (data[key] === undefined) delete data[key];
      }
      // Rien à changer : Drizzle refuse un SET vide (« No values to set »)
      // et répondrait 500 — on rend simplement le produit tel quel.
      if (Object.keys(data).length === 0) return getProductById(input.id);
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
