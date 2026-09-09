import { Link } from 'react-router'
import { NAV_GROUPS, type NavId } from './nav'
import NavIcon from './NavIcon'

export default function Sidebar({
  active,
  onSelect,
  onClose,
}: {
  active: NavId
  onSelect: (id: NavId) => void
  /** Fourni uniquement en tiroir mobile ; absent en colonne fixe. */
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-sand/60 px-5 py-4">
        <img src="/images/logo.webp" alt="" className="h-8 w-8 shrink-0" />
        <div className="leading-tight">
          <p className="font-display text-sm tracking-[0.1em] text-ink">CHEZ&nbsp;LAZIZ</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b8912e]">
            Espace admin
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/35">
              {group.group}
            </p>
            {group.items.map((item) => {
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id)
                    onClose?.()
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-[#b8912e]/10 font-medium text-ink'
                      : 'text-ink/60 hover:bg-ink/[0.04] hover:text-ink'
                  }`}
                >
                  <span className={isActive ? 'text-[#b8912e]' : 'text-ink/40'}>
                    <NavIcon id={item.id} />
                  </span>
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sand/60 px-3 py-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/55 transition-colors hover:bg-ink/[0.04] hover:text-ink"
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
