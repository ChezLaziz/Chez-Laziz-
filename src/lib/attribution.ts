/** D'où vient le visiteur — capté sans jamais rien lui demander.
 *
 * Trois sources, par ordre de fiabilité :
 *   1. les paramètres UTM de l'URL, présents si le lien publicitaire est
 *      étiqueté (c'est nous qui étiquetons nos propres liens) ;
 *   2. à défaut, le domaine référent, quand le navigateur le transmet ;
 *   3. sinon rien — et « rien » est stocké comme inconnu, jamais deviné.
 *
 * PREMIER CONTACT, PAS LE DERNIER. La toute première visite de la session
 * est celle qui a amené la personne ; si elle revient ensuite par un lien
 * direct pour finaliser, on garde l'origine d'entrée. Écraser à chaque page
 * attribuerait toutes les commandes à « direct ».
 *
 * Stocké en sessionStorage : première partie, effacé à la fermeture de
 * l'onglet, jamais transmis à un tiers. Ne sert qu'à rattacher une commande
 * à son origine. */

const KEY = 'laziz_attribution'

/** Sources connues. Tout le reste devient `autre` : la valeur vient d'une
 * URL, donc de n'importe qui — on ne stocke pas une chaîne arbitraire comme
 * si elle était un nom de plateforme. */
const KNOWN_SOURCES = ['instagram', 'facebook', 'tiktok', 'google', 'direct', 'autre'] as const
export type AcquisitionSource = (typeof KNOWN_SOURCES)[number]

/** Domaines référents → source. Les navigateurs intégrés d'Instagram et de
 * TikTok masquent souvent le référent : ces visites finiront en `direct`,
 * ce qui est la raison d'étiqueter les liens plutôt que de s'y fier. */
const REFERRER_MAP: [RegExp, AcquisitionSource][] = [
  [/(^|\.)instagram\.com$/i, 'instagram'],
  [/(^|\.)(facebook|fb)\.com$/i, 'facebook'],
  [/(^|\.)tiktok\.com$/i, 'tiktok'],
  [/(^|\.)(google|google\.[a-z.]+)$/i, 'google'],
  [/(^|\.)youtube\.com$/i, 'autre'],
]

export type Attribution = {
  source: AcquisitionSource
  campaign?: string
  content?: string
}

function normalizeSource(raw: string | null): AcquisitionSource | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if ((KNOWN_SOURCES as readonly string[]).includes(v)) return v as AcquisitionSource
  // Variantes courantes des gestionnaires de publicité.
  if (v === 'ig' || v === 'insta') return 'instagram'
  if (v === 'fb' || v === 'meta') return 'facebook'
  if (v === 'tt') return 'tiktok'
  return 'autre'
}

/** Coupe et nettoie une étiquette libre (campagne, créative).
 * Bornée en longueur : elle vient de l'URL, donc de l'extérieur. */
function cleanLabel(raw: string | null): string | undefined {
  if (!raw) return undefined
  const v = raw.trim().slice(0, 120)
  return v === '' ? undefined : v
}

function fromReferrer(): AcquisitionSource | null {
  if (typeof document === 'undefined' || !document.referrer) return null
  let host: string
  try {
    host = new URL(document.referrer).hostname
  } catch {
    return null
  }
  // Navigation interne : ce n'est pas une origine.
  if (host === window.location.hostname) return null
  for (const [pattern, source] of REFERRER_MAP) {
    if (pattern.test(host)) return source
  }
  return 'autre'
}

/** À appeler à chaque navigation. N'écrit qu'une fois par session. */
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(KEY)) return // premier contact déjà enregistré

    const params = new URLSearchParams(window.location.search)
    const utmSource = normalizeSource(params.get('utm_source'))
    const campaign = cleanLabel(params.get('utm_campaign'))
    const content = cleanLabel(params.get('utm_content'))

    // Une campagne sans utm_source reste exploitable : on garde l'étiquette
    // et on laisse le référent trancher l'origine.
    const source = utmSource ?? fromReferrer() ?? 'direct'

    const attribution: Attribution = { source }
    if (campaign) attribution.campaign = campaign
    if (content) attribution.content = content
    sessionStorage.setItem(KEY, JSON.stringify(attribution))
  } catch {
    // Navigation privée ou stockage bloqué : l'attribution est perdue, la
    // commande passe quand même. Jamais bloquant.
  }
}

export function getAttribution(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Attribution
    return normalizeSource(parsed.source) ? parsed : null
  } catch {
    return null
  }
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/** Type d'appareil, déduit de l'agent utilisateur.
 *
 * Volontairement grossier : trois catégories suffisent pour décider (faut-il
 * soigner le mobile ?). Une détection fine serait à la fois plus fragile et
 * plus intrusive. */
export function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(ua)) return 'mobile'
  return 'desktop'
}
