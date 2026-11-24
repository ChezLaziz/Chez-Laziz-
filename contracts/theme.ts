/** Le thème d'une page, d'après son adresse.
 *
 * La boutique est sombre. L'administration et l'écran de l'atelier sont des
 * outils de travail, lus en plein jour et remplis de tableaux : ils restent
 * clairs. Les couleurs elles-mêmes sont dans src/index.css (:root pour le
 * sombre, [data-theme='clair'] pour le clair).
 *
 * index.html applique la MÊME règle dans un script en ligne, pour que la
 * bonne couleur soit là dès le premier pixel — avant que ce fichier ne soit
 * chargé. Les deux copies ne peuvent pas diverger sans que le test
 * theme.test.ts échoue. */
export type Theme = "sombre" | "clair";

/** Les adresses qui restent claires. */
export const CHEMINS_CLAIRS = /^\/(admin|atelier)(\/|$)/;

export function themeForPath(pathname: string): Theme {
  return CHEMINS_CLAIRS.test(pathname) ? "clair" : "sombre";
}
