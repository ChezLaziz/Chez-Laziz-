import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getStatsSummary, recordPageView } from "./queries/stats";
import { assertAdmin } from "./queries/admin";

export const statsRouter = createRouter({
  /** Enregistre une visite (public, anonyme) */
  track: publicQuery
    .input(z.object({ path: z.string().max(255) }))
    .mutation(async ({ input }) => {
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
