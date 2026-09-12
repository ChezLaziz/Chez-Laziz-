// Le tableau du matbakh dans le groupe Telegram.
//
// UN SEUL message vit dans le groupe : « voilà ce qui reste à cuire ». Il ne
// s'empile pas, il se remplace. Deux façons de le mettre à jour, et la
// différence compte :
//
//   — du POIDS EN PLUS (une commande vient d'être confirmée) : on supprime
//     l'ancien tableau et on en envoie un neuf. Il redescend en bas de la
//     conversation ET il sonne — sinon le cuisinier ne saurait pas qu'il y a
//     du nouveau ;
//   — un APPUI SUR UN BOUTON (« تم », « رجوع ») : on modifie le message sur
//     place, sans bruit. Celui qui a appuyé regarde déjà l'écran.
//
// Le calcul lui-même est ailleurs, sans base ni réseau : contracts/kitchenBoard.ts.

import { ackKitchen, formatKitchenBoard, kitchenKeyboard, undoKitchen } from "@contracts/kitchenBoard";
import {
  currentKitchenLines,
  getConfirmedKitchenTotals,
  loadKitchenAck,
  readKitchenAck,
  readKitchenBoardMessageId,
  writeKitchenAck,
  writeKitchenBoardMessageId,
} from "../queries/kitchen";
import {
  deleteMessage,
  editMessage,
  isTelegramConfigured,
  pinMessage,
  sendMessage,
} from "./telegram";

/** Le point de départ du tableau : tout ce qui est DÉJÀ confirmé aujourd'hui
 * est réputé cuit.
 *
 * APPELÉ AU DÉMARRAGE DU SERVEUR, et c'est tout l'intérêt du moment choisi :
 * si on attendait la première confirmation pour poser ce point de départ,
 * cette commande-là ferait partie de l'historique et serait avalée. La
 * cuisine ne verrait jamais la première commande. */
export async function ensureKitchenBaseline(): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    await loadKitchenAck(await getConfirmedKitchenTotals());
  } catch (err) {
    console.error("[kitchen] point de départ non posé :", err);
  }
}

/** Réaffiche le tableau. `annonce` = il y a du poids en plus, il faut que ça
 * sonne. Ne lève jamais : un tableau non rafraîchi ne doit jamais faire
 * échouer la confirmation d'une commande. */
export async function refreshKitchenBoard(annonce: boolean): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    const [{ lines: lignes, canUndo }, ancien] = await Promise.all([
      currentKitchenLines(),
      readKitchenBoardMessageId(),
    ]);
    const texte = formatKitchenBoard(lignes);
    const clavier = kitchenKeyboard(lignes, canUndo);

    if (!annonce && ancien !== null) {
      if (await editMessage(ancien, texte, clavier)) return;
      // Le message a disparu (supprimé à la main) — on en refait un.
    }
    // Rien à préparer et aucun tableau affiché : pas la peine de sonner pour
    // annoncer qu'il n'y a rien.
    if (annonce === false && ancien === null && lignes.length === 0) return;

    if (ancien !== null) await deleteMessage(ancien);
    const envoye = await sendMessage(texte, clavier);
    await writeKitchenBoardMessageId(envoye?.message_id ?? null);
    // Épinglé : le cuisinier retrouve le tableau en haut du groupe sans
    // remonter les messages de la journée. Le message vient d'arriver, il a
    // déjà sonné — l'épinglage lui-même reste silencieux.
    if (envoye) await pinMessage(envoye.message_id);
  } catch (err) {
    console.error("[kitchen] tableau non rafraîchi :", err);
  }
}

/** « تم » sur un type : ce qui est confirmé à cet instant est cuit.
 * Retourne le texte court affiché sur le téléphone de qui a appuyé. */
export async function applyKitchenAck(key: string): Promise<string> {
  const confirmed = await getConfirmedKitchenTotals();
  const ack = await loadKitchenAck(confirmed);
  await writeKitchenAck(ackKitchen(ack, confirmed, key));
  await refreshKitchenBoard(false);
  return "✅ تسجّل";
}

/** Défaire le dernier « تم » — le bouton appuyé par erreur. */
export async function applyKitchenUndo(): Promise<string> {
  const ack = await readKitchenAck();
  if (!ack?.last) return "ما فماش شي نرجّعوه";
  await writeKitchenAck(undoKitchen(ack));
  await refreshKitchenBoard(false);
  return "↩️ رجّعناه";
}
