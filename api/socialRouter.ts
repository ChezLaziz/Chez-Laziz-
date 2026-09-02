import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  addSocialStat,
  getLatestSocialStats,
  getSocialHistory,
  type NetworkKey,
} from "./queries/social";
import { assertAdmin } from "./queries/admin";

const networkEnum = z.enum(["instagram", "facebook", "tiktok", "google"]);

export const socialRouter = createRouter({
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
