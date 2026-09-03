// Packs (coffrets) de la page Commande — source de vérité unique, partagée
// entre le site public et l'API. Les prix de vente des packs prêts sont
// FIXES (jamais recalculés depuis les produits) ; le Custom Pack est calculé
// dynamiquement : somme des 4 produits choisis (500 g chacun) + packaging.
import { isValidWeight, priceForWeight, type WeightKg } from "./shop";

/** Chaque produit d'un pack pèse exactement 500 g. */
export const PACK_ITEM_WEIGHT_KG: WeightKg = 0.5;

export const FIXED_PACK_IDS = ["vip", "premium", "delice", "classique"] as const;
export type FixedPackId = (typeof FIXED_PACK_IDS)[number];

export type FixedPack = {
  id: FixedPackId;
  name: string;
  tagline: string;
  /** Prix de vente, en millimes (69900 = 69,900 DT). Ne pas recalculer. */
  priceMillimes: number;
  /** Noms exacts des produits inclus — 500 g chacun. Ne pas renommer. */
  contents: readonly string[];
  badge?: string;
};

export const FIXED_PACKS: readonly FixedPack[] = [
  {
    id: "vip",
    name: "Laziz VIP",
    tagline: "Une sélection premium de nos créations.",
    priceMillimes: 69900,
    badge: "Premium",
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
    tagline: "Quatre saveurs raffinées, entre fruits et fruits secs.",
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
    tagline: "Trois saveurs gourmandes à partager.",
    priceMillimes: 39900,
    contents: ["Makroudh au Blé", "Makroudh Jwayed", "Makroudh Blanc à la Pistache"],
  },
  {
    id: "classique",
    name: "Laziz Classique",
    tagline: "L'essentiel du makroudh, en trois saveurs.",
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
export const CUSTOM_PACK_NAME = "Custom Pack";
export const CUSTOM_PACK_SUBTITLE = "Composez votre Pack";
/** Exactement 4 produits différents, 500 g chacun → 2 kg. */
export const CUSTOM_PACK_SIZE = 4;
export const CUSTOM_PACK_WEIGHT_KG: WeightKg = 2;
export const CUSTOM_PACK_PACKAGING_MILLIMES = 10000; // 10,000 DT
export const CUSTOM_PACK_PACKAGING_LABEL = "Packaging personnalisé";

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

/** 69900 → "69,900 DT" (écriture tunisienne : dinars, virgule, millimes). */
export function formatPriceDT(millimes: number): string {
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(millimes));
  const dinars = Math.floor(abs / 1000);
  const mill = String(abs % 1000).padStart(3, "0");
  return `${sign}${dinars},${mill} DT`;
}
