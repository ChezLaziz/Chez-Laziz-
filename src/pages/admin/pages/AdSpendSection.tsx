import { useState } from 'react'
import type { inferRouterOutputs } from '@trpc/server'
import { trpc } from '@/providers/trpc'
import type { AppRouter } from '../../../../api/router'
import { formatTND } from '@/lib/shop'
import { Card } from '../ui/Card'
import { Cell, Row, Table } from '../ui/Table'
import { ErrorState, InsufficientData, Skeleton } from '../ui/State'
import {
  SOURCE_COLOR,
  SOURCE_LABEL,
  SPEND_SOURCE_OPTIONS,
  currentMonthKey,
  monthLabel,
  type SpendSourceOption,
} from '../sources'

/** Dépenses publicitaires saisies à la main, et leur retour réel.
 *
 * Le mois est l'unité, et cette section ignore volontairement le sélecteur
 * de période global : un budget mensuel réparti au prorata des jours pour
 * coller à « 7 derniers jours » serait une estimation présentée comme une
 * mesure. Mieux vaut une période imposée et exacte.
 *
 * Rien n'est calculé sans montant saisi : ni CPA, ni ROAS, ni « coût par
 * commande estimé ». Un ROAS inventé ferait couper ou doubler un budget sur
 * un chiffre qui n'existe pas. */
export default function AdSpendSection({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data, isLoading, isError } = trpc.marketing.adPerformance.useQuery(
    { token },
    { staleTime: 30000 } as never,
  )

  const [month, setMonth] = useState(currentMonthKey())
  const [source, setSource] = useState<SpendSourceOption>('instagram')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const refresh = () => {
    void utils.marketing.adPerformance.invalidate()
  }
  const save = trpc.marketing.setSpend.useMutation({
    onSuccess: () => {
      setFormError(null)
      setAmount('')
      refresh()
    },
    onError: (e) => setFormError(e.message),
  })
  const remove = trpc.marketing.removeSpend.useMutation({
    onSuccess: refresh,
    onError: (e) => setFormError(e.message),
  })

  if (isError) return <ErrorState label="Impossible de charger les dépenses publicitaires." />
  if (isLoading || !data) return <Skeleton className="h-64" />

  const submit = () => {
    const dinars = Number(amount.replace(',', '.'))
    if (!Number.isFinite(dinars) || dinars < 0) {
      setFormError('Montant invalide. Saisissez un nombre de dinars, par exemple 120 ou 120,500.')
      return
    }
    save.mutate({ token, source, month, amountMillimes: Math.round(dinars * 1000) })
  }

  return (
    <div className="space-y-5">
      <Card title="Saisir une dépense publicitaire">
        <p className="mb-4 text-xs leading-relaxed text-ink/55">
          Un montant par plateforme et par mois. Ressaisir un mois déjà renseigné corrige le
          montant, il ne s'ajoute pas. Tant qu'un mois n'est pas saisi, aucun coût par commande ni
          retour sur dépense n'est calculé pour lui — il reste vide plutôt qu'estimé.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ink/45">Mois</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#b8912e]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ink/45">Plateforme</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SpendSourceOption)}
              className="rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#b8912e]"
            >
              {SPEND_SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ink/45">Montant (DT)</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              placeholder="120"
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              className="w-32 rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#b8912e]"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={save.isPending || amount.trim() === ''}
            className="rounded-full bg-ink px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        {formError && (
          <p className="mt-3 text-xs text-red-600" role="alert">
            {formError}
          </p>
        )}
      </Card>

      {!data.hasAnySpend && (
        <InsufficientData label="Aucune dépense publicitaire n'est encore saisie. Renseignez ce que vous avez dépensé sur un mois écoulé et son coût par commande apparaîtra ci-dessous — à condition que des commandes de ce mois portent une origine." />
      )}

      {data.months.map((m) => (
        <MonthCard
          key={m.month}
          month={m}
          onEdit={(src, millimes) => {
            setMonth(m.month)
            setSource(src as SpendSourceOption)
            setAmount(String(millimes / 1000).replace('.', ','))
            setFormError(null)
          }}
          onRemove={(src) => remove.mutate({ token, source: src as SpendSourceOption, month: m.month })}
          removing={remove.isPending ? remove.variables : undefined}
        />
      ))}

      <Card title="Ce que ces chiffres disent — et ce qu'ils ne disent pas">
        <ul className="space-y-2.5 text-xs leading-relaxed text-ink/55">
          <li>
            <strong className="font-semibold text-ink/75">Le ROAS est un minimum.</strong> Il
            compare la dépense au chiffre d'affaires des commandes dont l'origine est connue. Les
            commandes sans origine ne sont comptées nulle part — la vraie valeur est donc au moins
            celle affichée, jamais moins.
          </li>
          <li>
            <strong className="font-semibold text-ink/75">Un ROAS supérieur à 1 n'est pas un
            bénéfice.</strong> Il rapporte du chiffre d'affaires, pas de la marge. Avec un coût de
            revient saisi (page Rentabilité), il faut un ROAS nettement plus élevé pour couvrir la
            marchandise, l'emballage et le transport.
          </li>
          <li>
            <strong className="font-semibold text-ink/75">L'origine est celle du premier contact
            de la session.</strong> Une personne qui découvre une publicité en septembre et commande
            en octobre est comptée en octobre. Sur de l'alimentaire, où l'on commande vite, l'écart
            reste faible — il n'est pas nul.
          </li>
          <li>
            <strong className="font-semibold text-ink/75">Le mois entier est l'unité.</strong> Cette
            section ne suit pas le sélecteur de période en haut de page : découper un budget mensuel
            en jours supposerait une dépense étale, ce qui est faux dès qu'une publication est
            boostée quelques jours.
          </li>
        </ul>
      </Card>
    </div>
  )
}

