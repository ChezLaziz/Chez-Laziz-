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

import { getOrderById } from "../queries/orders";
import { transitionOrderStatus } from "./orderTransition";
import { applyKitchenAck, applyKitchenUndo } from "./telegramKitchen";
import {
  answerCallback,
  buildNewOrderTelegramMessage,
  decidedOrderMessage,
  editMessage,
  isTelegramConfigured,
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

async function decideOrder(
  q: CallbackQuery,
  orderId: number,
  decision: "confirmee" | "annulee",
): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) return "الطلبية ما ثماش";
  const messageId = q.message?.message_id;

  // Déjà tranchée — par l'autre bouton, par le tableau de bord, ou par un
  // double appui. On enlève les boutons pour que personne ne retente, et on
  // ne rejoue surtout pas la transition.
  if (order.status !== "nouvelle") {
    if (messageId) {
      // L'issue affichée est celle de la COMMANDE, pas celle du bouton qu'on
      // vient d'appuyer : un ❌ sur une commande déjà confirmée doit lire
      // « مؤكّدة », sinon le groupe garde une trace fausse.
      await editMessage(
        messageId,
        decidedOrderMessage(
          buildNewOrderTelegramMessage(order),
          order.status === "annulee" ? "annulee" : "confirmee",
        ),
      );
    }
    return "تعمّلت قبل";
  }

  const apres = await transitionOrderStatus(
    orderId,
    decision === "confirmee" ? "en_preparation" : "annulee",
    order.status,
  );
  if (!apres) return "ما نجّمناش";
  if (messageId) {
    await editMessage(
      messageId,
      decidedOrderMessage(buildNewOrderTelegramMessage(apres), decision, qui(q.from)),
    );
  }
  return decision === "confirmee" ? "✅ تأكّدت" : "❌ تلغات";
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

    const data = q.data ?? "";
    let reponse = "";
    if (data === "k:undo") {
      reponse = await applyKitchenUndo();
    } else if (data.startsWith("k:")) {
      reponse = await applyKitchenAck(data.slice(2));
    } else if (data.startsWith("o:ok:") || data.startsWith("o:no:")) {
      const id = Number(data.slice(5));
      reponse = Number.isInteger(id)
        ? await decideOrder(q, id, data.startsWith("o:ok:") ? "confirmee" : "annulee")
        : "";
    }
    await answerCallback(q.id, reponse || undefined);
  } catch (err) {
    console.error("[telegram] bouton non traité :", err);
    // Sans cette réponse, le bouton tourne indéfiniment sur le téléphone.
    await answerCallback(q.id, "فمّا مشكل، عاود");
  }
}
