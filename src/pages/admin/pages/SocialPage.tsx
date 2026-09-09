import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { Card } from '../ui/Card'
import { Cell, Row, Table } from '../ui/Table'
import { ErrorState, InsufficientData, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import { NETWORKS, NETWORK_KEYS, STALE_AFTER_DAYS, type NetworkKey } from '@contracts/social'
import type { PresetRange } from '@contracts/analytics'

/** Réseaux sociaux : audience relevée à la main, ventes réellement attribuées.
 *
 * DEUX MESURES DE NATURES DIFFÉRENTES cohabitent ici, et les confondre serait
 * la faute la plus facile à commettre sur cette page :
 *
 *   - les ABONNÉS sont saisis à la main, valent pour le compte entier et pour
 *     le jour de la saisie ;
 *   - les COMMANDES sont mesurées en continu, ne couvrent que la période
 *     choisie en haut de page, et seulement depuis que les liens sont
 *     étiquetés.
 *
 * D'où le refus délibéré d'afficher un « taux de conversion » abonnés →
 * commandes : le dénominateur n'est pas un nombre de visiteurs, les deux
 * chiffres ne couvrent pas la même fenêtre, et le rapport ressemblerait à une
 * mesure alors qu'il n'en serait pas une. Les deux colonnes sont montrées
 * côte à côte, chacune avec ce qu'elle vaut. */

const GLYPHS: Record<NetworkKey, React.ReactNode> = {
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.5-.1-1.4-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9V11H7.5v3H10v7h3.5Z" />
    </svg>
  ),
  tiktok: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 3c.4 2.3 1.9 3.8 4.4 4v3.1c-1.6 0-3-.5-4.4-1.4v6.4c0 3.5-2.6 5.9-5.9 5.9A5.7 5.7 0 0 1 5 15.2c0-3.4 2.8-5.9 6.3-5.7v3.2c-1.7-.3-3.1.7-3.1 2.4 0 1.5 1.1 2.6 2.6 2.6 1.7 0 2.7-1.2 2.7-3V3h3.1Z" />
    </svg>
  ),
  google: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
    </svg>
  ),
}

const nf = (n: number) => n.toLocaleString('fr-FR')

