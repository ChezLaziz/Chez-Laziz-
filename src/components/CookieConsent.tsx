import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getConsent, setConsent } from '@/lib/cookieConsent'

/** Nom de la variable CSS exposant la hauteur réelle du bandeau — lue par
 * toute barre fixe en bas d'écran (ex. le récap flottant de /commande) pour
 * se placer au-dessus au lieu de se retrouver cachée derrière (même
 * position "fixed bottom-0" que le bandeau, sinon). */
const HEIGHT_VAR = '--cookie-banner-h'

/** Bandeau de consentement — n'apparaît qu'une fois, tant qu'aucun choix
 * n'a été fait. Les cookies de mesure (GA4) et publicitaires (Meta Pixel)
 * ne se chargent qu'après acceptation, voir useTrackVisit.ts. */
export default function CookieConsent() {
  // Lu une seule fois au montage (pas dans un effet : localStorage est
  // disponible dès le premier rendu côté navigateur, aucune synchronisation
  // avec un système externe n'est nécessaire ici).
  const [visible, setVisible] = useState(() => getConsent() === null)
  const { pathname } = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const hidden = !visible || pathname.startsWith('/admin')

  useEffect(() => {
    const el = ref.current
    if (hidden || !el) {
      document.documentElement.style.setProperty(HEIGHT_VAR, '0px')
      return
    }
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(HEIGHT_VAR, `${entry.contentRect.height}px`)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.setProperty(HEIGHT_VAR, '0px')
    }
  }, [hidden])

  if (hidden) return null

  const choose = (value: 'accepted' | 'declined') => {
    setConsent(value)
    setVisible(false)
  }

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-sand/70 bg-[#faf6f3] px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:px-10"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-[13px] font-light leading-relaxed text-ink/75">
          Nous utilisons des cookies de mesure d'audience et publicitaires pour améliorer votre
          expérience et nos campagnes.{' '}
          <Link to="/politique-de-confidentialite" className="underline underline-offset-2">
            En savoir plus
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose('declined')}
            className="rounded-full border border-ink/20 px-5 py-2 text-[12px] uppercase tracking-[0.15em] text-ink/70 transition hover:border-ink/40"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-full bg-[#b8912e] px-5 py-2 text-[12px] uppercase tracking-[0.15em] text-white transition hover:bg-[#a37f27]"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
