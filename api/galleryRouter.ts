import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { listGalleryImages, addGalleryImage, deleteGalleryImage } from "./queries/gallery";
import { assertAdmin } from "./queries/admin";

export const galleryRouter = createRouter({
  /** Photos affichées sur la page Galerie (public) */
  list: publicQuery.query(() => listGalleryImages()),

  add: publicQuery
    .input(
      z.object({
        token: z.string(),
        imageUrl: z.string().min(1).max(500),
        alt: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await addGalleryImage(input.imageUrl, input.alt ?? "");
      return { ok: true };
    }),

  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await deleteGalleryImage(input.id);
      return { ok: true };
    }),
});
