// Telegram : le canal qui sonne sur le téléphone quand une commande arrive.
//
// Pourquoi Telegram plutôt qu'un e-mail : une commande arrive à n'importe
// quelle heure et il faut rappeler le client vite. Un e-mail dort dans une
// boîte ; Telegram sonne, et laisse choisir un son propre à la conversation
// — c'est là qu'on règle le « cha-ching », pas dans ce code.
//
// Trois personnes dans le groupe, deux rôles :
//   — qui confirme  : voit le client, appelle, appuie sur ✅ ;
//   — la cuisine    : ne voit que des kilos par type (voir telegramKitchen).
//
// Contrat, identique à celui de l'e-mail (api/lib/email.ts) : activé
// seulement si les variables d'environnement sont présentes, ne lève JAMAIS,
// journalise l'échec. Une commande n'est jamais refusée parce qu'une
// notification n'est pas partie.
//
// Variables : TELEGRAM_BOT_TOKEN (donné par @BotFather),
// TELEGRAM_CHAT_ID (le groupe ; négatif, ex. -1001234567890).

import { createHash } from "node:crypto";
import type { OrderItem } from "../queries/orders";
import { formatDinars, formatWeight } from "@contracts/shop";
import { escapeTelegramHtml } from "@contracts/kitchenBoard";

export type NotifiableOrder = {
  id: number;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  postalCode: string | null;
  items: string;
  subtotalMillimes: number;
  deliveryFeeMillimes: number;
  totalMillimes: number;
  paymentStatus: string;
  note: string | null;
};

export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

/** Telegram refuse un message au-delà de 4096 caractères : une commande à
 * vingt lignes ne doit pas faire disparaître la notification entière. */
const LIMITE_TELEGRAM = 4096;

const ADMIN_URL = "https://chezlaziz.com/admin";
/** Le domaine public : Telegram doit pouvoir joindre le webhook. */
export const PUBLIC_URL = "https://chezlaziz.com";

function tnd(millimes: number): string {
  return `${formatDinars(millimes)} د.ت`;
}

const esc = escapeTelegramHtml;

function parseItems(json: string): OrderItem[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
  } catch {
    return [];
  }
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Le secret que Telegram renvoie dans l'en-tête de chaque appel au webhook.
 *
 * DÉRIVÉ du jeton du bot plutôt que demandé en plus : une variable de moins à
 * poser, et un secret qui reste aussi difficile à deviner que le jeton dont
 * il vient. Le jeton lui-même n'est jamais exposé — seul son condensé. */
export function telegramWebhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  return createHash("sha256").update(`${token}:webhook`).digest("hex").slice(0, 48);
}

/** Un appel à l'API Telegram. Ne lève jamais : retourne le `result` de
 * Telegram, ou null si quoi que ce soit a échoué (déjà journalisé). */
/** Telegram refuse une modification qui ne change rien. Ce n'est pas une
 * panne : le message affiché est déjà celui qu'on voulait. Sans cette
 * exception, on supprimerait et renverrait un tableau identique — du bruit
 * dans le groupe pour rien. */
const RIEN_A_CHANGER = "message is not modified";

export async function tgCall<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  if (!isTelegramConfigured()) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!res.ok || !body.ok) {
      if (body.description?.includes(RIEN_A_CHANGER)) return {} as T;
      // La description porte la vraie cause (bot hors du groupe, jeton
      // révoqué, message trop vieux) ; sans elle on chercherait à l'aveugle.
      // Le jeton n'apparaît jamais dans le journal.
      console.error(`[telegram] ${method} refusé (${res.status}) : ${body.description ?? ""}`);
      return null;
    }
    return body.result ?? null;
  } catch (err) {
    console.error(`[telegram] ${method} — erreur réseau :`, err);
    return null;
  }
}

