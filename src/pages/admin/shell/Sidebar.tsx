import { Link } from 'react-router'
import { NAV_GROUPS, type NavId } from './nav'
import NavIcon from './NavIcon'

export default function Sidebar({
  active,
  onSelect,
  onClose,
  unreadCount = 0,
}: {
  active: NavId
  onSelect: (id: NavId) => void
  /** Fourni uniquement en tiroir mobile ; absent en colonne fixe. */
  onClose?: () => void
  /** Messages non lus — la pastille de la maquette, avec le vrai chiffre. */
  unreadCount?: number
}) {
  const items = NAV_GROUPS.flatMap((g) => g.items)

  return (
    <div className="flex h-full flex-col bg-[#f4f1ec]">
      {/* Le nom de la maison et ce que cet écran est. Rien d'autre : ni
          ornement ni devise, on vient ici pour travailler. */}
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <img src="/images/logo.webp" alt="" width="30" height="30" className="h-[30px] w-[30px] shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-ink">Chez Laziz</p>
          <p className="truncate text-[11.5px] text-ink/50">Administration</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id)
                onClose?.()
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] transition-colors ${
                isActive
                  ? 'bg-white font-semibold text-ink shadow-[0_0_0_1px_#e6e0d8]'
                  : 'text-ink/70 hover:bg-ink/[0.045] hover:text-ink'
              }`}
            >
              <span className={isActive ? 'text-[#2a4750]' : 'text-ink/55'}>
                <NavIcon id={item.id} />
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.id === 'messages' && unreadCount > 0 && (
                <span className="flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[#2a4750] px-1.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-[#e6e0d8] px-3 pb-3 pt-2">
        {/* L'écran de l'atelier s'ouvre sur UN AUTRE appareil — la tablette
            posée près du four — d'où le nouvel onglet : on ne veut pas
            remplacer le tableau de bord de celui qui clique. */}
        <a
          href="/atelier"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-ink/55 transition-colors hover:bg-ink/[0.045] hover:text-ink"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="2" y="4" width="20" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" strokeLinecap="round" />
          </svg>
          Écran de l'atelier
        </a>
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-ink/55 transition-colors hover:bg-ink/[0.045] hover:text-ink"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M14 3h7v7M21 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" strokeLinecap="round" />
          </svg>
          Voir le site
        </Link>
      </div>

    </div>
  )
}