/** Le mois tel que le serveur le renvoie.
 *
 * Déduit du routeur, pas redéclaré à la main : si le calcul côté serveur
 * change de forme, c'est ici que la compilation échoue — pas l'affichage
 * en production. */
type MonthPerf = inferRouterOutputs<AppRouter>['marketing']['adPerformance']['months'][number]

function fr(n: number, digits = 2): string {
  return n.toFixed(digits).replace('.', ',')
}

function MonthCard({
  month,
  onEdit,
  onRemove,
  removing,
}: {
  month: MonthPerf
  onEdit: (source: string, millimes: number) => void
  onRemove: (source: string) => void
  removing?: { source: string; month: string }
}) {
  const coverage = Math.round(month.orderCoverage * 100)
  // « ≥ » ne se justifie que sur une valeur non nulle : « au moins 0 »
  // n'informe sur rien, et le détail par plateforme dit déjà pourquoi.
  const isFloor = month.orderCoverage < 1

  return (
    <Card
      title={monthLabel(month.month)}
      action={
        month.totalOrders > 0 ? (
          <span className="text-[11px] text-ink/45">
            origine connue sur {month.attributedOrders}/{month.totalOrders} commandes ({coverage}%)
          </span>
        ) : (
          <span className="text-[11px] text-ink/45">aucune commande ce mois-ci</span>
        )
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Figure label="Dépense" value={`${formatTND(month.spendMillimes)} DT`} />
        <Figure
          label="CA rattaché"
          value={`${formatTND(month.paidRevenueMillimes)} DT`}
          hint={`${month.paidOrders} commande${month.paidOrders > 1 ? 's' : ''}`}
        />
        <Figure
          label="Coût par commande"
          value={month.cpaMillimes === null ? '—' : `${formatTND(month.cpaMillimes)} DT`}
        />
        <Figure
          label="Retour sur dépense"
          value={month.roas === null ? '—' : `${isFloor && month.roas > 0 ? '≥ ' : ''}${fr(month.roas)}`}
          hint={month.roas === null ? undefined : 'dinars de CA par dinar dépensé'}
          strong={month.roas !== null}
        />
      </div>

      {month.spendMillimes > 0 && month.attributedOrders === 0 && (
        <div className="mb-4">
          <InsufficientData label="Aucune commande de ce mois ne porte d'origine, alors que de l'argent a été dépensé. Cela ne veut pas dire que la publicité n'a rien rapporté : cela veut dire que rien ne permet de le mesurer. Ne coupez pas ce budget sur cette base — étiquetez d'abord vos liens." />
        </div>
      )}

      {month.bySource.length === 0 ? (
        <p className="py-3 text-sm text-ink/45">
          Ni dépense saisie ni commande d'origine connue pour ce mois.
        </p>
      ) : (
        <Table
          minWidth={560}
          columns={[
            { label: 'Plateforme' },
            { label: 'Dépense (DT)', align: 'right' },
            { label: 'Cmd', align: 'right' },
            { label: 'CA (DT)', align: 'right' },
            { label: 'Coût/cmd', align: 'right' },
            { label: 'Retour', align: 'right' },
            { label: '' },
          ]}
        >
          {month.bySource.map((s) => (
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
              <Cell align="right">
                {s.spendMillimes > 0 ? (
                  <button
                    type="button"
                    onClick={() => onEdit(s.source, s.spendMillimes)}
                    className="underline decoration-dotted underline-offset-4 hover:text-accent"
                    title="Corriger ce montant"
                  >
                    {formatTND(s.spendMillimes)}
                  </button>
                ) : (
                  <span className="text-ink/30">—</span>
                )}
              </Cell>
              <Cell align="right" muted>
                {s.orders}
              </Cell>
              <Cell align="right" muted>
                {formatTND(s.revenueMillimes)}
              </Cell>
              <Cell align="right" muted>
                {s.cpaMillimes === null ? '—' : formatTND(s.cpaMillimes)}
              </Cell>
              <Cell align="right">
                <VerdictCell verdict={s.verdict} roas={s.roas} isFloor={isFloor} />
              </Cell>
              <Cell align="right" last>
                {s.spendMillimes > 0 && (
                  <button
                    type="button"
                    onClick={() => onRemove(s.source)}
                    disabled={removing?.source === s.source && removing?.month === month.month}
                    className="text-[11px] text-ink/35 transition-colors hover:text-red-600 disabled:opacity-40"
                    title="Supprimer cette dépense"
                  >
                    supprimer
                  </button>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </Card>
  )
}

/** Le retour d'une ligne, ou la raison précise de son absence.
 *
 * Ces trois absences n'appellent pas la même décision : « rien mesuré » ne
 * doit jamais se lire comme « ça n'a rien rapporté ». */
function VerdictCell({
  verdict,
  roas,
  isFloor,
}: {
  verdict: string
  roas: number | null
  isFloor: boolean
}) {
  if (verdict === 'organic') {
    return <span className="text-[11px] text-ink/40">sans dépense saisie</span>
  }
  if (verdict === 'no_attribution') {
    return <span className="text-[11px] text-ink/45">non mesurable</span>
  }
  if (verdict === 'no_orders_from_source' || roas === null) {
    return <span className="text-[11px] font-medium text-red-600">0 commande</span>
  }
  return (
    <span className={`text-sm font-medium ${roas >= 1 ? 'text-green-700' : 'text-red-600'}`}>
      {isFloor && roas > 0 ? '≥ ' : ''}
      {fr(roas)}
    </span>
  )
}

function Figure({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
}) {
  return (
    <div className="rounded-lg border border-sand/60 bg-[#faf6f3] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45">{label}</p>
      <p
        className={`mt-1 font-display leading-none text-ink ${strong ? 'text-2xl' : 'text-xl'}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-ink/40">{hint}</p>}
    </div>
  )
}
