import { trpc } from '@/providers/trpc'
import { periodInput, type DashboardPeriod } from './shell/period'

/** UNE requête analytique pour tout le tableau de bord.
 *
 * Avant, la Vue d'ensemble et l'onglet Visiteurs interrogeaient deux
 * endpoints distincts, chacun rafraîchi toutes les 30 s, pour afficher les
 * mêmes nombres. Les pages partagent désormais ce hook : React Query
 * dédoublonne sur la clé, donc plusieurs blocs peuvent le consommer sans
 * déclencher plusieurs appels.
 *
 * La clé inclut la période : changer de dates recharge, revenir aux
 * précédentes ressert le cache sans rien redemander. */
export function useOverview(token: string, period: DashboardPeriod) {
  return trpc.dashboard.overview.useQuery(
    { token, period: periodInput(period) },
    {
      // 30 s suffisaient à trois requêtes plein-table ; ici une seule
      // requête bornée à la période, rafraîchie moins souvent.
      refetchInterval: 60000,
      staleTime: 30000,
    } as never,
  )
}

export type OverviewResult = ReturnType<typeof useOverview>
export type OverviewData = NonNullable<OverviewResult['data']>
