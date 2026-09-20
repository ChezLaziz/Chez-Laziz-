import DashIcon, { type DashIconName } from './DashIcon'
import { moneyDT } from './format'
import { DASH } from './palette'

/** Conteneur unique de tout le tableau de bord — une seule définition de
 * bordure, de fond et d'espacement, pour que les blocs ne divergent pas. */
export function Card({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string
  /** Petite icône à gauche du titre, comme sur la maquette. */
  icon?: DashIconName
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-[#ece7e1] bg-white p-4 shadow-[0_1px_2px_rgba(60,56,53,0.04),0_10px_30px_-18px_rgba(60,56,53,0.35)] sm:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-ink">
              {icon && (
                <span className="shrink-0 text-[#2a4750]">
                  <DashIcon name={icon} size={17} />
                </span>
              )}
              <span className="truncate">{title}</span>
            </h2>
          )}
          {action}
        </div>
      )}
      {/* `flex-1` : dans une rangée de cartes de hauteurs différentes, le
          contenu occupe toute la carte au lieu de laisser un grand vide en
          bas (un anneau à côté d'un graphique deux fois plus haut). */}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
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
 * (annulations, coût), sinon le vert et le rouge diraient l'inverse du sens
 * métier. */
export function TrendBadge({
  trend,
  inverse = false,
  comparable = true,
}: {
  trend: Trend
  inverse?: boolean
  /** Faux tant que la période précédente est trop maigre pour servir de
   * base : dix-huit commandes contre une, c'est « +1700 % » — un chiffre
   * vrai qui ne dit rien. On préfère l'écrire en toutes lettres. */
  comparable?: boolean
}) {
  if (!comparable) {
    return <span className="text-[11px] text-ink/40">pas encore assez d'historique</span>
  }
  if (trend.changePercent === null) {
    return <span className="text-[11px] text-ink/40">pas de comparaison</span>
  }
  const pct = trend.changePercent
  const flat = Math.abs(pct) < 0.05
  const good = inverse ? pct < 0 : pct > 0
  const color = flat ? 'text-ink/45' : good ? 'text-green-600' : 'text-red-600'
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${color}`}>
      <Arrow direction={flat ? 'flat' : pct > 0 ? 'up' : 'down'} />
      {pct > 0 && !flat ? '+' : ''}
      {Math.abs(pct) < 10 ? pct.toFixed(1) : Math.round(pct)}%
    </span>
  )
}

function Arrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'flat') return <span aria-hidden="true">→</span>
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      {direction === 'up' ? (
        <>
          <path d="M6 18 18 6" strokeLinecap="round" />
          <path d="M9 6h9v9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M6 6l12 12" strokeLinecap="round" />
          <path d="M18 9v9H9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

/** Un seul chiffre important, dans la carte de la maquette : pastille
 * d'icône, libellé, valeur, variation.
 *
 * `note` remplace la variation quand la donnée manque — un tableau de bord
 * doit pouvoir dire « je ne sais pas » à la place d'un chiffre inventé. */
export function Kpi({
  icon,
  label,
  value,
  trend,
  format = 'number',
  inverse = false,
  comparable = true,
  note,
  compact = false,
}: {
  icon: DashIconName
  label: string
  /** Valeur déjà formatée. Sinon elle est dérivée de `trend`. */
  value?: string
  trend?: Trend
  format?: 'money' | 'number' | 'percent'
  inverse?: boolean
  comparable?: boolean
  note?: string
  /** Variante de la seconde rangée : variation sur la même ligne. */
  compact?: boolean
}) {
  const display =
    value ??
    (trend === undefined
      ? '—'
      : format === 'money'
        ? `${moneyDT(trend.value)} DT`
        : format === 'percent'
          ? `${(trend.value * 100).toFixed(1)}%`
          : trend.value.toLocaleString('fr-FR'))

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#ece7e1] bg-white p-4 shadow-[0_1px_2px_rgba(60,56,53,0.04),0_10px_30px_-18px_rgba(60,56,53,0.35)] sm:gap-4 sm:p-5">
      <span
        className={`flex shrink-0 items-center justify-center text-[#2a4750] ${
          compact ? 'h-11 w-11 rounded-full' : 'h-11 w-11 rounded-xl'
        }`}
        style={{ backgroundColor: DASH.tile }}
        aria-hidden="true"
      >
        <DashIcon name={icon} size={compact ? 19 : 20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-ink/55">{label}</p>
        <p className="mt-0.5 font-display text-[26px] leading-tight text-ink sm:text-[28px]">
          {display}
        </p>
        <div className={`mt-1 ${compact ? 'flex flex-wrap items-center gap-x-2' : ''}`}>
          {note ? (
            <p className="text-[11px] leading-snug text-ink/40">{note}</p>
          ) : trend ? (
            <>
              <TrendBadge trend={trend} inverse={inverse} comparable={comparable} />
              {comparable && trend.changePercent !== null && (
                <p className={`text-[11px] text-ink/45 ${compact ? '' : 'mt-0.5'}`}>
                  vs période précédente
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
