import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import { getOverview, PRESET_RANGES, resolveCustom, resolvePreset } from "./queries/analytics";
import { listContactMessages } from "./queries/orders";

/** Période demandée par le client : un preset, ou deux dates. */
const periodInput = z
  .object({
    preset: z.enum(PRESET_RANGES).optional(),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
  })
  .default({ preset: "30d" });

function resolvePeriod(input: z.infer<typeof periodInput>) {
  if (input.start && input.end) return resolveCustom(input.start, input.end);
  return resolvePreset(input.preset ?? "30d");
}

export const dashboardRouter = createRouter({
  /** Vue d'ensemble. Toutes les métriques viennent de queries/analytics —
   * source unique : aucune page ne recalcule un chiffre d'affaires ni un
   * panier moyen de son côté. */
  overview: publicQuery
    .input(z.object({ token: z.string(), period: periodInput }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      const periods = resolvePeriod(input.period);
      const [analytics, messages] = await Promise.all([getOverview(periods), listContactMessages()]);
      const unread = messages.filter((m) => !m.isRead);
      return {
        ...analytics,
        period: {
          start: periods.current.start.toISOString(),
          end: periods.current.end.toISOString(),
          previousStart: periods.previous.start.toISOString(),
          previousEnd: periods.previous.end.toISOString(),
        },
        unreadMessages: unread.slice(0, 5),
        unreadCount: unread.length,
      };
    }),
});
