import { useEffect, useRef, useState } from 'react'

/** Barre supérieure : titre de la page, badge messages non lus, menu compte.
 *
 * Pas de champ de recherche global : la maquette en montrait un, mais il n'y
 * a rien à chercher en dehors des commandes — et la page Commandes a déjà sa
 * propre recherche. Un deuxième champ qui ne cherche que là-bas serait un
 * faux affordance. */
export default function TopBar({
  title,
  unreadCount,
  onOpenMessages,
  onOpenMenu,
  onLogout,
  right,
}: {
  title: string
  unreadCount: number
  onOpenMessages: () => void
  onOpenMenu: () => void
  onLogout: () => void
  /** Sélecteur de période — seulement sur les pages analytiques. */
  right?: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 border-b border-sand/60 bg-white/95 backdrop-blur-sm">
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:flex-nowrap md:px-6">
        <button
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1.5 text-ink/60 transition-colors hover:bg-ink/[0.04] lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="font-display text-lg text-ink">{title}</h1>

        <div className="ml-auto flex items-center gap-2">
          {right}

          <button
            onClick={onOpenMessages}
            aria-label={`Messages${unreadCount > 0 ? ` — ${unreadCount} non lus` : ''}`}
            className="relative rounded-lg p-2 text-ink/55 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8Z" strokeLinejoin="round" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-ink/[0.04]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b8912e]/15 text-xs font-semibold text-[#8f6f22]">
                CL
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-lg border border-sand/70 bg-white py-1 shadow-lg">
                <button
                  onClick={onLogout}
                  className="w-full px-3 py-2 text-left text-sm text-ink/70 transition-colors hover:bg-ink/[0.04] hover:text-red-600"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
