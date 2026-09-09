import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import { tpeFetchDelegations, tpeCreateShipment } from "./lib/tpe";
import { getOrderById, setOrderCarrier } from "./queries/orders";
import { buildTpePayload, refusalToSend } from "@contracts/tpeShipment";
import { parseOrderItems } from "@contracts/carriers";
import {
  allDelegations,
  cityReport,
  deleteAlias,
  destinationForOrder,
  saveAlias,
  saveDelegations,
} from "./queries/delegations";

/** Le transporteur, côté serveur.
 *
 * Trois responsabilités : tenir à jour leur table des délégations, relier nos
 * villes à ces délégations (automatiquement quand c'est sûr, par décision
 * humaine sinon), et créer les colis. La phase de reconnaissance — sonder
 * leurs chemins, inspecter la forme des réponses — a fait son travail et a
 * été retirée : la forme est connue, elle vit dans contracts/tpeShipment.ts.
 *
 * `syncDelegations` reste sans bouton dans l'interface : on ne la relance
 * que si le transporteur ajoute des délégations, ce qui est rare.
 *
 * Tout est réservé à l'admin. */
export const carriersRouter = createRouter({
  /** Récupère la table des délégations et la stocke.
   *
   * C'est le verrou de l'intégration : nos commandes portent une ville en
   * texte libre, leur API exige un identifiant. */
  syncDelegations: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      const { probe, delegations } = await tpeFetchDelegations();
      const saved = delegations.length > 0 ? await saveDelegations("tpe", delegations) : 0;
      return {
        status: probe.status,
        ok: probe.ok,
        shape: probe.shape,
        error: probe.error,
        // Un échantillon suffit à comprendre la forme ; la liste entière est
        // en base.
        sample: probe.sample.slice(0, 1200),
        found: delegations.length,
        saved,
      };
    }),

  /** Où en est le rapprochement ville → délégation, commande par commande.
   *
   * La question à laquelle cet écran répond : « qu'est-ce qui empêche encore
   * d'envoyer une commande au transporteur ? ». */
  cities: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      const lines = await cityReport("tpe");
      return {
        lines,
        pending: lines.filter((l) => l.match.delegation === null).length,
      };
    }),

  /** Enregistre la décision d'un humain pour une ville.
   *
   * Le seul endroit du code où un identifiant de délégation est choisi sans
   * correspondance automatique — et il faut un clic explicite pour y arriver. */
  linkCity: publicQuery
    .input(
      z.object({
        token: z.string(),
        governorate: z.string().min(1),
        city: z.string().min(1),
        delegationExternalId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await saveAlias("tpe", input);
      return { ok: true as const };
    }),

  /** Annule une décision : la ville redevient à décider. */
  unlinkCity: publicQuery
    .input(z.object({ token: z.string(), governorate: z.string(), city: z.string() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await deleteAlias("tpe", input.governorate, input.city);
      return { ok: true as const };
    }),

  /** ENVOIE VRAIMENT UN COLIS. Le seul endroit du projet qui le fasse.
   *
   * Une commande à la fois, sur un clic. Pas de lot : un envoi groupé qui
   * échoue à mi-chemin laisse un état que personne ne sait démêler, et il
   * s'agit ici de vrais colis et de vrai argent.
   *
   * L'ordre des vérifications est délibéré — tout ce qui peut refuser
   * refuse AVANT que quoi que ce soit ne parte. */
  send: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);

      const order = await getOrderById(input.id);
      if (!order) return { ok: false as const, reason: "introuvable" as const };

      const shippable = {
        id: order.id,
        customerName: order.customerName,
        phone: order.phone,
        governorate: order.governorate,
        city: order.city,
        address: order.address,
        postalCode: order.postalCode,
        items: parseOrderItems(order.items),
        subtotalMillimes: order.subtotalMillimes,
        deliveryFeeMillimes: order.deliveryFeeMillimes,
        totalMillimes: order.totalMillimes,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        note: order.note,
      };

      const destination = await destinationForOrder("tpe", order);
      const refusal = refusalToSend(
        { ...shippable, status: order.status, trackingNumber: order.trackingNumber },
        destination,
      );
      if (refusal !== null || destination === null) {
        return { ok: false as const, reason: refusal ?? ("no_delegation" as const) };
      }

      const outcome = await tpeCreateShipment(buildTpePayload(shippable, destination));

      if (outcome.kind === "created") {
        // Écrit AVANT de répondre : si l'interface se ferme entre-temps, le
        // numéro est déjà rangé et la commande ne peut plus repartir.
        await setOrderCarrier(order.id, {
          carrier: "tpe",
          trackingNumber: outcome.trackingNumber,
        });
        return {
          ok: true as const,
          trackingNumber: outcome.trackingNumber,
          // Dit si le transporteur a bien conservé notre référence.
          referenceKept: outcome.externalId !== null,
        };
      }

      if (outcome.kind === "unknown") {
        return { ok: false as const, reason: "incertain" as const, message: outcome.message };
      }
      return {
        ok: false as const,
        reason: "refuse" as const,
        status: outcome.status,
        message: outcome.message,
      };
    }),

  /** La table complète, pour offrir un choix exhaustif à qui doit trancher.
   *
   * Non filtrée par gouvernorat : quand une commande porte un gouvernorat
   * faux, la bonne délégation est justement ailleurs. */
  catalogue: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      const rows = await allDelegations("tpe");
      return rows.sort(
        (a, b) => a.governorate.localeCompare(b.governorate) || a.name.localeCompare(b.name),
      );
    }),

});
