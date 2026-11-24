import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getStatsSummary, recordPageView } from "./queries/stats";
import { assertAdmin } from "./queries/admin";
import { noterArrivee } from "./queries/arrivees";
import { agentAutomatique } from "@contracts/arrivees";

export const statsRouter = createRouter({
  /** Enregistre une visite (public, anonyme) */
  track: publicQuery
    .input(
      z.object({
        path: z.string().max(255),
        /** Présent sur la PREMIÈRE page d'une session seulement : l'étiquette
         * de publicité du lien d'arrivée, et si le lien venait de Meta. Rien
         * qui désigne une personne — voir contracts/arrivees.ts. */
        arrivee: z
          .object({
            pub: z.string().max(120).optional(),
            meta: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Avant l'écriture de la page vue, et sans l'attendre : un compteur
      // en mémoire, qui ne lève jamais. Les robots qui ouvrent les liens
      // publicitaires ne sont pas des visites.
      if (input.arrivee && !agentAutomatique(ctx.req.headers.get("user-agent"))) {
        noterArrivee(input.arrivee);
      }
      await recordPageView(input.path);
      return { ok: true };
    }),

  /** Résumé des statistiques (admin) */
  summary: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return getStatsSummary();
    }),
});
