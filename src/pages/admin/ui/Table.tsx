/** Tableau unique du tableau de bord.
 *
 * Un seul style de tableau pour Ventes, Produits, Clients et Géographie :
 * sans cela, quatre pages finissent avec quatre alignements et quatre
 * tailles de police pour la même chose.
 *
 * Chaque cellule porte un écart à sa droite, sauf la dernière. Sans lui, une
 * colonne alignée à droite touchait la colonne suivante alignée à gauche :
 * « 700 » et « hier » se lisaient « 700 hier », et deux en-têtes voisins ne
 * formaient plus qu'un seul mot. */
export function Table({
  columns,
  children,
  minWidth = 520,
}: {
  columns: { label: string; align?: 'left' | 'right' }[]
  children: React.ReactNode
  minWidth?: number
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-ink/40">
            {columns.map((c, i) => (
              <th
                key={c.label}
                className={`pb-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'} ${
                  i === 0 ? 'pl-1' : ''
                } ${i === columns.length - 1 ? 'pr-1' : 'pr-4'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-sand/50">{children}</tr>
}

export function Cell({
  children,
  align = 'left',
  muted = false,
  first = false,
  last = false,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  muted?: boolean
  first?: boolean
  last?: boolean
}) {
  return (
    <td
      className={`py-2 ${align === 'right' ? 'text-right' : ''} ${
        muted ? 'text-ink/55' : 'text-ink'
      } ${first ? 'pl-1' : ''} ${last ? 'pr-1' : 'pr-4'}`}
    >
      {children}
    </td>
  )
}

/** Croissance d'une ligne de tableau.
 *
 * « Nouveau » plutôt qu'un pourcentage quand la ligne n'existait pas avant :
 * un produit lancé cette semaine n'a pas « progressé de 100 % ». */
export function GrowthCell({
  changePercent,
  isNew,
}: {
  changePercent: number | null
  isNew: boolean
}) {
  if (isNew) return <span className="text-[11px] text-[#b8912e]">nouveau</span>
  if (changePercent === null) return <span className="text-[11px] text-ink/30">—</span>
  const flat = Math.abs(changePercent) < 0.5
  return (
    <span
      className={`text-[11px] font-medium ${
        flat ? 'text-ink/45' : changePercent > 0 ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {flat ? '→' : changePercent > 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(0)}%
    </span>
  )
}
