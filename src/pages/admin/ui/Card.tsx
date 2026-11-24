import { moneyDT } from './format'

/** Conteneur unique de tout le tableau de bord — une seule définition de
 * bordure, de fond et d'espacement, pour que les blocs ne divergent pas.
 *
 * Un trait fin, pas d'ombre : douze cartes qui flottent chacune sur son
 * ombre font un écran agité. Le blanc sur le fond chaud suffit à les
 * détacher. */
export function Card({
  title,
  hint,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string
  /** Une ligne sous le titre : ce que la carte compte, dit une fois. */
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    // `min-w-0` : une carte est un élément de grille, et sans lui un tableau
    // large élargissait toute la page au lieu de défiler dans sa carte.
    <section className={`flex min-w-0 flex-col rounded-xl border border-[#e9e4dd] bg-white p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3.5 flex items-start justify-between gap-3">
          {title && (
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-semibold leading-tight text-ink">{title}</h2>
              {hint && <p className="mt-1 text-[12px] leading-snug text-ink/50">{hint}</p>}
            </div>
          )}
          {action}
        </div>
      )}
      {/* `flex-1` : dans une rangée de cartes de hauteurs différentes, le
          contenu occupe toute la carte au lieu de laisser un grand vide en
          bas. */}
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
    return <span className="text-[12px] leading-[1.3] text-ink/45">pas encore assez d'historique</span>
  }
  if (trend.changePercent === null) {
    return <span className="text-[12px] leading-[1.3] text-ink/45">pas de comparaison</span>
  }
  const pct = trend.changePercent
  const flat = Math.abs(pct) < 0.05
  const good = inverse ? pct < 0 : pct > 0
  const color = flat ? 'text-ink/50' : good ? 'text-[#1d6b47]' : 'text-[#b3303f]'
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold leading-[1.25] tabular-nums ${color}`}>
      <Arrow direction={flat ? 'flat' : pct > 0 ? 'up' : 'down'} />
      {pct > 0 && !flat ? '+' : ''}
      {Math.abs(pct) < 10 ? pct.toFixed(1).replace('.', ',') : Math.round(pct)} %
    </span>
  )
}

function Arrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'flat') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
        <path d="M5 12h14" strokeLinecap="round" />
      </svg>
    )
  }
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

/** Les chiffres clés, dans UNE carte découpée par des traits.
 *
 * Huit cartes séparées, chacune avec sa pastille d'icône, donnaient huit
 * objets à regarder avant d'avoir lu un seul nombre. Ici le regard suit une
 * seule ligne : libellé, valeur, variation. */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Chiffres clés"
      className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e9e4dd] bg-[#e9e4dd] xl:grid-cols-4"
    >
      {children}
    </section>
  )
}

/** Un seul chiffre important : libellé, valeur, variation, précision.
 *
 * Les valeurs sont composées dans la police du texte, pas dans Marcellus :
 * ses chiffres sont dessinés comme des capitales romaines, et « 104 » s'y
 * lisait « IO4 ». Un tableau de bord où l'on hésite sur un chiffre ne sert
 * à rien. */
export function Kpi({
  label,
  value,
  trend,
  format = 'number',
  unit,
  inverse = false,
  comparable = true,
  detail,
}: {
  label: string
  /** Valeur déjà formatée. Sinon elle est dérivée de `trend`. */
  value?: string
  /** Unité écrite en petit après la valeur. Déduite pour `format: money`. */
  unit?: string
  trend?: Trend
  format?: 'money' | 'number'
  inverse?: boolean
  comparable?: boolean
  /** Précision sous la variation (« 230 articles »). */
  detail?: string
}) {
  const display =
    value ??
    (trend === undefined
      ? '—'
      : format === 'money'
        ? moneyDT(trend.value)
        : trend.value.toLocaleString('fr-FR'))

  const suffix = unit ?? (format === 'money' && value === undefined && trend !== undefined ? 'DT' : undefined)

  return (
    <div className="min-w-0 bg-white px-4 py-4 sm:px-5">
      <p className="truncate text-[12.5px] leading-[1.3] text-ink/55">{label}</p>
      <p className="mt-1.5 whitespace-nowrap text-[24px] font-semibold leading-none tracking-[-0.01em] text-ink tabular-nums sm:text-[28px]">
        {display}
        {suffix && <span className="ml-1.5 text-[13px] font-medium tracking-normal text-ink/45">{suffix}</span>}
      </p>
      <div className="mt-2.5 min-h-[18px]">
        {trend && <TrendBadge trend={trend} inverse={inverse} comparable={comparable} />}
      </div>
      {detail && <p className="mt-1 truncate text-[12px] leading-[1.3] text-ink/45">{detail}</p>}
    </div>
  )
}
