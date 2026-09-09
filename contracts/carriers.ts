/** Remise des commandes aux transporteurs.
 *
 * Chez Laziz travaille avec deux transporteurs. Ce module ne connaît que ce
 * qui a été VÉRIFIÉ ; il n'invente ni endpoint, ni nom de champ, ni format de
 * fichier. Ce qui n'est pas prouvé est marqué comme non disponible, pas
 * deviné.
 *
 * ÉTAT RÉEL AU 9 SEPTEMBRE 2026
 *
 *   Team Parcel Express — une API existe (api.teamparcelexpress.com, Django
 *   REST, en-tête `Authorization: Token …`) mais elle est INTERNE et non
 *   documentée. Deux verrous avant de s'en servir :
 *     1. il faut capturer une vraie création de colis depuis leur interface
 *        pour connaître la forme exacte du corps de requête ;
 *     2. leur champ `delegation` est un IDENTIFIANT, et nous ne stockons que
 *        le nom de la ville en texte libre. Sans la table des délégations
 *        (récupérable une fois le jeton obtenu), aucun envoi ne peut aboutir.
 *   Tant que ces deux points ne sont pas levés, l'adaptateur REST n'existe
 *   pas — et un adaptateur à moitié deviné serait pire que pas d'adaptateur.
 *
 *   Jetpack Delivery — aucune API côté marchand. Leur plateforme tourne sur
 *   ShippingLog, où l'API est une option payante que le TRANSPORTEUR doit
 *   activer, pas nous.
 *
 * D'où la seule voie honnête aujourd'hui : préparer les données proprement,
 * les exporter, et garder la trace de qui transporte quoi. */

export const CARRIERS = {
  tpe: {
    label: "Team Parcel Express",
    /** Ce que le transporteur sait faire AUJOURD'HUI, pas demain. */
    api: false,
    platform: "app.teamparcelexpress.com",
  },
  jetpack: {
    label: "Jetpack Delivery",
    api: false,
    platform: "jetpack.tn/expediteur",
  },
} as const;

export const CARRIER_KEYS = ["tpe", "jetpack"] as const;
export type CarrierKey = (typeof CARRIER_KEYS)[number];

export function isCarrierKey(v: string): v is CarrierKey {
  return (CARRIER_KEYS as readonly string[]).includes(v);
}

/* ------------------------------ Préparation ------------------------------ */

/** Les seuls champs d'une commande dont la remise au transporteur a besoin. */
export type ShippableOrder = {
  id: number;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  postalCode?: string | null;
  items: { name: string; weightKg?: number; qty: number }[];
  subtotalMillimes: number;
  deliveryFeeMillimes: number;
  totalMillimes: number;
  paymentMethod: string;
  paymentStatus: string;
  note?: string | null;
};

/** Numéro tunisien à 8 chiffres, débarrassé de l'indicatif et des espaces.
 *
 * Les clients saisissent « +216 20 123 456 », « 0020123456 », « 20 123 456 ».
 * Un transporteur veut 8 chiffres. On garde les 8 derniers, qui sont le
 * numéro national quelle que soit la forme saisie. */
export function carrierPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-8);
}

/** Poids total en kilos, articles et quantités confondus.
 *
 * Une ligne sans poids compte pour 0 plutôt que d'être devinée : mieux vaut
 * un poids sous-estimé et visible qu'un poids inventé. La couverture est
 * exposée par `hasCompleteWeight` pour que l'interface puisse le dire. */
export function totalWeightKg(items: ShippableOrder["items"]): number {
  return items.reduce((sum, it) => sum + (it.weightKg ?? 0) * it.qty, 0);
}

export function hasCompleteWeight(items: ShippableOrder["items"]): boolean {
  return items.length > 0 && items.every((it) => typeof it.weightKg === "number");
}

