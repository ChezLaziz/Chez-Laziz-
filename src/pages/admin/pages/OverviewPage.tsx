import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatTND } from '@/lib/shop'
import { Card, Kpi } from '../ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import { MIN_ORDERS_FOR_SIGNALS, buildSignals } from '@contracts/signals'
import type { PresetRange } from '@contracts/analytics'

const dayLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function KpiSkeletons() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[92px]" />
      ))}
    </div>
  )
}

export default function OverviewPage({
  token,
  period,
  onGoToOrders,
}: {
  token: string
  period: PresetRange
  onGoToOrders: (status: string) => void
}) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger les données du tableau de bord." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <KpiSkeletons />
        <Skeleton className="h-64" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const signals = buildSignals(data)
  const hasSales = data.orders.value > 0
  // Une variation n'a de sens qu'avec une vraie période de référence. Même
  // seuil que les signaux : en dessous, on écrit qu'on ne compare pas.
  const comparable = data.orders.previous >= MIN_ORDERS_FOR_SIGNALS

  return (
    <div className="space-y-5">
      {/* Cinq chiffres, pas vingt. Chacun répond à une question distincte :
          combien j'ai gagné, combien j'ai vendu, à quel panier, à combien
          de personnes, en quelle quantité. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Chiffre d'affaires" trend={data.revenueMillimes} format="money" comparable={comparable} />
        <Kpi label="Commandes" trend={data.orders} comparable={comparable} />
        <Kpi label="Panier moyen" trend={data.aovMillimes} format="money" comparable={comparable} />
        <Kpi label="Clients" trend={data.customers} comparable={comparable} />
        <Kpi label="Articles vendus" trend={data.unitsSold} comparable={comparable} />
      </div>

      {/* Le CA exclut les 8 DT de livraison : dit une fois, ici, plutôt que
          répété sous chaque montant de la page. */}
      <p className="-mt-2 text-[11px] text-ink/40">
        Chiffre d'affaires hors frais de livraison (encaissés pour le transporteur). Commandes
        annulées exclues.
      </p>

      <Card title="Évolution du chiffre d'affaires">
        {!hasSales ? (
          <EmptyState label="Aucune vente sur cette période." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b8912e" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#b8912e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 10, fill: '#9c9490' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => String(Math.round(Number(v) / 1000))}
                  tick={{ fontSize: 10, fill: '#9c9490' }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip
                  formatter={(v) => [`${formatTND(Number(v))} DT`, 'CA']}
                  labelFormatter={(l) => dayLabel(String(l))}
                  cursor={{ stroke: '#dec9b8', strokeWidth: 1 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dec9b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenueMillimes"
                  stroke="#b8912e"
                  strokeWidth={2}
                  fill="url(#revGradient)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Venue de l'ancienne page Ventes : la seule carte qui n'y faisait
          pas doublon. Le CA dit combien ; les barres disent quand. */}
      <Card title="Commandes par jour">
        {!hasSales ? (
          <EmptyState label="Aucune vente sur cette période." />
        ) : (
          <div className="h-48">
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Produits — part du chiffre d'affaires">
          {data.topProducts.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <ul className="space-y-3">
              {data.topProducts.slice(0, 5).map((p) => (
                <li key={p.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink">{p.name}</span>
                    <span className="shrink-0 font-medium text-ink">
                      {formatTND(p.revenueMillimes)} DT
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#b8912e]"
                        style={{ width: `${Math.max(p.revenueShare * 100, 1.5)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-[11px] text-ink/45">
                      {(p.revenueShare * 100).toFixed(0)}% · {p.unitsSold} u.
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Gouvernorats">
          {data.topGovernorates.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[380px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/40">
                    <th className="pb-2 pl-1 font-medium">Gouvernorat</th>
                    <th className="pb-2 text-right font-medium">CA (DT)</th>
                    <th className="pb-2 text-right font-medium">Cmd</th>
                    <th className="pb-2 pr-1 text-right font-medium">Panier (DT)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topGovernorates.slice(0, 6).map((g) => (
                    <tr key={g.governorate} className="border-t border-sand/50">
                      <td className="py-2 pl-1">
                        <span className="text-ink">{g.governorate}</span>
                        {g.topProductName && (
                          <span className="block truncate text-[11px] text-ink/40">
                            {g.topProductName}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-medium text-ink">
                        {formatTND(g.revenueMillimes)}
                      </td>
                      <td className="py-2 text-right text-ink/60">{g.orders}</td>
                      <td className="py-2 pr-1 text-right text-ink/60">
                        {formatTND(g.aovMillimes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Pas de « Nouveaux vs revenants » : dix-huit clients, zéro revenant, et
          cinq jours d'historique. La carte reviendra avec le premier client
          qui recommande. */}
      <div>
        {/* Impact business de la livraison — pas sa gestion. Chez Laziz
            sous-traite le transport : ce bloc mesure ce que l'entreprise
            perd, il ne pilote ni tournées ni livreurs. */}
        <Card title="Impact de la livraison">
          {data.delivery.completed + data.delivery.cancelled + data.delivery.inProgress === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="Terminées"
                value={`${(data.delivery.completionRate * 100).toFixed(0)}%`}
                sub={`${data.delivery.completed} cmd`}
              />
              <MiniStat
                label="Annulées"
                value={`${(data.delivery.cancellationRate * 100).toFixed(0)}%`}
                sub={`${data.delivery.cancelled} cmd`}
                tone={data.delivery.cancellationRate > 0.15 ? 'bad' : 'neutral'}
              />
              <MiniStat
                label="CA perdu"
                value={`${formatTND(data.delivery.lostRevenueMillimes)} DT`}
                sub="commandes annulées"
                tone={data.delivery.lostRevenueMillimes > 0 ? 'bad' : 'neutral'}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Signaux : uniquement calculés à partir des chiffres ci-dessus,
          chacun accompagné de sa preuve. Voir signals.ts. */}
      <Card title="À surveiller">
        {signals.length === 0 ? (
          <p className="text-sm text-ink/45">
            Pas encore assez de données pour dégager un signal fiable sur cette période.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {signals.map((s) => (
              <li key={s.id} className="flex gap-2.5">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.tone === 'good'
                      ? 'bg-green-500'
                      : s.tone === 'bad'
                        ? 'bg-red-500'
                        : 'bg-[#b8912e]'
                  }`}
                />
                <p className="text-sm leading-relaxed text-ink/75">{s.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Commandes par statut">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {(['nouvelle', 'en_preparation', 'prete', 'terminee', 'annulee'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onGoToOrders(s)}
              className="rounded-lg border border-sand/70 px-3 py-2.5 text-left transition-colors hover:border-[#b8912e]"
            >
              <p className="font-display text-xl text-ink">{data.statusCounts[s] ?? 0}</p>
              <p className="mt-0.5 text-[11px] text-ink/50">{STATUS_LABELS[s]}</p>
            </button>
          ))}
        </div>
      </Card>

      <DataQualityNote quality={data.dataQuality} pageViews={data.pageViews.value} />
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  nouvelle: 'Nouvelles',
  en_preparation: 'En préparation',
  prete: 'Prêtes',
  terminee: 'Terminées',
  annulee: 'Annulées',
}

function MiniStat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub: string
  tone?: 'neutral' | 'bad'
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-1 font-display text-xl ${tone === 'bad' ? 'text-red-600' : 'text-ink'}`}>
        {value}
      </p>
      <p className="text-[11px] text-ink/40">{sub}</p>
    </div>
  )
}

/** Dit au lecteur quand le tableau de bord ne sait pas — condition pour
 * pouvoir faire confiance au reste. */
function DataQualityNote({
  quality,
  pageViews,
}: {
  quality: { customerIdCoverage: number; governorateCoverage: number; ordersTotal: number }
  pageViews: number
}) {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return (
    <details className="rounded-xl border border-sand/70 bg-white px-5 py-3">
      <summary className="cursor-pointer text-xs font-medium text-ink/50">
        Fiabilité des données
      </summary>
      <ul className="mt-3 space-y-1.5 text-xs text-ink/55">
        <li>Identité client (téléphone exploitable) : {pct(quality.customerIdCoverage)}</li>
        <li>Gouvernorat renseigné : {pct(quality.governorateCoverage)}</li>
        <li className="pt-1.5 text-ink/45">
          {pageViews.toLocaleString('fr-FR')} pages vues sur la période. Comptées une fois par page
          et par session : ce n'est ni un nombre de visiteurs ni un total de pages vues, et aucun
          taux de conversion fiable ne peut en être déduit.
        </li>
      </ul>
    </details>
  )
}
