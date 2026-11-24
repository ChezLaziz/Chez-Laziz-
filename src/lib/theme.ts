import { themeForPath, type Theme } from '@contracts/theme'

export { themeForPath }
export type { Theme }

/** Pose le thème sur <html> : c'est là que le lisent le fond de page, les
 * menus natifs (color-scheme) et tout ce qui s'affiche hors de #root. La
 * règle elle-même est dans contracts/theme.ts. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'clair') root.setAttribute('data-theme', 'clair')
  else root.removeAttribute('data-theme')
}
