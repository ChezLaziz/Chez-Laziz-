import { useState } from 'react'
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
import { moneyAvgDT, moneyDT } from '../ui/format'
import { Card, Kpi, KpiStrip } from '../ui/Card'
import BarList, { type BarRow } from '../ui/BarList'
import { DASH, STATUS_GROUPS, STATUS_VIEW, sourceLabel, statusLabel } from '../ui/palette'
import { EmptyState, ErrorState, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { DashboardPeriod } from '../shell/period'
import { MIN_ORDERS_FOR_SIGNALS, buildSignals } from '@contracts/signals'

const dayLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

const pct = (ratio: number) => `${Math.round(ratio * 100)} %`

/** Traits communs aux deux graphiques : une grille à peine visible, des
 * axes sans trait, des libellés gris. La seule chose colorée est la donnée. */
const AXIS_TICK = { fontSize: 11, fill: '#8f8883' }
const GRID = '#efebe6'
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2dcd4',
  boxShadow: '0 6px 20px -12px rgba(60,56,53,.35)',
  padding: '6px 10px',
} as const

function LoadingBoard() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[236px] rounded-xl xl:h-[124px]" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[330px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[330px] rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[280px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[280px] rounded-xl" />
      </div>
    </div>
  )
}

type Mesure = 'ca' | 'commandes'

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
  // Un seul graphique, deux lectures : le chiffre d'affaires et le nombre
  // de commandes ont la même forme neuf jours sur dix, et deux graphiques
  // presque identiques l'un sous l'autre prenaient la moitié de l'écran.
  const [mesure, setMesure] = useState<Mesure>('ca')

  if (isError) return <ErrorState label="Impossible de charger les données du tableau de bord." />
  if (isLoading || !data) return <LoadingBoard />

  const signals = buildSignals(data)
  const hasSales = data.orders.value > 0
  // Une variation n'a de sens qu'avec une vraie période de référence. Même
  // seuil que les signaux : en dessous, on écrit qu'on ne compare pas.
  const comparable = data.orders.previous >= MIN_ORDERS_FOR_SIGNALS

  /* ---- Origines des commandes ---- */
  const acq = data.acquisition
  const sourceRows: BarRow[] = acq.bySource.map((s) => ({
    key: s.source,
    label: sourceLabel(s.source),
    share: acq.totalOrders === 0 ? 0 : s.orders / acq.totalOrders,
    display: pct(acq.totalOrders === 0 ? 0 : s.orders / acq.totalOrders),
    note: `${s.orders.toLocaleString('fr-FR')} cmd`,
  }))
  // L'origine manquante est une ligne à part entière, jamais fondue dans
  // « direct » : une mesure absente n'est pas une visite directe.
  if (acq.unknownOrders > 0) {
    sourceRows.push({
      key: '__inconnue',
      label: 'Origine inconnue',
      share: acq.unknownOrders / acq.totalOrders,
      display: pct(acq.unknownOrders / acq.totalOrders),
      note: `${acq.unknownOrders.toLocaleString('fr-FR')} cmd`,
      muted: true,
    })
  }

  /* ---- Statuts ----
   * Quatre groupes à l'écran, cinq statuts en base : le clic transmet la
   * liste exacte des statuts du groupe au carnet de commandes, qui filtre
   * dessus. Rien n'est arrondi. */
  const statusRows = STATUS_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    color: g.color,
    value: g.statuses.reduce((sum, st) => sum + (data.statusCounts[st] ?? 0), 0),
    onSelect: () => onGoToOrders(g.statuses.join(',')),
  }))
  const statusTotal = statusRows.reduce((sum, s) => sum + s.value, 0)

  /* ---- Coût de revient ----
   * Coût de REVIENT des articles, pas la publicité : aucune dépense
   * publicitaire n'est enregistrée, et en inventer une fausserait tout ce
   * qui en découle. Écrit seulement si l'essentiel du chiffre d'affaires a
   * un coût saisi — sinon le nombre serait vrai sur un tiers des ventes et
   * lu comme vrai sur toutes. Tant que personne ne saisit ces coûts, la
   * ligne n'existe pas : une carte « — » en permanence ne disait rien. */
  const costCoverage = data.margins.revenueCoverage
  const costKnown = costCoverage >= 0.5 && data.orders.value > 0
  const costPerOrder = data.orders.value === 0 ? 0 : data.margins.costMillimes / data.orders.value

  const returning = data.customerMetrics.returningCustomers
  const units = data.unitsSold.value

  const productRows: BarRow[] = data.topProducts.slice(0, 5).map((p) => ({
    key: p.key,
    label: p.name,
    share: p.revenueShare,
    display: pct(p.revenueShare),
    note: `${p.unitsSold.toLocaleString('fr-FR')} vente${p.unitsSold > 1 ? 's' : ''}`,
  }))

  return (
    <div className="space-y-4">
      {/* Quatre chiffres, pas huit. Chacun répond à une question distincte :
          combien j'ai vendu, en combien de commandes, de quelle taille, à
          combien de personnes. */}
      <div>
        <KpiStrip>
          <Kpi label="Chiffre d'affaires" trend={data.revenueMillimes} format="money" comparable={comparable} />
          <Kpi
            label="Commandes"
            trend={data.orders}
            comparable={comparable}
            detail={`${units.toLocaleString('fr-FR')} article${units > 1 ? 's' : ''} vendu${units > 1 ? 's' : ''}`}
          />
          <Kpi
            label="Panier moyen"
            trend={data.aovMillimes}
            value={moneyAvgDT(data.aovMillimes.value)}
            unit="DT"
            comparable={comparable}
            detail={
              costKnown
                ? `coût de revient ${moneyAvgDT(costPerOrder)} DT par commande`
                : undefined
            }
          />
          <Kpi
            label="Clients"
            trend={data.customers}
            comparable={comparable}
            detail={`dont ${returning.toLocaleString('fr-FR')} déjà client${returning > 1 ? 's' : ''}`}
          />
        </KpiStrip>
        {/* Le CA exclut les 8 DT de livraison : dit une fois, ici, plutôt
            que répété sous chaque montant de la page. */}
        <p className="mt-2 px-1 text-[12px] leading-snug text-ink/45">
          Chiffre d'affaires hors frais de livraison, commandes annulées exclues. Variations par
          rapport à la période précédente de même durée.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Ventes par jour"
          className="lg:col-span-2"
          action={
            <div role="group" aria-label="Mesure affichée" className="flex shrink-0 rounded-lg bg-[#f3f0eb] p-0.5">
              {(
                [
                  ['ca', "Chiffre d'affaires"],
                  ['commandes', 'Commandes'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mesure === id}
                  onClick={() => setMesure(id)}
                  className={`rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
                    mesure === id
                      ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(60,56,53,0.12)]'
                      : 'text-ink/55 hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {!hasSales ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                {mesure === 'ca' ? (
                  <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={dayLabel}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={32}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(v) => Math.round(Number(v) / 1000).toLocaleString('fr-FR')}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      formatter={(v) => [`${moneyDT(Number(v))} DT`, "Chiffre d'affaires"]}
                      labelFormatter={(l) => dayLabel(String(l))}
                      cursor={{ stroke: '#c9c3bb', strokeWidth: 1 }}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenueMillimes"
                      stroke={DASH.deep}
                      strokeWidth={2}
                      fill={DASH.deep}
                      fillOpacity={0.08}
                      dot={false}
                      activeDot={{ r: 4, fill: DASH.deep, stroke: '#fff', strokeWidth: 2 }}
                      // Sans animation : la courbe est là quand la page
                      // s'ouvre, elle ne se dessine pas sous les yeux à
                      // chaque rafraîchissement d'une minute.
                      isAnimationActive={false}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={dayLabel}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={32}
                      tickMargin={8}
                    />
                    <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
                    <Tooltip
                      formatter={(v) => [String(v), 'Commandes']}
                      labelFormatter={(l) => dayLabel(String(l))}
                      cursor={{ fill: 'rgba(42,71,80,0.06)' }}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Bar
                      dataKey="orders"
                      fill={DASH.deep}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                      isAnimationActive={false}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
          {hasSales && (
            <p className="mt-1 text-[11px] text-ink/40">
              {mesure === 'ca' ? 'En dinars, par jour de commande.' : 'Nombre de commandes valides par jour.'}
            </p>
          )}
        </Card>

        <Card title="Statut des commandes">
          {statusTotal === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <StatusBreakdown
              rows={statusRows}
              total={statusTotal}
              cancellationRate={data.delivery.cancellationRate}
              lostRevenueMillimes={data.delivery.lostRevenueMillimes}
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Commandes récentes"
          className="lg:col-span-2"
          action={<LinkButton onClick={() => onGoToOrders(null)}>Toutes les commandes</LinkButton>}
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-[13px] sm:min-w-[440px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-ink/45">
                    <th className="pb-2 pl-1 pr-3 font-medium">N°</th>
                    <th className="pb-2 pr-3 font-medium">Client</th>
                    <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Produits</th>
                    <th className="pb-2 pr-3 text-right font-medium">Total</th>
                    <th className="pb-2 pr-1 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-[#efebe6]">
                      <td className="py-2.5 pl-1 pr-3 tabular-nums text-ink/60">{o.id}</td>
                      <td className="py-2.5 pr-3 text-ink">
                        <span className="block max-w-[118px] truncate sm:max-w-[150px]">{o.customerName}</span>
                      </td>
                      {/* Sous `sm`, la colonne des produits s'efface : sur un
                          téléphone elle poussait le total et le statut hors
                          de l'écran, les deux choses qu'on vient y lire. */}
                      <td className="hidden py-2.5 pr-3 text-ink/65 sm:table-cell">
                        <span className="block max-w-[220px] truncate">
                          {o.firstItemName}
                          {o.extraItems > 0 && <span className="text-ink/40"> +{o.extraItems}</span>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-medium tabular-nums text-ink">
                        {moneyDT(o.totalMillimes)} DT
                      </td>
                      <td className="py-2.5 pr-1">
                        <span
                          className={`inline-block whitespace-nowrap rounded-md border px-2 text-[11.5px] font-medium leading-[1.7] ${
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

        {/* Signaux : uniquement calculés à partir des chiffres ci-dessus,
            chacun accompagné de sa preuve. Voir signals.ts. */}
        <Card title="À surveiller">
          {signals.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-ink/50">
              Pas encore assez de données pour dégager un signal fiable sur cette période.
            </p>
          ) : (
            <ul className="space-y-3">
              {signals.map((s) => (
                <li key={s.id} className="flex gap-2.5">
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        s.tone === 'good' ? DASH.green : s.tone === 'bad' ? DASH.red : DASH.gold,
                    }}
                  />
                  <p className="text-[13px] leading-relaxed text-ink/75">{s.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Origine des commandes">
          {acq.totalOrders === 0 ? (
            <EmptyState label="Aucune commande sur cette période." />
          ) : (
            <>
              <BarList rows={sourceRows} />
              {!acq.hasAnyAttribution && (
                <p className="mt-3 text-[12px] leading-snug text-ink/45">
                  Aucune commande ne porte encore d'origine : étiquetez les liens publicitaires
                  (utm_source) pour que cette carte se remplisse.
                </p>
              )}
            </>
          )}
        </Card>

        {/* Publicité par publicité, lue sur les commandes elles-mêmes : la
            seule mesure complète, disponible le jour même. Voir
            computeAdPerformance (api/queries/analytics/acquisition.ts). */}
        <AdsCard ads={data.ads} className="lg:col-span-2" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Produits les plus vendus"
          hint="Part du chiffre d'affaires de la période."
          action={<LinkButton onClick={onGoToCatalogue}>Tous les produits</LinkButton>}
        >
          {productRows.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <BarList rows={productRows} />
          )}
        </Card>

        <Card title="Gouvernorats" hint="Les six premiers, par chiffre d'affaires.">
          {data.topGovernorates.length === 0 ? (
            <EmptyState label="Aucune vente sur cette période." />
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-[13px] sm:min-w-[380px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-ink/45">
                    <th className="pb-2 pl-1 font-medium">Gouvernorat</th>
                    <th className="pb-2 text-right font-medium">CA (DT)</th>
                    <th className="pb-2 pl-3 text-right font-medium">Cmd</th>
                    <th className="pb-2 pl-3 pr-1 text-right font-medium">Panier (DT)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topGovernorates.slice(0, 6).map((g) => (
                    <tr key={g.governorate} className="border-t border-[#efebe6]">
                      <td className="py-2 pl-1">
                        <span className="text-ink">{g.governorate}</span>
                        {g.topProductName && (
                          <span className="ml-2 hidden max-w-[150px] truncate align-bottom text-[11.5px] text-ink/40 sm:inline-block">
                            {g.topProductName}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums text-ink">
                        {moneyDT(g.revenueMillimes)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-ink/60">{g.orders}</td>
                      <td className="py-2 pr-1 text-right tabular-nums text-ink/60">{moneyAvgDT(g.aovMillimes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <DataQualityNote
        quality={data.dataQuality}
        pageViews={data.pageViews.value}
        pixel={{ seen: data.ads.pixelSeen, placed: data.ads.placed }}
      />
    </div>
  )
}

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md text-[12.5px] font-medium text-[#2a4750] underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a4750]/40"
    >
      {children}
    </button>
  )
}

/** Où en sont les commandes de la période, et ce que les annulations ont
 * coûté.
 *
 * Une barre découpée plutôt qu'un anneau : quatre longueurs sur une même
 * ligne se comparent d'un coup d'œil. Les segments sont séparés par un
 * blanc, pas par un trait, et chaque état garde son nom et son nombre
 * écrits dessous — la couleur seule ne porte jamais l'information. Chaque
 * ligne est un bouton : elle ouvre le carnet filtré sur ces commandes-là.
 *
 * L'impact des annulations vivait dans une carte à part (« Impact de la
 * livraison ») ; il est ici, sous les statuts dont il découle. Chez Laziz
 * sous-traite le transport : ces deux chiffres mesurent ce que la maison
 * perd, ils ne pilotent ni tournées ni livreurs. */
function StatusBreakdown({
  rows,
  total,
  cancellationRate,
  lostRevenueMillimes,
}: {
  rows: { key: string; label: string; color: string; value: number; onSelect: () => void }[]
  total: number
  cancellationRate: number
  lostRevenueMillimes: number
}) {
  return (
    <div>
      <p className="text-[24px] font-semibold leading-none tracking-[-0.01em] text-ink tabular-nums">
        {total.toLocaleString('fr-FR')}
        <span className="ml-2 text-[12.5px] font-normal tracking-normal text-ink/50">
          commande{total > 1 ? 's' : ''} passée{total > 1 ? 's' : ''}
        </span>
      </p>

      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {rows
          .filter((r) => r.value > 0)
          .map((r) => (
            <span
              key={r.key}
              className="h-full min-w-[5px]"
              style={{ flexGrow: r.value, flexBasis: 0, backgroundColor: r.color }}
            />
          ))}
      </div>

      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={r.onSelect}
              className="-mx-1.5 flex min-h-[36px] w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-lg px-1.5 text-left transition-colors hover:bg-ink/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a4750]/40"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: r.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink/80">{r.label}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-ink/45">{pct(total === 0 ? 0 : r.value / total)}</span>
              <span className="w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">
                {r.value.toLocaleString('fr-FR')}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#efebe6] pt-3.5">
        <div>
          <dt className="text-[12px] text-ink/50">Taux d'annulation</dt>
          <dd
            className={`mt-0.5 text-[16px] font-semibold tabular-nums ${
              cancellationRate > 0.15 ? 'text-[#b3303f]' : 'text-ink'
            }`}
          >
            {pct(cancellationRate)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink/50">Montant annulé</dt>
          <dd className="mt-0.5 whitespace-nowrap text-[16px] font-semibold tabular-nums text-ink">
            {moneyDT(lostRevenueMillimes)} <span className="text-[12px] font-medium text-ink/45">DT</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** Ce qu'une publicité a vendu, d'après les commandes — pas d'après Meta.
 *
 * Même tableau que « Gouvernorats », volontairement : une seule façon de
 * dessiner un tableau dans ce tableau de bord. L'identifiant est affiché en
 * entier et en chasse fixe : c'est celui de la colonne « ID de la
 * publicité » du Gestionnaire de publicités, et on doit pouvoir les
 * comparer chiffre à chiffre. */
function AdsCard({
  ads,
  className = '',
}: {
  ads: {
    rows: {
      label: string | null
      sources: string[]
      placed: number
      orders: number
      cancelled: number
      aovMillimes: number
      pixelSeen: number
      firstOrderAt: string
      lastOrderAt: string
    }[]
    placed: number
  }
  className?: string
}) {
  const jour = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const part = (n: number, d: number) => (d === 0 ? '—' : `${Math.round((n / d) * 100)} %`)
  // Neuf publicités au plus, et la ligne « sans étiquette » TOUJOURS : c'est
  // elle qui ferme le total, la couper ferait croire que tout est étiqueté.
  const publicites = ads.rows.filter((r) => r.label !== null)
  const sansEtiquette = ads.rows.find((r) => r.label === null)
  const rows = [...publicites.slice(0, 9), ...(sansEtiquette ? [sansEtiquette] : [])]
  const masquees = Math.max(publicites.length - 9, 0)

  return (
    <Card title="Publicités" hint="Ce que chaque publicité a vendu, compté sur les commandes." className={className}>
      {ads.placed === 0 ? (
        <EmptyState label="Aucune commande sur cette période." />
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-ink/45">
                  <th className="pb-2 pl-1 font-medium">Publicité</th>
                  <th className="pb-2 pr-4 text-right font-medium">Passées</th>
                  <th className="pb-2 pr-4 text-right font-medium">Valides</th>
                  <th className="pb-2 pr-4 text-right font-medium">Annulées</th>
                  <th className="pb-2 pr-4 text-right font-medium">Panier (DT)</th>
                  <th className="pb-2 pr-1 text-right font-medium">Vues par le Pixel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const taux = r.placed === 0 ? 0 : r.cancelled / r.placed
                  return (
                    <tr key={r.label ?? '__sans'} className="border-t border-[#efebe6]">
                      <td className="py-2 pl-1 pr-4">
                        {r.label === null ? (
                          <span className="text-ink/60">Sans étiquette de publicité</span>
                        ) : (
                          <span className="break-all font-mono text-[12px] text-ink">{r.label}</span>
                        )}
                        <span className="block text-[11.5px] text-ink/40">
                          {r.sources.length > 0 ? `${r.sources.map(sourceLabel).join(' + ')}, ` : ''}
                          {jour(r.firstOrderAt)}
                          {jour(r.firstOrderAt) === jour(r.lastOrderAt) ? '' : ` au ${jour(r.lastOrderAt)}`}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium tabular-nums text-ink">{r.placed}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-ink/60">{r.orders}</td>
                      <td
                        className={`whitespace-nowrap py-2 pr-4 text-right tabular-nums ${
                          r.placed >= 8 && taux >= 0.25 ? 'text-[#b3303f]' : 'text-ink/60'
                        }`}
                      >
                        {r.cancelled}
                        <span className="ml-1.5 text-[11.5px] opacity-70">{part(r.cancelled, r.placed)}</span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                        {r.orders === 0 ? '—' : moneyAvgDT(r.aovMillimes)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-1 text-right tabular-nums text-ink/60">
                        {r.pixelSeen}
                        <span className="ml-1.5 text-[11.5px] opacity-70">{part(r.pixelSeen, r.placed)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-ink/45">
            D'après l'étiquette du lien publicitaire (utm_content = identifiant de la publicité) :
            indépendant de ce que Meta attribue, et disponible le jour même. « Passées » inclut les
            annulées. « Vues par le Pixel » : commandes arrivées après « Accepter ».
            {masquees > 0 ? ` ${masquees} autre${masquees > 1 ? 's' : ''} ligne${masquees > 1 ? 's' : ''} non affichée${masquees > 1 ? 's' : ''}.` : ''}
          </p>
        </>
      )}
    </Card>
  )
}

/** Dit au lecteur quand le tableau de bord ne sait pas — condition pour
 * pouvoir faire confiance au reste. */
function DataQualityNote({
  quality,
  pageViews,
  pixel,
}: {
  quality: { customerIdCoverage: number; governorateCoverage: number; ordersTotal: number }
  pageViews: number
  pixel: { seen: number; placed: number }
}) {
  return (
    <details className="rounded-xl border border-[#e9e4dd] bg-white px-4 py-3 sm:px-5">
      <summary className="cursor-pointer text-[13px] font-medium text-ink/60">Fiabilité des données</summary>
      <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink/60">
        <li>Identité client (téléphone exploitable) : {pct(quality.customerIdCoverage)}</li>
        <li>Gouvernorat renseigné : {pct(quality.governorateCoverage)}</li>
        {pixel.placed > 0 && (
          <li>
            Commandes arrivées avec les cookies du Pixel Meta : {pct(pixel.seen / pixel.placed)} (
            {pixel.seen} sur {pixel.placed}). Les autres ne partent chez Meta qu'avec le téléphone
            haché : c'est la part des ventes que le Gestionnaire de publicités voit le moins bien.
          </li>
        )}
        <li className="pt-1 text-ink/50">
          {pageViews.toLocaleString('fr-FR')} pages vues sur la période. Comptées une fois par page
          et par session : ce n'est ni un nombre de visiteurs ni un total de pages vues, et aucun
          taux de conversion fiable ne peut en être déduit.
        </li>
      </ul>
    </details>
  )
}
