// Le tableau du MATBAKH : combien de kilos, par type, restent à préparer.
//
// Le cuisinier ne travaille pas commande par commande, il cuit en gros. Cinq
// clients à 500 g du même makroudh, c'est UNE fournée de 2,5 kg — et c'est
// tout ce qu'il a besoin de lire. Rien ici ne porte de nom, de téléphone ni
// d'adresse : le poids, le type, et c'est fini.
//
// Le compteur ne se remet pas à zéro tout seul à minuit. Il descend quand le
// cuisinier appuie sur « تم » pour un type : ce qui est cuit est cuit, ce qui
// reste attend. Un appui par erreur se défait.
//
// La mesure reste toujours DÉRIVÉE des commandes confirmées, jamais un
// compteur qu'on incrémente : pendant = confirmé − acquitté. Un compteur
// dérive au premier envoi manqué ; une différence, non.

/** Une ligne de commande telle qu'elle est enregistrée (voir OrderItem).
 * `contents` = les produits d'un pack ; quand il est présent, c'est LUI qui
 * porte le poids réel à préparer, pas la ligne du pack. */
export type KitchenItem = {
  productId?: number;
  name: string;
  weightKg: number;
  qty: number;
  contents?: { productId?: number; name: string; weightKg: number }[];
};

/** Poids cumulé par type, et le nom sous lequel il a été commandé. */
export type ConfirmedTotals = Record<string, { kg: number; name: string }>;

/** Ce que le cuisinier a déjà déclaré cuit, en cumulé depuis toujours.
 * `prev` garde la valeur d'avant le dernier « تم » : c'est ce qui rend
 * l'erreur réparable. `last` = le type du dernier « تم ». */
export type KitchenAck = {
  kg: Record<string, number>;
  prev: Record<string, number>;
  last?: string;
};

export type KitchenLine = { key: string; label: string; kg: number };

export const EMPTY_ACK: KitchenAck = { kg: {}, prev: {} };

/** Deux commandes du même produit doivent tomber dans le même seau.
 * L'identifiant produit est le repère sûr ; un produit supprimé du catalogue
 * n'en a plus, on se rabat alors sur son nom — normalisé, pour qu'une
 * majuscule ou un espace en trop ne crée pas un deuxième seau. */
export function kitchenKey(productId: number | null | undefined, name: string): string {
  if (typeof productId === "number" && Number.isFinite(productId)) return `p${productId}`;
  return `n${fnv1a(name.trim().toLowerCase().replace(/\s+/g, " "))}`;
}

/** Hachage court et stable, en JavaScript pur : ce fichier est partagé avec
 * le navigateur, node:crypto n'y a pas sa place. Il ne protège rien — il
 * raccourcit un nom pour tenir dans les 64 octets d'un bouton Telegram. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Les additions de flottants (0,5 + 0,5 + 0,5) laissent des traînées :
 * 1.4999999999999998 s'afficherait « 1,5 kg » mais ne s'annulerait jamais
 * contre l'acquittement. On arrondit au gramme, partout. */
function auGramme(kg: number): number {
  return Math.round(kg * 1000) / 1000;
}

/** Poids à préparer, par type, pour un lot de commandes confirmées.
 *
 * Un pack compte par son CONTENU, jamais deux fois : « Custom Pack 2 kg »
 * n'est pas un produit qu'on cuit, ses deux kilos le sont. */
export function accumulateKitchen(orders: { items: KitchenItem[] }[]): ConfirmedTotals {
  const totaux: ConfirmedTotals = {};
  const ajoute = (productId: number | undefined, name: string, kg: number) => {
    if (!(kg > 0)) return;
    const key = kitchenKey(productId, name);
    const seau = (totaux[key] ??= { kg: 0, name });
    seau.kg = auGramme(seau.kg + kg);
  };
  for (const order of orders) {
    for (const it of order.items) {
      const qty = Number.isFinite(it.qty) ? it.qty : 0;
      if (it.contents?.length) {
        for (const c of it.contents) ajoute(c.productId, c.name, c.weightKg * qty);
      } else {
        ajoute(it.productId, it.name, it.weightKg * qty);
      }
    }
  }
  return totaux;
}

