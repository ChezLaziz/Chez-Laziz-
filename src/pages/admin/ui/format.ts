import { formatTND } from '@/lib/shop'

/** Montant en dinars AVEC séparateur de milliers : « 2 309,2 DT ».
 *
 * `formatTND` sert d'abord la boutique, où les montants dépassent rarement
 * trois chiffres ; le tableau de bord, lui, affiche des chiffres d'affaires
 * de plusieurs milliers de dinars, où « 2309,2 » se lit mal. On groupe donc
 * ici, sans toucher au formatage des prix du site.
 *
 * L'espace inséré est une espace fine INSÉCABLE : un retour à la ligne au
 * milieu d'un montant se lirait comme deux nombres. */
export function moneyDT(millimes: number): string {
  const raw = formatTND(millimes)
  const negative = raw.startsWith('-')
  const [intPart, decPart] = (negative ? raw.slice(1) : raw).split(',')
  const grouped = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${negative ? '-' : ''}${grouped}${decPart ? `,${decPart}` : ''}`
}
