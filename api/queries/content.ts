import { getDb } from "./connection";
import { settings } from "@db/schema";

const FOOTER_KEYS = {
  tagline: "footer_tagline",
  instagram: "footer_instagram",
  facebook: "footer_facebook",
  tiktok: "footer_tiktok",
  copyright: "footer_copyright",
} as const;

export const FOOTER_DEFAULTS = {
  tagline:
    "Pâtisserie artisanale — Kairouan, Tunisie. Le makroudh kairouanais authentique, fait main chaque jour.",
  instagram: "https://www.instagram.com/chezlaziz",
  facebook: "https://www.facebook.com/profile.php?id=61573444418563",
  tiktok: "https://www.tiktok.com/search?q=chez%20laziz%20kairouan",
  copyright: "© 2026 Chez Laziz — عند لعزيز · Kairouan. Tous droits réservés.",
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
