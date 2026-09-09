import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatTND } from '@/lib/shop'
import { Card, Kpi } from '../ui/Card'
import { Cell, GrowthCell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, NotCollected, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { PresetRange } from '@contracts/analytics'

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Espèces à la livraison',
  d17: 'D17',
}

const dayLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export default function SalesPage({ token, period }: { token: string; period: PresetRange }) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger les ventes." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const hasSales = data.orders.value > 0

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Chiffre d'affaires" trend={data.revenueMillimes} format="money" />
        <Kpi label="Commandes" trend={data.orders} />
        <Kpi label="Panier moyen" trend={data.aovMillimes} format="money" />
        <Kpi label="Articles vendus" trend={data.unitsSold} />
      </div>

      <Card title="Commandes par jour">
        {!hasSales ? (
          <EmptyState label="Aucune vente sur cette période." />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 10, fill: '#9c9490' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#9c9490' }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <Tooltip
                  formatter={(v) => [String(v), 'Commandes']}
                  labelFormatter={(l) => dayLabel(String(l))}
                  cursor={{ fill: 'rgba(184,145,46,0.08)' }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dec9b8' }}
                />
                <Bar dataKey="orders" fill="#b8912e" radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Chiffre d'affaires par produit">
        {data.products.length === 0 ? (
          <EmptyState label="Aucune vente sur cette période." />
        ) : (
          <Table
            columns={[
              { label: 'Produit' },
              { label: 'CA (DT)', align: 'right' },
              { label: 'Unités', align: 'right' },
              { label: 'Cmd', align: 'right' },
              { label: 'Part', align: 'right' },
              { label: 'Évol.', align: 'right' },
            ]}
          >
            {data.products.map((p) => (
              <Row key={p.key}>
                <Cell first>{p.name}</Cell>
                <Cell align="right">{formatTND(p.revenueMillimes)}</Cell>
                <Cell align="right" muted>
                  {p.unitsSold}
                </Cell>
                <Cell align="right" muted>
                  {p.orders}
                </Cell>
                <Cell align="right" muted>
                  {(p.revenueShare * 100).toFixed(0)}%
                </Cell>
                <Cell align="right" last>
                  <GrowthCell changePercent={p.changePercent} isNew={p.isNew} />
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Par gouvernorat">
          {data.governorates.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <Table
              minWidth={340}
              columns={[
                { label: 'Gouvernorat' },
                { label: 'CA (DT)', align: 'right' },
                { label: 'Cmd', align: 'right' },
                { label: 'Évol.', align: 'right' },
              ]}
            >
              {data.governorates.map((g) => (
                <Row key={g.governorate}>
                  <Cell first>{g.governorate}</Cell>
                  <Cell align="right">{formatTND(g.revenueMillimes)}</Cell>
                  <Cell align="right" muted>
                    {g.orders}
                  </Cell>
                  <Cell align="right" last>
                    <GrowthCell changePercent={g.changePercent} isNew={g.isNew} />
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Par mode de paiement">
            {data.payments.length === 0 ? (
              <EmptyState label="Aucune vente sur cette période." />
            ) : (
              <ul className="space-y-2.5">
                {data.payments.map((p) => (
                  <li key={p.method} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink/70">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                    <span>
                      <span className="font-medium text-ink">{formatTND(p.revenueMillimes)} DT</span>
                      <span className="ml-2 text-ink/45">
                        {p.orders} cmd · {(p.share * 100).toFixed(0)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Par type de client">
            {data.customerSplit.newCustomers + data.customerSplit.returningCustomers === 0 ? (
              <EmptyState label="Aucun client identifiable sur cette période." />
            ) : (
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-ink/70">Nouveaux</span>
                  <span>
                    <span className="font-medium text-ink">
                      {formatTND(data.customerSplit.newRevenueMillimes)} DT
                    </span>
                    <span className="ml-2 text-ink/45">
                      {data.customerSplit.newCustomers} clients
                    </span>
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-ink/70">Revenants</span>
                  <span>
                    <span className="font-medium text-ink">
                      {formatTND(data.customerSplit.returningRevenueMillimes)} DT
                    </span>
                    <span className="ml-2 text-ink/45">
                      {data.customerSplit.returningCustomers} clients
                    </span>
                  </span>
                </li>
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Le site n'a ni code promo ni procédure de remboursement en base :
          afficher « Remises : 0 DT » laisserait croire à une mesure, alors
          que rien n'est mesuré. */}
      <NotCollected
        what="Remises, remboursements et chiffre d'affaires net"
        needs="Les commandes n'enregistrent ni remise ni remboursement. Le chiffre d'affaires affiché est donc brut. Ces montants deviendront calculables dès que ces champs existeront."
      />
    </div>
  )
}
