import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  getFooterContent,
  setFooterContent,
  getPagesContent,
  setPagesContent,
} from "./queries/content";
import { assertAdmin } from "./queries/admin";

const pagesInput = z.object({
  homeEyebrow: z.string().max(200),
  homeTitle: z.string().max(100),
  homeSubtitleAr: z.string().max(300),
  homeSubtitleFr: z.string().max(500),
  maisonEyebrow: z.string().max(200),
  maisonTitle: z.string().max(200),
  maisonP1: z.string().max(1000),
  maisonP2: z.string().max(1000),
  collectionEyebrow: z.string().max(200),
  collectionTitle: z.string().max(200),
  collectionSubtitle: z.string().max(500),
  galerieEyebrow: z.string().max(200),
  galerieTitle: z.string().max(200),
  contactEyebrow: z.string().max(200),
  contactTitle: z.string().max(200),
});

// Seule une image passée par notre propre upload (dossier site/) est
// acceptée comme bandeau — jamais une URL externe arbitraire.
const bannerImageInput = z
  .string()
  .max(300)
  .regex(/^$|^\/api\/uploads\/site\/[a-zA-Z0-9_-]+\.jpg$/, "Image de bandeau invalide");

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
        bannerImage: bannerImageInput.default(""),
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
        bannerImage: input.bannerImage,
      });
      return { ok: true };
    }),

  /** Titres/textes des pages publiques (public) */
  pages: publicQuery.query(() => getPagesContent()),

  updatePages: publicQuery
    .input(pagesInput.extend({ token: z.string() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await setPagesContent({
        homeEyebrow: input.homeEyebrow,
        homeTitle: input.homeTitle,
        homeSubtitleAr: input.homeSubtitleAr,
        homeSubtitleFr: input.homeSubtitleFr,
        maisonEyebrow: input.maisonEyebrow,
        maisonTitle: input.maisonTitle,
        maisonP1: input.maisonP1,
        maisonP2: input.maisonP2,
        collectionEyebrow: input.collectionEyebrow,
        collectionTitle: input.collectionTitle,
        collectionSubtitle: input.collectionSubtitle,
        galerieEyebrow: input.galerieEyebrow,
        galerieTitle: input.galerieTitle,
        contactEyebrow: input.contactEyebrow,
        contactTitle: input.contactTitle,
      });
      return { ok: true };
    }),
});
