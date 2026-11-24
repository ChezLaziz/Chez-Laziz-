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
//   — du POIDS EN MOINS (une commande marquée livrée ou annulée, un appui sur
//     « تم » ou « رجوع ») : on modifie le message sur place, sans bruit.
//     Personne n'a besoin d'être réveillé pour apprendre qu'il y a moins à
//     faire.
//
// Le calcul lui-même est ailleurs, sans base ni réseau : contracts/kitchenBoard.ts.

import {
  formatKitchenBoard,
  kitchenKeyboard,
  parseKitchenCallback,
} from "@contracts/kitchenBoard";
import {
  currentKitchenBoard,
  markKitchenDone,
  readKitchenBoardMessageId,
  undoKitchenDone,
  writeKitchenBoardMessageId,
} from "../queries/kitchen";
import {
  deleteMessage,
  editMessage,
  isTelegramConfigured,
  pinMessage,
  sendMessage,
  unpinMessage,
} from "./telegram";

/** Ce que devient un tableau qui n'est plus LE tableau : une ligne, plus de
 * chiffres, plus de boutons. */
export const VIEUX_TABLEAU = "🍳 جدول قديم — شوف الجدول الجديد المثبّت.";

/** Réaffiche le tableau. `annonce` = il y a du poids en plus, il faut que ça
 * sonne. Ne lève jamais : un tableau non rafraîchi ne doit jamais faire
 * échouer la confirmation d'une commande.
 *
 * UN SEUL rafraîchissement à la fois. Trois confirmations d'affilée sur le
 * tableau de bord lançaient trois « lire l'ancien, le supprimer, envoyer le
 * neuf » entrelacés : deux lisaient le même ancien identifiant, et l'un des
 * deux nouveaux tableaux restait orphelin dans le groupe, avec de vieux
 * poids et des boutons qui marchaient encore.
 *
 * ET PAS UN PAR COMMANDE. La boutique marque ses livraisons par lots — vingt
 * commandes passées à « terminée » en une minute — et chacune fait maintenant
 * bouger le tableau. Vingt modifications d'un même message en rafale, c'est
 * ce que Telegram refuse (429), et un refus ici fait renvoyer le tableau, qui
 * sonne. Un rafraîchissement déjà en file et pas encore commencé lira de
 * toute façon l'état le plus récent : les demandes suivantes s'y joignent au
 * lieu de s'empiler. Vingt commandes, deux écritures. */
let file: Promise<void> = Promise.resolve();
let enAttente: { annonce: boolean; tour: Promise<void> } | null = null;

/** Combien de temps on laisse un lot se finir avant de corriger le tableau. */
export const DELAI_LOT_MS = 4000;
let minuterie: ReturnType<typeof setTimeout> | null = null;

/** Du poids EN MOINS, et rien ne presse : le tableau sera corrigé dans
 * quelques secondes, une seule fois pour tout ce qui aura bougé d'ici là.
 *
 * La boutique ferme ses commandes par lots — une vingtaine de « Terminée »
 * cliquées à la suite, à deux ou trois secondes d'intervalle. Corriger le
 * message à chaque clic, c'est vingt modifications du même message en une
 * minute : Telegram finit par en refuser une (429), le refus est pris pour
 * un message disparu, et le tableau est renvoyé — il sonne, pour annoncer
 * qu'il y a MOINS à faire. Personne n'attend ce chiffre à la seconde. */
export function refreshKitchenBoardSoon(): void {
  if (minuterie) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    void refreshKitchenBoard(false);
  }, DELAI_LOT_MS);
  // Ne retient pas le processus : un serveur qui s'arrête n'attend pas un
  // tableau — il sera remis d'accord au redémarrage.
  minuterie.unref?.();
}

export function refreshKitchenBoard(annonce: boolean): Promise<void> {
  // Ce rafraîchissement-ci lira l'état le plus récent : celui qui attendait
  // son heure n'a plus rien à ajouter.
  if (minuterie) {
    clearTimeout(minuterie);
    minuterie = null;
  }
  if (enAttente) {
    // Une seule des demandes regroupées apporte du poids : le tout sonne.
    enAttente.annonce ||= annonce;
    return enAttente.tour;
  }
  const ticket = { annonce, tour: Promise.resolve() };
  ticket.tour = file.then(() => {
    // À partir d'ici il lit la base : une demande qui arrive maintenant
    // pourrait porter un changement qu'il ne verra pas. Elle ouvre donc un
    // nouveau tour, qui passera après celui-ci.
    enAttente = null;
    return rafraichir(ticket.annonce);
  });
  enAttente = ticket;
  file = ticket.tour.catch(() => undefined);
  return ticket.tour;
}

