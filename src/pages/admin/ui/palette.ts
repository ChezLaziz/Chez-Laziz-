/** Couleurs et libellés partagés par les blocs du tableau de bord.
 *
 * Une seule définition : deux graphiques qui parlent des mêmes statuts
 * doivent les peindre de la même couleur, sinon la légende de l'un
 * contredit la barre de l'autre.
 *
 * La couleur ne sert qu'à porter du sens (un statut, une origine, une
 * variation) — jamais à décorer. */

/** Teintes du tableau de bord.
 *
 * UNE couleur pour les mesures (le vert profond), quatre pour les états.
 * Les quatre ont été passées au contrôle des couleurs de graphique : elles
 * restent distinctes pour un œil daltonien (écart ≥ 15 entre voisines, là où
 * l'ancien vert et l'ancien or tombaient à 6,5) et aucune n'est un gris, qui
 * se lisait « pas de donnée » plutôt que « en attente ».
 *
 * Chaque état porte la même teinte que dans le carnet de commandes : or pour
 * une commande nouvelle, bleu pour une commande en préparation, vert pour
 * une commande terminée. Seule l'annulation diffère, et c'est voulu : dans
 * le carnet c'est une ligne éteinte (gris), ici c'est une perte (rouge). */
export const DASH = {
  deep: '#2a4750',
  /** Barres secondaires et pistes de fond. */
  track: '#eeebe6',
  gold: '#d99a26',
  green: '#237a52',
  red: '#c4384d',
  blue: '#4a80c8',
  grey: '#b9b6b0',
} as const

/** Statuts de commande : libellé et couleur, dans l'ordre du cycle de vie.
 *
 * Ce sont les cinq statuts que la base connaît et que le carnet de
 * commandes sait filtrer. La barre du tableau de bord en montre quatre
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

/** `label` compte des commandes (légende de la barre des statuts) ; `one` en qualifie
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
    color: DASH.blue,
    pill: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  en_preparation: {
    label: 'En préparation',
    one: 'En préparation',
    color: DASH.blue,
    pill: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  nouvelle: {
    label: 'Nouvelles',
    one: 'Nouvelle',
    color: DASH.gold,
    pill: 'bg-[#b8912e]/10 text-[#8a5527] border-[#b8912e]/40',
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

/** Regroupement lisible pour la barre des statuts du tableau de bord.
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
  { key: 'en_cours', label: 'En cours', statuses: ['en_preparation', 'prete'], color: DASH.blue },
  { key: 'en_attente', label: 'En attente', statuses: ['nouvelle'], color: DASH.gold },
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
