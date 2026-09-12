import { useEffect, useRef, useState } from 'react'
import { estCheminInterne } from '@contracts/internalPaths'
import { Link, useLocation } from 'react-router'
import { getConsent, setConsent } from '@/lib/cookieConsent'
import { useLang } from '@/lib/i18n'

/** Nom de la variable CSS exposant la hauteur réelle du bandeau — lue par
 * toute barre fixe en bas d'écran (ex. le récap flottant de /commande) pour
 * se placer au-dessus au lieu de se retrouver cachée derrière (même
 * position "fixed bottom-0" que le bandeau, sinon). */
const HEIGHT_VAR = '--cookie-banner-h'

/** Bandeau de consentement — n'apparaît qu'une fois, tant qu'aucun choix
 * n'a été fait. Les cookies de mesure (GA4) et publicitaires (Meta Pixel)
 * ne se chargent qu'après acceptation, voir useTrackVisit.ts.
 *
 * DISCRET PAR CONSTRUCTION. Mesuré sur un téléphone de 844 px de haut,
 * l'ancienne version en occupait 230 — un quart de la première impression,
 * et le premier élément que l'œil rencontrait sur une page d'arrivée
 * publicitaire. Elle est désormais sur une seule ligne, texte court, deux
 * boutons compacts : le visiteur choisit sans que le makroudh disparaisse
 * derrière. Le texte long et le lien vers la politique restent, en plus
 * petit — informer n'oblige pas à occuper l'écran. */
export default function CookieConsent() {
  // Lu une seule fois au montage (pas dans un effet : localStorage est
  // disponible dès le premier rendu côté navigateur, aucune synchronisation
  // avec un système externe n'est nécessaire ici).
  const [visible, setVisible] = useState(() => getConsent() === null)
  const { pathname } = useLocation()
  const lang = useLang()
  const isAr = lang === 'ar'
  const ref = useRef<HTMLDivElement>(null)
  const hidden = !visible || estCheminInterne(pathname)

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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-sand/70 bg-[#faf6f3]/97 px-4 pt-2.5 backdrop-blur-sm md:px-10"
      // pb-[env(safe-area-inset-bottom)] : sur iPhone, la barre d'accueil
      // recouvre sinon les boutons du bandeau.
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 md:gap-6">
        <p className="min-w-0 flex-1 text-[11px] font-light leading-snug text-ink/60 md:text-[13px]">
          {isAr ? (
            <>
              نستعمل ملفات تعريف الارتباط لقياس الزيارات.{' '}
              <Link to="/politique-de-confidentialite" className="underline underline-offset-2">
                المزيد
              </Link>
            </>
          ) : (
            <>
              Cookies de mesure d'audience et publicitaires.{' '}
              <Link to="/politique-de-confidentialite" className="underline underline-offset-2">
                En savoir plus
              </Link>
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose('declined')}
            className="min-h-9 rounded-full px-3 text-[11px] font-medium text-ink/50 transition hover:text-ink md:text-xs"
          >
            {isAr ? 'رفض' : 'Refuser'}
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="min-h-9 rounded-full bg-[#b8912e] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#a37f27] md:text-xs"
          >
            {isAr ? 'موافق' : 'Accepter'}
          </button>
        </div>
      </div>
    </div>
  )
}
