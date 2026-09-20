import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type DonutSlice = {
  key: string
  label: string
  value: number
  color: string
  /** Rend la ligne de légende cliquable (ouvrir la liste filtrée). */
  onSelect?: () => void
}

/** Anneau + légende, tel que la maquette les pose : le total au centre,
 * une ligne par tranche à droite.
 *
 * La légende n'est PAS générée par recharts : ses lignes doivent pouvoir
 * être des boutons (cliquer « Terminées » ouvre le carnet filtré), et un
 * anneau ne se lit pas sans ses chiffres écrits en toutes lettres. */
export default function Donut({
  slices,
  total,
  totalLabel,
  valueFormat = 'count',
  height = 140,
}: {
  slices: DonutSlice[]
  total: number
  totalLabel: string
  /** « 38 » (comptage) ou « 62 % » (part) à droite de chaque ligne. */
  valueFormat?: 'count' | 'percent'
  height?: number
}) {
  const sum = slices.reduce((s, d) => s + d.value, 0)
  const drawn = slices.filter((d) => d.value > 0)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={drawn}
              dataKey="value"
              nameKey="label"
              innerRadius="63%"
              outerRadius="100%"
              paddingAngle={drawn.length > 1 ? 1.5 : 0}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {drawn.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [
                `${Number(v).toLocaleString('fr-FR')}${
                  sum === 0 ? '' : ` · ${Math.round((Number(v) / sum) * 100)}%`
                }`,
                String(n),
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                border: '1px solid #e5ded6',
                boxShadow: '0 8px 24px -12px rgba(60,56,53,.4)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[24px] leading-none text-ink">
            {total.toLocaleString('fr-FR')}
          </span>
          <span className="mt-1 text-[11px] text-ink/45">{totalLabel}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {slices.map((d) => {
          const right =
            valueFormat === 'percent'
              ? `${sum === 0 ? 0 : Math.round((d.value / sum) * 100)}%`
              : d.value.toLocaleString('fr-FR')
          const row = (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-left text-[12.5px] leading-tight text-ink/75">
                {d.label}
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold text-ink">{right}</span>
            </>
          )
          return (
            <li key={d.key}>
              {d.onSelect ? (
                <button
                  type="button"
                  onClick={d.onSelect}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-ink/[0.04]"
                >
                  {row}
                </button>
              ) : (
                <div className="flex w-full items-center gap-2 px-1 py-1">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
