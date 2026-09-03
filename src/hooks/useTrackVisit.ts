import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { trpc } from '@/providers/trpc'
import { initAnalytics, trackPageView } from '@/lib/analytics'

/** Enregistre chaque page vue (hors /admin) : compteur interne anonyme, une
 * fois par chemin et par session, et vue de page GA4 si configuré. */
export function useTrackVisit() {
  const location = useLocation()
  const { mutate } = trpc.stats.track.useMutation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/admin')) return
    trackPageView(path)
    const key = `laziz_view:${path}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    mutate({ path })
    // `mutate` de React Query est stable entre les rendus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])
}
