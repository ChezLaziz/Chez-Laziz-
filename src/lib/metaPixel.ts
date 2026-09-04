// Meta Pixel (Facebook/Instagram Ads) — chargé uniquement si
// VITE_META_PIXEL_ID est défini au build. Sans identifiant, chaque fonction
// est un no-op et aucun script Meta n'est injecté (voir la page Politique
// de confidentialité, qui reflète cet état).
//
// Mêmes garanties que GA4 (src/lib/analytics.ts) : aucune donnée
// personnelle envoyée depuis le navigateur — les événements ne contiennent
// que des identifiants/noms de produits, des quantités et des montants.
// Le téléphone du client n'est transmis (haché) que côté serveur, voir
// api/lib/metaConversionsApi.ts.

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim()

export const metaPixelEnabled = Boolean(PIXEL_ID)

type FbqFn = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[][]
  push?: FbqFn
  loaded?: boolean
  version?: string
}

declare global {
  interface Window {
    fbq?: FbqFn
    _fbq?: FbqFn
  }
}

let initialized = false

export function initMetaPixel() {
  if (!PIXEL_ID || initialized || typeof window === 'undefined') return
  initialized = true
  if (!window.fbq) {
    // Réplique le snippet officiel Meta : une file d'attente le temps que
    // fbevents.js se charge et prenne le relai de window.fbq.
    const fbq: FbqFn = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue!.push(args)
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)
  }
  window.fbq('init', PIXEL_ID)
}

export function trackMetaPageView() {
  if (!PIXEL_ID || !window.fbq) return
  window.fbq('track', 'PageView')
}

export type MetaContentItem = { id: string; quantity?: number; item_price?: number }

/** Événements standard Meta utiles à l'optimisation des campagnes
 * (retargeting + Advantage+ / correspondance des achats). `eventId` doit
 * être identique côté Conversions API (api/lib/metaConversionsApi.ts) pour
 * que Meta déduplique les deux envois d'un même événement. */
export function trackMeta(
  event: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase',
  params: { value: number; contents: MetaContentItem[] },
  eventId?: string,
) {
  if (!PIXEL_ID || !window.fbq) return
  const payload = {
    currency: 'TND',
    value: params.value,
    content_type: 'product',
    content_ids: params.contents.map((c) => c.id),
    contents: params.contents,
    num_items: params.contents.reduce((n, c) => n + (c.quantity ?? 1), 0),
  }
  if (eventId) window.fbq('track', event, payload, { eventID: eventId })
  else window.fbq('track', event, payload)
}
