// Règles métier partagées entre le site public et l'API — source de vérité
// unique pour tout ce qui touche au prix, au poids et au paiement, afin
// qu'aucune valeur ne soit dupliquée (et potentiellement désynchronisée)
// entre le frontend et le backend.

/** Poids disponibles à la commande. Le prix produit en base reste le prix
 * pour 1 kg — jamais réinterprété comme un prix pour 500 g. */
export const ALLOWED_WEIGHTS_KG = [0.5, 1, 1.5, 2, 2.5] as const;
export type WeightKg = (typeof ALLOWED_WEIGHTS_KG)[number];

export function isValidWeight(value: unknown): value is WeightKg {
  return (
    typeof value === "number" &&
    (ALLOWED_WEIGHTS_KG as readonly number[]).includes(value)
  );
}

/** 0.5 → "500 g", 1.5 → "1,5 kg" (lang="ar" → "500 غ", "1,5 كغ"). */
export function formatWeight(kg: WeightKg, lang: "fr" | "ar" = "fr"): string {
  const unit = lang === "ar" ? { small: "غ", big: "كغ" } : { small: "g", big: "kg" };
  if (kg < 1) return `${Math.round(kg * 1000)} ${unit.small}`;
  return `${kg.toString().replace(".", ",")} ${unit.big}`;
}

/** Prix (en millimes) pour un poids donné, calculé depuis le prix de base
 * 1 kg — jamais accepté depuis le client, toujours recalculé côté serveur. */
export function priceForWeight(
  basePricePerKgMillimes: number,
  weightKg: WeightKg,
): number {
  return Math.round(basePricePerKgMillimes * weightKg);
}

/** Montant en millimes → dinars lisibles, sans zéros inutiles :
 * 8000 → "8", 69900 → "69,9", 8050 → "8,05", 0 → "0".
 * Source unique de l'affichage des prix (site public, admin, e-mails) —
 * ne jamais utiliser pour une valeur de données (analytics, JSON-LD,
 * base) qui doit rester un nombre brut. */
export function formatDinars(millimes: number): string {
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(millimes));
  const mill = abs % 1000;
  const dinars = Math.floor(abs / 1000);
  if (mill === 0) return `${sign}${dinars}`;
  return `${sign}${dinars},${String(mill).padStart(3, "0").replace(/0+$/, "")}`;
}

// ---- Livraison ----
export const DELIVERY_FEE_MILLIMES = 8000; // 8 DT, fixe, toute la Tunisie
export const DELIVERY_REGION = "Toute la Tunisie";
export const DELIVERY_TIME_LABEL = "24h";
export const DELIVERY_METHOD_LABEL = "Livraison à domicile (porte-à-porte)";

// ---- Paiement ----
export const PAYMENT_METHODS = ["cod", "d17"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isValidPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

/** Numéro D17 auquel le client doit envoyer le paiement avant de joindre
 * sa capture d'écran (preuve obligatoire, vérifiée manuellement par l'admin). */
export const D17_NUMBER_DISPLAY = "24 41 07 35";

export const PAYMENT_PROOF_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
// Une capture d'écran de paiement, pas une photo HD — 8 Mo est largement
// suffisant et limite l'abus de l'endpoint d'upload.
export const PAYMENT_PROOF_MAX_SIZE_BYTES = 8 * 1024 * 1024;

// ---- Gouvernorats de Tunisie (liste officielle, pour le sélecteur de livraison) ----
export const TUNISIA_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "La Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

/** Libellé arabe de chaque gouvernorat — AFFICHAGE UNIQUEMENT.
 * La valeur envoyée au serveur reste le nom français de
 * TUNISIA_GOVERNORATES : c'est lui qui est validé à la commande et stocké
 * en base. Traduire les valeurs (et pas seulement les libellés) ferait
 * échouer toute commande passée depuis la version arabe. */
export const GOVERNORATE_LABELS_AR: Record<string, string> = {
  Ariana: "أريانة",
  "Béja": "باجة",
  "Ben Arous": "بن عروس",
  Bizerte: "بنزرت",
  "Gabès": "قابس",
  Gafsa: "قفصة",
  Jendouba: "جندوبة",
  Kairouan: "القيروان",
  Kasserine: "القصرين",
  "Kébili": "قبلي",
  "Le Kef": "الكاف",
  Mahdia: "المهدية",
  "La Manouba": "منوبة",
  "Médenine": "مدنين",
  Monastir: "المنستير",
  Nabeul: "نابل",
  Sfax: "صفاقس",
  "Sidi Bouzid": "سيدي بوزيد",
  Siliana: "سليانة",
  Sousse: "سوسة",
  Tataouine: "تطاوين",
  Tozeur: "توزر",
  Tunis: "تونس",
  Zaghouan: "زغوان",
};

export function governorateLabel(value: string, lang: "fr" | "ar"): string {
  return lang === "ar" ? (GOVERNORATE_LABELS_AR[value] ?? value) : value;
}
