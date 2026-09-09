import { CUSTOM_PACK_SIZE } from "./packs";

/** Les seuls refus que le serveur explique au client.
 *
 * DEUX PROBLÈMES RÉELS ONT MENÉ ICI.
 *
 * 1. Ce que le serveur renvoyait était du français, montré tel quel à un
 *    client arabophone au moment précis où il valide sa commande.
 * 2. Le filtre côté navigateur écartait les messages « techniques » par
 *    liste NOIRE. Tout ce qu'elle n'avait pas prévu passait : une page
 *    d'erreur HTML du proxy, une réponse 429 hors format tRPC ou une panne
 *    de transformation donnaient au client « Unable to transform response
 *    from server ». Constaté en pilotant un vrai navigateur, pas déduit.
 *
 * D'où une liste BLANCHE : le serveur envoie un jeton, le navigateur le
 * traduit. Un jeton inconnu — donc n'importe quelle panne d'infrastructure —
 * devient le message générique, dans la langue du client. Rien d'autre ne
 * peut atteindre l'écran.
 *
 * Le jeton reste lisible dans les journaux du serveur : c'est voulu. */
export const ORDER_ERROR = {
  produitIndisponible: "CL_produit_indisponible",
  packIndisponible: "CL_pack_indisponible",
  customPackTaille: "CL_custom_pack_taille",
  preuveD17Requise: "CL_preuve_d17_requise",
  delegationHorsGouvernorat: "CL_delegation_hors_gouvernorat",
  tropDeRequetes: "CL_trop_de_requetes",
} as const;

export type OrderErrorToken = (typeof ORDER_ERROR)[keyof typeof ORDER_ERROR];

const MESSAGES: Record<OrderErrorToken, { fr: string; ar: string }> = {
  [ORDER_ERROR.produitIndisponible]: {
    fr: "Un produit de votre commande n'est plus disponible. Retirez-le ou appelez-nous.",
    ar: "أحد منتجات طلبكم لم يعد متوفّرًا. أزيلوه أو اتصلوا بنا.",
  },
  [ORDER_ERROR.packIndisponible]: {
    fr: "Ce pack n'est plus disponible. Choisissez-en un autre ou appelez-nous.",
    ar: "هذه الحزمة لم تعد متوفّرة. اختاروا غيرها أو اتصلوا بنا.",
  },
  [ORDER_ERROR.customPackTaille]: {
    fr: `Votre pack sur mesure doit contenir exactement ${CUSTOM_PACK_SIZE} produits différents.`,
    ar: `حزمتكم الخاصة لازم تحتوي على ${CUSTOM_PACK_SIZE} منتجات مختلفة بالضبط.`,
  },
  [ORDER_ERROR.preuveD17Requise]: {
    fr: "Joignez la capture d'écran de votre paiement D17 pour valider la commande.",
    ar: "أرفقوا صورة دفع D17 لتأكيد الطلب.",
  },
  [ORDER_ERROR.delegationHorsGouvernorat]: {
    fr: "La délégation choisie n'appartient pas à ce gouvernorat. Choisissez-la à nouveau.",
    ar: "المعتمدية المختارة ما تنتميش لهذه الولاية. اختاروها من جديد.",
  },
  [ORDER_ERROR.tropDeRequetes]: {
    fr: "Trop de demandes en même temps. Patientez quelques secondes et réessayez.",
    ar: "طلبات كثيرة في نفس الوقت. استنّوا شويّة وأعيدوا المحاولة.",
  },
};

function isToken(value: string): value is OrderErrorToken {
  return Object.prototype.hasOwnProperty.call(MESSAGES, value);
}

/** Le message à afficher, dans la langue du client.
 *
 * `fallback` sert à tout le reste : panne, bug, message inconnu. Le client
 * ne doit jamais lire autre chose que l'un de ces textes. */
export function orderErrorMessage(
  raw: string | undefined,
  lang: "fr" | "ar",
  fallback: string,
): string {
  if (!raw) return fallback;
  const token = raw.trim();
  return isToken(token) ? MESSAGES[token][lang] : fallback;
}
