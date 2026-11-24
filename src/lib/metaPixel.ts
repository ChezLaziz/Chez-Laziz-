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

import { fbcToWrite, rawClickIdFromSearch } from '@contracts/metaClickId'

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim()

export const metaPixelEnabled = Boolean(PIXEL_ID)

/** Le clic publicitaire qui a amené cette visite — lu UNE fois, au
 * chargement de la page, pendant que le fbclid est encore dans l'adresse.
 *
 * EN MÉMOIRE SEULEMENT : ni cookie, ni localStorage, ni sessionStorage, et
 * rien ne part nulle part. La valeur ne sert que dans initMetaPixel, donc
 * après « Accepter ». Voir contracts/metaClickId.ts pour le pourquoi : sans
 * elle, une visiteuse qui accepte le bandeau APRÈS avoir quitté la page
 * d'arrivée commande avec son consentement mais sans le clic qui l'a
 * amenée. */
const clicDArrivee: { fbclid: string; vuLe: number } | null = (() => {
  if (!PIXEL_ID || typeof window === 'undefined') return null
  try {
    const fbclid = rawClickIdFromSearch(window.location.search)
    return fbclid ? { fbclid, vuLe: Date.now() } : null
  } catch {
    return null
  }
})()

/** Repose `_fbc` si le Pixel n'a plus aucun moyen de le faire lui-même.
 *
 * Appelée dans initMetaPixel et nulle part ailleurs : c'est ce qui la place
 * derrière le consentement. Même cookie que celui du Pixel (même nom, même
 * domaine, même durée de 90 jours), pour qu'il n'en existe jamais deux. */
function restaurerClicDArrivee() {
  if (!clicDArrivee) return
  try {
    // Le fbclid est encore dans l'adresse : le Pixel va le lire tout seul.
    if (rawClickIdFromSearch(window.location.search) === clicDArrivee.fbclid) return
    const existant =
      document.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('_fbc='))
        ?.slice('_fbc='.length) ?? null
    const valeur = fbcToWrite({
      fbclid: clicDArrivee.fbclid,
      firstSeenMs: clicDArrivee.vuLe,
      existingFbc: existant,
    })
    if (!valeur) return
    const hote = window.location.hostname.replace(/^www\./, '')
    // Pas d'attribut domain sur localhost ou une adresse IP : le navigateur
    // refuserait le cookie.
    const domaine = hote.includes('.') && !/^[\d.]+$/.test(hote) ? `; domain=.${hote}` : ''
    document.cookie = `_fbc=${valeur}; path=/; max-age=${90 * 24 * 3600}; SameSite=Lax${domaine}`
  } catch {
    // Cookies bloqués par le navigateur : rien à restaurer, rien à casser.
  }
}

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

/** Les événements émis AVANT que la cliente n'ait touché « Accepter ».
 *
 * Le Pixel ne se charge qu'au consentement : d'ici là window.fbq n'existe
 * pas, et chaque trackMeta repartait dans le vide — l'appelant, lui, pose
 * son verrou « déjà envoyé » et ne réessaiera jamais. Le ViewContent du
 * produit mis en avant, seul signal de haut d'entonnoir de la page que la
 * publicité paie, était ainsi perdu pour TOUTE nouvelle visiteuse : la
 * bannière cookies s'affiche par-dessus, elle accepte trois secondes plus
 * tard, et l'événement n'existait déjà plus.
 *
 * On les met de côté et on les rejoue à l'initialisation. Si elle REFUSE,
 * initMetaPixel n'est jamais appelé : la file n'est jamais vidée, rien ne
 * part — le refus reste respecté à la lettre. */
type EvenementEnAttente = { event: string; payload: Record<string, unknown>; eventId?: string }
const enAttente: EvenementEnAttente[] = []
/** Plafond : un panier composé longuement sans consentement ne doit pas
 * faire enfler la file indéfiniment. */
const ATTENTE_MAX = 20

function envoyer(event: string, payload: Record<string, unknown>, eventId?: string) {
  if (eventId) window.fbq!('track', event, payload, { eventID: eventId })
  else window.fbq!('track', event, payload)
}

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
  // AVANT l'init : fbevents.js lit `_fbc` au moment où il traite la file.
  // Posé ici, le clic accompagne aussi les événements du navigateur, pas
  // seulement la commande côté serveur.
  restaurerClicDArrivee()
  window.fbq('init', PIXEL_ID)
  // APRÈS l'init, jamais avant : un track antérieur serait ignoré par Meta.
  for (const e of enAttente.splice(0)) envoyer(e.event, e.payload, e.eventId)
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
  // « Contact » = le client part vers WhatsApp. PAS « Purchase » : personne
  // n'a encore acheté, et apprendre à Meta que cliquer vaut vendre enverrait
  // le budget sur des gens qui cliquent sans jamais commander.
  // « Lead » = la commande vient d'être ACCEPTÉE par le serveur. Ce n'est
  // toujours pas « Purchase » : personne n'a payé, et la commande sera
  // confirmée au téléphone. Mais c'est le geste le plus proche d'une vente
  // que la page puisse mesurer à l'instant même — entre lui et le Purchase
  // serveur (qui attend l'appel), Meta n'avait RIEN à apprendre.
  event:
    | 'ViewContent'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'Purchase'
    | 'Contact'
    | 'Lead',
  params: { value: number; contents: MetaContentItem[] },
  eventId?: string,
) {
  // Le test du Pixel reste EN PREMIER : sans identifiant, on n'empile rien.
  if (!PIXEL_ID) return
  const payload = {
    currency: 'TND',
    value: params.value,
    content_type: 'product',
    content_ids: params.contents.map((c) => c.id),
    contents: params.contents,
    num_items: params.contents.reduce((n, c) => n + (c.quantity ?? 1), 0),
  }
  if (!window.fbq) {
    if (enAttente.length < ATTENTE_MAX) enAttente.push({ event, payload, eventId })
    return
  }
  envoyer(event, payload, eventId)
}
