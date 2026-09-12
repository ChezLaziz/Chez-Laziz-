// Ce que Telegram nous renvoie quand quelqu'un appuie sur un bouton.
//
// Quatre gestes, et c'est tout : confirmer une commande, l'annuler, déclarer
// un type cuit, défaire le dernier « تم ».
//
// Appuyer sur ✅ ici équivaut EXACTEMENT à faire avancer la commande depuis
// le tableau de bord — même fonction, mêmes conséquences (voir
// transitionOrderStatus) : l'achat part vers Meta, la cuisine voit le poids
// arriver. Sinon la personne qui confirme depuis son téléphone travaillerait
// dans une réalité parallèle.

import { getOrderById, setCancelReason } from "../queries/orders";
import { isCancelReason } from "@contracts/cancelReasons";
import { transitionOrderStatus } from "./orderTransition";
import { applyKitchenAck, applyKitchenUndo } from "./telegramKitchen";
import {
  answerCallback,
  buildNewOrderTelegramMessage,
  cancelReasonKeyboard,
  cancelReasonPrompt,
  decidedOrderMessage,
  editMessage,
  isTelegramConfigured,
  newOrderKeyboard,
} from "./telegram";

type CallbackQuery = {
  id: string;
  data?: string;
  from?: { first_name?: string; username?: string };
  message?: { message_id: number; chat?: { id?: number | string } };
};

/** Le nom de la personne qui a appuyé — c'est ce qui reste écrit dans le
 * groupe à côté de « مؤكّدة ». */
function qui(from: CallbackQuery["from"]): string {
  return from?.first_name?.trim() || from?.username?.trim() || "؟";
}

/** Une commande déjà tranchée : on réaffiche son ÉTAT RÉEL et on retire les
 * boutons. L'issue montrée est celle de la commande, pas celle du bouton qu'on
 * vient de toucher — un ❌ sur une commande déjà confirmée doit lire
 * « مؤكّدة », sinon le groupe garde une trace fausse. */
async function afficherDejaTranchee(
  messageId: number | undefined,
  order: { status: string; cancelReason: string | null } & Parameters<
    typeof buildNewOrderTelegramMessage
  >[0],
): Promise<string> {
  if (messageId) {
    await editMessage(
      messageId,
      decidedOrderMessage(
        buildNewOrderTelegramMessage(order),
        order.status === "annulee" ? "annulee" : "confirmee",
        undefined,
        order.cancelReason,
      ),
    );
  }
  return "تعمّلت قبل";
}

async function confirmOrder(q: CallbackQuery, orderId: number): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) return "الطلبية ما ثماش";
  if (order.status !== "nouvelle") return afficherDejaTranchee(q.message?.message_id, order);

  const apres = await transitionOrderStatus(orderId, "en_preparation", order.status);
  if (!apres) return "ما نجّمناش";
  if (q.message?.message_id) {
    await editMessage(
      q.message.message_id,
      decidedOrderMessage(buildNewOrderTelegramMessage(apres), "confirmee", qui(q.from)),
    );
  }
  return "✅ تأكّدت";
}

/** ❌ ne fait qu'ouvrir la question : rien n'est annulé avant qu'une raison ne
 * soit choisie. */
async function askCancelReason(q: CallbackQuery, orderId: number): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) return "الطلبية ما ثماش";
  if (order.status !== "nouvelle") return afficherDejaTranchee(q.message?.message_id, order);
  if (q.message?.message_id) {
    await editMessage(
      q.message.message_id,
      cancelReasonPrompt(buildNewOrderTelegramMessage(order)),
      cancelReasonKeyboard(orderId),
    );
  }
  return "";
}

/** « رجوع » : le ❌ touché par erreur n'a rien changé, on remet les deux
 * boutons d'origine. */
async function backToDecision(q: CallbackQuery, orderId: number): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) return "الطلبية ما ثماش";
  if (order.status !== "nouvelle") return afficherDejaTranchee(q.message?.message_id, order);
  if (q.message?.message_id) {
    await editMessage(
      q.message.message_id,
      buildNewOrderTelegramMessage(order),
      newOrderKeyboard(orderId),
    );
  }
  return "";
}

/** La raison choisie annule la commande DANS LE MÊME GESTE : la raison est
 * écrite avant le changement d'état, donc il n'existe pas d'annulation sans
 * raison venue de Telegram. */
async function cancelWithReason(
  q: CallbackQuery,
  orderId: number,
  reason: string,
): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) return "الطلبية ما ثماش";
  if (order.status !== "nouvelle") return afficherDejaTranchee(q.message?.message_id, order);

  await setCancelReason(orderId, reason);
  const apres = await transitionOrderStatus(orderId, "annulee", order.status);
  if (!apres) return "ما نجّمناش";
  if (q.message?.message_id) {
    await editMessage(
      q.message.message_id,
      decidedOrderMessage(
        buildNewOrderTelegramMessage(apres),
        "annulee",
        qui(q.from),
        reason,
      ),
    );
  }
  return "❌ تلغات";
}

/** Un identifiant de commande venu d'un bouton : il vient de nous, mais on ne
 * lui fait pas confiance pour autant. */
function orderId(data: string, prefixe: string): number | null {
  const n = Number(data.slice(prefixe.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function dispatch(q: CallbackQuery): Promise<string> {
  const data = q.data ?? "";
  if (data === "k:undo") return applyKitchenUndo();
  if (data.startsWith("k:")) return applyKitchenAck(data.slice(2));

  if (data.startsWith("o:ok:")) {
    const id = orderId(data, "o:ok:");
    return id ? confirmOrder(q, id) : "";
  }
  if (data.startsWith("o:no:")) {
    const id = orderId(data, "o:no:");
    return id ? askCancelReason(q, id) : "";
  }
  if (data.startsWith("o:back:")) {
    const id = orderId(data, "o:back:");
    return id ? backToDecision(q, id) : "";
  }
  if (data.startsWith("o:r:")) {
    // o:r:<raison>:<id> — une raison inconnue ne devient pas une annulation
    // muette : on ne fait rien plutôt que d'écrire une valeur inventée.
    const [, , reason, brut] = data.split(":");
    const id = Number(brut);
    if (!isCancelReason(reason) || !Number.isInteger(id) || id <= 0) return "";
    return cancelWithReason(q, id, reason);
  }
  return "";
}

/** Traite une mise à jour Telegram. Ne lève jamais : le webhook doit toujours
 * répondre 200, sinon Telegram réessaie en boucle et finit par le couper. */
export async function handleTelegramUpdate(update: unknown): Promise<void> {
  if (!isTelegramConfigured()) return;
  const q = (update as { callback_query?: CallbackQuery })?.callback_query;
  if (!q?.id) return;

  try {
    // Un bouton ne vaut que dans le groupe configuré. Un identifiant de
    // conversation inattendu, c'est quelqu'un d'autre : on ne fait rien.
    const chatId = q.message?.chat?.id;
    if (chatId !== undefined && String(chatId) !== String(process.env.TELEGRAM_CHAT_ID)) {
      await answerCallback(q.id);
      return;
    }

    await answerCallback(q.id, (await dispatch(q)) || undefined);
  } catch (err) {
    console.error("[telegram] bouton non traité :", err);
    // Sans cette réponse, le bouton tourne indéfiniment sur le téléphone.
    await answerCallback(q.id, "فمّا مشكل، عاود");
  }
}
