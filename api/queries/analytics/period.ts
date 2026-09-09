/** Périodes du tableau de bord et comparaison « vs période précédente ».
 *
 * Une seule définition de période pour toutes les pages : sans cela, deux
 * pages affichant « 30 derniers jours » peuvent couvrir deux intervalles
 * différents et donner deux chiffres d'affaires différents pour le même mois. */

export { PRESET_RANGES, type PresetRange } from "@contracts/analytics";
import type { PresetRange } from "@contracts/analytics";

export type Period = {
  /** Inclus. */
  start: Date;
  /** Exclu — évite qu'une commande passée à 23:59:59.500 soit perdue. */
  end: Date;
};

export type PeriodPair = {
  current: Period;
  /** Période précédente de MÊME durée, contiguë. Comparer 7 jours à 30
   * jours produirait une variation qui ne veut rien dire. */
  previous: Period;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Nombre de jours couverts par un preset, aujourd'hui inclus. */
export function presetDays(preset: PresetRange): number {
  switch (preset) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

/** Période courante + période précédente équivalente, pour un preset. */
export function resolvePreset(preset: PresetRange, now = new Date()): PeriodPair {
  const days = presetDays(preset);
  const end = new Date(startOfDay(now).getTime() + DAY_MS); // fin de la journée en cours
  const start = new Date(end.getTime() - days * DAY_MS);
  return {
    current: { start, end },
    previous: { start: new Date(start.getTime() - days * DAY_MS), end: start },
  };
}

/** Période personnalisée (deux dates choisies par l'utilisateur). */
export function resolveCustom(startInput: Date, endInput: Date): PeriodPair {
  const start = startOfDay(startInput);
  const end = new Date(startOfDay(endInput).getTime() + DAY_MS);
  const span = Math.max(end.getTime() - start.getTime(), DAY_MS);
  return {
    current: { start, end },
    previous: { start: new Date(start.getTime() - span), end: start },
  };
}

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
