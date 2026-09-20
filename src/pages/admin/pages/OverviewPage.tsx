import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ProductImage from '@/components/ProductImage'
import { moneyDT } from '../ui/format'
import { Card, Kpi, type Trend } from '../ui/Card'
import Donut, { type DonutSlice } from '../ui/Donut'
import { DASH, SERIES_COLORS, STATUS_GROUPS, STATUS_VIEW, sourceLabel, statusLabel } from '../ui/palette'
import { EmptyState, ErrorState, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { DashboardPeriod } from '../shell/period'
import { MIN_ORDERS_FOR_SIGNALS, buildSignals } from '@contracts/signals'

const dayLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

const DAY_MS = 24 * 60 * 60 * 1000

/** Variation d'une métrique calculée ici plutôt que servie par l'API.
 *
 * Même règle que côté serveur (voir percentChange) : pas de base de
 * comparaison = null, jamais « +100 % ». */
function trendOf(value: number, previous: number): Trend {
  return {
    value,
    previous,
    changePercent: previous === 0 ? null : ((value - previous) / previous) * 100,
  }
}

function LoadingBoard() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <Skeleton className="h-[238px] rounded-2xl lg:col-span-12 min-[1480px]:col-span-5" />
        <Skeleton className="h-[200px] rounded-2xl lg:col-span-6 min-[1480px]:col-span-4" />
        <Skeleton className="h-[190px] rounded-2xl lg:col-span-6 min-[1480px]:col-span-3" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function OverviewPage({
  token,
  period,
  onGoToOrders,
  onGoToCatalogue,
}: {
  token: string
  period: DashboardPeriod
  onGoToOrders: (status: string | null) => void
  onGoToCatalogue: () => void
}) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger les données du tableau de bord." />
  if (isLoading || !data) return <LoadingBoard />

  const signals = buildSignals(data)
  const hasSales = data.orders.value > 0
  // Une variation n'a de sens qu'avec une vraie période de référence. Même
  // seuil que les signaux : en dessous, on écrit qu'on ne compare pas.
  const comparable = data.orders.previous >= MIN_ORDERS_FOR_SIGNALS

  // Étiquette de la carte, pas un second filtre : le tableau de bord n'a
  // qu'un sélecteur de période, en haut de page. Deux contrôles pour la
  // même chose donneraient deux périodes affichées côte à côte.
  const days = Math.max(Math.round((period.end.getTime() - period.start.getTime()) / DAY_MS) + 1, 1)
  const periodLabel = `${days} jour${days > 1 ? 's' : ''}`

  /* ---- Origines des commandes ---- */
  const acq = data.acquisition
  const sourceSlices: DonutSlice[] = acq.bySource.map((s, i) => ({
    key: s.source,
    label: sourceLabel(s.source),
    value: s.orders,
    color: SERIES_COLORS[i % SERIES_COLORS.length]!,
  }))
  // L'origine manquante est une tranche à part entière, jamais fondue dans
  // « direct » : une mesure absente n'est pas une visite directe.
  if (acq.unknownOrders > 0) {
    sourceSlices.push({
      key: '__inconnue',
      label: 'Origine inconnue',
      value: acq.unknownOrders,
      color: DASH.grey,
    })
  }

  /* ---- Statuts ----
   * Quatre groupes à l'écran, cinq statuts en base : le clic transmet la
   * liste exacte des statuts du groupe au carnet de commandes, qui filtre
   * dessus. Rien n'est arrondi. */
  const statusSlices: DonutSlice[] = STATUS_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    value: g.statuses.reduce((sum, st) => sum + (data.statusCounts[st] ?? 0), 0),
    color: g.color,
    onSelect: () => onGoToOrders(g.statuses.join(',')),
  }))
  const statusTotal = statusSlices.reduce((sum, s) => sum + s.value, 0)

  /* ---- Coût par commande ----
   * Coût de REVIENT des articles, pas la publicité : aucune dépense
   * publicitaire n'est enregistrée, et en inventer une fausserait tout ce
   * qui en découle. Affiché seulement si l'essentiel du chiffre d'affaires
   * a un coût saisi — sinon le nombre serait vrai sur un tiers des ventes
   * et lu comme vrai sur toutes. */
  const costCoverage = data.margins.revenueCoverage
  const costKnown = costCoverage >= 0.5 && data.orders.value > 0
  const costPerOrder = data.orders.value === 0 ? 0 : data.margins.costMillimes / data.orders.value
  const prevCostPerOrder =
    data.orders.previous === 0 ? 0 : data.previousMargins.costMillimes / data.orders.previous

  return (
    <div className="space-y-3">
      {/* Quatre chiffres, pas vingt. Chacun répond à une question distincte :
          combien j'ai gagné, combien de commandes, combien de personnes, en
          quelle quantité. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="revenue" label="Chiffre d'affaires" trend={data.revenueMillimes} format="money" comparable={comparable} />
        <Kpi icon="orders" label="Commandes" trend={data.orders} comparable={comparable} />
        <Kpi icon="customers" label="Clients" trend={data.customers} comparable={comparable} />
        <Kpi icon="units" label="Articles vendus" trend={data.unitsSold} comparable={comparable} />
      </div>

      {/* Le CA exclut les 8 DT de livraison : dit une fois, ici, plutôt que
          répété sous chaque montant de la page. */}
      <p className="!mt-1 px-1 text-[11px] leading-snug text-ink/40">
        Chiffre d'affaires hors frais de livraison (encaissés pour le transporteur). Commandes
        annulées exclues.
      </p>

      <div className="grid gap-3 lg:grid-cols-12">
        <Card
          title="Évolution du chiffre d'affaires"
          icon="chart"
          className="lg:col-span-12 min-[1480px]:col-span-5"
          action={
            <span className="shrink-0 rounded-lg border border-[#e6e0d9] px-2 py-0.5 text-[11px] text-ink/55">
              {periodLabel}
            </span>
          }
        >
          {!hasSales ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueTrend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DASH.sage} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={DASH.sage} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#eeeae5" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={dayLabel}
                    tick={{ fontSize: 11, fill: '#9c9490' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={(v) => String(Math.round(Number(v) / 1000))}
                    tick={{ fontSize: 11, fill: '#9c9490' }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    formatter={(v) => [`${moneyDT(Number(v))} DT`, 'CA']}
                    labelFormatter={(l) => dayLabel(String(l))}
                    cursor={{ stroke: DASH.sageSoft, strokeWidth: 1 }}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border: '1px solid #e5ded6',
                      boxShadow: '0 8px 24px -12px rgba(60,56,53,.4)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenueMillimes"
                    stroke={DASH.deep}
                    strokeWidth={2}
                    fill="url(#revGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: DASH.deep }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card
          title="Sources de commandes"
          className="lg:col-span-6 min-[1480px]:col-span-4"
          bodyClassName="flex flex-col justify-center"
        >
          {acq.totalOrders === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <>
              <Donut
                slices={sourceSlices}
                total={acq.totalOrders}
                totalLabel="commandes"
                valueFormat="percent"
              />
              {!acq.hasAnyAttribution && (
                <p className="mt-2 text-[11px] leading-snug text-ink/40">
                  Aucune commande ne porte encore d'origine : étiquetez les liens publicitaires
                  (utm_source) pour que cette carte se remplisse.
                </p>
              )}
            </>
          )}
        </Card>

        <Card
          title="Statut des commandes"
          className="lg:col-span-6 min-[1480px]:col-span-3"
          bodyClassName="flex flex-col justify-center"
        >
          {statusTotal === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <Donut slices={statusSlices} total={statusTotal} totalLabel="total" height={104} />
          )}
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon="basket"
          label="Panier moyen"
          trend={data.aovMillimes}
          format="money"
          comparable={comparable}
          compact
        />
        <Kpi
          icon="cost"
          label="Coût par commande"
          value={costKnown ? `${moneyDT(Math.round(costPerOrder))} DT` : '—'}
          trend={costKnown ? trendOf(costPerOrder, prevCostPerOrder) : undefined}
          // Un coût qui monte est une mauvaise nouvelle : sans ceci, la
          // hausse s'afficherait en vert.
          inverse
          comparable={comparable}
          note={
            costKnown
              ? `coût de revient · ${Math.round(costCoverage * 100)}% du CA couvert`
              : 'coût de revient non saisi dans Produits'
          }
          compact
        />
        <Kpi
          icon="rate"
          label="Taux de conversion"
          value="—"
          // Les pages vues sont dédoublonnées par page ET par session : on
          // ne sait pas combien de personnes sont venues, donc aucun taux
          // de conversion ne peut en être tiré. Mieux vaut un tiret qu'un
          // pourcentage qui se lirait comme une mesure.
          note="visiteurs uniques non mesurés"
          compact
        />
        <Kpi
          icon="returning"
          label="Clients récurrents"
          value={data.customerMetrics.returningCustomers.toLocaleString('fr-FR')}
          trend={trendOf(
            data.customerMetrics.returningCustomers,
            data.previousCustomerMetrics.returningCustomers,
          )}
          comparable={comparable}
          compact
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <Card
          title="Produits les plus vendus"
          className="lg:col-span-6 min-[1480px]:col-span-4"
          action={
            <button
              onClick={onGoToCatalogue}
              className="shrink-0 text-[12px] text-ink/45 transition-colors hover:text-[#2a4750]"
            >
              Voir tout
            </button>
          }
        >
          {data.topProducts.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <ul className="space-y-2">
              {data.topProducts.slice(0, 4).map((p) => (
                <li key={p.key} className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#f5ece5]">
                    <ProductImage src={p.imageUrl} alt="" compact />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}</span>
                  <span className="w-[40%] max-w-[176px] shrink-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] text-ink/50">
                        {p.unitsSold.toLocaleString('fr-FR')} vente{p.unitsSold > 1 ? 's' : ''}
                      </span>
                      <span
                        className="text-[13px] font-semibold text-ink"
                        title="part du chiffre d'affaires"
                      >
                        {(p.revenueShare * 100).toFixed(0)}%
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(p.revenueShare * 100, 2)}%`,
                          backgroundColor: '#5d7876',
                        }}
                      />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Commandes récentes"
          className="lg:col-span-6 min-[1480px]:col-span-5"
          action={
            <button
              onClick={() => onGoToOrders(null)}
              className="shrink-0 text-[12px] text-ink/45 transition-colors hover:text-[#2a4750]"
            >
              Voir tout
            </button>
          }
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[380px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-ink/40">
                    <th className="rounded-l-lg bg-ink/[0.025] py-1.5 pl-2.5 pr-2 font-medium">#</th>
                    <th className="bg-ink/[0.025] py-1.5 pr-3 font-medium">Client</th>
                    <th className="bg-ink/[0.025] py-1.5 pr-3 font-medium">Produits</th>
                    <th className="bg-ink/[0.025] py-1.5 pr-3 text-right font-medium">Total</th>
                    <th className="rounded-r-lg bg-ink/[0.025] py-1.5 pr-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-sand/40 last:border-0">
                      <td className="py-1.5 pl-2.5 pr-2 text-ink/70">#{o.id}</td>
                      <td className="py-1.5 pr-3 text-ink">
                        <span className="block max-w-[92px] truncate">{o.customerName}</span>
                      </td>
                      <td className="py-1.5 pr-3 text-ink/70">
                        <span className="block max-w-[116px] truncate">
                          {o.firstItemName}
                          {o.extraItems > 0 && (
                            <span className="text-ink/40"> +{o.extraItems}</span>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-3 text-right font-medium text-ink">
                        {moneyDT(o.totalMillimes)} DT
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-md border px-2 py-0 text-[11px] font-medium leading-[1.6] ${
                            STATUS_VIEW[o.status as keyof typeof STATUS_VIEW]?.pill ??
                            'border-ink/10 bg-ink/[0.05] text-ink/60'
                          }`}
                        >
                          {statusLabel(o.status, 'one')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <PromoCard className="lg:col-span-12 min-[1480px]:col-span-3" />
      </div>

      {/* ------------------------------------------------------------------
          Ce qui suit existait avant la maquette et continue de servir :
          le détail des commandes dans le temps, la géographie, l'impact des
          annulations, les signaux et la fiabilité des données. La maquette
          dessine le haut de page ; elle ne dit pas de jeter ces chiffres.
          ------------------------------------------------------------------ */}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Commandes par jour" icon="orders">
          {!hasSales ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#eeeae5" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={dayLabel}
                    tick={{ fontSize: 11, fill: '#9c9490' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#9c9490' }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    formatter={(v) => [String(v), 'Commandes']}
                    labelFormatter={(l) => dayLabel(String(l))}
                    cursor={{ fill: 'rgba(42,71,80,0.06)' }}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border: '1px solid #e5ded6',
                      boxShadow: '0 8px 24px -12px rgba(60,56,53,.4)',
                    }}
                  />
                  <Bar dataKey="orders" fill={DASH.sage} radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Gouvernorats">
          {data.topGovernorates.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[380px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/40">
                    <th className="pb-1.5 pl-1 font-medium">Gouvernorat</th>
                    <th className="pb-1.5 text-right font-medium">CA (DT)</th>
                    <th className="pb-1.5 text-right font-medium">Cmd</th>
                    <th className="pb-1.5 pr-1 text-right font-medium">Panier (DT)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topGovernorates.slice(0, 6).map((g) => (
                    <tr key={g.governorate} className="border-t border-sand/50">
                      <td className="py-1.5 pl-1">
                        <span className="text-ink">{g.governorate}</span>
                        {g.topProductName && (
                          <span className="ml-2 inline-block max-w-[150px] truncate align-bottom text-[11px] text-ink/40">
                            {g.topProductName}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-right font-medium text-ink">
                        {moneyDT(g.revenueMillimes)}
                      </td>
                      <td className="py-1.5 text-right text-ink/60">{g.orders}</td>
                      <td className="py-1.5 pr-1 text-right text-ink/60">
                        {moneyDT(g.aovMillimes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Impact business de la livraison — pas sa gestion. Chez Laziz
            sous-traite le transport : ce bloc mesure ce que l'entreprise
            perd, il ne pilote ni tournées ni livreurs. */}
        <Card title="Impact de la livraison">
          {data.delivery.completed + data.delivery.cancelled + data.delivery.inProgress === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <div className="grid grid-cols-3 gap-2">
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
                value={`${moneyDT(data.delivery.lostRevenueMillimes)} DT`}
                sub="commandes annulées"
                tone={data.delivery.lostRevenueMillimes > 0 ? 'bad' : 'neutral'}
              />
            </div>
          )}
        </Card>

        {/* Signaux : uniquement calculés à partir des chiffres ci-dessus,
            chacun accompagné de sa preuve. Voir signals.ts. */}
        <Card title="À surveiller">
          {signals.length === 0 ? (
            <p className="text-sm text-ink/45">
              Pas encore assez de données pour dégager un signal fiable sur cette période.
            </p>
          ) : (
            <ul className="space-y-2">
              {signals.map((s) => (
                <li key={s.id} className="flex gap-2.5">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        s.tone === 'good' ? DASH.green : s.tone === 'bad' ? DASH.red : DASH.gold,
                    }}
                  />
                  <p className="text-[13px] leading-snug text-ink/75">{s.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DataQualityNote quality={data.dataQuality} pageViews={data.pageViews.value} />

      <p className="pt-0.5 text-center text-[11px] text-ink/35">
        Fait avec passion en Tunisie
        <span className="mx-2 text-ink/20">|</span>
        Chez Laziz
        <span className="mx-2 text-ink/20">|</span>
        {new Date().getFullYear()}
      </p>
    </div>
  )
}

/** Carte de marque de la maquette — les photos de la maison, à l'endroit
 * exact où elle les place.
 *
 * Deux cadrages pour deux formes : en colonne étroite (grand écran), la
 * photo verticale du plat ; en bandeau large (tablette et téléphone), le
 * coffret. Un seul fichier redimensionné donnerait un plat coupé en deux
 * dans un bandeau, ou un coffret réduit à une tache dans une colonne. */
function PromoCard({ className = '' }: { className?: string }) {
  return (
    <article
      className={`relative min-h-[168px] overflow-hidden rounded-2xl border border-[#ece7e1] shadow-[0_1px_2px_rgba(60,56,53,0.04),0_10px_30px_-18px_rgba(60,56,53,0.35)] ${className}`}
    >
      <picture>
        <source media="(min-width: 1480px)" srcSet="/images/admin/promo.webp" />
        <img
          src="/images/admin/promo-wide.webp"
          alt="Makroudh Chez Laziz"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, rgba(38,44,42,.82) 0%, rgba(38,44,42,.55) 42%, rgba(38,44,42,.08) 78%)',
        }}
      />
      <div className="relative flex h-full min-h-[168px] flex-col justify-between p-4">
        <div>
          <p className="font-display text-[19px] italic leading-snug text-white/95">
            Plus qu'un dessert,
            <br />
            une histoire tunisienne
          </p>
          <div className="mt-3 h-px w-10 bg-white/50" />
        </div>
        <p className="self-end font-display text-[15px] tracking-[0.18em] text-white/90">
          CHEZ&nbsp;LAZIZ
        </p>
      </div>
    </article>
  )
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
      <p className={`font-display text-[19px] leading-tight ${tone === 'bad' ? 'text-red-600' : 'text-ink'}`}>
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
    <details className="rounded-2xl border border-[#ece7e1] bg-white px-4 py-2.5">
      <summary className="cursor-pointer text-xs font-medium text-ink/50">
        Fiabilité des données
      </summary>
      <ul className="mt-2 space-y-1 text-xs text-ink/55">
        <li>Identité client (téléphone exploitable) : {pct(quality.customerIdCoverage)}</li>
        <li>Gouvernorat renseigné : {pct(quality.governorateCoverage)}</li>
        <li className="pt-1 text-ink/45">
          {pageViews.toLocaleString('fr-FR')} pages vues sur la période. Comptées une fois par page
          et par session : ce n'est ni un nombre de visiteurs ni un total de pages vues, et aucun
          taux de conversion fiable ne peut en être déduit.
        </li>
      </ul>
    </details>
  )
}
