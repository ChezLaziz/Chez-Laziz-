import { Link } from 'react-router'
import { NAV_GROUPS, type NavId } from './nav'
import NavIcon from './NavIcon'

/** Branche d'olivier de la charte — le même motif que la maquette place en
 * tête et en pied de la colonne. */
function OliveBranch({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M32 33V13" />
      <path d="M32 15c-4.5-.4-8-2.2-9.6-5.2C25.8 8.4 30 10 32 15Z" />
      <path d="M32 15c4.5-.4 8-2.2 9.6-5.2C38.2 8.4 34 10 32 15Z" />
      <path d="M32 22c-5-.5-9-2.5-10.7-5.8C25 14.7 29.7 16.5 32 22Z" />
      <path d="M32 22c5-.5 9-2.5 10.7-5.8C39 14.7 34.3 16.5 32 22Z" />
      <path d="M32 9c-2.6-1.2-4.3-3.2-4.6-5.6 2.6.6 4.4 2.6 4.6 5.6Z" />
      <path d="M32 9c2.6-1.2 4.3-3.2 4.6-5.6-2.6.6-4.4 2.6-4.6 5.6Z" />
    </svg>
  )
}

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
    <div className="flex h-full flex-col bg-[#f3efe9]">
      <div className="px-5 pb-3 pt-4 text-center">
        <OliveBranch className="mx-auto h-6 w-12 text-[#7d9188]" />
        <p className="mt-1.5 font-display text-[17px] tracking-[0.14em] text-ink">CHEZ&nbsp;LAZIZ</p>
        <p className="font-display text-[11px] italic leading-snug text-ink/50">
          Le goût authentique de la Tunisie
        </p>
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
                  ? 'bg-[#dcdfde] font-semibold text-ink'
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

      <div className="px-3 pb-1">
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

      {/* Pied de colonne de la maquette. Décoratif — donc masqué quand la
          colonne est courte (téléphone couché) plutôt que de pousser la
          navigation hors de l'écran. */}
      <div className="hidden shrink-0 px-5 pb-3 pt-1.5 text-center sm:block">
        <OliveBranch className="mx-auto h-5 w-10 text-[#a8b8ae]" />
        <div className="mx-auto mt-1.5 h-px w-6 bg-sand/70" />
        <p className="mt-1.5 font-display text-[13px] leading-[1.35] text-[#c3ab8f]">
          Tradition
          <br />
          Qualité
          <br />
          Partage
        </p>
        <div className="mx-auto mt-2 h-px w-10 bg-sand/70" />
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.3em] text-ink/35">
          Tunisie <span className="text-[#b08968]">♥</span>
        </p>
      </div>
    </div>
  )
}
