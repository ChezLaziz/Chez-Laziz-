import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  listOrders,
  updateOrderStatus,
  updatePaymentStatus,
  createOrder,
  deleteOrder,
} from "./queries/orders";
import { assertAdmin } from "./queries/admin";
import type { OrderItem } from "./queries/orders";
import { listAvailableProducts } from "./queries/products";
import { paymentProofExists } from "./lib/r2";
import { notifyAdminNewOrder } from "./lib/email";
import { TRPCError } from "@trpc/server";
import {
  ALLOWED_WEIGHTS_KG,
  DELIVERY_FEE_MILLIMES,
  PAYMENT_METHODS,
  TUNISIA_GOVERNORATES,
  isValidWeight,
  priceForWeight,
} from "@contracts/shop";
import {
  CUSTOM_PACK_NAME,
  CUSTOM_PACK_PACKAGING_MILLIMES,
  CUSTOM_PACK_SIZE,
  CUSTOM_PACK_WEIGHT_KG,
  FIXED_PACK_IDS,
  PACK_ITEM_WEIGHT_KG,
  customPackTotal,
  getFixedPack,
  isValidCustomSelection,
  packContents,
  packWeightKg,
} from "@contracts/packs";

const orderStatusEnum = z.enum([
  "nouvelle",
  "en_preparation",
  "prete",
  "terminee",
  "annulee",
]);

const weightEnum = z
  .number()
  .refine(isValidWeight, {
    message: `Poids invalide — valeurs autorisées : ${ALLOWED_WEIGHTS_KG.join(", ")} kg`,
  });

const qtyInput = z.number().int().min(1).max(500);

// Trois types de lignes. `kind` absent = produit au poids (compatibilité
// avec les anciens clients) ; les packs/Custom Pack l'indiquent explicitement.
const packItemInput = z.object({
  kind: z.literal("pack"),
  packId: z.enum(FIXED_PACK_IDS),
  qty: qtyInput,
});
const customItemInput = z.object({
  kind: z.literal("custom"),
  productIds: z.array(z.number().int().positive()).length(CUSTOM_PACK_SIZE, {
    message: `Le Custom Pack doit contenir exactement ${CUSTOM_PACK_SIZE} produits.`,
  }),
  qty: qtyInput,
});
const productItemInput = z.object({
  kind: z.literal("product").optional(),
  productId: z.number().int(),
  weightKg: weightEnum,
  qty: qtyInput,
});
const orderItemInput = z.union([packItemInput, customItemInput, productItemInput]);

export const ordersRouter = createRouter({
  /** Passer une commande (public). Les prix, le sous-total, la livraison et
   * le total sont TOUJOURS recalculés côté serveur à partir du catalogue —
   * jamais depuis les valeurs envoyées par le client. */
  create: publicQuery
    .input(
      z.object({
        customerName: z.string().min(2).max(255),
        phone: z.string().min(6).max(50),
        governorate: z.enum(TUNISIA_GOVERNORATES),
        city: z.string().min(1).max(150),
        address: z.string().min(5).max(1000),
        postalCode: z.string().max(10).optional(),
        note: z.string().max(1000).optional(),
        items: z.array(orderItemInput).min(1),
        paymentMethod: z.enum(PAYMENT_METHODS),
        // Clé retournée par POST /api/uploads/payment-proof — obligatoire si
        // paymentMethod === "d17", vérifiée ci-dessous (existence réelle dans
        // le stockage, pas seulement présence de la valeur).
        paymentProofKey: z.string().max(255).optional(),
        // Générée par le client pour chaque tentative — protège contre les
        // commandes en double (double clic, nouvelle tentative réseau).
        idempotencyKey: z.string().min(8).max(64).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const catalog = await listAvailableProducts();
      const findProduct = (id: number) => {
        const product = catalog.find((p) => p.id === id);
        if (!product) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Produit indisponible" });
        }
        return product;
      };
      const items: OrderItem[] = input.items.map((i) => {
        // Pack prêt : prix de vente FIXE (contracts/packs.ts), jamais celui du client.
        if (i.kind === "pack") {
          const pack = getFixedPack(i.packId);
          if (!pack) throw new TRPCError({ code: "BAD_REQUEST", message: "Pack indisponible" });
          return {
            kind: "pack",
            packId: pack.id,
            name: pack.name,
            weightKg: packWeightKg(pack),
            qty: i.qty,
            unitPriceMillimes: pack.priceMillimes,
            contents: packContents(pack),
          };
        }
        // Custom Pack : 4 produits différents × 500 g + packaging personnalisé,
        // recalculé ici depuis le catalogue.
        if (i.kind === "custom") {
          if (!isValidCustomSelection(i.productIds)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Le Custom Pack doit contenir exactement ${CUSTOM_PACK_SIZE} produits différents.`,
            });
          }
          const products = i.productIds.map(findProduct);
          return {
            kind: "custom",
            name: CUSTOM_PACK_NAME,
            weightKg: CUSTOM_PACK_WEIGHT_KG,
            qty: i.qty,
            unitPriceMillimes: customPackTotal(products.map((p) => p.priceMillimes)),
            packagingMillimes: CUSTOM_PACK_PACKAGING_MILLIMES,
            contents: products.map((p) => ({
              productId: p.id,
              name: p.name,
              weightKg: PACK_ITEM_WEIGHT_KG,
            })),
          };
        }
        const product = findProduct(i.productId);
        return {
          kind: "product",
          productId: product.id,
          name: product.name,
          weightKg: i.weightKg,
          qty: i.qty,
          unitPriceMillimes: priceForWeight(product.priceMillimes, i.weightKg),
        };
      });
      const subtotalMillimes = items.reduce(
        (sum, i) => sum + i.qty * i.unitPriceMillimes,
        0,
      );
      const deliveryFeeMillimes = DELIVERY_FEE_MILLIMES;
      const totalMillimes = subtotalMillimes + deliveryFeeMillimes;

      if (input.paymentMethod === "d17") {
        const valid =
          !!input.paymentProofKey && (await paymentProofExists(input.paymentProofKey));
        if (!valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "La preuve de paiement D17 (capture d'écran du virement) est obligatoire.",
          });
        }
      }

      const order = await createOrder({
        customerName: input.customerName,
        phone: input.phone,
        governorate: input.governorate,
        city: input.city,
        address: input.address,
        postalCode: input.postalCode,
        note: input.note,
        items,
        subtotalMillimes,
        deliveryFeeMillimes,
        totalMillimes,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "d17" ? "pending_verification" : "pending",
        paymentProofKey: input.paymentMethod === "d17" ? input.paymentProofKey : undefined,
        idempotencyKey: input.idempotencyKey,
      });
      // Notification e-mail : sans attendre, et sans jamais faire échouer
      // la commande si l'envoi échoue (voir api/lib/email.ts).
      if (order) void notifyAdminNewOrder(order);
      return order;
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

  /** Approuver/rejeter une preuve de paiement D17 (n'a pas d'effet sur une
   * commande "cash on delivery" — voir queries/orders.ts). */
  setPaymentStatus: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int(),
        paymentStatus: z.enum(["approved", "rejected"]),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      return updatePaymentStatus(input.id, input.paymentStatus);
    }),

  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await deleteOrder(input.id);
      return { ok: true };
    }),
});
