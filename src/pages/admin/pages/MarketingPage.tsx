import { Bar, BarChart, Cell as RCell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatTND } from '@/lib/shop'
import { Card } from '../ui/Card'
import { Cell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, InsufficientData, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import AdSpendSection from './AdSpendSection'
import { SOURCE_COLOR, SOURCE_LABEL } from '../sources'
import { NETWORKS, type NetworkKey } from '@contracts/social'
import type { PresetRange } from '@contracts/analytics'

const DEVICE_LABEL: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
}

export default function MarketingPage({ token, period }: { token: string; period: PresetRange }) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger les données marketing." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const a = data.acquisition

  return (
    <div className="space-y-5">
      {/* La couverture d'abord : sans elle, un graphe « TikTok 3 commandes »
          se lit comme un classement alors qu'il ne décrit qu'une fraction. */}
      <CoverageBanner
        attributed={a.attributedOrders}
        total={a.totalOrders}
        coverage={a.orderCoverage}
      />

      {a.hasAnyAttribution ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Commandes par origine">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={a.bySource}
                    margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="source"
                      tickFormatter={(s) => SOURCE_LABEL[String(s)] ?? String(s)}
                      tick={{ fontSize: 11, fill: '#3c3835' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#9c9490' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(184,145,46,0.06)' }}
                      formatter={(v) => [String(v), 'Commandes']}
                      labelFormatter={(l) => SOURCE_LABEL[String(l)] ?? String(l)}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dec9b8' }}
                    />
                    <Bar dataKey="orders" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {a.bySource.map((s) => (
                        <RCell key={s.source} fill={SOURCE_COLOR[s.source] ?? '#9c9490'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Chiffre d'affaires par origine">
              <Table
                minWidth={340}
                columns={[
                  { label: 'Origine' },
                  { label: 'CA (DT)', align: 'right' },
                  { label: 'Cmd', align: 'right' },
                  { label: 'Panier (DT)', align: 'right' },
                  { label: 'Part', align: 'right' },
                ]}
              >
                {a.bySource.map((s) => (
                  <Row key={s.source}>
                    <Cell first>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: SOURCE_COLOR[s.source] ?? '#9c9490' }}
                        />
                        {SOURCE_LABEL[s.source] ?? s.source}
                      </span>
                    </Cell>
                    <Cell align="right">{formatTND(s.revenueMillimes)}</Cell>
                    <Cell align="right" muted>
                      {s.orders}
                    </Cell>
                    <Cell align="right" muted>
                      {formatTND(s.aovMillimes)}
                    </Cell>
                    <Cell align="right" muted last>
                      {(s.revenueShare * 100).toFixed(0)}%
                    </Cell>
                  </Row>
                ))}
              </Table>
              <p className="mt-3 text-[11px] text-ink/40">
                Part calculée sur le chiffre d'affaires attribué, pas sur le total — sinon le
                pourcentage bougerait avec le taux de couverture, sans qu'aucune vente ne change.
              </p>
            </Card>
          </div>

          <LabelTable
            title="Campagnes"
            rows={a.byCampaign}
            empty="Aucune commande ne porte d'étiquette de campagne. Ajoutez `utm_campaign=` à vos liens publicitaires."
          />
          <LabelTable
            title="Créatives"
            rows={a.byCreative}
            empty="Aucune commande ne porte d'étiquette de créative. Ajoutez `utm_content=` pour distinguer vos visuels."
          />
        </>
      ) : (
        <Card title="Origine des commandes">
          <EmptyState label="Aucune commande n'a encore d'origine connue." />
          <p className="mx-auto mt-2 max-w-xl text-center text-xs leading-relaxed text-ink/50">
            La mesure vient de démarrer : seules les commandes passées après sa mise en place
            peuvent en porter une. Utilisez les liens étiquetés ci-dessous et les premières origines
            apparaîtront ici.
          </p>
        </Card>
      )}

      {a.byDevice.length > 0 && (
        <Card title="Appareils">
          <ul className="space-y-3">
            {a.byDevice.map((d) => (
              <li key={d.device}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink">{DEVICE_LABEL[d.device] ?? d.device}</span>
                  <span className="text-ink/55">
                    <span className="font-medium text-ink">{d.orders}</span> cmd ·{' '}
                    {formatTND(d.revenueMillimes)} DT
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#b8912e]"
                    style={{ width: `${Math.max(d.share * 100, 1.5)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <TaggedLinks />

      {/* Coût par commande et retour sur dépense — calculés UNIQUEMENT à
          partir des montants réellement saisis. Aucun budget n'est deviné :
          un mois non renseigné reste vide plutôt que d'être estimé. */}
      <AdSpendSection token={token} />
    </div>
  )
}

function CoverageBanner({
  attributed,
  total,
  coverage,
}: {
  attributed: number
  total: number
  coverage: number
}) {
  if (total === 0) return null
  const pct = Math.round(coverage * 100)
  if (attributed === 0) {
    return (
      <InsufficientData
        label={`Aucune des ${total} commandes de cette période ne porte d'origine connue. C'est attendu tant que vos liens ne sont pas étiquetés : sans étiquette, un clic depuis Instagram ou TikTok arrive sans rien qui l'identifie.`}
      />
    )
  }
  return (
    <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
          Couverture de l'attribution
        </p>
        <p className="text-sm">
          <span className="font-display text-2xl leading-none text-ink">{pct}%</span>
          <span className="ml-2 text-ink/50">
            {attributed} commande{attributed > 1 ? 's' : ''} sur {total}
          </span>
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <div className="h-full rounded-full bg-[#b8912e]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-ink/45">
        Les {total - attributed} commandes restantes sont arrivées sans origine identifiable — lien
        non étiqueté, navigateur qui masque la provenance, ou adresse tapée directement. Elles
        comptent dans votre chiffre d'affaires mais pas dans les répartitions ci-dessous.
      </p>
    </div>
  )
}

function LabelTable({
  title,
  rows,
  empty,
}: {
  title: string
  rows: { key: string; label: string; source: string | null; orders: number; revenueMillimes: number }[]
  empty: string
}) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm leading-relaxed text-ink/45">{empty}</p>
      ) : (
        <Table
          columns={[
            { label: title === 'Campagnes' ? 'Campagne' : 'Créative' },
            { label: 'Origine' },
            { label: 'Cmd', align: 'right' },
            { label: 'CA (DT)', align: 'right' },
          ]}
        >
          {rows.map((r) => (
            <Row key={r.key}>
              <Cell first>{r.label}</Cell>
              <Cell muted>{r.source ? (SOURCE_LABEL[r.source] ?? r.source) : '—'}</Cell>
              <Cell align="right" muted>
                {r.orders}
              </Cell>
              <Cell align="right" last>
                {formatTND(r.revenueMillimes)}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </Card>
  )
}

const BASE = 'https://chezlaziz.com'
const TAGGED: { network: NetworkKey; url: string }[] = [
  { network: 'instagram', url: `${BASE}/?utm_source=instagram&utm_campaign=bio` },
  { network: 'facebook', url: `${BASE}/?utm_source=facebook&utm_campaign=bio` },
  { network: 'tiktok', url: `${BASE}/?utm_source=tiktok&utm_campaign=bio` },
  { network: 'google', url: `${BASE}/?utm_source=google&utm_campaign=fiche` },
]

/** Le tableau ci-dessus ne se remplit que si les liens sont étiquetés. Les
 * donner tout faits est la seule chose qui transforme cette page d'une
 * promesse en une mesure. */
function TaggedLinks() {
  return (
    <Card title="Vos liens à utiliser">
      <p className="mb-4 text-xs leading-relaxed text-ink/55">
        Remplacez le lien de votre bio par celui de la plateforme correspondante. C'est ce qui
        permet de savoir d'où vient chaque commande — le client, lui, ne voit aucune différence et
        rien ne lui est demandé.
      </p>
      <ul className="space-y-2.5">
        {TAGGED.map(({ network, url }) => (
          <li key={network} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex w-24 shrink-0 items-center gap-2 text-sm text-ink">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: NETWORKS[network].color }}
              />
              {NETWORKS[network].label}
            </span>
            <code className="min-w-0 flex-1 truncate rounded bg-[#faf6f3] px-2.5 py-1.5 font-mono text-[11px] text-ink/70">
              {url}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(url)}
              className="shrink-0 rounded-full border border-ink/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60 transition-colors hover:border-[#b8912e] hover:text-accent"
            >
              Copier
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-ink/40">
        Pour une publicité précise, ajoutez <code className="font-mono">&amp;utm_content=</code>
        suivi du nom du visuel — la ligne « Créatives » vous dira alors lequel vend le mieux.
      </p>
    </Card>
  )
}
