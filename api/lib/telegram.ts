// Notification Telegram à l'équipe pour chaque nouvelle commande.
//
// Pourquoi Telegram en plus de l'e-mail : une commande arrive à n'importe
// quelle heure et il faut rappeler le client vite. Un e-mail dort dans une
// boîte ; Telegram sonne sur le téléphone, et Telegram permet de choisir un
// son différent par conversation — c'est là qu'on règle le « cha-ching ».
//
// Même contrat que l'e-mail (voir api/lib/email.ts) : activé seulement si
// les variables d'environnement sont présentes, ne lève jamais, journalise
// l'échec. Une commande n'est JAMAIS refusée parce qu'une notification n'est
// pas partie.
//
// Variables : TELEGRAM_BOT_TOKEN (donné par @BotFather),
// TELEGRAM_CHAT_ID (l'identifiant du groupe ou de la conversation ; négatif
// pour un groupe, ex. -1001234567890).

import type { OrderItem } from "../queries/orders";
import { formatDinars, formatWeight } from "@contracts/shop";

type NotifiableOrder = {
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

/** Telegram refuse un message au-delà de 4096 caractères : une commande à
 * vingt lignes ne doit pas faire disparaître la notification entière. */
const LIMITE_TELEGRAM = 4096;

function tnd(millimes: number): string {
  return `${formatDinars(millimes)} DT`;
}

/** Telegram en mode HTML n'interprète que `&`, `<` et `>`. Un nom de client
 * contenant « < » casserait le message sans cet échappement. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

/** Le message tel qu'il arrive sur le téléphone.
 *
 * La PREMIÈRE ligne est ce que l'aperçu de la notification affiche, écran
 * verrouillé : numéro de commande et montant, rien d'autre. Le reste sert
 * une fois la conversation ouverte.
 *
 * Le numéro de téléphone reste en texte brut : Telegram le détecte et le
 * rend cliquable tout seul, alors qu'un lien `tel:` serait rejeté. */
export function buildNewOrderTelegramMessage(order: NotifiableOrder): string {
  const items = parseItems(order.items);
  const addressLine = `${order.address}, ${order.city}${order.postalCode ? ` ${order.postalCode}` : ""}, ${order.governorate}`;

  const lignes: string[] = [];
  for (const it of items) {
    lignes.push(
      `${it.qty} × ${escapeHtml(it.name)} (${formatWeight(it.weightKg)}) — ${tnd(it.qty * it.unitPriceMillimes)}`,
    );
    // Le contenu d'un pack (pack prêt ou Custom Pack) : sans lui, « Custom
    // Pack 2 kg » ne dit pas quoi préparer.
    for (const c of it.contents ?? []) {
      lignes.push(`    • ${escapeHtml(c.name)} — ${formatWeight(c.weightKg)}`);
    }
  }

  const corps = [
    `💰 <b>Nouvelle commande #${order.id} — ${tnd(order.totalMillimes)}</b>`,
    ``,
    `👤 ${escapeHtml(order.customerName)}`,
    `📞 ${escapeHtml(order.phone)}`,
    `📍 ${escapeHtml(addressLine)}`,
    ``,
    ...lignes,
    ``,
    `Sous-total : ${tnd(order.subtotalMillimes)}`,
    `Livraison : ${tnd(order.deliveryFeeMillimes)}`,
    `<b>Total : ${tnd(order.totalMillimes)}</b>`,
    `Paiement : Espèces à la livraison`,
    ...(order.note ? [`📝 « ${escapeHtml(order.note)} »`] : []),
    ``,
    `https://chezlaziz.com/admin`,
  ].join("\n");

  if (corps.length <= LIMITE_TELEGRAM) return corps;
  // On coupe dans la liste des articles, jamais dans l'en-tête : mieux vaut
  // une commande tronquée qui sonne qu'un message perdu.
  const fin = `\n…\n\nhttps://chezlaziz.com/admin`;
  return corps.slice(0, LIMITE_TELEGRAM - fin.length) + fin;
}

/** Envoie la notification ; ne lève jamais (journalise l'échec) — appelée
 * sans await après la création de la commande. */
export async function notifyAdminNewOrderTelegram(order: NotifiableOrder): Promise<void> {
  if (!isTelegramConfigured()) {
    console.log(`[telegram] non configuré — commande #${order.id} non notifiée sur Telegram`);
    return;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: buildNewOrderTelegramMessage(order),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!res.ok) {
      // Le corps de la réponse porte la vraie cause (chat introuvable, bot
      // pas membre du groupe, jeton révoqué) ; sans lui on chercherait à
      // l'aveugle. Le jeton n'apparaît jamais dans le journal.
      console.error(
        `[telegram] échec (${res.status}) pour la commande #${order.id}: ${await res.text()}`,
      );
    } else {
      console.log(`[telegram] commande #${order.id} notifiée`);
    }
  } catch (err) {
    console.error(`[telegram] erreur réseau pour la commande #${order.id}:`, err);
  }
}
