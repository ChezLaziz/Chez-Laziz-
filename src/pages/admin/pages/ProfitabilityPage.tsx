import { formatTND } from '@/lib/shop'
import { Card, TrendBadge } from '../ui/Card'
import { Cell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, InsufficientData, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { PresetRange } from '@contracts/analytics'

/** En dessous, un taux de marge décrit une minorité de l'activité et ne doit
 * pas être présenté comme le taux de la boutique. */
const USABLE_COVERAGE = 0.6

export default function ProfitabilityPage({
  token,
  period,
}: {
  token: string
  period: PresetRange
}) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger la rentabilité." />
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

  const m = data.margins
  const prev = data.previousMargins
  const nothingEntered = m.coveredRevenueMillimes === 0 && m.missingCost.length > 0

  if (nothingEntered) {
    return (
      <div className="space-y-5">
        <InsufficientData
          label="Aucun coût de revient n'est encore saisi, donc aucune marge n'est calculable. Ouvrez « Catalogue & prix », modifiez un produit et renseignez son coût de revient au kilo — la marge apparaîtra ici dès le premier produit renseigné, sur la part des ventes qu'il représente."
        />
        <MissingCostList missing={m.missingCost} total={m.totalRevenueMillimes} />
      </div>
    )
  }

  if (m.coveredRevenueMillimes === 0) {
    return <EmptyState label="Aucune vente sur cette période." />
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Marge brute produit
          </p>
          <p
            className={`mt-1.5 font-display text-2xl leading-none ${
              m.marginMillimes < 0 ? 'text-red-600' : 'text-ink'
            }`}
          >
            {formatTND(m.marginMillimes)} DT
          </p>
          <p className="mt-2">
            <TrendBadge
              trend={{
                value: m.marginMillimes,
                previous: prev.marginMillimes,
                changePercent:
                  prev.marginMillimes === 0
                    ? null
                    : ((m.marginMillimes - prev.marginMillimes) / Math.abs(prev.marginMillimes)) *
                      100,
              }}
            />
          </p>
        </div>
        <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Taux de marge
          </p>
          <p
            className={`mt-1.5 font-display text-2xl leading-none ${
              m.marginRate < 0 ? 'text-red-600' : 'text-ink'
            }`}
          >
            {(m.marginRate * 100).toFixed(1)}%
          </p>
          <p className="mt-2 text-[11px] text-ink/45">
            sur {formatTND(m.coveredRevenueMillimes)} DT de ventes
          </p>
        </div>
        <div className="rounded-xl border border-sand/70 bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">
            Coût de revient
          </p>
          <p className="mt-1.5 font-display text-2xl leading-none text-ink">
            {formatTND(m.costMillimes)} DT
          </p>
          <p className="mt-2 text-[11px] text-ink/45">
            couverture {(m.revenueCoverage * 100).toFixed(0)}% du CA
          </p>
        </div>
      </div>

      {/* Ce que ces chiffres NE contiennent PAS. Sans cette phrase, « marge »
          se lit comme « bénéfice », et la décision qui suit est fausse. */}
      <p className="-mt-2 text-[11px] leading-relaxed text-ink/45">
        Marge brute produit = ventes − coût de revient des articles. Elle ne déduit ni l'emballage,
        ni ce que vous versez réellement au transporteur, ni la publicité, ni les charges fixes —
        aucun de ces montants n'est enregistré. Ce n'est donc pas un bénéfice net.
      </p>

      {m.revenueCoverage < USABLE_COVERAGE && (
        <InsufficientData
          label={`Le taux de marge ci-dessus ne décrit que ${(m.revenueCoverage * 100).toFixed(0)}% de vos ventes — celles dont le coût est saisi. Il n'est pas représentatif de la boutique tant que les produits listés plus bas n'ont pas de coût.`}
        />
      )}

      <Card title="Marge par produit">
        {m.byProduct.length === 0 ? (
          <EmptyState label="Aucun produit avec un coût saisi sur cette période." />
        ) : (
          <>
            <Table
              columns={[
                { label: 'Produit' },
                { label: 'Ventes (DT)', align: 'right' },
                { label: 'Coût (DT)', align: 'right' },
                { label: 'Marge (DT)', align: 'right' },
                { label: 'Taux', align: 'right' },
              ]}
            >
              {m.byProduct.map((p) => (
                <Row key={p.key}>
                  <Cell first>{p.name}</Cell>
                  <Cell align="right" muted>
                    {formatTND(p.revenueMillimes)}
                  </Cell>
                  <Cell align="right" muted>
                    {formatTND(p.costMillimes)}
                  </Cell>
                  <Cell align="right">
                    <span className={p.marginMillimes < 0 ? 'text-red-600' : 'text-ink'}>
                      {formatTND(p.marginMillimes)}
                    </span>
                  </Cell>
                  <Cell align="right" last>
                    <span
                      className={
                        p.marginRate < 0
                          ? 'text-red-600'
                          : p.marginRate >= m.marginRate
                            ? 'text-green-600'
                            : 'text-ink/55'
                      }
                    >
                      {(p.marginRate * 100).toFixed(0)}%
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
            {/* Le classement est en dinars, pas en pourcentage : c'est la
                distinction qui décide où mettre l'effort. */}
            <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
              Classé par marge en dinars, pas par taux : un produit à 20 % qui se vend beaucoup
              rapporte plus qu'un produit à 60 % qui se vend peu. Taux en vert = au-dessus de la
              moyenne ({(m.marginRate * 100).toFixed(0)}%).
            </p>
          </>
        )}
      </Card>

      <MissingCostList missing={m.missingCost} total={m.totalRevenueMillimes} />
    </div>
  )
}

/** La liste de ce qu'il reste à saisir — présentée par poids dans le chiffre
 * d'affaires, pour renseigner d'abord ce qui change le plus le résultat. */
function MissingCostList({
  missing,
  total,
}: {
  missing: { key: string; name: string; revenueMillimes: number }[]
  total: number
}) {
  if (missing.length === 0) return null
  return (
    <Card title="Produits sans coût de revient">
      <Table
        columns={[
          { label: 'Produit' },
          { label: 'Ventes (DT)', align: 'right' },
          { label: 'Part du CA', align: 'right' },
        ]}
      >
        {missing.map((p) => (
          <Row key={p.key}>
            <Cell first>{p.name}</Cell>
            <Cell align="right" muted>
              {formatTND(p.revenueMillimes)}
            </Cell>
            <Cell align="right" muted last>
              {total === 0 ? '—' : `${((p.revenueMillimes / total) * 100).toFixed(0)}%`}
            </Cell>
          </Row>
        ))}
      </Table>
      <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
        Ces ventes sont exclues du calcul de marge. Renseignez d'abord celles du haut : ce sont
        elles qui changent le plus le résultat. Les packs prêts n'apparaîtront jamais comme
        couverts — leur composition ne référence pas les produits du catalogue, donc leur coût
        n'est pas déductible.
      </p>
    </Card>
  )
}