async function rafraichir(annonce: boolean): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    const [tableau, ancien] = await Promise.all([
      currentKitchenBoard(),
      readKitchenBoardMessageId(),
    ]);
    const texte = formatKitchenBoard(tableau);
    const clavier = kitchenKeyboard(tableau);
    const vide = tableau.sections.length === 0;

    if (!annonce && ancien !== null) {
      if (await editMessage(ancien, texte, clavier)) return;
      // Le message a disparu (supprimé à la main) — on en refait un.
    }
    // Rien à préparer et aucun tableau affiché : pas la peine de sonner pour
    // annoncer qu'il n'y a rien.
    if (annonce === false && ancien === null && vide) return;

    const supprime = ancien === null || (await deleteMessage(ancien));
    if (ancien !== null && !supprime) {
      // Telegram ne laisse pas supprimer un message de plus de 48 heures —
      // et après deux jours sans commande confirmée, c'est le cas du tableau.
      // Le laisser tel quel, c'était garder en haut du groupe un tableau
      // épinglé aux chiffres périmés, à côté du nouveau. On ne peut pas
      // l'enlever : on lui retire ses chiffres, ses boutons et son épingle.
      await editMessage(ancien, VIEUX_TABLEAU);
      await unpinMessage(ancien);
    }
    const envoye = await sendMessage(texte, clavier);
    if (envoye) {
      await writeKitchenBoardMessageId(envoye.message_id);
      // Épinglé : le cuisinier retrouve le tableau en haut du groupe sans
      // remonter les messages de la journée. Le message vient d'arriver, il
      // a déjà sonné — l'épinglage lui-même reste silencieux.
      await pinMessage(envoye.message_id);
    } else if (ancien !== null && supprime) {
      // L'ancien est parti et rien ne l'a remplacé : il n'y a plus de
      // tableau, on le note pour ne pas modifier un message qui n'existe plus.
      await writeKitchenBoardMessageId(null);
    }
    // Sinon l'ancien message existe toujours : on GARDE son identifiant. Un
    // envoi refusé (Telegram saturé, coupure) ne doit pas faire oublier le
    // tableau — le prochain rafraîchissement le réécrira sur place.
  } catch (err) {
    console.error("[kitchen] tableau non rafraîchi :", err);
  }
}

/** « تم » sur une section du tableau. Retourne le texte court affiché sur le
 * téléphone de qui a appuyé.
 *
 * `messageId` = le message dont vient l'appui. S'il ne porte pas un bouton
 * d'aujourd'hui, c'est un vieux tableau resté plus haut dans la conversation
 * (ceux d'avant ce changement avaient un bouton par parfum) : on ne devine
 * pas ce qu'il voulait dire, on lui retire ses boutons et on renvoie vers le
 * tableau en cours. */
export async function applyKitchenDone(data: string, messageId?: number): Promise<string> {
  const bouton = parseKitchenCallback(data);
  if (!bouton) {
    const actuel = await readKitchenBoardMessageId();
    if (messageId && messageId !== actuel) {
      await editMessage(messageId, VIEUX_TABLEAU);
      await unpinMessage(messageId);
    }
    await refreshKitchenBoard(false);
    return "الجدول تبدّل، شوف الجديد";
  }
  const resultat = await markKitchenDone(bouton.kind, bouton.day, bouton.stamp);
  await refreshKitchenBoard(false);
  return resultat === "ok" ? "✅ تسجّل" : "الجدول تبدّل، عاود شوف واضغط";
}

/** Défaire le dernier « تم » — le bouton appuyé par erreur. */
export async function applyKitchenUndo(): Promise<string> {
  if (!(await undoKitchenDone())) return "ما فماش شي نرجّعوه";
  await refreshKitchenBoard(false);
  return "↩️ رجّعناه";
}
