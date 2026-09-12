import { z } from "zod";
import { delegationsForGovernorate, governorateKey } from "@contracts/delegations";
import { allDelegations, findDelegation } from "./queries/delegations";
import { createRouter, publicQuery } from "./middleware";
import {
  listOrders,
  getOrderById,
  updatePaymentStatus,
  createOrder,
  deleteOrder,
  setOrderCarrier,
} from "./queries/orders";
import { CARRIER_KEYS } from "@contracts/carriers";
import { assertAdmin } from "./queries/admin";
import type { OrderItem } from "./queries/orders";
import { listAvailableProducts } from "./queries/products";
import { notifyAdminNewOrder } from "./lib/email";
import { notifyAdminNewOrderTelegram } from "./lib/telegram";
import { maybeReportMetaPurchase, transitionOrderStatus } from "./lib/orderTransition";
import { applyKitchenRelease, refreshKitchenBoard } from "./lib/telegramKitchen";
import { parseKitchenItems } from "./queries/kitchen";
import { currentKitchenLines } from "./queries/kitchen";
import { getLastOrderId, listOrdersAwaitingCall } from "./queries/reminders";
import { TRPCError } from "@trpc/server";
import { ORDER_ERROR } from "@contracts/orderErrors";
import { metaUserSignals } from "@contracts/metaSignals";
import {
  ALLOWED_WEIGHTS_KG,
  DELIVERY_FEE_MILLIMES,
  DEFAULT_PAYMENT_METHOD,
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
  packIsAvailable,
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
  /** Les délégations d'un gouvernorat, pour le sélecteur de la commande.
   *
   * Public et en lecture seule : ce sont des noms de lieux, rien de plus.
   * Vide si la table du transporteur n'est pas chargée — le formulaire
   * retombe alors sur la saisie libre. */
  delegations: publicQuery
    .input(z.object({ governorate: z.enum(TUNISIA_GOVERNORATES) }))
    .query(async ({ input }) => {
      const all = await allDelegations("tpe");
      return delegationsForGovernorate(all, input.governorate).map((d) => ({
        externalId: d.externalId,
        name: d.name,
      }));
    }),

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
        // La délégation choisie dans la liste du transporteur. Facultative
        // pour ne pas bloquer la commande si la liste n'a pas pu se charger :
        // la ville en texte libre reste alors la seule information.
        delegationExternalId: z.string().min(1).max(40).optional(),
        note: z.string().max(1000).optional(),
        items: z.array(orderItemInput).min(1),
        // Le paiement à la livraison est le seul moyen. Le champ reste
        // accepté — un onglet resté ouvert sur l'ancienne version peut encore
        // l'envoyer — mais il n'est plus qu'une formalité : z.enum ne connaît
        // plus que "cod", donc une commande qui demanderait D17 est REFUSÉE
        // au lieu d'être enregistrée en silence dans un état sans issue.
        paymentMethod: z.enum(PAYMENT_METHODS).default(DEFAULT_PAYMENT_METHOD),
        // Générée par le client pour chaque tentative — protège contre les
        // commandes en double (double clic, nouvelle tentative réseau).
        idempotencyKey: z.string().min(8).max(64).optional(),
        // Origine, captée côté client sans rien demander au visiteur. Ces
        // valeurs viennent d'une URL, donc de l'extérieur : la source est
        // restreinte à une liste fermée, les étiquettes sont bornées, et
        // rien de tout ceci n'entre dans un calcul de prix.
        acquisitionSource: z
          .enum(["instagram", "facebook", "tiktok", "google", "direct", "autre"])
          .optional(),
        acquisitionCampaign: z.string().max(120).optional(),
        acquisitionContent: z.string().max(120).optional(),
        deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const h = ctx.req.headers;
      const signals = metaUserSignals({
        cookie: h.get("cookie"),
        xForwardedFor: h.get("x-forwarded-for"),
        xRealIp: h.get("x-real-ip"),
        userAgent: h.get("user-agent"),
      });
      const catalog = await listAvailableProducts();
      const findProduct = (id: number) => {
        const product = catalog.find((p) => p.id === id);
        if (!product) {
          throw new TRPCError({ code: "BAD_REQUEST", message: ORDER_ERROR.produitIndisponible });
        }
        return product;
      };
      const items: OrderItem[] = input.items.map((i) => {
        // Pack prêt : prix de vente FIXE (contracts/packs.ts), jamais celui du client.
        if (i.kind === "pack") {
          const pack = getFixedPack(i.packId);
            // Le prix d'un pack est figé, mais son CONTENU vient du catalogue :
          // un makroudh marqué indisponible depuis l'administration laissait
          // le pack qui le contient en vente, à son prix plein. La commande
          // partait, encaissable sur le papier, et il fallait rappeler le
          // client pour lui dire qu'on ne peut pas la préparer.
          if (!pack || !packIsAvailable(pack, catalog.map((p) => p.name)))
            throw new TRPCError({ code: "BAD_REQUEST", message: ORDER_ERROR.packIndisponible });
          return {
            kind: "pack",
            packId: pack.id,
            name: pack.name,
            weightKg: packWeightKg(pack),
            qty: i.qty,
            unitPriceMillimes: pack.priceMillimes,
            // Avec l'identifiant produit : sans lui, la cuisine rangeait le
            // makroudh d'un pack et le même makroudh commandé au poids dans
            // deux seaux différents, avec deux boutons « تم ».
            contents: packContents(pack).map((c) => ({
              ...c,
              productId: catalog.find((p) => p.name === c.name)?.id,
            })),
          };
        }
        // Custom Pack : 4 produits différents × 500 g + packaging personnalisé,
        // recalculé ici depuis le catalogue.
        if (i.kind === "custom") {
          if (!isValidCustomSelection(i.productIds)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: ORDER_ERROR.customPackTaille,
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

      // L'identifiant vient d'un formulaire public : on ne l'écrit sur la
      // commande que s'il existe chez le transporteur ET appartient au
      // gouvernorat déclaré. La ville stockée est alors LEUR nom, pas ce que
      // le navigateur a envoyé — c'est ce qui rend l'envoi sans surprise.
      let delegationExternalId: string | undefined;
      let city = input.city;
      if (input.delegationExternalId) {
        const found = await findDelegation("tpe", input.delegationExternalId);
        if (!found || governorateKey(found.governorate) !== governorateKey(input.governorate)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ORDER_ERROR.delegationHorsGouvernorat,
          });
        }
        delegationExternalId = found.externalId;
        city = found.name;
      }

      const order = await createOrder({
        customerName: input.customerName,
        phone: input.phone,
        governorate: input.governorate,
        city,
        address: input.address,
        delegationExternalId,
        note: input.note,
        acquisitionSource: input.acquisitionSource,
        acquisitionCampaign: input.acquisitionCampaign,
        acquisitionContent: input.acquisitionContent,
        deviceType: input.deviceType,
        items,
        subtotalMillimes,
        deliveryFeeMillimes,
        totalMillimes,
        paymentMethod: input.paymentMethod,
        // « pending » veut dire ici : reste à encaisser à la livraison. Il
        // passe à « paid » quand l'argent est rentré, depuis l'administration.
        paymentStatus: "pending",
        idempotencyKey: input.idempotencyKey,
        // Captés MAINTENANT : l'événement Purchase ne part que plus tard,
        // quand un humain confirme la commande, et la requête du client
        // n'existe plus à ce moment-là. Rien n'est retenu si le Pixel ne
        // s'est pas chargé — c'est-à-dire si le client a refusé les cookies.
        ...(signals ?? {}),
      });
      // Notifications : sans attendre, et sans jamais faire échouer la
      // commande si un envoi échoue (voir api/lib/email.ts et
      // api/lib/telegram.ts). Telegram sonne sur le téléphone dans la
      // seconde ; l'e-mail reste la trace écrite. Le Meta
      // Conversions API n'est PAS déclenché ici : une commande qui vient
      // d'être créée n'est ni confirmée ni payée — voir maybeReportMetaPurchase,
      // appelée seulement depuis setStatus/setPaymentStatus.
      if (order) {
        void notifyAdminNewOrder(order);
        void notifyAdminNewOrderTelegram(order);
      }
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
      // Le statut d'AVANT décide si le poids à préparer change : la cuisine
      // n'a rien à voir entre « en préparation » et « prête ».
      const avant = await getOrderById(input.id);
      if (!avant) return null;
      return transitionOrderStatus(input.id, input.status, avant.status);
    }),

  /** Marquer une commande encaissée, ou revenir en arrière.
   *
   * Deux valeurs, et c'est tout ce qui reste depuis le retrait de D17 :
   * « paid » quand l'argent est rentré, « pending » quand il reste à
   * encaisser. « approved » et « rejected » servaient à approuver une capture
   * de virement ; elles restent dans l'énumération de la base, où elles
   * décrivent d'anciennes commandes, mais plus personne ne peut les poser. */
  setPaymentStatus: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int(),
        paymentStatus: z.enum(["paid", "pending"]),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      const order = await updatePaymentStatus(input.id, input.paymentStatus);
      if (order) await maybeReportMetaPurchase(order);
      return order;
    }),

  /** Chez quel transporteur part le colis, et sous quel numéro.
   *
   * Saisie manuelle : aucune API transporteur n'est joignable aujourd'hui
   * (voir contracts/carriers.ts). Le jour où l'une le devient, c'est cette
   * même mutation qui enregistrera le numéro renvoyé — l'interface ne changera
   * pas. */
  setCarrier: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int().positive(),
        carrier: z.enum(CARRIER_KEYS).nullable(),
        trackingNumber: z.string().max(80).optional(),
        clear: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      return setOrderCarrier(input.id, {
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        clear: input.clear,
      });
    }),

  /** Ce que l'écran de l'atelier interroge toutes les quinze secondes.
   *
   * Une requête à part, et pas `list` : `list` rend TOUTES les commandes de
   * l'histoire de la boutique, avec adresses et téléphones. La faire tourner
   * en boucle sur un écran laissé allumé toute la journée serait à la fois du
   * gaspillage et une exposition inutile. Ici : de quoi appeler, de quoi
   * cuire, rien d'autre.
   *
   * `lastOrderId` est le seul signal dont l'écran a besoin pour savoir qu'une
   * commande VIENT d'arriver — et donc pour faire sonner la caisse. */
  pulse: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      const [lastOrderId, attente, cuisine] = await Promise.all([
        getLastOrderId(),
        // Seuil à zéro : l'écran montre la file réelle, pas seulement le retard.
        listOrdersAwaitingCall(new Date(), 0),
        currentKitchenLines(),
      ]);
      return { lastOrderId, attente, cuisine: cuisine.lines };
    }),

  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      // Supprimer une commande CONFIRMÉE retire du poids au matbakh : sans ce
      // rafraîchissement, le cuisinier préparerait une commande effacée.
      const avant = await getOrderById(input.id);
      await deleteOrder(input.id);
      if (avant && avant.status !== "nouvelle" && avant.status !== "annulee") {
        await applyKitchenRelease(parseKitchenItems(avant.items));
        void refreshKitchenBoard(false);
      }
      return { ok: true };
    }),
});
