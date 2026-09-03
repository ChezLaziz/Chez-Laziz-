import { getDb } from "./connection";
import { settings } from "@db/schema";

const FOOTER_KEYS = {
  tagline: "footer_tagline",
  instagram: "footer_instagram",
  facebook: "footer_facebook",
  tiktok: "footer_tiktok",
  copyright: "footer_copyright",
  // Photo du bandeau « Nous trouver » du pied de page (clé d'image uploadée
  // depuis l'admin, dossier site/). Vide = illustration dorée de Kairouan.
  bannerImage: "footer_banner_image",
} as const;

export const FOOTER_DEFAULTS = {
  tagline:
    "Pâtisserie artisanale — Kairouan, Tunisie. Le makroudh kairouanais authentique, fait main chaque jour.",
  instagram: "https://www.instagram.com/chezlaziz",
  facebook: "https://www.facebook.com/profile.php?id=61573444418563",
  tiktok: "https://www.tiktok.com/search?q=chez%20laziz%20kairouan",
  copyright: "© 2026 Chez Laziz — عند لعزيز · Kairouan. Tous droits réservés.",
  bannerImage: "",
};

export type FooterContent = typeof FOOTER_DEFAULTS;

export async function getFooterContent(): Promise<FooterContent> {
  const rows = await getDb().query.settings.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    tagline: map.get(FOOTER_KEYS.tagline) ?? FOOTER_DEFAULTS.tagline,
    instagram: map.get(FOOTER_KEYS.instagram) ?? FOOTER_DEFAULTS.instagram,
    facebook: map.get(FOOTER_KEYS.facebook) ?? FOOTER_DEFAULTS.facebook,
    tiktok: map.get(FOOTER_KEYS.tiktok) ?? FOOTER_DEFAULTS.tiktok,
    copyright: map.get(FOOTER_KEYS.copyright) ?? FOOTER_DEFAULTS.copyright,
    bannerImage: map.get(FOOTER_KEYS.bannerImage) ?? FOOTER_DEFAULTS.bannerImage,
  };
}

export async function setFooterContent(data: FooterContent): Promise<void> {
  const db = getDb();
  const entries = Object.entries(FOOTER_KEYS) as [keyof FooterContent, string][];
  for (const [field, key] of entries) {
    await db
      .insert(settings)
      .values({ key, value: data[field] })
      .onConflictDoUpdate({ target: settings.key, set: { value: data[field] } });
  }
}

const PAGE_KEYS = {
  homeEyebrow: "page_home_eyebrow",
  homeTitle: "page_home_title",
  homeSubtitleAr: "page_home_subtitle_ar",
  homeSubtitleFr: "page_home_subtitle_fr",
  maisonEyebrow: "page_maison_eyebrow",
  maisonTitle: "page_maison_title",
  maisonP1: "page_maison_p1",
  maisonP2: "page_maison_p2",
  collectionEyebrow: "page_collection_eyebrow",
  collectionTitle: "page_collection_title",
  collectionSubtitle: "page_collection_subtitle",
  galerieEyebrow: "page_galerie_eyebrow",
  galerieTitle: "page_galerie_title",
  contactEyebrow: "page_contact_eyebrow",
  contactTitle: "page_contact_title",
  // Photo de la page Contact (clé d'image uploadée depuis l'admin, dossier
  // site/). Vide = photo par défaut du thème (visit-lifestyle.webp).
  contactImage: "page_contact_image",
} as const;

export const PAGES_DEFAULTS = {
  homeEyebrow: "Pâtisserie artisanale — Kairouan",
  homeTitle: "CHEZ LAZIZ",
  homeSubtitleAr: "عند لعزيز — مقروض قيرواني أصيل",
  homeSubtitleFr:
    "L'art du makroudh kairouanais authentique — fait main chaque jour, au goût traditionnel qui ne change jamais.",
  maisonEyebrow: "La Maison",
  maisonTitle: "L'art du makroudh kairouanais authentique",
  maisonP1:
    "Enraciné dans l'héritage intemporel de Kairouan, notre makroudh est une célébration du savoir-faire tunisien, raffiné pour les palais d'aujourd'hui.",
  maisonP2:
    "Chaque losange est façonné à la main avec des ingrédients soigneusement choisis : semoule dorée, pâte de dattes fondante, miel — et un goût traditionnel qui ne change jamais.",
  collectionEyebrow: "La Collection",
  collectionTitle: "Le makroudh, dans tous ses états",
  collectionSubtitle:
    "Des classiques aux créations de saison — chaque pièce est façonnée à la main, chaque jour. Prix en dinars tunisiens (TND).",
  galerieEyebrow: "La Boutique",
  galerieTitle: "La semoule, les dattes, le miel",
  contactEyebrow: "Nous trouver",
  contactTitle: "La boutique vous attend à Kairouan",
  contactImage: "",
};

export type PagesContent = typeof PAGES_DEFAULTS;

export async function getPagesContent(): Promise<PagesContent> {
  const rows = await getDb().query.settings.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const result = {} as PagesContent;
  const entries = Object.entries(PAGE_KEYS) as [keyof PagesContent, string][];
  for (const [field, key] of entries) {
    result[field] = map.get(key) ?? PAGES_DEFAULTS[field];
  }
  return result;
}

export async function setPagesContent(data: PagesContent): Promise<void> {
  const db = getDb();
  const entries = Object.entries(PAGE_KEYS) as [keyof PagesContent, string][];
  for (const [field, key] of entries) {
    await db
      .insert(settings)
      .values({ key, value: data[field] })
      .onConflictDoUpdate({ target: settings.key, set: { value: data[field] } });
  }
}
