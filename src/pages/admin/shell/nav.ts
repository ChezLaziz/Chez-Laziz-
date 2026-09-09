/** Navigation de l'admin, en deux groupes.
 *
 * PILOTAGE = comprendre le business (lecture, analytique).
 * GESTION  = agir dessus (commandes, catalogue, contenu).
 *
 * Les deux étaient mélangés dans une seule barre d'onglets : « Vue
 * d'ensemble » et « Paramètres » côte à côte, alors qu'on ne les ouvre pas
 * dans le même état d'esprit.
 *
 * Absents volontairement : Marketing (attribution) et Tunnel. Les données
 * qui les alimenteraient — source d'acquisition, dépense publicitaire,
 * identifiant de session — ne sont collectées nulle part. Quatre pages vides coûtent plus qu'elles
 * n'apportent ; elles reviendront quand la donnée existera. */

export type NavId =
  | 'apercu'
  | 'ventes'
  | 'clients'
  | 'produits'
  | 'geographie'
  | 'rentabilite'
  | 'inventaire'
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
      { id: 'inventaire', label: 'Inventaire' },
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
      // d'abonnés saisis à la main, pas une attribution publicitaire. Le mot
      // « Marketing » laisserait croire à un ROAS qu'on ne sait pas calculer.
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
  'inventaire',
  'intelligence',
])
