import { formatTND } from '@/lib/shop'

/** Conteneur unique de tout le tableau de bord — une seule définition de
 * bordure, de fond et d'espacement, pour que les blocs ne divergent pas. */
export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-sand/70 bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export type Trend = { value: number; previous: number; changePercent: number | null }

/** Variation vs période précédente.
 *
 * `changePercent: null` = la période précédente était à zéro. On écrit
 * « pas de comparaison » au lieu d'un « +100 % » qui n'informe sur rien.
 *
 * `inverse` : pour une métrique où la baisse est une bonne nouvelle
 * (annulations), sinon le vert et le rouge diraient l'inverse du sens métier. */
export function TrendBadge({ trend, inverse = false }: { trend: Trend; inverse?: boolean }) {
  if (trend.changePercent === null) {
    return <span className="text-[11px] text-ink/40">pas de comparaison</span>
  }
  const pct = trend.changePercent
  const flat = Math.abs(pct) < 0.05
  const good = inverse ? pct < 0 : pct > 0
  const color = flat ? 'text-ink/45' : good ? 'text-green-600' : 'text-red-600'
  const arrow = flat ? '→' : pct > 0 ? '↑' : '↓'
  return (
    <span className={`text-[11px] font-medium ${color}`}>
      {arrow} {Math.abs(pct).toFixed(1)}% <span className="font-normal text-ink/40">vs préc.</span>
    </span>
  )
}

/** Un seul chiffre important. Volontairement sobre : pas d'icône ni de
 * couleur décorative — la couleur est réservée à la variation, qui elle
 * porte un sens. */
export function Kpi({
  label,
  trend,
  format = 'number',
  inverse = false,
}: {
  label: string
  trend: Trend
  format?: 'money' | 'number' | 'percent'
  inverse?: boolean
}) {
  const display =
    format === 'money'
      ? `${formatTND(trend.value)} DT`
      : format === 'percent'
        ? `${(trend.value * 100).toFixed(1)}%`
        : trend.value.toLocaleString('fr-FR')

  return (
    <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-1.5 font-display text-2xl leading-none text-ink">{display}</p>
      <p className="mt-2">
        <TrendBadge trend={trend} inverse={inverse} />
      </p>
    </div>
  )
}
