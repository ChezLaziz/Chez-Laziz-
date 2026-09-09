import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { trpc } from '@/providers/trpc'
import { initAnalytics, trackPageView } from '@/lib/analytics'
import { initMetaPixel, trackMetaPageView } from '@/lib/metaPixel'
import { getConsent, onConsentChange } from '@/lib/cookieConsent'
import { captureAttribution } from '@/lib/attribution'

/** Enregistre chaque page vue (hors /admin) : compteur interne anonyme
 * (toujours actif, sans cookie tiers), et vue de page GA4/Meta Pixel une
 * fois le consentement aux cookies accepté (voir CookieConsent.tsx). */
export function useTrackVisit() {
  const location = useLocation()
  const { mutate } = trpc.stats.track.useMutation()
  const [consented, setConsented] = useState(() => getConsent() === 'accepted')

  useEffect(() => onConsentChange(() => setConsented(getConsent() === 'accepted')), [])

  useEffect(() => {
    if (!consented) return
    initAnalytics()
    initMetaPixel()
  }, [consented])

  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/admin')) return
    // Avant tout le reste : c'est la PREMIÈRE vue de la session qui porte
    // l'origine. La fonction ne réécrit rien si elle a déjà enregistré.
    captureAttribution()
    if (consented) {
      trackPageView(path)
      trackMetaPageView()
    }
    const key = `laziz_view:${path}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    mutate({ path })
    // `mutate` de React Query est stable entre les rendus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, consented])
}
