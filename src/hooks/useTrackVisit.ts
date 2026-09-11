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
    // Dédoublonnage au mieux. Un navigateur qui bloque le stockage — Safari
    // iOS, réglage « Bloquer tous les cookies » — fait LEVER l'accès à
    // sessionStorage lui-même, pas seulement échouer l'écriture. Sans garde,
    // l'exception remontait depuis cet effet jusqu'à l'ErrorBoundary racine :
    // le visiteur venu d'une annonce voyait une page d'erreur au lieu de la
    // boutique, et rien n'atteignait le serveur pour le signaler.
    // Sans stockage, on compte la vue : perdre le visiteur fausse davantage
    // les chiffres qu'un éventuel doublon.
    let dejaComptee = false
    try {
      const key = `laziz_view:${path}`
      dejaComptee = sessionStorage.getItem(key) !== null
      if (!dejaComptee) sessionStorage.setItem(key, '1')
    } catch {
      // stockage indisponible — pas de dédoublonnage possible
    }
    if (dejaComptee) return
    mutate({ path })
    // `mutate` de React Query est stable entre les rendus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, consented])
}
