import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import {
  enregistrerMessageOffres,
  getOffresList,
  marquerContactOffres,
  retirerDesOffres,
} from "./queries/offres";
import { OFFRES_MESSAGE_MAX } from "@contracts/offres";
import { tunisianLocalPhone } from "@contracts/phone";

/** Les offres sur WhatsApp — voir contracts/offres.ts pour les règles.
 *
 * Réservé à l'administration : la liste porte des noms et des numéros.
 * Rien ici n'envoie de message, et rien ici n'AJOUTE quelqu'un à la liste :
 * on n'y entre qu'en cochant la case du formulaire de commande (voir
 * orders.create). */
const identifiant = z.string().regex(/^\d{8}$/);

export const offresRouter = createRouter({
  list: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    await assertAdmin(input.token);
    return getOffresList();
  }),

  contact: publicQuery
    .input(z.object({ token: z.string(), customerId: identifiant, contacted: z.boolean() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      if (!(await marquerContactOffres(input.customerId, input.contacted))) {
        throw new TRPCError({ code: "CONFLICT", message: "Le registre est occupé, réessayez." });
      }
      return { ok: true };
    }),

  // « STOP » arrive par WhatsApp, d'un NUMÉRO, et le plus souvent dans
  // l'heure qui suit le message — c'est-à-dire au moment où la cliente n'est
  // plus dans la liste du jour. Le retrait se fait donc par numéro, tel
  // qu'on le lit dans la conversation, et marche pour toute personne
  // inscrite, qu'elle soit affichée ou non.
  retirer: publicQuery
    .input(z.object({ token: z.string(), phone: z.string().min(1).max(50) }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      const id = tunisianLocalPhone(input.phone);
      if (!id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce numéro n'est pas un numéro tunisien à huit chiffres." });
      }
      const resultat = await retirerDesOffres(id);
      // Un retrait qui échoue en silence serait la pire panne de ce module :
      // quelqu'un a dit stop, la page affiche « retiré », et on lui réécrit.
      if (resultat === "echec") {
        throw new TRPCError({ code: "CONFLICT", message: "Le retrait n'a pas été enregistré, réessayez." });
      }
      return { retire: resultat === "retire" };
    }),

  enregistrerMessage: publicQuery
    .input(z.object({ token: z.string(), texte: z.string().max(OFFRES_MESSAGE_MAX * 4) }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      return { message: await enregistrerMessageOffres(input.texte) };
    }),
});
