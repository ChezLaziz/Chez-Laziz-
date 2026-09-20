/** Vocabulaire de période partagé entre le client et le serveur.
 *
 * Défini ici pour que l'admin et l'API ne puissent pas diverger : si le
 * client propose « 90 jours » et que le serveur ne connaît pas ce preset,
 * l'utilisateur voit un chiffre pour une période qu'il n'a pas demandée.
 *
 * Le CALCUL des bornes vit ici lui aussi, et non plus seulement côté
 * serveur : le sélecteur de dates affiche « du 1er au 10 septembre », et
 * ces deux dates doivent être exactement celles que le serveur utilisera
 * pour agréger. Deux implémentations, même de trois lignes, finissent par
 * se décaler d'un jour — et le tableau de bord afficherait alors une
 * période et compterait l'autre. */
export const PRESET_RANGES = ["today", "7d", "15d", "30d", "90d"] as const;
export type PresetRange = (typeof PRESET_RANGES)[number];

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
    case "15d":
      return 15;
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

/** Dernier jour RÉELLEMENT couvert par une période.
 *
 * `end` est exclusive : l'afficher telle quelle annoncerait « jusqu'au 20 »
 * pour une période qui s'arrête le 19 au soir. */
export function lastDayOf(period: Period): Date {
  return new Date(period.end.getTime() - DAY_MS);
}
