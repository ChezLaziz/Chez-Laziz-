/** Icônes des cartes du tableau de bord.
 *
 * Dessinées à la main plutôt qu'importées d'une bibliothèque : il en faut
 * huit, elles ne changent jamais, et aucune dépendance supplémentaire ne se
 * justifie pour huit tracés.
 *
 * Chaque icône ACCOMPAGNE un libellé écrit — jamais seule. Une icône seule
 * se devine ; un chiffre d'affaires ne se devine pas. */
export type DashIconName =
  | 'revenue'
  | 'orders'
  | 'customers'
  | 'units'
  | 'basket'
  | 'cost'
  | 'rate'
  | 'returning'
  | 'chart'

export default function DashIcon({ name, size = 18 }: { name: DashIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths(name)}
    </svg>
  )
}

function paths(name: DashIconName) {
  switch (name) {
    case 'revenue':
    case 'chart':
      return (
        <>
          <path d="M4 20V13" />
          <path d="M10 20V8" />
          <path d="M16 20v-5" />
          <path d="M20 20V4" />
        </>
      )
    case 'orders':
      return (
        <>
          <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L20 7H6" />
          <circle cx="10" cy="19.5" r="1.3" />
          <circle cx="17" cy="19.5" r="1.3" />
        </>
      )
    case 'customers':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.5M17.5 20a5.5 5.5 0 0 0-2-4.3" />
        </>
      )
    case 'units':
      return (
        <>
          <path d="M3.5 11.5 11 4h7v7l-7.5 7.5a2 2 0 0 1-2.8 0l-4.2-4.2a2 2 0 0 1 0-2.8Z" />
          <circle cx="14.8" cy="7.2" r="1.2" />
        </>
      )
    case 'basket':
      return (
        <>
          <path d="M5 8h14l-1 11a2 2 0 0 1-2 1.8H8A2 2 0 0 1 6 19Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </>
      )
    case 'cost':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      )
    case 'rate':
      return (
        <>
          <path d="M6 18 18 6" />
          <circle cx="7.5" cy="7.5" r="2" />
          <circle cx="16.5" cy="16.5" r="2" />
        </>
      )
    case 'returning':
      return (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      )
  }
}
