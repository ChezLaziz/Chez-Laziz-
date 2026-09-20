import { lastDayOf, resolvePreset, type PresetRange } from '@contracts/analytics'

/** Période affichée par le tableau de bord.
 *
 * `preset` non nul = période glissante (« 30 jours »), recalculée à chaque
 * ouverture ; `start`/`end` sont alors les bornes que ce preset donne
 * AUJOURD'HUI, conservées pour pouvoir les écrire à l'écran. `preset: null`
 * = deux dates choisies à la main.
 *
 * Les deux bornes sont INCLUSES et représentent des jours entiers : c'est
 * ce que lit l'utilisateur (« du 1er au 10 »), et le serveur borne ensuite
 * la journée de fin à minuit le lendemain (voir resolveCustom). */
export type DashboardPeriod = {
  preset: PresetRange | null
  /** Premier jour inclus. */
  start: Date
  /** Dernier jour inclus. */
  end: Date
}

/** Libellés des raccourcis, ici plutôt que dans le composant : le
 * sélecteur et tout autre écran qui nommerait une période doivent lire la
 * même liste. */
export const PRESET_LABELS: Record<PresetRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '15d': '15 jours',
  '30d': '30 jours',
  '90d': '90 jours',
}

/** Période par défaut à l'ouverture de l'admin. */
export function defaultPeriod(): DashboardPeriod {
  return periodFromPreset('30d')
}

export function periodFromPreset(preset: PresetRange, now = new Date()): DashboardPeriod {
  // Mêmes bornes que celles que le serveur calculera : une seule
  // implémentation, dans contracts/analytics.ts.
  const { current } = resolvePreset(preset, now)
  return { preset, start: current.start, end: lastDayOf(current) }
}

/** Ce que l'on envoie à l'API. Un preset reste un preset (le serveur le
 * recalcule au moment de la requête) ; une période choisie voyage en deux
 * instants datés à MIDI — ainsi le jour reste le même quel que soit le
 * décalage horaire entre le navigateur et le serveur. */
export function periodInput(p: DashboardPeriod): { preset?: PresetRange; start?: string; end?: string } {
  if (p.preset) return { preset: p.preset }
  return { start: noonISO(p.start), end: noonISO(p.end) }
}

function noonISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString()
}