export async function sendMessage(
  text: string,
  keyboard?: InlineKeyboard,
): Promise<{ message_id: number } | null> {
  return tgCall<{ message_id: number }>("sendMessage", {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

export async function editMessage(
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<boolean> {
  const res = await tgCall("editMessageText", {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: keyboard ?? { inline_keyboard: [] },
  });
  return res !== null;
}

export async function deleteMessage(messageId: number): Promise<void> {
  await tgCall("deleteMessage", {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    message_id: messageId,
  });
}

/** Sans cet appel, le bouton tourne en rond sur le téléphone de celui qui a
 * appuyé, même quand tout s'est bien passé. */
export async function answerCallback(id: string, text?: string): Promise<void> {
  await tgCall("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}

/** Déclare le webhook auprès de Telegram. Idempotent : appelé à chaque
 * démarrage du serveur, pour qu'il n'y ait RIEN à faire à la main après avoir
 * posé les deux variables. */
export async function registerTelegramWebhook(): Promise<void> {
  if (!isTelegramConfigured()) {
    console.log("[telegram] non configuré — webhook non déclaré");
    return;
  }
  const ok = await tgCall("setWebhook", {
    url: `${PUBLIC_URL}/api/telegram/webhook`,
    secret_token: telegramWebhookSecret(),
    // Seuls les appuis sur les boutons nous intéressent : ni les messages du
    // groupe, ni les ajouts de membres.
    allowed_updates: ["callback_query"],
  });
  if (ok !== null) console.log("[telegram] webhook déclaré");
}

/** Le message que lit la personne qui confirme.
 *
 * La PREMIÈRE ligne est ce que l'aperçu affiche sur un écran verrouillé :
 * numéro de commande et montant, rien d'autre.
 *
 * Le numéro de téléphone reste en texte brut : Telegram le détecte et le rend
 * cliquable tout seul, alors qu'un lien `tel:` serait rejeté. */
export function buildNewOrderTelegramMessage(order: NotifiableOrder): string {
  const items = parseItems(order.items);
  const adresse = `${order.address}, ${order.city}${order.postalCode ? ` ${order.postalCode}` : ""}, ${order.governorate}`;

  const lignes: string[] = [];
  for (const it of items) {
    lignes.push(
      `${it.qty} × ${esc(it.name)} (${formatWeight(it.weightKg, "ar")}) — ${tnd(it.qty * it.unitPriceMillimes)}`,
    );
    // Le contenu d'un pack : sans lui, « Custom Pack 2 kg » ne dit pas quoi
    // préparer.
    for (const c of it.contents ?? []) {
      lignes.push(`    • ${esc(c.name)} — ${formatWeight(c.weightKg, "ar")}`);
    }
  }

  const corps = [
    `💰 <b>طلبية جديدة #${order.id} — ${tnd(order.totalMillimes)}</b>`,
    ``,
    `👤 ${esc(order.customerName)}`,
    `📞 ${esc(order.phone)}`,
    `📍 ${esc(adresse)}`,
    ``,
    ...lignes,
    ``,
    `المجموع الفرعي : ${tnd(order.subtotalMillimes)}`,
    `التوصيل : ${tnd(order.deliveryFeeMillimes)}`,
    `<b>المجموع : ${tnd(order.totalMillimes)}</b>`,
    `الدفع : نقداً عند التوصيل`,
    ...(order.note ? [`📝 « ${esc(order.note)} »`] : []),
    ``,
    ADMIN_URL,
  ].join("\n");

  if (corps.length <= LIMITE_TELEGRAM) return corps;
  // On coupe dans la liste des articles, jamais dans l'en-tête : mieux vaut
  // une commande tronquée qui sonne qu'un message perdu.
  const fin = `\n…\n\n${ADMIN_URL}`;
  return corps.slice(0, LIMITE_TELEGRAM - fin.length) + fin;
}

/** Les deux seules décisions possibles sur une commande qui vient d'arriver.
 * `callback_data` reste sous les 64 octets imposés par Telegram. */
export function newOrderKeyboard(orderId: number): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: "✅ تأكيد الطلبية", callback_data: `o:ok:${orderId}` }],
      [{ text: "❌ إلغاء", callback_data: `o:no:${orderId}` }],
    ],
  };
}

/** Ce que devient le message une fois la décision prise : les boutons
 * disparaissent, la décision reste écrite, avec qui l'a prise. */
export function decidedOrderMessage(
  base: string,
  decision: "confirmee" | "annulee",
  par?: string,
): string {
  const etat = decision === "confirmee" ? "✅ <b>مؤكّدة</b>" : "❌ <b>ملغاة</b>";
  // Sans nom quand la décision ne vient pas d'un bouton : elle a été prise
  // dans le tableau de bord, et attribuer ce geste à celui qui vient
  // d'appuyer serait un mensonge écrit dans le groupe.
  return `${base}\n\n${par ? `${etat} — ${esc(par)}` : etat}`;
}

/** Envoie la notification de nouvelle commande ; ne lève jamais. */
export async function notifyAdminNewOrderTelegram(order: NotifiableOrder): Promise<void> {
  if (!isTelegramConfigured()) {
    console.log(`[telegram] non configuré — commande #${order.id} non notifiée`);
    return;
  }
  const envoye = await sendMessage(buildNewOrderTelegramMessage(order), newOrderKeyboard(order.id));
  if (envoye) console.log(`[telegram] commande #${order.id} notifiée`);
}
