import { NETWORKS } from '@contracts/social'

/** Libellés et couleurs des origines de commande.
 *
 * Partagés par la répartition d'acquisition et la vue publicité : deux
 * fichiers auraient fini par nommer ou colorer TikTok différemment sur la
 * même page. */
export const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  direct: 'Direct',
  autre: 'Autre',
}

/** Couleurs de série validées (voir contracts/social.ts). Direct et Autre
 * sont volontairement neutres : ce ne sont pas des plateformes, et leur
 * donner une couleur vive les ferait lire comme un canal à travailler. */
export const SOURCE_COLOR: Record<string, string> = {
  instagram: NETWORKS.instagram.color,
  facebook: NETWORKS.facebook.color,
  tiktok: NETWORKS.tiktok.color,
  google: NETWORKS.google.color,
  direct: '#9c9490',
  autre: '#c4bdb6',
}

/** Plateformes sur lesquelles une dépense peut être saisie — miroir de
 * SPEND_SOURCES côté serveur. `direct` en est absent : on n'achète pas du
 * trafic direct. */
export const SPEND_SOURCE_OPTIONS = ['instagram', 'facebook', 'tiktok', 'google', 'autre'] as const
export type SpendSourceOption = (typeof SPEND_SOURCE_OPTIONS)[number]

/** `YYYY-MM` du mois local en cours. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** « septembre 2026 » à partir de `2026-09`. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
