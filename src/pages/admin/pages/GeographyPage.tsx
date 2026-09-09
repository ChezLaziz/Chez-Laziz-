import { useState } from 'react'
import { formatTND } from '@/lib/shop'
import { Card } from '../ui/Card'
import { Cell, GrowthCell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { PresetRange } from '@contracts/analytics'

/** Pas de carte décorative de la Tunisie : une carte ne dirait rien de plus
 * que ce tableau, coûterait un fond cartographique à charger, et se lit
 * moins bien qu'une colonne de chiffres alignés. Le détail par gouvernorat
 * s'ouvre au clic — pas une page par gouvernorat. */
export default function GeographyPage({ token, period }: { token: string; period: PresetRange }) {
  const { data, isLoading, isError } = useOverview(token, period)
  const [selected, setSelected] = useState<string | null>(null)

  if (isError) return <ErrorState label="Impossible de charger les données géographiques." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const govs = data.governorates
  const active = selected ?? govs[0]?.governorate ?? null
  const activeGov = govs.find((g) => g.governorate === active)
  const activeDelivery = data.governorateDelivery.find((d) => d.governorate === active)
  const activeProducts = data.productByGovernorate
    .filter((c) => c.governorate === active)
    .sort((a, b) => b.revenueMillimes - a.revenueMillimes)

  const avgAov = data.aovMillimes.value

  return (
    <div className="space-y-5">
      <Card title="Gouvernorats">
        {govs.length === 0 ? (
          <EmptyState label="Aucune vente sur cette période." />
        ) : (
          <>
            <Table
              columns={[
                { label: 'Gouvernorat' },
                { label: 'CA (DT)', align: 'right' },
                { label: 'Cmd', align: 'right' },
                { label: 'Clients', align: 'right' },
                { label: 'Panier (DT)', align: 'right' },
                { label: 'Évol.', align: 'right' },
              ]}
            >
              {govs.map((g) => (
                <Row key={g.governorate}>
                  <Cell first>
                    <button
                      onClick={() => setSelected(g.governorate)}
                      className={`text-left transition-colors hover:text-[#b8912e] ${
                        g.governorate === active ? 'font-medium text-[#8f6f22]' : 'text-ink'
                      }`}
                    >
                      {g.governorate}
                    </button>
                    {g.topProductName && (
                      <span className="block truncate text-[11px] text-ink/40">
                        {g.topProductName}
                      </span>
                    )}
                  </Cell>
                  <Cell align="right">{formatTND(g.revenueMillimes)}</Cell>
                  <Cell align="right" muted>
                    {g.orders}
                  </Cell>
                  <Cell align="right" muted>
                    {g.customers}
                  </Cell>
                  <Cell align="right">
                    <span className={g.aovMillimes > avgAov ? 'text-green-600' : 'text-ink'}>
                      {formatTND(g.aovMillimes)}
                    </span>
                  </Cell>
                  <Cell align="right" last>
                    <GrowthCell changePercent={g.changePercent} isNew={g.isNew} />
                  </Cell>
                </Row>
              ))}
            </Table>
            <p className="mt-3 text-[11px] text-ink/40">
              Panier en vert = au-dessus de la moyenne ({formatTND(avgAov)} DT). Cliquez un
              gouvernorat pour son détail.
            </p>
          </>
        )}
      </Card>

      {activeGov && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={`${activeGov.governorate} — produits préférés`}>
            {activeProducts.length === 0 ? (
              <EmptyState label="Aucune vente sur la période." />
            ) : (
              <Table
                minWidth={320}
                columns={[
                  { label: 'Produit' },
                  { label: 'CA (DT)', align: 'right' },
                  { label: 'Unités', align: 'right' },
                ]}
              >
                {activeProducts.map((c) => (
                  <Row key={c.productKey}>
                    <Cell first>{c.productName}</Cell>
                    <Cell align="right">{formatTND(c.revenueMillimes)}</Cell>
                    <Cell align="right" muted last>
                      {c.unitsSold}
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Card>

          {/* Impact business de la livraison, pas son pilotage : où
              l'entreprise perd des commandes, sans toucher au travail du
              transporteur. */}
          <Card title={`${activeGov.governorate} — livraison`}>
            {!activeDelivery ? (
              <EmptyState label="Aucune commande sur la période." />
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-ink/70">Commandes</span>
                  <span className="text-ink">{activeDelivery.total}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ink/70">Annulées</span>
                  <span
                    className={
                      activeDelivery.cancellationRate > 0.15 ? 'text-red-600' : 'text-ink'
                    }
                  >
                    {activeDelivery.cancelled} (
                    {(activeDelivery.cancellationRate * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-sand/50 pt-3">
                  <span className="text-ink/70">CA perdu</span>
                  <span
                    className={
                      activeDelivery.lostRevenueMillimes > 0 ? 'text-red-600' : 'text-ink'
                    }
                  >
                    {formatTND(activeDelivery.lostRevenueMillimes)} DT
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ink/70">Clients distincts</span>
                  <span className="text-ink">{activeGov.customers}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
