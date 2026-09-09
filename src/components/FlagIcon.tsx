/** Drapeaux tricolore et tunisien, dessinés en SVG.
 *
 * PAS d'emoji 🇫🇷/🇹🇳 : Windows ne dessine aucun drapeau national (il
 * affiche « FR » et « TN » en lettres), et plusieurs Android anciens ne
 * connaissent pas tous les codes. Un client sur deux verrait donc un carré
 * vide à l'endroit précis où il doit choisir sa langue.
 *
 * `title` est absent volontairement : ces drapeaux sont décoratifs, le
 * libellé lisible est porté par le bouton qui les contient. */
export default function FlagIcon({ lang, className = '' }: { lang: 'fr' | 'ar'; className?: string }) {
  const common = `inline-block shrink-0 rounded-[3px] ${className}`
  if (lang === 'fr') {
    return (
      <svg viewBox="0 0 3 2" className={common} aria-hidden="true">
        <rect width="3" height="2" fill="#fff" />
        <rect width="1" height="2" fill="#000091" />
        <rect x="2" width="1" height="2" fill="#e1000f" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 30 20" className={common} aria-hidden="true">
      <rect width="30" height="20" fill="#e70013" />
      <circle cx="15" cy="10" r="6" fill="#fff" />
      <circle cx="15" cy="10" r="4.6" fill="#e70013" />
      <circle cx="16.4" cy="10" r="3.7" fill="#fff" />
      {/* Étoile à cinq branches, centrée dans le croissant. */}
      <path
        fill="#e70013"
        d="M15.6 6.9l.85 2.6h2.74l-2.22 1.6.85 2.6-2.22-1.61-2.21 1.61.84-2.6-2.21-1.6h2.73z"
      />
    </svg>
  )
}
