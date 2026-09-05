// Packs (coffrets) de la page Commande — source de vérité unique, partagée
// entre le site public et l'API. Les prix de vente des packs prêts sont
// FIXES (jamais recalculés depuis les produits) ; le Custom Pack est calculé
// dynamiquement : somme des 4 produits choisis (500 g chacun) + packaging.
import { formatDinars, isValidWeight, priceForWeight, type WeightKg } from "./shop";

/** Chaque produit d'un pack pèse exactement 500 g. */
export const PACK_ITEM_WEIGHT_KG: WeightKg = 0.5;

export const FIXED_PACK_IDS = ["vip", "premium", "delice", "classique"] as const;
export type FixedPackId = (typeof FIXED_PACK_IDS)[number];

export type FixedPack = {
  id: FixedPackId;
  name: string;
  /** Nom affiché sur la version arabe du site. */
  nameAr: string;
  tagline: string;
  taglineAr: string;
  /** Prix de vente, en millimes (69900 = 69,900 DT). Ne pas recalculer. */
  priceMillimes: number;
  /** Noms exacts des produits inclus — 500 g chacun. Ne pas renommer. */
  contents: readonly string[];
  badge?: string;
  badgeAr?: string;
};

export const FIXED_PACKS: readonly FixedPack[] = [
  {
    id: "vip",
    name: "Laziz VIP",
    nameAr: "لعزيز الملكية",
    tagline: "Une sélection premium de nos créations.",
    taglineAr: "تشكيلة مختارة من أرقى إبداعاتنا.",
    priceMillimes: 69900,
    badge: "Premium",
    badgeAr: "نخبة",
    contents: [
      "Makroudh Laziz – Fruits Secs",
      "Makroudh Blanc à la Pistache",
      "Makroudh Blanc au Fraise",
      "Makroudh Zgougou",
    ],
  },
  {
    id: "premium",
    name: "Laziz Premium",
    nameAr: "لعزيز الفاخرة",
    tagline: "Quatre saveurs raffinées, entre fruits et fruits secs.",
    taglineAr: "أربع نكهات راقية، بين الفواكه والفواكه الجافة.",
    priceMillimes: 49900,
    contents: [
      "Makroudh Blanc aux Figues",
      "Makroudh aux Amandes",
      "Makroudh Jwayed",
      "Makroudh aux Noisettes",
    ],
  },
  {
    id: "delice",
    name: "Laziz Délice",
    nameAr: "لعزيز الشهية",
    tagline: "Trois saveurs gourmandes à partager.",
    taglineAr: "ثلاث نكهات لذيذة للمشاركة مع الأحبّة.",
    priceMillimes: 39900,
    contents: ["Makroudh au Blé", "Makroudh Jwayed", "Makroudh Blanc à la Pistache"],
  },
  {
    id: "classique",
    name: "Laziz Classique",
    nameAr: "لعزيز الكلاسيكية",
    tagline: "L'essentiel du makroudh, en trois saveurs.",
    taglineAr: "أساسيات المقروض في ثلاث نكهات.",
    priceMillimes: 29900,
    contents: ["Makroudh Laziz aux Dattes", "Makroudh Jwayed", "Makroudh aux Noisettes"],
  },
];

export function getFixedPack(id: string): FixedPack | undefined {
  return FIXED_PACKS.find((p) => p.id === id);
}

/** Poids total d'un pack prêt : nombre de produits × 500 g (1,5 kg ou 2 kg). */
export function packWeightKg(pack: FixedPack): WeightKg {
  const kg = pack.contents.length * PACK_ITEM_WEIGHT_KG;
  if (!isValidWeight(kg)) throw new Error(`Poids de pack invalide : ${kg} kg`);
  return kg;
}

export function packContents(pack: FixedPack): { name: string; weightKg: WeightKg }[] {
  return pack.contents.map((name) => ({ name, weightKg: PACK_ITEM_WEIGHT_KG }));
}

// ---- Custom Pack ----
// Le nom français reste l'identité de la ligne de panier et de la commande
// (e-mail, admin, base) ; les variantes AR ne servent qu'à l'affichage.
export const CUSTOM_PACK_NAME = "Custom Pack";
export const CUSTOM_PACK_NAME_AR = "حزمة على المقاس";
export const CUSTOM_PACK_SUBTITLE = "Composez votre Pack";
export const CUSTOM_PACK_SUBTITLE_AR = "كوّنوا الحزمة الخاصة بكم";
/** Exactement 4 produits différents, 500 g chacun → 2 kg. */
export const CUSTOM_PACK_SIZE = 4;
export const CUSTOM_PACK_WEIGHT_KG: WeightKg = 2;
export const CUSTOM_PACK_PACKAGING_MILLIMES = 10000; // 10 DT
export const CUSTOM_PACK_PACKAGING_LABEL = "Packaging personnalisé";
export const CUSTOM_PACK_PACKAGING_LABEL_AR = "تغليف خاص";

/** Prix d'un produit dans un pack : 500 g, depuis son prix pour 1 kg. */
export function packItemPrice(basePricePerKgMillimes: number): number {
  return priceForWeight(basePricePerKgMillimes, PACK_ITEM_WEIGHT_KG);
}

/** Somme des produits choisis (500 g chacun), sans le packaging. */
export function customPackProductsTotal(basePricesPerKgMillimes: readonly number[]): number {
  return basePricesPerKgMillimes.reduce((sum, base) => sum + packItemPrice(base), 0);
}

/** Produits + packaging personnalisé = prix final du Custom Pack. */
export function customPackTotal(basePricesPerKgMillimes: readonly number[]): number {
  return customPackProductsTotal(basePricesPerKgMillimes) + CUSTOM_PACK_PACKAGING_MILLIMES;
}

/** Exactement 4 identifiants de produits, entiers positifs, tous différents. */
export function isValidCustomSelection(ids: readonly unknown[]): ids is number[] {
  if (ids.length !== CUSTOM_PACK_SIZE) return false;
  const seen = new Set<number>();
  for (const id of ids) {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return false;
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** Ordre canonique (pour comparer deux packs identiques). */
export function normalizeCustomSelection(ids: readonly number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

/** 8000 → "8 DT", 69900 → "69,9 DT" ; lang="ar" → "8 د.ت". */
export function formatPriceDT(millimes: number, lang: "fr" | "ar" = "fr"): string {
  return `${formatDinars(millimes)} ${lang === "ar" ? "د.ت" : "DT"}`;
}
