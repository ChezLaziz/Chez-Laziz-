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
      // Maison : l'accueil du tableau de bord, comme sur la maquette.
      return (
        <>
          <path d="M3.5 10.5 12 3.8l8.5 6.7V19a1.6 1.6 0 0 1-1.6 1.6H5.1A1.6 1.6 0 0 1 3.5 19Z" strokeLinejoin="round" />
          <path d="M9.6 20.6v-6h4.8v6" strokeLinejoin="round" />
        </>
      )
    case 'commandes':
      return (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M9 3.5h6v3H9z" strokeLinejoin="round" />
          <path d="M8.5 12.5h7M8.5 16h4.5" strokeLinecap="round" />
        </>
      )
    case 'catalogue':
      // Cabas : le catalogue et ses prix, côté vente.
      return (
        <>
          <path d="M4 8h16l-1 11.2a2 2 0 0 1-2 1.8H7a2 2 0 0 1-2-1.8Z" strokeLinejoin="round" />
          <path d="M9 8V6.4a3 3 0 0 1 6 0V8" strokeLinecap="round" />
        </>
      )
    case 'messages':
      return (
        <>
          <path d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.6-.34L4.5 20l1.2-3.3a6.8 6.8 0 0 1-2.2-5.1c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" strokeLinejoin="round" />
          <path d="M8.6 11.6h.01M12 11.6h.01M15.4 11.6h.01" strokeLinecap="round" strokeWidth="2.2" />
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
