import { useLocation } from 'react-router'

/** Pages disponibles en arabe (préfixe /ar) — la liste s'étend au fur et à
 * mesure des pages traduites. Le sélecteur de langue ne s'affiche que sur
 * ces pages ; ailleurs, le site reste français uniquement pour l'instant. */
export const BILINGUAL_BASE_PATHS = [
  '/',
  '/collection',
  '/commande',
  '/contact',
  '/faq',
  '/livraison',
  '/galerie',
  '/politique-de-confidentialite',
  '/conditions-generales',
  '/makroudh-tunisien',
  '/makroudh-kairouan',
  '/makroudh-aux-dattes',
  '/makroudh-fruits-secs',
  '/la-maison',
  '/journal',
  '/journal/quest-ce-que-le-makroudh-tunisien',
  '/journal/makroudh-kairouan-histoire-tradition',
  '/journal/comment-est-prepare-le-makroudh',
  '/journal/makroudh-vs-baklava-difference',
  '/journal/comment-choisir-son-makroudh',
  '/journal/duree-conservation-makroudh',
  '/journal/makroudh-idee-cadeau',
  '/journal/makroudh-el-louz-vs-traditionnel',
  '/journal/prix-makroudh-tunisie',
  '/journal/makroudh-tunisiens-etranger',
  '/journal/faq-makroudh',
  '/journal/pourquoi-kairouan-makroudh',
  '/journal/nouvelles-saveurs-makroudh-blanc',
] as const

export type Lang = 'fr' | 'ar'

export function langFromPathname(pathname: string): Lang {
  return pathname === '/ar' || pathname.startsWith('/ar/') ? 'ar' : 'fr'
}

/** Retire le préfixe /ar d'un chemin pour obtenir l'équivalent français
 * ("chemin de base"). `/ar` → `/`, `/ar/collection` → `/collection`. */
export function stripLangPrefix(pathname: string): string {
  if (pathname === '/ar') return '/'
  if (pathname.startsWith('/ar/')) return pathname.slice(3)
  return pathname
}

/** Construit le chemin équivalent dans l'autre langue, query string conservée. */
export function altLangPath(pathname: string, search: string, targetLang: Lang): string {
  const base = stripLangPrefix(pathname)
  const withLang = targetLang === 'ar' ? (base === '/' ? '/ar' : `/ar${base}`) : base
  return withLang + search
}

export function useLang(): Lang {
  const { pathname } = useLocation()
  return langFromPathname(pathname)
}

/** Vrai si la page courante existe dans les deux langues (voir
 * BILINGUAL_BASE_PATHS) — sert à savoir si le sélecteur de langue doit
 * s'afficher et vers quelle page il doit pointer. */
export function useIsBilingualPage(): boolean {
  const { pathname } = useLocation()
  const base = stripLangPrefix(pathname)
  return (BILINGUAL_BASE_PATHS as readonly string[]).includes(base)
}
