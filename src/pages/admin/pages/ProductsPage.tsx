import { useState } from 'react'
import { formatTND } from '@/lib/shop'
import { Card } from '../ui/Card'
import { Cell, GrowthCell, Row, Table } from '../ui/Table'
import { EmptyState, ErrorState, NotCollected, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import type { PresetRange } from '@contracts/analytics'

export default function ProductsPage({ token, period }: { token: string; period: PresetRange }) {
  const { data, isLoading, isError } = useOverview(token, period)
  const [selected, setSelected] = useState<string | null>(null)

  if (isError) return <ErrorState label="Impossible de charger les produits." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const products = data.products
  const active = selected ?? products[0]?.key ?? null
  const activeProduct = products.find((p) => p.key === active)
  // Où ce produit se vend le mieux : même matrice que « que préfère ce
  // gouvernorat ? », lue dans l'autre sens.
  const activeCells = data.productByGovernorate
    .filter((c) => c.productKey === active)
    .sort((a, b) => b.revenueMillimes - a.revenueMillimes)

  return (
    <div className="space-y-5">
      <Card title="Performance par produit">
        {products.length === 0 ? (
          <EmptyState label="Aucune vente sur cette période." />
        ) : (
          <>
            <Table
              columns={[
                { label: 'Produit' },
                { label: 'CA (DT)', align: 'right' },
                { label: 'Unités', align: 'right' },
                { label: 'Cmd', align: 'right' },
                { label: 'Part du CA', align: 'right' },
                { label: 'Évol.', align: 'right' },
              ]}
            >
              {products.map((p) => (
                <Row key={p.key}>
                  <Cell first>
                    <button
                      onClick={() => setSelected(p.key)}
                      className={`text-left transition-colors hover:text-[#b8912e] ${
                        p.key === active ? 'font-medium text-[#8f6f22]' : 'text-ink'
                      }`}
                    >
                      {p.name}
                    </button>
                  </Cell>
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
            <p className="mt-3 text-[11px] text-ink/40">
              Classement par chiffre d'affaires. Cliquez un produit pour voir où il se vend.
            </p>
          </>
        )}
      </Card>

      {activeProduct && (
        <Card title={`${activeProduct.name} — par gouvernorat`}>
          {activeCells.length === 0 ? (
            <EmptyState label="Aucune vente de ce produit sur la période." />
          ) : (
            <Table
              minWidth={380}
              columns={[
                { label: 'Gouvernorat' },
                { label: 'CA (DT)', align: 'right' },
                { label: 'Unités', align: 'right' },
                { label: 'Cmd', align: 'right' },
              ]}
            >
              {activeCells.map((c) => (
                <Row key={c.governorate}>
                  <Cell first>{c.governorate}</Cell>
                  <Cell align="right">{formatTND(c.revenueMillimes)}</Cell>
                  <Cell align="right" muted>
                    {c.unitsSold}
                  </Cell>
                  <Cell align="right" muted last>
                    {c.orders}
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      )}

      {/* Ce classement est au chiffre d'affaires. Tant que les coûts ne sont
          pas tous saisis, « meilleur produit » veut dire « plus gros CA » et
          pas « celui qui rapporte le plus » — une distinction trop
          importante pour être passée sous silence. */}
      {data.dataQuality.productCostCoverage < 1 && (
        <NotCollected
          what="Marge par produit"
          needs={
            data.dataQuality.productCostCoverage === 0
              ? "Aucun coût de revient n'est saisi : ce classement est au chiffre d'affaires, pas à la marge. Un produit très vendu peut rapporter moins qu'un autre moins vendu. Renseignez le coût au kilo dans « Catalogue & prix » pour voir la marge dans « Rentabilité »."
              : `Le coût de revient couvre ${Math.round(data.dataQuality.productCostCoverage * 100)}% du chiffre d'affaires. Ce classement reste au chiffre d'affaires ; la marge par produit se trouve dans « Rentabilité », qui liste aussi les produits dont le coût manque encore.`
          }
        />
      )}
    </div>
  )
}
