/** La trace de la DERNIÈRE commande envoyée, pour que l'écran « Merci,
 * commande n°X reçue » survive à un rechargement.
 *
 * LE GESTE QU'ON N'AVAIT PAS PRÉVU : sur un téléphone, tirer vers le bas
 * pour rafraîchir est un réflexe. L'écran de confirmation ne vivait que
 * dans la mémoire de l'onglet (un simple useState) et le panier venait
 * d'être vidé : après un rafraîchissement, la cliente retombait sur une
 * page de commande VIDE, sans numéro, sans récapitulatif, sans la moindre
 * preuve que sa commande était partie. Elle recommande — et le patron
 * reçoit deux fois la même chose — ou elle appelle, inquiète.
 *
 * On ne range ici QUE de quoi réafficher la confirmation : un numéro, un
 * montant, une adresse de livraison et l'heure. Ni téléphone, ni nom (ils
 * vivent déjà dans la mémoire client), ni contenu du panier ligne à ligne :
 * le détail se relit dans le message WhatsApp ou dans le carnet de
 * commandes du patron.
 *
 * ET ÇA PÉRIME. Une confirmation vieille de deux jours qui réapparaît à la
 * place de la boutique serait pire que l'oubli : la cliente croirait sa
 * NOUVELLE commande passée alors qu'elle n'a rien envoyé. Une heure suffit
 * largement à couvrir un rechargement, un retour arrière ou un onglet
 * recyclé par Android. */
export type LastOrder = {
  id: number;
  totalMillimes: number;
  /** Hors livraison, tel que le serveur l'a enregistré — jamais déduit du
   * total : le jour où les frais changent, une soustraction afficherait à
   * la cliente un sous-total que sa facture ne confirme pas. */
  subtotalMillimes: number;
  address: string;
  /** Millisecondes depuis epoch, à l'instant de l'envoi. */
  at: number;
};

export const LAST_ORDER_KEY = "cl.lastOrder.v1";

/** Au-delà, on n'affiche plus rien : voir le commentaire ci-dessus. */
export const LAST_ORDER_TTL_MS = 60 * 60 * 1000;

export function serializeLastOrder(o: LastOrder): string {
  return JSON.stringify(o);
}

/** Relit la trace, ou null si elle est absente, illisible, incomplète ou
 * périmée. Volontairement sévère : un objet à moitié valide réafficherait
 * une confirmation à trous (« commande n°NaN »), ce qui inquiète plus que
 * de ne rien montrer.
 *
 * `now` est passé par l'appelant pour que la règle reste testable sans
 * dépendre de l'horloge. */
export function parseLastOrder(raw: string | null, now: number): LastOrder | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  if (typeof o.id !== "number" || !Number.isFinite(o.id) || o.id <= 0) return null;
  if (typeof o.totalMillimes !== "number" || !Number.isFinite(o.totalMillimes)) return null;
  if (typeof o.subtotalMillimes !== "number" || !Number.isFinite(o.subtotalMillimes)) return null;
  if (typeof o.at !== "number" || !Number.isFinite(o.at)) return null;
  // Une trace datée du futur vient d'une horloge déréglée : on ne la croit
  // pas plus qu'une trace périmée.
  if (o.at > now) return null;
  if (now - o.at > LAST_ORDER_TTL_MS) return null;
  return {
    id: o.id,
    totalMillimes: o.totalMillimes,
    subtotalMillimes: o.subtotalMillimes,
    address: typeof o.address === "string" ? o.address : "",
    at: o.at,
  };
}
