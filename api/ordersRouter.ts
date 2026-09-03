import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { listOrders, updateOrderStatus, createOrder, deleteOrder } from "./queries/orders";
import { assertAdmin } from "./queries/admin";
import { listAvailableProducts } from "./queries/products";
import { TRPCError } from "@trpc/server";

const orderStatusEnum = z.enum([
  "nouvelle",
  "en_preparation",
  "prete",
  "terminee",
  "annulee",
]);

export const ordersRouter = createRouter({
  /** Passer une commande (public). Les prix sont recalculés côté serveur. */
  create: publicQuery
    .input(
      z.object({
        customerName: z.string().min(2).max(255),
        phone: z.string().min(6).max(50),
        note: z.string().max(1000).optional(),
        items: z
          .array(
            z.object({
              productId: z.number().int(),
              qty: z.number().int().min(1).max(500),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const catalog = await listAvailableProducts();
      const items = input.items.map((i) => {
        const product = catalog.find((p) => p.id === i.productId);
        if (!product) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Produit indisponible",
          });
        }
        return {
          productId: product.id,
          name: product.name,
          qty: i.qty,
          priceMillimes: product.priceMillimes,
        };
      });
      const totalMillimes = items.reduce(
        (sum, i) => sum + i.qty * i.priceMillimes,
        0,
      );
      return createOrder({
        customerName: input.customerName,
        phone: input.phone,
        note: input.note,
        items,
        totalMillimes,
      });
    }),

  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return listOrders();
    }),

  setStatus: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int(),
        status: orderStatusEnum,
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      return updateOrderStatus(input.id, input.status);
    }),

  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await deleteOrder(input.id);
      return { ok: true };
    }),
});
