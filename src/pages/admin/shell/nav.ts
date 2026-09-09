/** Navigation de l'admin, en deux groupes.
 *
 * PILOTAGE = comprendre le business (lecture, analytique).
 * GESTION  = agir dessus (commandes, catalogue, contenu).
 *
 * Les deux étaient mélangés dans une seule barre d'onglets : « Vue
 * d'ensemble » et « Paramètres » côte à côte, alors qu'on ne les ouvre pas
 * dans le même état d'esprit.
 *
 * Absent volontairement : Tunnel de vente. Ce qui l'alimenterait — un
 * identifiant de session, un ajout au panier enregistré côté serveur — n'est
 * collecté nulle part. Une page vide coûte plus qu'elle n'apporte ; elle
 * reviendra quand la donnée existera.
 *
 * Marketing, lui, a désormais de quoi vivre : l'origine des commandes est
 * captée (src/lib/attribution.ts) et la dépense publicitaire est saisie à la
 * main (table ad_spend). Rien n'y est calculé sans montant réel. */

export type NavId =
  | 'apercu'
  | 'ventes'
  | 'clients'
  | 'produits'
  | 'geographie'
  | 'rentabilite'
  | 'marketing'
  | 'intelligence'
  | 'commandes'
  | 'catalogue'
  | 'messages'
  | 'reseaux'
  | 'contenu'
  | 'parametres'

export const NAV_GROUPS: { group: string; items: { id: NavId; label: string }[] }[] = [
  {
    group: 'Pilotage',
    items: [
      { id: 'apercu', label: "Vue d'ensemble" },
      { id: 'ventes', label: 'Ventes' },
      { id: 'clients', label: 'Clients' },
      { id: 'produits', label: 'Produits' },
      { id: 'geographie', label: 'Géographie' },
      { id: 'rentabilite', label: 'Rentabilité' },
      { id: 'marketing', label: 'Marketing' },
      { id: 'intelligence', label: 'Intelligence' },
    ],
  },
  {
    group: 'Gestion',
    items: [
      { id: 'commandes', label: 'Commandes' },
      { id: 'catalogue', label: 'Catalogue & prix' },
      { id: 'messages', label: 'Messages' },
      // Nommé « Réseaux sociaux » et non « Marketing » : ce sont des nombres
      // d'abonnés saisis à la main. L'attribution des commandes et le retour
      // sur dépense vivent dans la page Marketing, qui est une lecture ;
      // celle-ci est une saisie.
      { id: 'reseaux', label: 'Réseaux sociaux' },
      { id: 'contenu', label: 'Contenu du site' },
      { id: 'parametres', label: 'Paramètres' },
    ],
  },
]

/** Pages analytiques : elles partagent le sélecteur de période global. Les
 * pages de gestion ne le montrent pas — filtrer un formulaire de réglages
 * sur « 7 derniers jours » n'aurait aucun sens. */
export const ANALYTICS_PAGES = new Set<NavId>([
  'apercu',
  'ventes',
  'clients',
  'produits',
  'geographie',
  'rentabilite',
  'marketing',
  'intelligence',
])
