/** Une étiquette de lien (`utm_campaign`, `utm_content`) telle qu'on a le
 * droit de la garder.
 *
 * ELLE VIENT D'UNE URL, DONC DE N'IMPORTE QUI. Un lien fabriqué avec
 * « ?utm_content=%00 » posait un caractère nul dans l'étiquette ; le
 * navigateur la gardait pour la session, l'envoyait avec la commande, et
 * Postgres — qui refuse ce caractère dans un texte — rejetait la commande
 * ENTIÈRE. Quiconque partageait un tel lien empêchait de commander tous
 * ceux qui cliquaient dessus, avec pour seul message « réessayez ».
 * Constaté sur la copie locale, pas déduit.
 *
 * Donc : ni caractère de contrôle, ni espace autour, ni moitié d'emoji en
 * bout de coupe (voir demiCaracteres.ts — même cause, même effet). La même
 * fonction sert au navigateur, à la commande et au compteur de visites :
 * c'est ce qui garantit que les trois parlent de la même étiquette. */

import { sansDemiCaracteres } from "./demiCaracteres";

/** La longueur de la colonne (`acquisition_campaign`, `acquisition_content`). */
export const ETIQUETTE_LONGUEUR_MAX = 120;

// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u001f\u007f-\u009f]/g;

/** Rend une chaîne vide quand il ne reste rien : à l'appelant d'en faire
 * « pas d'étiquette ». Stable — nettoyer deux fois ne change plus rien. */
export function etiquettePropre(brut: string | null | undefined): string {
  if (typeof brut !== "string") return "";
  const sansControle = brut.replace(CONTROLE, "").trim();
  return sansDemiCaracteres(sansControle.slice(0, ETIQUETTE_LONGUEUR_MAX)).trim();
}
