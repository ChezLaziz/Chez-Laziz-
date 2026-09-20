import { useEffect, useRef, useState } from 'react'
import { PRESET_RANGES } from '@contracts/analytics'
import { PRESET_LABELS, periodFromPreset, type DashboardPeriod } from './period'

function toInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fromInputValue(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

const longDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const DAY_MS = 24 * 60 * 60 * 1000
/** Au-delà d'un an, la requête ramènerait toute l'histoire de la boutique
 * pour un écran qui tient en une page : la borne est dite, pas subie. */
const MAX_DAYS = 366

/** LE filtre du tableau de bord : deux dates, et quatre raccourcis.
 *
 * Un seul sélecteur pour toute la page — pas un par carte : deux blocs qui
 * affichent deux périodes différentes sur le même écran donnent deux
 * vérités, et on ne sait plus laquelle lire. */
export default function DateRange({
  value,
  onChange,
}: {
  value: DashboardPeriod
  onChange: (p: DashboardPeriod) => void
}) {
  const [open, setOpen] = useState<null | 'dates' | 'presets'>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={root} className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => (o === 'dates' ? null : 'dates'))}
        aria-haspopup="dialog"
        aria-expanded={open === 'dates'}
        className="flex items-center gap-2 rounded-xl border border-[#e6e0d9] bg-white px-3 py-2 text-[13px] text-ink shadow-sm transition-colors hover:border-[#cdd8d3]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-ink/45">
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
        </svg>
        <span className="whitespace-nowrap">{longDate(value.start)}</span>
        <span className="text-ink/35" aria-hidden="true">
          →
        </span>
        <span className="whitespace-nowrap">{longDate(value.end)}</span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => (o === 'presets' ? null : 'presets'))}
        aria-haspopup="menu"
        aria-expanded={open === 'presets'}
        className="flex items-center gap-1.5 rounded-xl border border-[#e6e0d9] bg-white px-3 py-2 text-[13px] text-ink shadow-sm transition-colors hover:border-[#cdd8d3]"
      >
        {value.preset ? PRESET_LABELS[value.preset] : 'Personnalisé'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open === 'presets' && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-44 rounded-xl border border-[#e6e0d9] bg-white py-1 shadow-lg"
        >
          {PRESET_RANGES.map((p) => (
            <button
              key={p}
              role="menuitemradio"
              aria-checked={value.preset === p}
              onClick={() => {
                onChange(periodFromPreset(p))
                setOpen(null)
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors hover:bg-ink/[0.04] ${
                value.preset === p ? 'font-semibold text-ink' : 'text-ink/65'
              }`}
            >
              {PRESET_LABELS[p]}
              {value.preset === p && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-[#2a4750]">
                  <path d="M4 12.5 9.5 18 20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
          <button
            role="menuitemradio"
            aria-checked={value.preset === null}
            onClick={() => setOpen('dates')}
            className={`w-full border-t border-sand/50 px-3 py-2 text-left text-[13px] transition-colors hover:bg-ink/[0.04] ${
              value.preset === null ? 'font-semibold text-ink' : 'text-ink/65'
            }`}
          >
            Dates personnalisées…
          </button>
        </div>
      )}

      {open === 'dates' && (
        <CustomRangePanel
          value={value}
          onCancel={() => setOpen(null)}
          onApply={(p) => {
            onChange(p)
            setOpen(null)
          }}
        />
      )}
    </div>
  )
}

function CustomRangePanel({
  value,
  onApply,
  onCancel,
}: {
  value: DashboardPeriod
  onApply: (p: DashboardPeriod) => void
  onCancel: () => void
}) {
  const [start, setStart] = useState(toInputValue(value.start))
  const [end, setEnd] = useState(toInputValue(value.end))
  const today = toInputValue(new Date())

  const startDate = fromInputValue(start)
  const endDate = fromInputValue(end)
  const error = validate(startDate, endDate)

  return (
    <div
      role="dialog"
      aria-label="Choisir une période"
      className="absolute left-0 top-full z-40 mt-1.5 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-[#e6e0d9] bg-white p-4 shadow-lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">Début</span>
          <input
            type="date"
            value={start}
            max={today}
            onChange={(e) => setStart(e.target.value)}
            // text-base : en dessous de 16px, iOS Safari zoome la page au
            // premier appui dans le champ.
            className="mt-1 w-full rounded-lg border border-sand bg-white px-2.5 py-2 text-base text-ink outline-none transition-colors focus:border-[#2a4750] sm:text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">Fin</span>
          <input
            type="date"
            value={end}
            max={today}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-sand bg-white px-2.5 py-2 text-base text-ink outline-none transition-colors focus:border-[#2a4750] sm:text-[13px]"
          />
        </label>
      </div>

      {error && <p className="mt-2.5 text-[12px] text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] text-ink/55 transition-colors hover:text-ink"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!!error || !startDate || !endDate}
          onClick={() => {
            if (!startDate || !endDate || error) return
            onApply({ preset: null, start: startDate, end: endDate })
          }}
          className="rounded-lg bg-[#2a4750] px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Appliquer
        </button>
      </div>
    </div>
  )
}

/** Dit POURQUOI la période est refusée, plutôt que de la corriger en
 * silence : un intervalle inversé est souvent une faute de frappe, et la
 * rectifier sans le dire donnerait des chiffres pour des dates que
 * personne n'a demandées. */
function validate(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return 'Choisissez une date de début et une date de fin.'
  if (start.getTime() > end.getTime()) return 'La date de début doit précéder la date de fin.'
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
  if (days > MAX_DAYS) return `Période trop longue (${days} jours) — 366 jours au maximum.`
  return null
}
