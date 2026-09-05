// Google Analytics 4 — chargé uniquement si VITE_GA_MEASUREMENT_ID est
// défini au build. Sans identifiant, chaque fonction est un no-op et aucun
// script Google n'est injecté (voir la page Politique de confidentialité,
// qui reflète cet état).
//
// Aucune donnée personnelle n'est envoyée : les événements e-commerce ne
// contiennent que des identifiants/noms de produits, des quantités et des
// montants — jamais le nom, le téléphone ou l'adresse du client.

const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim()

export const analyticsEnabled = Boolean(MEASUREMENT_ID)

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFn
  }
}

let initialized = false

export function initAnalytics() {
  if (!MEASUREMENT_ID || initialized || typeof window === 'undefined') return
  initialized = true
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag('js', new Date())
  // send_page_view: false — les vues de page sont envoyées manuellement à
  // chaque changement de route (SPA), sinon seule la première serait comptée.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`
  document.head.appendChild(script)
}

export function trackPageView(path: string) {
  if (!MEASUREMENT_ID || !window.gtag) return
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href })
}

export type AnalyticsItem = {
  item_id: string
  item_name: string
  item_variant?: string
  price?: number
  quantity?: number
}

export function track(
  event:
    | 'view_item_list'
    | 'add_to_cart'
    | 'view_cart'
    | 'begin_checkout'
    | 'add_payment_info'
    | 'purchase',
  params: Record<string, unknown>,
) {
  if (!MEASUREMENT_ID || !window.gtag) return
  window.gtag('event', event, { currency: 'TND', ...params })
}

/** Signale un crash React (voir ErrorBoundary) — sans ça, une erreur
 * inattendue qui fait planter toute la page ne laisse aucune trace, et
 * personne ne sait qu'un visiteur est tombé sur un écran blanc. */
export function trackException(description: string, fatal = true) {
  if (!MEASUREMENT_ID || !window.gtag) return
  window.gtag('event', 'exception', { description, fatal })
}