/** Ce qui reste à préparer : confirmé − acquitté, du plus lourd au plus léger
 * (le cuisinier commence par la grosse fournée).
 *
 * `labels` remplace le nom enregistré à la commande par le nom actuel du
 * catalogue — en arabe quand il existe. Une commande négative est impossible
 * à cuire : une annulation après « تم » ramène simplement à zéro. */
export function kitchenPending(
  confirmed: ConfirmedTotals,
  ack: KitchenAck,
  labels: Record<string, string> = {},
): KitchenLine[] {
  const lignes: KitchenLine[] = [];
  for (const [key, { kg, name }] of Object.entries(confirmed)) {
    const reste = auGramme(kg - (ack.kg[key] ?? 0));
    if (reste <= 0) continue;
    lignes.push({ key, label: labels[key] ?? name, kg: reste });
  }
  return lignes.sort((a, b) => b.kg - a.kg || a.label.localeCompare(b.label, "ar"));
}

/** « تم » sur un type : tout ce qui est confirmé à cet instant est cuit. On
 * enregistre le cumul, pas une soustraction — une commande qui arrive pendant
 * la fournée n'est donc pas effacée par le bouton. */
export function ackKitchen(
  ack: KitchenAck,
  confirmed: ConfirmedTotals,
  key: string,
): KitchenAck {
  const cumul = confirmed[key]?.kg ?? 0;
  return {
    kg: { ...ack.kg, [key]: cumul },
    prev: { ...ack.prev, [key]: ack.kg[key] ?? 0 },
    last: key,
  };
}

/** Défaire le dernier « تم ». Appuyer deux fois ne creuse pas plus loin :
 * un seul pas en arrière, celui de l'erreur qu'on vient de faire. */
export function undoKitchen(ack: KitchenAck): KitchenAck {
  const key = ack.last;
  if (!key) return ack;
  return { kg: { ...ack.kg, [key]: ack.prev[key] ?? 0 }, prev: { ...ack.prev } };
}

/** 3 → « 3 كغ », 5.5 → « 5,5 كغ », 0.25 → « 250 غ ». */
export function formatKgAr(kg: number): string {
  const g = auGramme(kg);
  if (g < 1) return `${Math.round(g * 1000)} غ`;
  return `${String(g).replace(".", ",")} كغ`;
}

/** Le message tel que le cuisinier le lit. Aucune donnée client, par
 * construction : cette fonction ne reçoit que des poids et des noms de
 * produits.
 *
 * PAS DE TOTAL GÉNÉRAL, et c'est délibéré. « 50 kg » ne se cuit pas : on ne
 * cuit pas des kilos, on cuit dix kilos de fraise, cinq de vanille, trois de
 * figue. Un chiffre unique additionne des recettes différentes et ne dit rien
 * de ce qu'il faut préparer — au mieux il ne sert à rien, au pire il fait
 * croire à une fournée qui n'existe pas. Le total qui compte est celui de
 * CHAQUE type, et il est sur sa ligne. */
export function formatKitchenBoard(lines: KitchenLine[]): string {
  if (lines.length === 0) {
    return ["🍳 <b>المطبخ</b>", "", "✅ ما فماش شي يستنى — كل شي مكمّل."].join("\n");
  }
  return [
    "🍳 <b>المطبخ — المطلوب توّا</b>",
    "",
    ...lines.map((l) => `🔸 ${escapeTelegramHtml(l.label)} — <b>${formatKgAr(l.kg)}</b>`),
  ].join("\n");
}

/** Telegram en mode HTML n'interprète que ces trois caractères. */
export function escapeTelegramHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Un bouton « تم » par type, plus « رجوع » quand il y a une erreur à
 * défaire. Un bouton par ligne : au doigt, sur un téléphone de cuisine,
 * deux boutons côte à côte se confondent — et se tromper coûte une fournée.
 *
 * `callback_data` est plafonné à 64 octets par Telegram : la clé courte de
 * kitchenKey tient, le nom du produit non. */
export function kitchenKeyboard(lines: KitchenLine[], canUndo: boolean) {
  const rows = lines.map((l) => [
    { text: `✅ ${l.label} — ${formatKgAr(l.kg)}`, callback_data: `k:${l.key}` },
  ]);
  if (canUndo) rows.push([{ text: "↩️ رجوع (غلطت)", callback_data: "k:undo" }]);
  return { inline_keyboard: rows };
}
