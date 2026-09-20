/** Couleurs et libellés partagés par les blocs du tableau de bord.
 *
 * Une seule définition : deux graphiques qui parlent des mêmes statuts
 * doivent les peindre de la même couleur, sinon la légende de l'un
 * contredit l'anneau de l'autre.
 *
 * La couleur ne sert qu'à porter du sens (un statut, une origine, une
 * variation) — jamais à décorer. */

/** Teintes de la charte du tableau de bord : vert profond « Tunisie » et
 * ses déclinaisons, plus l'or de la maison pour les compléments. */
export const DASH = {
  deep: '#2a4750',
  sage: '#86a09b',
  sageSoft: '#b9cbc4',
  sageFaint: '#dde7e2',
  gold: '#d3a24a',
  green: '#3aa163',
  red: '#c63c51',
  grey: '#d7d7d5',
  /** Fond des pastilles d'icône. */
  tile: '#eef1f2',
} as const

/** Palette d'une série (origines des commandes) : du plus foncé au plus
 * clair, pour que l'ordre de la légende se lise aussi sur l'anneau. */
export const SERIES_COLORS = [DASH.deep, DASH.sage, DASH.sageSoft, DASH.gold, DASH.sageFaint]

/** Statuts de commande : libellé et couleur, dans l'ordre du cycle de vie.
 *
 * Ce sont les cinq statuts que la base connaît et que le carnet de
 * commandes sait filtrer. L'anneau du tableau de bord en montre quatre
 * groupes (voir STATUS_GROUPS) — mais un clic ouvre bien la liste des
 * statuts réels du groupe, jamais une liste approchante. */
export const ORDER_STATUSES = [
  'terminee',
  'prete',
  'en_preparation',
  'nouvelle',
  'annulee',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** `label` compte des commandes (légende d'un anneau) ; `one` en qualifie
 * UNE (pastille d'une ligne de tableau). « Terminées » sur une seule
 * commande se lirait comme un total. */
export const STATUS_VIEW: Record<
  OrderStatus,
  { label: string; one: string; color: string; pill: string }
> = {
  terminee: {
    label: 'Terminées',
    one: 'Terminée',
    color: DASH.green,
    pill: 'bg-green-50 text-green-700 border-green-200',
  },
  prete: {
    label: 'Prêtes',
    one: 'Prête',
    color: DASH.sage,
    pill: 'bg-[#eef3f1] text-[#3f6158] border-[#cddbd6]',
  },
  en_preparation: {
    label: 'En préparation',
    one: 'En préparation',
    color: DASH.gold,
    pill: 'bg-[#fbf3e3] text-[#8a6a22] border-[#eddcb8]',
  },
  nouvelle: {
    label: 'Nouvelles',
    one: 'Nouvelle',
    color: DASH.grey,
    pill: 'bg-ink/[0.05] text-ink/60 border-ink/10',
  },
  annulee: {
    label: 'Annulées',
    one: 'Annulée',
    color: DASH.red,
    pill: 'bg-red-50 text-red-700 border-red-200',
  },
}

/** Libellé d'un statut inconnu de cette table (valeur ajoutée en base sans
 * passer ici) : on écrit la valeur brute plutôt que de la ranger d'office
 * dans un statut voisin. */
export function statusLabel(status: string, form: 'plural' | 'one' = 'plural'): string {
  const view = STATUS_VIEW[status as OrderStatus]
  if (!view) return status
  return form === 'one' ? view.one : view.label
}

/** Regroupement lisible pour l'anneau du tableau de bord.
 *
 * « En cours » réunit la préparation et les commandes prêtes : de
 * l'extérieur c'est le même moment — la commande est acceptée et pas encore
 * partie. Le groupe garde la LISTE de ses statuts pour que le clic ouvre
 * exactement ces commandes-là. */
export const STATUS_GROUPS: {
  key: string
  label: string
  statuses: OrderStatus[]
  color: string
}[] = [
  { key: 'terminees', label: 'Terminées', statuses: ['terminee'], color: DASH.green },
  { key: 'en_cours', label: 'En cours', statuses: ['en_preparation', 'prete'], color: DASH.gold },
  { key: 'en_attente', label: 'En attente', statuses: ['nouvelle'], color: DASH.grey },
  { key: 'annulees', label: 'Annulées', statuses: ['annulee'], color: DASH.red },
]

/** Origines des commandes — voir src/lib/attribution.ts pour la capture.
 *
 * « inconnue » n'est PAS « direct » : un référent masqué ou un lien non
 * étiqueté est une mesure manquante, pas une visite directe. Les confondre
 * ferait croire que la publicité n'amène personne. */
export const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  direct: 'Direct',
  autre: 'Autres',
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source
}
