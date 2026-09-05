import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useCart } from '@/providers/cart'
import { useLang, useIsBilingualPage, altLangPath, type Lang } from '@/lib/i18n'

// Navigation volontairement courte : le parcours principal est
// Accueil → Collection → Commander → Nous trouver. La Maison et la
// Galerie restent en ligne (liens dans le pied de page) mais n'ont pas
// besoin d'être dans la navigation principale — elles n'aident pas à
// décider ou à commander, elles alourdissent juste le choix.
// Sur grand écran, "Commander" est déjà le bouton doré à droite (plus le
// panier) : le répéter en lien texte ferait trois entrées pour la même
// page. Le menu mobile, lui, n'a pas ce bouton et garde le lien.
// "Nous trouver" n'a pas encore de version arabe : le libellé se traduit
// quand même (cohérence de la navigation), le lien pointe vers la page
// française telle quelle.
function links(lang: Lang) {
  const collection = lang === 'ar' ? '/ar/collection' : '/collection'
  return [
    { href: lang === 'ar' ? '/ar' : '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil' },
    { href: collection, label: lang === 'ar' ? 'التشكيلة' : 'La Collection' },
    { href: '/contact', label: lang === 'ar' ? 'تواصل معنا' : 'Nous trouver' },
  ]
}
function orderHref(lang: Lang) {
  return lang === 'ar' ? '/ar/commande' : '/commande'
}
function mobileLinks(lang: Lang) {
  const l = links(lang)
  return [l[0], l[1], { href: orderHref(lang), label: lang === 'ar' ? 'اطلب الآن' : 'Commander' }, l[2]]
}

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const cls = 'nav-link whitespace-nowrap text-sm font-medium tracking-wide'
  const inner = (
    <>
      <span className="nl-first">{label}</span>
      <span className="nl-second text-accent" aria-hidden="true">{label}</span>
    </>
  )
  return href.startsWith('/') ? (
    <Link to={href} onClick={onClick} className={cls}>{inner}</Link>
  ) : (
    <a href={href} onClick={onClick} className={cls}>{inner}</a>
  )
}

/** Bouton FR / عربي — visible seulement sur les pages qui existent dans les
 * deux langues (voir BILINGUAL_BASE_PATHS). Conserve la page équivalente
 * et la chaîne de requête (utile pour ?produit=… par ex.). */
function LanguageSwitch({ tone }: { tone: 'light' | 'dark' }) {
  const { pathname, search } = useLocation()
  const lang = useLang()
  const target = lang === 'ar' ? 'fr' : 'ar'
  const href = altLangPath(pathname, search, target)
  return (
    <Link
      to={href}
      lang={target}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
        tone === 'light'
          ? 'border-ink/20 text-ink/70 hover:border-[#b8912e] hover:text-accent'
          : 'border-[#faf6f3]/50 text-[#faf6f3] hover:bg-[#faf6f3] hover:text-ink'
      }`}
    >
      {target === 'ar' ? 'عربي' : 'FR'}
    </Link>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const lang = useLang()
  const isBilingual = useIsBilingualPage()
  const isHome = pathname === '/' || pathname === '/ar'
  const [scrolledState, setScrolled] = useState(false)
  // Sur les pages sans photo en fond (tout sauf l'accueil), le header doit
  // toujours être dans son style "clair" (texte foncé, fond visible) —
  // sinon le texte blanc devient invisible sur fond crème.
  const scrolled = isHome ? scrolledState : true
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const { count } = useCart()
  const LINKS = links(lang)
  const MOBILE_LINKS = mobileLinks(lang)

  useEffect(() => {
    if (!isHome) return
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      if (y > 400 && y > lastY + 4) setHidden(true)
      else if (y < lastY - 4) setHidden(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <header
        className={`site-header fixed inset-x-0 top-0 z-50 ${
          hidden && !open ? 'header-hidden' : ''
        } ${
          scrolled && !open
            ? 'border-b border-sand/60 bg-[#faf6f3]/90 backdrop-blur-md'
            : 'border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-10">
          <Link
            to={lang === 'ar' ? '/ar' : '/'}
            className="flex items-center gap-2.5"
          >
            <img src="/images/logo.webp" alt="Chez Laziz" className="h-10 w-10 md:h-12 md:w-12" />
            <span
              className={`font-display text-xl tracking-[0.14em] md:text-2xl ${
                scrolled || open ? 'text-ink' : 'text-[#faf6f3]'
              }`}
            >
              CHEZ&nbsp;LAZIZ
            </span>
          </Link>

          <nav
            className={`hidden items-center gap-4 md:flex lg:gap-7 xl:gap-9 ${
              scrolled ? 'text-ink' : 'text-[#faf6f3]'
            }`}
          >
            {LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
            {isBilingual && <LanguageSwitch tone={scrolled ? 'light' : 'dark'} />}
            <Link
              to={orderHref(lang)}
              aria-label={lang === 'ar' ? 'عربة التسوق' : 'Voir le panier'}
              className="relative flex h-9 w-9 items-center justify-center"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#b8912e] text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
            <Link
              to={orderHref(lang)}
              className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ${
                scrolled
                  ? 'border-[#b8912e] text-accent hover:bg-[#b8912e] hover:text-white'
                  : 'border-[#faf6f3]/70 text-[#faf6f3] hover:bg-[#faf6f3] hover:text-ink'
              }`}
            >
              {lang === 'ar' ? 'اطلب الآن' : 'Commander'}
            </Link>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <Link
              to={orderHref(lang)}
              aria-label={lang === 'ar' ? 'عربة التسوق' : 'Voir le panier'}
              className={`relative flex h-10 w-10 items-center justify-center ${
                scrolled || open ? 'text-ink' : 'text-[#faf6f3]'
              }`}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#b8912e] text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className={`flex h-10 w-10 flex-col items-center justify-center gap-[6px] ${
              scrolled || open ? 'text-ink' : 'text-[#faf6f3]'
            }`}
          >
            <span
              className={`h-px w-6 bg-current transition-transform duration-300 ${
                open ? 'translate-y-[3.5px] rotate-45' : ''
              }`}
            />
            <span
              className={`h-px w-6 bg-current transition-transform duration-300 ${
                open ? '-translate-y-[3.5px] -rotate-45' : ''
              }`}
            />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen drawer */}
      <div
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[#2e2a27] transition-[clip-path] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          open ? '[clip-path:inset(0_0_0_0)]' : 'pointer-events-none [clip-path:inset(0_0_100%_0)]'
        }`}
      >
        {MOBILE_LINKS.map((l, i) =>
          l.href.startsWith('/') ? (
            <Link
              key={l.href}
              to={l.href}
              onClick={() => setOpen(false)}
              className="font-display text-4xl text-[#faf6f3] transition-all duration-500"
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : '0ms', opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(16px)' }}
            >
              {l.label}
            </Link>
          ) : (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-display text-4xl text-[#faf6f3] transition-all duration-500"
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : '0ms', opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(16px)' }}
            >
              {l.label}
            </a>
          ),
        )}
        {isBilingual && (
          <div
            className="transition-all duration-500"
            style={{ transitionDelay: open ? `${120 + MOBILE_LINKS.length * 60}ms` : '0ms', opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(16px)' }}
          >
            <LanguageSwitch tone="dark" />
          </div>
        )}
        <a
          href="tel:+21623691039"
          className="mt-4 rounded-full bg-[#b8912e] px-8 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white"
        >
          {lang === 'ar' ? 'اطلب عبر الهاتف' : 'Commander par téléphone'}
        </a>
      </div>
    </>
  )
}
