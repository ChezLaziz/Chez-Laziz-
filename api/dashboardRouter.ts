import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import {
  getRevenueSummary,
  getOrderStatusCounts,
  getTopProducts,
} from "./queries/dashboard";
import { getStatsSummary } from "./queries/stats";
import { listContactMessages } from "./queries/orders";
import { getLatestSocialStats } from "./queries/social";

export const dashboardRouter = createRouter({
  /** Vue d'ensemble agrégée pour la page d'accueil de l'admin. */
  overview: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      const [revenue, statusCounts, topProducts, visits, messages, social] =
        await Promise.all([
          getRevenueSummary(),
          getOrderStatusCounts(),
          getTopProducts(5),
          getStatsSummary(),
          listContactMessages(),
          getLatestSocialStats(),
        ]);
      const unread = messages.filter((m) => !m.isRead);
      return {
        revenue,
        statusCounts,
        topProducts,
        visits,
        unreadMessages: unread.slice(0, 5),
        unreadCount: unread.length,
        social,
      };
    }),
});
