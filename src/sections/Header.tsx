import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useCart } from '@/providers/cart'

const LINKS = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#maison', label: 'La Maison' },
  { href: '#collection', label: 'La Collection' },
  { href: '#galerie', label: 'Galerie' },
  { href: '/commande', label: 'Commander' },
  { href: '#visite', label: 'Nous trouver' },
]

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const cls = 'nav-link text-sm font-medium tracking-wide'
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

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const { count } = useCart()

  useEffect(() => {
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
  }, [])

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
          <a
            href="#accueil"
            className={`font-display text-xl tracking-[0.14em] md:text-2xl ${
              scrolled || open ? 'text-ink' : 'text-[#faf6f3]'
            }`}
          >
            CHEZ&nbsp;LAZIZ
          </a>

          <nav
            className={`hidden items-center gap-9 md:flex ${
              scrolled ? 'text-ink' : 'text-[#faf6f3]'
            }`}
          >
            {LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
            <Link
              to="/commande"
              aria-label="Voir le panier"
              className="relative flex h-9 w-9 items-center justify-center"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#bc773f] text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
            <Link
              to="/commande"
              className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ${
                scrolled
                  ? 'border-[#bc773f] text-accent hover:bg-[#bc773f] hover:text-white'
                  : 'border-[#faf6f3]/70 text-[#faf6f3] hover:bg-[#faf6f3] hover:text-ink'
              }`}
            >
              Commander
            </Link>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <Link
              to="/commande"
              aria-label="Voir le panier"
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
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#bc773f] text-[10px] font-semibold text-white">
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
        {LINKS.map((l, i) =>
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
        <a
          href="tel:+21623691039"
          className="mt-4 rounded-full bg-[#bc773f] px-8 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white"
        >
          Commander par téléphone
        </a>
      </div>
    </>
  )
}
