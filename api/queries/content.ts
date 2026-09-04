import { getDb } from "./connection";
import { settings } from "@db/schema";

const FOOTER_KEYS = {
  tagline: "footer_tagline",
  taglineAr: "footer_tagline_ar",
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
  taglineAr: "حرفة صناعة الحلويات — القيروان، تونس. المقروض القيرواني الأصيل، صناعة يدوية كل يوم.",
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
    taglineAr: map.get(FOOTER_KEYS.taglineAr) ?? FOOTER_DEFAULTS.taglineAr,
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
  homeEyebrowAr: "page_home_eyebrow_ar",
  homeTitle: "page_home_title",
  homeSubtitleAr: "page_home_subtitle_ar",
  homeSubtitleFr: "page_home_subtitle_fr",
  maisonEyebrow: "page_maison_eyebrow",
  maisonEyebrowAr: "page_maison_eyebrow_ar",
  maisonTitle: "page_maison_title",
  maisonTitleAr: "page_maison_title_ar",
  maisonP1: "page_maison_p1",
  maisonP1Ar: "page_maison_p1_ar",
  maisonP2: "page_maison_p2",
  maisonP2Ar: "page_maison_p2_ar",
  collectionEyebrow: "page_collection_eyebrow",
  collectionEyebrowAr: "page_collection_eyebrow_ar",
  collectionTitle: "page_collection_title",
  collectionTitleAr: "page_collection_title_ar",
  collectionSubtitle: "page_collection_subtitle",
  collectionSubtitleAr: "page_collection_subtitle_ar",
  galerieEyebrow: "page_galerie_eyebrow",
  galerieTitle: "page_galerie_title",
  contactEyebrow: "page_contact_eyebrow",
  contactEyebrowAr: "page_contact_eyebrow_ar",
  contactTitle: "page_contact_title",
  contactTitleAr: "page_contact_title_ar",
  // Photo de la page Contact (clé d'image uploadée depuis l'admin, dossier
  // site/). Vide = photo par défaut du thème (visit-lifestyle.webp).
  contactImage: "page_contact_image",
} as const;

export const PAGES_DEFAULTS = {
  homeEyebrow: "Pâtisserie artisanale — Kairouan",
  homeEyebrowAr: "حرفة صناعة الحلويات — القيروان",
  homeTitle: "CHEZ LAZIZ",
  homeSubtitleAr: "عند لعزيز — مقروض قيرواني أصيل",
  homeSubtitleFr:
    "L'art du makroudh kairouanais authentique — fait main chaque jour, au goût traditionnel qui ne change jamais.",
  maisonEyebrow: "La Maison",
  maisonEyebrowAr: "دارنا",
  maisonTitle: "L'art du makroudh kairouanais authentique",
  maisonTitleAr: "فن المقروض القيرواني الأصيل",
  maisonP1:
    "Enraciné dans l'héritage intemporel de Kairouan, notre makroudh est une célébration du savoir-faire tunisien, raffiné pour les palais d'aujourd'hui.",
  maisonP1Ar:
    "متجذّر في تراث القيروان الخالد، مقروضنا احتفاء بالحرفية التونسية الأصيلة، مُعاد صياغته ليلائم أذواق اليوم.",
  maisonP2:
    "Chaque losange est façonné à la main avec des ingrédients soigneusement choisis : semoule dorée, pâte de dattes fondante, miel — et un goût traditionnel qui ne change jamais.",
  maisonP2Ar:
    "كل قطعة تُصنع يدويًا بمكونات مُنتقاة بعناية: سميد ذهبي، عجينة تمر طرية، عسل — وطعم تقليدي لا يتغيّر أبدًا.",
  collectionEyebrow: "La Collection",
  collectionEyebrowAr: "التشكيلة",
  collectionTitle: "Le makroudh, dans tous ses états",
  collectionTitleAr: "المقروض، بكل أشكاله",
  collectionSubtitle:
    "Des classiques aux créations de saison — chaque pièce est façonnée à la main, chaque jour. Prix en dinars tunisiens (TND).",
  collectionSubtitleAr:
    "من الكلاسيكيات إلى إبداعات المواسم — كل قطعة تُصنع يدويًا كل يوم. الأسعار بالدينار التونسي (TND).",
  galerieEyebrow: "La Boutique",
  galerieTitle: "La semoule, les dattes, le miel",
  contactEyebrow: "Nous trouver",
  contactEyebrowAr: "تواصل معنا",
  contactTitle: "La boutique vous attend à Kairouan",
  contactTitleAr: "متجرنا بانتظاركم في القيروان",
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
