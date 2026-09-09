import type { NavId } from './nav'

/** Icônes de la navigation, séparées de `nav.ts`.
 *
 * `nav.ts` ne contient plus que des données : un module qui exporte à la
 * fois des composants et des constantes casse le rafraîchissement à chaud
 * de Vite. */
export default function NavIcon({ id }: { id: NavId }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      {paths(id)}
    </svg>
  )
}

function paths(id: NavId) {
  switch (id) {
    case 'apercu':
      return (
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="12" width="8" height="9" rx="1.5" />
          <rect x="3" y="15" width="8" height="6" rx="1.5" />
        </>
      )
    case 'commandes':
      return (
        <>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeLinejoin="round" />
          <path d="M9 8h6M9 12h6" strokeLinecap="round" />
        </>
      )
    case 'catalogue':
      return (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v16" />
        </>
      )
    case 'messages':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
    case 'contenu':
      return (
        <>
          <path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
          <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
        </>
      )
    case 'parametres':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15H3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.3 8.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.2 1Z"
            strokeLinejoin="round"
          />
        </>
      )
  }
}
