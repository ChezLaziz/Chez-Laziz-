import { PRESET_RANGES, type PresetRange } from '@contracts/analytics'

const LABELS: Record<PresetRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
}

/** Le SEUL filtre global du tableau de bord.
 *
 * Volontairement quatre boutons et rien d'autre : un sélecteur de dates
 * complet en tête de chaque page coûte plus d'attention qu'il n'en fait
 * gagner. Chaque page ajoute ses propres filtres si elle en a besoin. */
export default function DateRange({
  value,
  onChange,
}: {
  value: PresetRange
  onChange: (v: PresetRange) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-sand/70 bg-white p-0.5">
      {PRESET_RANGES.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors ${
            value === p ? 'bg-ink text-[#faf6f3]' : 'text-ink/55 hover:text-ink'
          }`}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  )
}
