/** Le message WhatsApp de confirmation, écrit à la place de celle qui appelle.
 *
 * POURQUOI. Sur 81 commandes annulées, 38 portent la raison « ما جابش
 * تليفون » : le client n'a pas décroché. Presque une annulation sur deux, et
 * une commande sur douze. Ces gens-là ont rempli le formulaire jusqu'au bout
 * — ils voulaient le makroudh. Ils n'ont simplement pas répondu à un numéro
 * inconnu, ce que plus personne ne fait.
 *
 * Un message WhatsApp, lui, se lit. Mais l'écrire à la main, sur un
 * téléphone, pour chaque commande, personne ne le fait : il faut retrouver le
 * numéro, le montant, le prénom. Ce module le prépare, et le groupe Telegram
 * l'ouvre en un geste (voir api/lib/telegram.ts) : il ne reste qu'à appuyer
 * sur « envoyer ».
 *
 * RIEN NE PART TOUT SEUL. C'est un lien wa.me : il ouvre la conversation
 * avec le texte déjà saisi, et un humain l'envoie. Le site n'écrit jamais au
 * client de lui-même.
 *
 * Le texte est en tunisien, neutre sur le moment où on l'envoie : il sert
 * aussi bien avant d'appeler qu'après un appel resté sans réponse. */

import { formatDinars } from "./shop";
import { tunisianLocalPhone } from "./phone";
import { prenomPourSaluer } from "./prenom";

export type ConfirmableOrder = {
  id: number;
  customerName: string;
  phone: string;
  totalMillimes: number;
};

export function orderConfirmMessage(order: ConfirmableOrder): string {
  // Rien si le champ commence par un titre, une particule ou un chiffre :
  // on salue alors sans nom plutôt que d'écrire « عسلامة Mme » ou
  // « عسلامة 12345 ». Voir contracts/prenom.ts.
  const p = prenomPourSaluer(order.customerName);
  return [
    `عسلامة${p ? ` ${p}` : ""} 👋 معاك Chez Laziz.`,
    `وصلتنا طلبيتك رقم ${order.id} (${formatDinars(order.totalMillimes)} د.ت، الدفع عند التوصيل).`,
    `نحبّو نأكّدوها معاك قبل ما نبعثوها: جاوبنا بـ «نعم» وتوصلك في 24 ساعة.`,
  ].join("\n");
}

/** Lien wa.me vers le CLIENT, message compris — ou `null` si son numéro
 * n'est pas un numéro tunisien exploitable (mieux vaut pas de bouton qu'un
 * bouton qui ouvre la conversation d'un inconnu). */
export function orderConfirmWhatsAppUrl(order: ConfirmableOrder): string | null {
  const local = tunisianLocalPhone(order.phone);
  if (!local) return null;
  return `https://wa.me/216${local}?text=${encodeURIComponent(orderConfirmMessage(order))}`;
}
