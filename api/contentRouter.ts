import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getFooterContent, setFooterContent } from "./queries/content";
import { assertAdmin } from "./queries/admin";

export const contentRouter = createRouter({
  /** Contenu du pied de page (public) */
  footer: publicQuery.query(() => getFooterContent()),

  updateFooter: publicQuery
    .input(
      z.object({
        token: z.string(),
        tagline: z.string().max(500),
        instagram: z.string().max(300),
        facebook: z.string().max(300),
        tiktok: z.string().max(300),
        copyright: z.string().max(300),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await setFooterContent({
        tagline: input.tagline,
        instagram: input.instagram,
        facebook: input.facebook,
        tiktok: input.tiktok,
        copyright: input.copyright,
      });
      return { ok: true };
    }),
});
