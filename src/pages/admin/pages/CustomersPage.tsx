import { formatTND } from '@/lib/shop'
import { Card, Kpi } from '../ui/Card'
import { Cell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, InsufficientData, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { PresetRange } from '@contracts/analytics'

/** En dessous, les segments d'ancienneté ne veulent rien dire : « dormant
 * depuis 90 jours » suppose au moins 90 jours d'historique. */
const SEGMENT_MIN_HISTORY_DAYS = 90

export default function CustomersPage({ token, period }: { token: string; period: PresetRange }) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger les données clients." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const c = data.customerMetrics
  const noRepeatYet = c.avgDaysBetweenPurchases === null

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Clients" trend={data.customers} />
        <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Nouveaux / revenants
          </p>
          <p className="mt-1.5 font-display text-2xl leading-none text-ink">
            {c.newCustomers} <span className="text-ink/30">/</span> {c.returningCustomers}
          </p>
          <p className="mt-2 text-[11px] text-ink/45">sur la période</p>
        </div>
        <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Valeur moyenne / client
          </p>
          <p className="mt-1.5 font-display text-2xl leading-none text-ink">
            {formatTND(c.avgCustomerValueMillimes)} DT
          </p>
          <p className="mt-2 text-[11px] text-ink/45">
            {c.avgOrdersPerCustomer.toFixed(2)} commande{c.avgOrdersPerCustomer >= 2 ? 's' : ''} en
            moyenne
          </p>
        </div>
        <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Taux de réachat
          </p>
          <p className="mt-1.5 font-display text-2xl leading-none text-ink">
            {(c.repeatPurchaseRate * 100).toFixed(0)}%
          </p>
          <p className="mt-2 text-[11px] text-ink/45">clients ayant commandé 2 fois ou plus</p>
        </div>
      </div>

      <p className="-mt-2 text-[11px] text-ink/40">
        Un client est identifié par son numéro de téléphone normalisé (8 derniers chiffres) — il
        n'existe ni compte client ni e-mail. Couverture sur cette période :{' '}
        {Math.round(data.dataQuality.customerIdCoverage * 100)}%.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Fidélité">
          {c.periodCustomers === 0 ? (
            <EmptyState label="Aucun client sur cette période." />
          ) : (
            <div className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                <DistRow label="1 seule commande" value={c.ordersDistribution.oneOrder} total={c.periodCustomers} />
                <DistRow label="2 commandes" value={c.ordersDistribution.twoOrders} total={c.periodCustomers} />
                <DistRow label="3 commandes ou plus" value={c.ordersDistribution.threePlus} total={c.periodCustomers} />
              </ul>
              <div className="border-t border-sand/50 pt-3">
                {noRepeatYet ? (
                  <p className="text-xs leading-relaxed text-ink/50">
                    Délai entre deux achats : pas encore calculable — aucun client n'a passé de
                    deuxième commande. Ce chiffre apparaîtra dès le premier réachat.
                  </p>
                ) : (
                  <p className="text-xs text-ink/55">
                    Délai moyen entre deux commandes d'un même client :{' '}
                    <span className="font-medium text-ink">
                      {c.avgDaysBetweenPurchases!.toFixed(0)} jours
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card title="Meilleurs clients">
          {c.topCustomers.length === 0 ? (
            <EmptyState label="Aucun client sur cette période." />
          ) : (
            <Table
              minWidth={320}
              columns={[
                { label: 'Client' },
                { label: 'Cmd', align: 'right' },
                { label: 'Total (DT)', align: 'right' },
              ]}
            >
              {c.topCustomers.map((t) => (
                <Row key={t.id}>
                  <Cell first>
                    <span className="text-ink">{t.name}</span>
                    <span className="block text-[11px] text-ink/40">
                      dernière commande{' '}
                      {new Date(t.lastOrderAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </Cell>
                  <Cell align="right" muted>
                    {t.orders}
                  </Cell>
                  <Cell align="right" last>
                    {formatTND(t.revenueMillimes)}
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      </div>

      {/* Segments et cohortes : volontairement masqués tant que l'historique
          est trop court. Classer un client « à risque » après cinq jours
          d'activité serait une conclusion sans fondement. */}
      {c.historyDays < SEGMENT_MIN_HISTORY_DAYS && (
        <InsufficientData
          label={`Segments (actif, à risque, dormant) et cohortes de rétention : pas encore exploitables. La boutique compte ${c.historyDays} jour${c.historyDays > 1 ? 's' : ''} d'historique de commandes ; il en faut au moins ${SEGMENT_MIN_HISTORY_DAYS} pour que « sans commande depuis 90 jours » signifie quelque chose.`}
        />
      )}
    </div>
  )
}

function DistRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink/70">{label}</span>
        <span className="text-ink">
          {value} <span className="text-ink/40">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
        <div className="h-full rounded-full bg-[#b8912e]" style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}
