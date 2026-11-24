import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import { getSuiviList, markSuivi } from "./queries/suiviLivraison";

/** Le suivi après livraison — voir contracts/suiviLivraison.ts pour les
 * règles, et pour ce que le message a le droit de dire.
 *
 * Réservé à l'administration : la liste porte des noms et des numéros. Rien
 * ici n'envoie de message ; la page ouvre un lien wa.me et un humain
 * envoie. */
export const suiviRouter = createRouter({
  list: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    await assertAdmin(input.token);
    return getSuiviList();
  }),

  mark: publicQuery
    .input(
      z.object({
        token: z.string(),
        // Les huit chiffres du numéro, rien d'autre : c'est une clé de
        // registre, pas un champ libre.
        customerId: z.string().regex(/^\d{8}$/),
        contacted: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      // Un échec se dit : la page croirait sinon la cliente notée, et la
      // reproposerait demain à quelqu'un qui lui a déjà écrit.
      if (!(await markSuivi(input.customerId, input.contacted))) {
        throw new TRPCError({ code: "CONFLICT", message: "Le registre est occupé, réessayez." });
      }
      return { ok: true };
    }),
});
