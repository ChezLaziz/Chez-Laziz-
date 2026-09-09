import { Card } from '../ui/Card'
import { ErrorState, Skeleton } from '../ui/State'
import { useOverview } from '../useOverview'
import { buildSignals, MIN_ORDERS_FOR_SIGNALS, type Signal } from '@contracts/signals'
import type { PresetRange } from '@contracts/analytics'

/** Ni chatbot, ni « IA ». Des règles arithmétiques sur les chiffres réels,
 * chacune accompagnée des nombres qui la fondent — voir contracts/signals.ts.
 *
 * Rien à afficher est un résultat valide : sous le seuil de volume, une
 * variation n'est que du bruit, et l'inventer serait pire que se taire. */
export default function IntelligencePage({
  token,
  period,
}: {
  token: string
  period: PresetRange
}) {
  const { data, isLoading, isError } = useOverview(token, period)

  if (isError) return <ErrorState label="Impossible de charger l'analyse." />
  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const signals = buildSignals(data)
  const belowThreshold =
    data.orders.value < MIN_ORDERS_FOR_SIGNALS || data.orders.previous < MIN_ORDERS_FOR_SIGNALS

  const opportunities = signals.filter((s) => s.tone === 'good')
  const problems = signals.filter((s) => s.tone === 'bad')
  const observations = signals.filter((s) => s.tone === 'neutral')

  return (
    <div className="space-y-5">
      {belowThreshold ? (
        <Card title="Analyse">
          <p className="text-sm leading-relaxed text-ink/60">
            Pas encore assez de volume pour conclure quoi que ce soit sur cette période.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/50">
            Cette période compte {data.orders.value} commande
            {data.orders.value > 1 ? 's' : ''}, la précédente {data.orders.previous}. En dessous de{' '}
            {MIN_ORDERS_FOR_SIGNALS} de chaque côté, une variation ne distingue pas une tendance du
            hasard : passer de 2 à 3 commandes s'affiche « +50 % » et ne veut rien dire. Les
            analyses apparaîtront d'elles-mêmes une fois ce seuil franchi — essayez une période plus
            large en attendant.
          </p>
        </Card>
      ) : signals.length === 0 ? (
        <Card title="Analyse">
          <p className="text-sm leading-relaxed text-ink/60">
            Aucun mouvement notable sur cette période. Le chiffre d'affaires, le panier moyen et la
            répartition des ventes sont restés dans leur variation habituelle.
          </p>
        </Card>
      ) : (
        <>
          <SignalGroup title="Opportunités" signals={opportunities} tone="good" />
          <SignalGroup title="Problèmes" signals={problems} tone="bad" />
          <SignalGroup title="À noter" signals={observations} tone="neutral" />
        </>
      )}

      {/* Ce que l'analyse ne peut PAS voir : dit explicitement, pour qu'une
          absence d'alerte ne se lise pas comme une absence de problème. */}
      <Card title="Ce que cette analyse ne couvre pas">
        <ul className="space-y-2 text-sm leading-relaxed text-ink/60">
          <li>
            <span className="font-medium text-ink/75">Rentabilité.</span>{' '}
            {data.dataQuality.productCostCoverage === 0
              ? "Aucun coût de revient n'est encore saisi : impossible de dire quel produit rapporte le plus. Renseignez-les dans « Catalogue & prix »."
              : `La marge est calculée sur ${Math.round(data.dataQuality.productCostCoverage * 100)}% du chiffre d'affaires (voir « Rentabilité »). Emballage, transport réel, publicité et charges fixes restent hors calcul : c'est une marge produit, pas un bénéfice net.`}
          </li>
          <li>
            <span className="font-medium text-ink/75">Publicité.</span>{' '}
            {data.dataQuality.acquisitionSourceCoverage === 0
              ? "Aucune commande ne porte encore d'origine connue (voir « Marketing » pour les liens à utiliser). La dépense publicitaire n'est pas enregistrée non plus : ni CPA ni ROAS ne sont calculables."
              : `L'origine est connue pour ${Math.round(data.dataQuality.acquisitionSourceCoverage * 100)}% du chiffre d'affaires (voir « Marketing »). La dépense publicitaire reste non enregistrée : ni CPA ni ROAS ne sont calculables.`}
          </li>
          <li>
            <span className="font-medium text-ink/75">Tunnel de vente.</span> Les visites ne portent
            pas d'identifiant de session et les ajouts au panier ne sont pas enregistrés côté
            serveur : le taux de conversion et les points d'abandon ne sont pas mesurables.
          </li>
          <li>
            <span className="font-medium text-ink/75">Stock.</span> Aucune quantité en stock n'est
            suivie : ni rupture, ni rotation, ni prévision de demande.
          </li>
        </ul>
      </Card>
    </div>
  )
}

function SignalGroup({
  title,
  signals,
  tone,
}: {
  title: string
  signals: Signal[]
  tone: 'good' | 'bad' | 'neutral'
}) {
  if (signals.length === 0) return null
  const dot = tone === 'good' ? 'bg-green-500' : tone === 'bad' ? 'bg-red-500' : 'bg-[#b8912e]'
  return (
    <Card title={title}>
      <ul className="space-y-3">
        {signals.map((s) => (
          <li key={s.id} className="flex gap-2.5">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <p className="text-sm leading-relaxed text-ink/75">{s.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
