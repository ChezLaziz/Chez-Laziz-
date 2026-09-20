/** Périodes du tableau de bord et comparaison « vs période précédente ».
 *
 * Une seule définition de période pour toutes les pages : sans cela, deux
 * pages affichant « 30 derniers jours » peuvent couvrir deux intervalles
 * différents et donner deux chiffres d'affaires différents pour le même mois.
 *
 * Le calcul des bornes est remonté dans `@contracts/analytics` : le
 * sélecteur de dates de l'admin affiche les jours couverts, et il doit lire
 * la MÊME fonction que celle qui agrège ici. Ce module garde ce qui ne sert
 * qu'au serveur (découpage en jours) et réexporte le reste, pour que les
 * appelants existants n'aient rien à changer. */

export {
  PRESET_RANGES,
  presetDays,
  resolveCustom,
  resolvePreset,
  lastDayOf,
  type Period,
  type PeriodPair,
  type PresetRange,
} from "@contracts/analytics";

import type { Period } from "@contracts/analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jours de la période, du plus ancien au plus récent, en clés `YYYY-MM-DD`.
 *
 * Sert à remplir les jours sans vente avec 0 : sans cela une courbe de CA
 * saute les jours creux et donne l'illusion d'une activité continue. */
export function daysInPeriod(period: Period): string[] {
  const out: string[] = [];
  for (let t = period.start.getTime(); t < period.end.getTime(); t += DAY_MS) {
    out.push(dayKey(new Date(t)));
  }
  return out;
}

/** Clé de jour en heure LOCALE du serveur.
 *
 * Volontairement pas `toISOString()` : celui-ci découpe les jours en UTC,
 * si bien qu'une commande passée à 00:30 à Tunis était comptée la veille et
 * que le total « aujourd'hui » ne correspondait pas à la dernière barre du
 * graphique. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
