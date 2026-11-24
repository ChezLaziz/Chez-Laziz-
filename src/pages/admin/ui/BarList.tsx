import { DASH } from './palette'

export type BarRow = {
  key: string
  label: string
  /** Part du total, entre 0 et 1 : c'est elle que la barre dessine. */
  share: number
  /** Le chiffre principal, déjà écrit (« 74 % »). */
  display: string
  /** Précision à côté du chiffre (« 77 commandes »). */
  note?: string
  /** Mesure manquante (origine inconnue) : en gris, jamais dans la couleur
   * des vraies valeurs — elle ne doit pas se lire comme une source. */
  muted?: boolean
}

/** Une liste de parts, en barres horizontales.
 *
 * Remplace les anneaux : comparer deux arcs demande un effort que deux
 * barres posées sur la même ligne de départ ne demandent pas, et le nom
 * comme le chiffre restent écrits en toutes lettres à côté. La piste grise
 * vaut 100 % : la barre se lit donc bien comme une part du total. */
export default function BarList({ rows }: { rows: BarRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={`min-w-0 truncate text-[13px] ${r.muted ? 'text-ink/60' : 'text-ink'}`}>{r.label}</span>
            <span className="shrink-0 whitespace-nowrap text-[13px] tabular-nums">
              {r.note && <span className="mr-2 text-[12px] text-ink/45">{r.note}</span>}
              <span className="font-semibold text-ink">{r.display}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: DASH.track }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(Math.max(r.share * 100, r.share > 0 ? 1.5 : 0), 100)}%`,
                backgroundColor: r.muted ? DASH.grey : DASH.deep,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
