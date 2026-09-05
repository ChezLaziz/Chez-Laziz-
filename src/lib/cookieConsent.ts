// Consentement aux cookies de mesure/publicité (GA4, Meta Pixel) — ni l'un
// ni l'autre ne se déclenche avant un choix explicite du visiteur. Le
// compteur de visites interne (anonyme, sans cookie tiers) n'est pas
// concerné et reste actif dans tous les cas — voir useTrackVisit.ts.

const STORAGE_KEY = 'laziz_cookie_consent'
const CHANGE_EVENT = 'laziz:consent-change'

export type ConsentValue = 'accepted' | 'declined'

// localStorage lève une exception en navigation privée iOS et quand le
// navigateur bloque les données de site : sans garde, le bandeau de cookies
// et la connexion admin plantaient au lieu de simplement ne rien mémoriser.
export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function setConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Choix non mémorisé (stockage indisponible) — il s'applique quand même
    // pour cette visite, le bandeau réapparaîtra à la prochaine.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function onConsentChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}
