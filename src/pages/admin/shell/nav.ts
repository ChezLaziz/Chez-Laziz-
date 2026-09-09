/** Navigation de l'admin, en deux groupes.
 *
 * PILOTAGE = comprendre le business (lecture).
 * GESTION  = agir dessus (commandes, catalogue, contenu).
 *
 * SIX PAGES, PAS QUATORZE. Un audit mené sur les chiffres réels — dix-huit
 * commandes en cinq jours, dix-huit clients dont aucun n'est revenu, cent
 * pour cent en espèces, zéro message — a montré que huit pages étaient
 * vides, redondantes ou structurellement muettes à ce volume :
 *
 *   Ventes        reprenait les quatre chiffres de la Vue d'ensemble ;
 *                 sa seule carte propre, « Commandes par jour », y a été
 *                 déplacée.
 *   Clients       « fidélité » sur cinq jours d'historique, zéro revenant.
 *   Produits      le même « CA par produit » qu'ailleurs.
 *   Géographie    le même tableau des gouvernorats qu'ailleurs.
 *   Rentabilité   aucun coût de revient saisi, et non souhaitée.
 *   Marketing     aucune commande avec une origine, aucune dépense.
 *   Intelligence  muette sous dix commandes par période ET par période
 *                 précédente ; ses signaux vivent déjà dans « À surveiller ».
 *   Réseaux       des abonnés à saisir à la main chaque mois : du travail
 *                 en plus, pour zéro relevé.
 *
 * Elles reviendront le jour où la donnée existera — git les garde. Une
 * page vide coûte plus qu'elle n'apporte : elle fait douter des pleines. */

export type NavId = 'apercu' | 'commandes' | 'catalogue' | 'messages' | 'contenu' | 'parametres'

export const NAV_GROUPS: { group: string; items: { id: NavId; label: string }[] }[] = [
  {
    group: 'Pilotage',
    items: [{ id: 'apercu', label: "Vue d'ensemble" }],
  },
  {
    group: 'Gestion',
    items: [
      { id: 'commandes', label: 'Commandes' },
      { id: 'catalogue', label: 'Catalogue & prix' },
      { id: 'messages', label: 'Messages' },
      { id: 'contenu', label: 'Contenu du site' },
      { id: 'parametres', label: 'Paramètres' },
    ],
  },
]

/** Pages qui montrent le sélecteur de période. Les pages de gestion ne le
 * montrent pas — filtrer un formulaire de réglages sur « 7 derniers jours »
 * n'aurait aucun sens. */
export const ANALYTICS_PAGES = new Set<NavId>(['apercu'])