/** CE QUE LE LIVREUR DOIT ENCAISSER — et surtout ce qu'il ne doit PAS.
 *
 * La règle la plus dangereuse de tout ce module. Une commande D17 déjà
 * approuvée est PAYÉE : envoyer son total au transporteur ferait payer le
 * client deux fois. Le montant à encaisser est donc nul dès que l'argent est
 * déjà rentré, quel que soit le total de la commande. */
export function amountToCollectMillimes(o: ShippableOrder): number {
  const alreadyPaid = o.paymentStatus === "approved" || o.paymentStatus === "paid";
  return alreadyPaid ? 0 : o.totalMillimes;
}

/** Contenu du colis en une ligne, pour le bordereau et le fichier. */
export function packageContents(items: ShippableOrder["items"]): string {
  return items
    .map((it) => `${it.qty}× ${it.name}${it.weightKg ? ` (${it.weightKg} kg)` : ""}`)
    .join(" + ");
}

/** Adresse complète sur une ligne, sans virgule vide ni double espace. */
export function fullAddress(o: ShippableOrder): string {
  return [o.address, o.city, o.postalCode, o.governorate]
    .map((p) => (p ?? "").trim())
    .filter((p) => p !== "")
    .join(", ");
}

/* -------------------------------- Export -------------------------------- */

/** Une ligne prête pour un transporteur.
 *
 * Les noms de colonnes reprennent les champs réels de l'API Team Parcel
 * Express (name, phone1, address, price_ttc, quantity, weight, note, ref) —
 * observés dans leur interface, pas inventés. C'est le point de départ le
 * plus proche du besoin ; il RESTERA à remapper le jour où un transporteur
 * fournit son propre gabarit. Le fichier est donc un brouillon exploitable,
 * pas un format certifié : l'interface le dit à l'utilisateur. */
export const EXPORT_COLUMNS = [
  "ref",
  "name",
  "phone1",
  "phone2",
  "address",
  "city",
  "governorate",
  "postal_code",
  "price_ttc",
  "quantity",
  "weight",
  "contents",
  "note",
] as const;

export function exportRow(o: ShippableOrder): Record<(typeof EXPORT_COLUMNS)[number], string> {
  const collect = amountToCollectMillimes(o);
  return {
    // Notre propre référence : c'est elle qui permettra de rapprocher la
    // commande du colis, dans les deux sens.
    ref: `CL-${o.id}`,
    name: o.customerName.trim(),
    phone1: carrierPhone(o.phone) ?? o.phone.trim(),
    phone2: "",
    address: o.address.trim(),
    city: o.city.trim(),
    governorate: o.governorate.trim(),
    postal_code: (o.postalCode ?? "").trim(),
    // En dinars avec 3 décimales : les transporteurs raisonnent en dinars,
    // pas en millimes. 47000 millimes → « 47.000 ».
    price_ttc: (collect / 1000).toFixed(3),
    quantity: String(o.items.reduce((s, it) => s + it.qty, 0)),
    weight: totalWeightKg(o.items).toFixed(2),
    contents: packageContents(o.items),
    note: (o.note ?? "").trim(),
  };
}

/** Échappement CSV : guillemets doublés, champ encadré dès qu'il contient un
 * séparateur, un guillemet ou un saut de ligne. Une adresse tunisienne
 * contient très souvent une virgule — sans cela le fichier se décale d'une
 * colonne et le colis part à la mauvaise adresse. */
function csvCell(value: string): string {
  if (/[",;\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Fichier CSV complet.
 *
 * Séparateur point-virgule et BOM UTF-8 : c'est ce qu'attend Excel en
 * configuration française. Avec une virgule et sans BOM, Excel ouvre tout
 * dans une seule colonne et casse les accents — le fichier serait inutilisable
 * par la personne qui doit le déposer chez le transporteur. */
export function buildCsv(orders: ShippableOrder[]): string {
  const lines = [
    EXPORT_COLUMNS.join(";"),
    ...orders.map((o) => {
      const row = exportRow(o);
      return EXPORT_COLUMNS.map((c) => csvCell(row[c])).join(";");
    }),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