export default function SocialPage({ token, period }: { token: string; period: PresetRange }) {
  const social = trpc.social.overview.useQuery({ token }, { staleTime: 30000 } as never)
  const analytics = useOverview(token, period)

  if (social.isError) return <ErrorState label="Impossible de charger les relevés des réseaux." />
  if (social.isLoading || !social.data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const o = social.data
  // Commandes attribuées à chaque plateforme sur la période choisie. Absente
  // tant que l'analytique n'a pas répondu : on n'affiche pas 0 en attendant.
  const bySource = new Map(
    (analytics.data?.acquisition.bySource ?? []).map((s) => [s.source, s]),
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Abonnés, tous réseaux" value={o.hasAnyData ? nf(o.totalFollowers) : '—'} />
        <Figure
          label="Variation nette"
          value={
            o.netFollowersDelta === null
              ? '—'
              : `${o.netFollowersDelta > 0 ? '+' : ''}${nf(o.netFollowersDelta)}`
          }
          hint={
            o.netFollowersDelta === null
              ? 'un seul relevé : pas de comparaison'
              : 'depuis le relevé précédent'
          }
          tone={
            o.netFollowersDelta === null ? 'neutral' : o.netFollowersDelta < 0 ? 'bad' : 'good'
          }
        />
        <Figure
          label="Réseaux en baisse"
          value={String(o.decliningNetworks.length)}
          hint={
            o.decliningNetworks.length === 0
              ? 'aucun recul au dernier relevé'
              : o.decliningNetworks.map((n) => NETWORKS[n].label).join(', ')
          }
          tone={o.decliningNetworks.length > 0 ? 'bad' : 'neutral'}
        />
        <Figure
          label="Relevés périmés"
          value={String(o.staleNetworks.length)}
          hint={`plus de ${STALE_AFTER_DAYS} jours`}
          tone={o.staleNetworks.length > 0 ? 'bad' : 'neutral'}
        />
      </div>

      {/* La variation nette masque les compensations : +100 sur Instagram et
          −100 sur Facebook donnent zéro. Le détail par réseau existe pour ça,
          mais le dire ici évite de lire « 0 » comme « rien ne bouge ». */}
      {o.netFollowersDelta === 0 && o.decliningNetworks.length > 0 && (
        <InsufficientData label="La variation nette est à zéro, mais elle additionne des gains et des pertes qui se compensent. Regardez le détail par réseau plus bas." />
      )}

      {!o.hasAnyData ? (
        <InsufficientData label="Aucun relevé n'a encore été saisi. Ouvrez chaque réseau, notez le nombre d'abonnés et de messages dans le formulaire plus bas — la courbe et les variations apparaîtront dès le deuxième relevé." />
      ) : (
        <Card title="Évolution des abonnés">
          {o.trend.length < 2 ? (
            <InsufficientData label="Un seul relevé pour l'instant : une courbe demande au moins deux points. Refaites une saisie dans quelques jours." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={o.trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="at"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                    tickFormatter={(t) =>
                      new Date(Number(t)).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                    tick={{ fontSize: 11, fill: '#9c9490' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9c9490' }}
                    axisLine={false}
                    tickLine={false}
                    // Assez large pour un nombre à quatre chiffres avec son
                    // séparateur de milliers : trop étroit, « 1 600 »
                    // s'affichait « 600 » et l'axe mentait d'un ordre de
                    // grandeur.
                    width={56}
                    tickFormatter={(v) => Number(v).toLocaleString('fr-FR')}
                  />
                  <Tooltip
                    labelFormatter={(t) => new Date(Number(t)).toLocaleDateString('fr-FR')}
                    formatter={(v, name) => [nf(Number(v)), NETWORKS[name as NetworkKey].label]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dec9b8' }}
                  />
                  {NETWORK_KEYS.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={NETWORKS[key].color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      // Un réseau non relevé à une date donnée est ABSENT du
                      // point : sans cela la ligne plongerait à zéro puis
                      // remonterait, en inventant un effondrement.
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {NETWORK_KEYS.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-ink/55">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: NETWORKS[key].color }}
                />
                {NETWORKS[key].label}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card title="Audience et ventes, réseau par réseau">
        <Table
          minWidth={720}
          columns={[
            { label: 'Réseau' },
            { label: 'Abonnés', align: 'right' },
            { label: 'Variation', align: 'right' },
            { label: 'Pire baisse', align: 'right' },
            { label: 'Messages', align: 'right' },
            { label: 'Cmd (période)', align: 'right' },
            { label: 'CA (DT)', align: 'right' },
            { label: 'Relevé' },
          ]}
        >
          {o.networks.map((n) => {
            const sales = bySource.get(n.network)
            return (
              <Row key={n.network}>
                <Cell first>
                  <span className="inline-flex items-center gap-2">
                    <span style={{ color: NETWORKS[n.network].color }}>{GLYPHS[n.network]}</span>
                    <a
                      href={NETWORKS[n.network].url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent hover:underline"
                    >
                      {NETWORKS[n.network].label}
                    </a>
                  </span>
                </Cell>
                <Cell align="right">
                  {n.latest ? nf(n.latest.followers) : <span className="text-ink/30">—</span>}
                </Cell>
                <Cell align="right">
                  <DeltaCell delta={n.followersDelta} percent={n.followersDeltaPercent} />
                </Cell>
                <Cell align="right" muted>
                  {n.worstDrop === 0 ? (
                    <span className="text-ink/30">—</span>
                  ) : (
                    <span className="text-red-600">−{nf(n.worstDrop)}</span>
                  )}
                </Cell>
                <Cell align="right" muted>
                  {n.latest ? nf(n.latest.messages) : '—'}
                </Cell>
                <Cell align="right">
                  {analytics.isLoading ? (
                    <span className="text-ink/30">…</span>
                  ) : sales ? (
                    nf(sales.orders)
                  ) : (
                    <span className="text-ink/30">0</span>
                  )}
                </Cell>
                <Cell align="right" muted>
                  {analytics.isLoading ? '…' : sales ? formatTND(sales.revenueMillimes) : '—'}
                </Cell>
                <Cell last>
                  <FreshnessCell days={n.daysSinceReading} stale={n.isStale} />
                </Cell>
              </Row>
            )
          })}
        </Table>

        <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-ink/45">
          <p>
            <strong className="font-semibold text-ink/70">Les deux moitiés de ce tableau ne se
            divisent pas l'une par l'autre.</strong> Les abonnés sont un relevé manuel du compte
            entier au jour de la saisie ; les commandes sont mesurées en continu, sur la seule
            période choisie en haut de page. Un « taux de conversion » entre les deux n'aurait pas
            de sens — un abonné n'est pas une visite, et les deux colonnes ne couvrent pas la même
            fenêtre.
          </p>
          <p>
            Une plateforme peut afficher 0 commande alors qu'elle en apporte : l'origine n'est
            captée que sur les liens étiquetés. Voyez la page Marketing pour le taux de couverture
            réel.
          </p>
        </div>
      </Card>

      <Card title="Saisir un relevé">
        <p className="mb-4 text-xs leading-relaxed text-ink/55">
          Ouvrez chaque réseau, relevez le nombre d'abonnés et de messages non lus, puis
          enregistrez. Environ 30 secondes par réseau. Aucune API n'est connectée : ces chiffres
          n'existent que si vous les saisissez, et la fraîcheur du relevé compte autant que sa
          valeur.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {NETWORK_KEYS.map((key) => (
            <ReadingForm key={key} network={key} token={token} />
          ))}
        </div>
      </Card>
    </div>
  )
}

function DeltaCell({ delta, percent }: { delta: number | null; percent: number | null }) {
  // Un premier relevé n'est pas « +1200 abonnés » : il n'y a rien avant lui.
  if (delta === null) return <span className="text-[11px] text-ink/35">1er relevé</span>
  if (delta === 0) return <span className="text-[11px] text-ink/45">→ 0</span>
  const good = delta > 0
  return (
    <span className={`text-[11px] font-medium ${good ? 'text-green-600' : 'text-red-600'}`}>
      {good ? '↑' : '↓'} {nf(Math.abs(delta))}
      {percent !== null && (
        <span className="font-normal text-ink/40"> ({Math.abs(percent).toFixed(1)}%)</span>
      )}
    </span>
  )
}

function FreshnessCell({ days, stale }: { days: number | null; stale: boolean }) {
  if (days === null) return <span className="text-[11px] text-ink/35">aucun relevé</span>
  const label = days === 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} jours`
  if (!stale) return <span className="text-[11px] text-ink/50">{label}</span>
  return (
    <span className="text-[11px] font-medium text-red-600" title="Ce relevé ne décrit plus la situation actuelle.">
      {label} — périmé
    </span>
  )
}

function ReadingForm({ network, token }: { network: NetworkKey; token: string }) {
  const utils = trpc.useUtils()
  const [followers, setFollowers] = useState('')
  const [messages, setMessages] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const record = trpc.social.record.useMutation({
    onSuccess: () => {
      setError(null)
      setFollowers('')
      setMessages('')
      setSaved(true)
      void utils.social.overview.invalidate()
      void utils.social.latest.invalidate()
      void utils.social.history.invalidate()
    },
    onError: (e) => setError(e.message),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)
    const f = Number.parseInt(followers, 10)
    if (!Number.isFinite(f) || f < 0) {
      setError("Le nombre d'abonnés doit être un entier positif.")
      return
    }
    const m = Number.parseInt(messages || '0', 10)
    record.mutate({ token, network, followers: f, messages: Number.isFinite(m) ? m : 0 })
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-sand/60 bg-[#faf6f3] px-4 py-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span style={{ color: NETWORKS[network].color }}>{GLYPHS[network]}</span>
        <span className="text-sm font-medium text-ink">{NETWORKS[network].label}</span>
        <a
          href={NETWORKS[network].url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[11px] text-accent underline underline-offset-2"
        >
          {NETWORKS[network].urlLabel}
        </a>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-ink/45">Abonnés</span>
          <input
            type="text"
            inputMode="numeric"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            className="w-full rounded-lg border border-sand bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#b8912e]"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-ink/45">Messages</span>
          <input
            type="text"
            inputMode="numeric"
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-sand bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#b8912e]"
          />
        </label>
        <button
          type="submit"
          disabled={record.isPending || followers.trim() === ''}
          className="rounded-full bg-ink px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {record.isPending ? '…' : 'Noter'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && !error && <p className="mt-2 text-[11px] text-green-700">Relevé enregistré.</p>}
    </form>
  )
}

function Figure({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-green-700' : 'text-ink'
  return (
    <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className={`mt-1.5 font-display text-2xl leading-none ${color}`}>{value}</p>
      {hint && <p className="mt-2 text-[11px] text-ink/45">{hint}</p>}
    </div>
  )
}
