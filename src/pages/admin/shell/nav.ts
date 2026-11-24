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

export type NavId =
  | 'apercu'
  | 'commandes'
  | 'suivi'
  | 'jetpack'
  | 'offres'
  | 'catalogue'
  | 'messages'
  | 'contenu'
  | 'parametres'

export const NAV_GROUPS: { group: string; items: { id: NavId; label: string }[] }[] = [
  {
    group: 'Pilotage',
    items: [{ id: 'apercu', label: 'Tableau de bord' }],
  },
  {
    group: 'Gestion',
    items: [
      { id: 'commandes', label: 'Commandes' },
      // Une septième page, et ce n'est pas l'ancienne « Clients » qui
      // revient : pas de statistiques de fidélité, une liste courte de colis
      // livrés dont personne n'a pris de nouvelles. Vide, elle ne veut pas
      // dire « aucune donnée » mais « tout le monde a eu son message » —
      // voir contracts/suiviLivraison.ts.
      { id: 'suivi', label: 'Suivi des colis' },
      // La seule page qui gagne sa place après l'audit « six pages » : remettre
      // les commandes à Jetpack. Leur plateforme n'ouvre aucun accès marchand
      // (voir contracts/carriers.ts) ; leur import CSV est la seule voie réelle,
      // et l'export générique ne s'y importait pas — colonnes à nous, pas au
      // gabarit de Jetpack. Ici on coche et on télécharge au FORMAT de Jetpack.
      { id: 'jetpack', label: 'Jetpack' },
      // Les clientes qui ont demandé, en commandant, à recevoir les offres
      // sur WhatsApp — et elles seules. Voir contracts/offres.ts.
      { id: 'offres', label: 'Offres WhatsApp' },
      { id: 'catalogue', label: 'Produits' },
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
