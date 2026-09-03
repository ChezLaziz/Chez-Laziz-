// Consentement aux cookies de mesure/publicité (GA4, Meta Pixel) — ni l'un
// ni l'autre ne se déclenche avant un choix explicite du visiteur. Le
// compteur de visites interne (anonyme, sans cookie tiers) n'est pas
// concerné et reste actif dans tous les cas — voir useTrackVisit.ts.

const STORAGE_KEY = 'laziz_cookie_consent'
const CHANGE_EVENT = 'laziz:consent-change'

export type ConsentValue = 'accepted' | 'declined'

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'accepted' || value === 'declined' ? value : null
}

export function setConsent(value: ConsentValue) {
  window.localStorage.setItem(STORAGE_KEY, value)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function onConsentChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}
