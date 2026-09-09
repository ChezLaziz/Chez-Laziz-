import { Card } from '../ui/Card'
import { Cell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, InsufficientData, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import { LOW_STOCK_DAYS, MIN_HISTORY_DAYS } from '@contracts/inventory'
import type { PresetRange } from '@contracts/analytics'

const kg = (grams: number) => (grams / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })

const STATUS: Record<string, { label: string; className: string }> = {
  rupture: { label: 'Rupture', className: 'text-red-600 font-medium' },
  faible: { label: 'Faible', className: 'text-amber-700 font-medium' },
  ok: { label: 'OK', className: 'text-ink/55' },
  dormant: { label: 'Aucune vente', className: 'text-ink/40' },
  non_suivi: { label: 'Non suivi', className: 'text-ink/35' },
}

export default function InventoryPage({ token, period }: { token: string; period: PresetRange }) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger l'inventaire." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const inv = data.inventory
  if (inv.products.length === 0) return <EmptyState label="Aucun produit au catalogue." />

  const tracked = inv.products.length - inv.untracked
  const nothingTracked = tracked === 0

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="En rupture"
          value={inv.outOfStock}
          sub="stock à zéro"
          tone={inv.outOfStock > 0 ? 'bad' : 'neutral'}
        />
        <Stat
          label="Stock faible"
          value={inv.lowStock}
          sub={`moins de ${LOW_STOCK_DAYS} jours de couverture`}
          tone={inv.lowStock > 0 ? 'warn' : 'neutral'}
        />
        <Stat
          label="Stock suivi"
          value={tracked}
          sub={`sur ${inv.products.length} produits`}
          tone="neutral"
        />
      </div>

      {nothingTracked ? (
        <InsufficientData label="Aucun stock n'est encore suivi. Ouvrez « Catalogue & prix », modifiez un produit et renseignez son stock en kilos — le rythme d'écoulement et les jours restants apparaîtront ici. Laisser le champ vide garde le produit hors suivi ; saisir 0 le déclare en rupture." />
      ) : (
        !inv.forecastAvailable && (
          <InsufficientData
            label={`Prévision indisponible : la période analysée couvre ${inv.historyDays} jour${inv.historyDays > 1 ? 's' : ''}, il en faut au moins ${MIN_HISTORY_DAYS} pour qu'un rythme d'écoulement veuille dire quelque chose. Les stocks et les quantités vendues ci-dessous restent exacts ; seule la colonne « Jours restants » attend plus d'historique. Choisissez une période plus large si vous en avez.`}
          />
        )
      )}

      <Card title="Stock par produit">
        <Table
          columns={[
            { label: 'Produit' },
            { label: 'Stock (kg)', align: 'right' },
            { label: 'Vendu (kg)', align: 'right' },
            { label: 'Par jour (kg)', align: 'right' },
            { label: 'Jours restants', align: 'right' },
            { label: 'État', align: 'right' },
          ]}
          minWidth={620}
        >
          {inv.products.map((p) => (
            <Row key={p.productId}>
              <Cell first>{p.name}</Cell>
              <Cell align="right">
                {p.stockGrams === null ? <span className="text-ink/30">—</span> : kg(p.stockGrams)}
              </Cell>
              <Cell align="right" muted>
                {p.soldGrams === 0 ? '—' : kg(p.soldGrams)}
              </Cell>
              <Cell align="right" muted>
                {p.dailyGrams === 0 ? '—' : kg(Math.round(p.dailyGrams))}
              </Cell>
              <Cell align="right">
                {p.daysOfCover === null ? (
                  <span className="text-ink/30">—</span>
                ) : (
                  <span className={p.daysOfCover < LOW_STOCK_DAYS ? 'text-amber-700 font-medium' : 'text-ink'}>
                    {Math.floor(p.daysOfCover)}
                  </span>
                )}
              </Cell>
              <Cell align="right" last>
                <span className={`text-[11px] ${STATUS[p.status]!.className}`}>
                  {STATUS[p.status]!.label}
                </span>
              </Cell>
            </Row>
          ))}
        </Table>

        {/* Le rythme ne compte que les lignes rattachées à un produit du
            catalogue. Sans cette phrase, un stock qui descend plus vite que
            prévu passerait pour une erreur de saisie. */}
        <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
          Les quantités vendues ne comptent que les articles vendus seuls. Les packs consomment eux
          aussi du stock mais ne sont pas décomptés ici — leur composition ne référence pas toujours
          les produits du catalogue. Le rythme affiché est donc un minimum, et le stock réel peut
          baisser plus vite.
          {data.dataQuality.stockCoverage > 0 && (
            <>
              {' '}
              Le suivi couvre {Math.round(data.dataQuality.stockCoverage * 100)}% du chiffre
              d'affaires de la période.
            </>
          )}
        </p>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number
  sub: string
  tone: 'neutral' | 'warn' | 'bad'
}) {
  return (
    <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p
        className={`mt-1.5 font-display text-2xl leading-none ${
          tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-700' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] text-ink/45">{sub}</p>
    </div>
  )
}
