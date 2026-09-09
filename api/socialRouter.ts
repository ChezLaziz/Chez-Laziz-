import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  addSocialStat,
  getAllSocialStats,
  getLatestSocialStats,
  getSocialHistory,
  type NetworkKey,
} from "./queries/social";
import { assertAdmin } from "./queries/admin";
import { buildSocialOverview, buildTrend } from "@contracts/social";

const networkEnum = z.enum(["instagram", "facebook", "tiktok", "google"]);

export const socialRouter = createRouter({
  /** Vue d'ensemble des quatre réseaux, calculée côté serveur.
   *
   * Les règles (un premier relevé n'est pas une croissance, la pire baisse
   * se cherche sur tout l'historique, un relevé vieux de plus d'un mois est
   * périmé) vivent dans contracts/social.ts, pur et testé — aucune page ne
   * les réinvente. */
  overview: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      const overview = buildSocialOverview(await getAllSocialStats());
      return { ...overview, trend: buildTrend(overview) };
    }),

  /** Dernier relevé de chaque réseau (admin) */
  latest: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return getLatestSocialStats();
    }),

  /** Historique d'un réseau (admin) */
  history: publicQuery
    .input(z.object({ token: z.string(), network: networkEnum }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return getSocialHistory(input.network as NetworkKey);
    }),

  /** Ajouter un relevé (admin) */
  record: publicQuery
    .input(
      z.object({
        token: z.string(),
        network: networkEnum,
        followers: z.number().int().min(0),
        messages: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await addSocialStat(
        input.network as NetworkKey,
        input.followers,
        input.messages,
      );
      return { ok: true };
    }),
});
