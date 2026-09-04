import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  getFooterContent,
  setFooterContent,
  getPagesContent,
  setPagesContent,
} from "./queries/content";
import { assertAdmin } from "./queries/admin";

// Seule une image passée par notre propre upload (dossier site/) est
// acceptée pour une photo de contenu — jamais une URL externe arbitraire.
const siteImageInput = z
  .string()
  .max(300)
  .regex(/^$|^\/api\/uploads\/site\/[a-zA-Z0-9_-]+\.jpg$/, "Image invalide");

const pagesInput = z.object({
  homeEyebrow: z.string().max(200),
  homeEyebrowAr: z.string().max(200),
  homeTitle: z.string().max(100),
  homeSubtitleAr: z.string().max(300),
  homeSubtitleFr: z.string().max(500),
  maisonEyebrow: z.string().max(200),
  maisonEyebrowAr: z.string().max(200),
  maisonTitle: z.string().max(200),
  maisonTitleAr: z.string().max(200),
  maisonP1: z.string().max(1000),
  maisonP1Ar: z.string().max(1000),
  maisonP2: z.string().max(1000),
  maisonP2Ar: z.string().max(1000),
  collectionEyebrow: z.string().max(200),
  collectionEyebrowAr: z.string().max(200),
  collectionTitle: z.string().max(200),
  collectionTitleAr: z.string().max(200),
  collectionSubtitle: z.string().max(500),
  collectionSubtitleAr: z.string().max(500),
  galerieEyebrow: z.string().max(200),
  galerieTitle: z.string().max(200),
  contactEyebrow: z.string().max(200),
  contactEyebrowAr: z.string().max(200),
  contactTitle: z.string().max(200),
  contactTitleAr: z.string().max(200),
  contactImage: siteImageInput.default(""),
});

export const contentRouter = createRouter({
  /** Contenu du pied de page (public) */
  footer: publicQuery.query(() => getFooterContent()),

  updateFooter: publicQuery
    .input(
      z.object({
        token: z.string(),
        tagline: z.string().max(500),
        taglineAr: z.string().max(500),
        instagram: z.string().max(300),
        facebook: z.string().max(300),
        tiktok: z.string().max(300),
        copyright: z.string().max(300),
        bannerImage: siteImageInput.default(""),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await setFooterContent({
        tagline: input.tagline,
        taglineAr: input.taglineAr,
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
        homeEyebrowAr: input.homeEyebrowAr,
        homeTitle: input.homeTitle,
        homeSubtitleAr: input.homeSubtitleAr,
        homeSubtitleFr: input.homeSubtitleFr,
        maisonEyebrow: input.maisonEyebrow,
        maisonEyebrowAr: input.maisonEyebrowAr,
        maisonTitle: input.maisonTitle,
        maisonTitleAr: input.maisonTitleAr,
        maisonP1: input.maisonP1,
        maisonP1Ar: input.maisonP1Ar,
        maisonP2: input.maisonP2,
        maisonP2Ar: input.maisonP2Ar,
        collectionEyebrow: input.collectionEyebrow,
        collectionEyebrowAr: input.collectionEyebrowAr,
        collectionTitle: input.collectionTitle,
        collectionTitleAr: input.collectionTitleAr,
        collectionSubtitle: input.collectionSubtitle,
        collectionSubtitleAr: input.collectionSubtitleAr,
        galerieEyebrow: input.galerieEyebrow,
        galerieTitle: input.galerieTitle,
        contactEyebrow: input.contactEyebrow,
        contactEyebrowAr: input.contactEyebrowAr,
        contactTitle: input.contactTitle,
        contactTitleAr: input.contactTitleAr,
        contactImage: input.contactImage,
      });
      return { ok: true };
    }),
});
