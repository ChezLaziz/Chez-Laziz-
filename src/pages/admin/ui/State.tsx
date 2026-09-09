/** États explicites de chaque bloc du tableau de bord.
 *
 * L'audit a relevé le contraire partout : une requête en échec affichait
 * « Aucune commande » (donc « ton business est à zéro »), et une autre un
 * chargement infini. Un chiffre absent et un chiffre nul ne veulent pas dire
 * la même chose — ces composants forcent à les distinguer. */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink/[0.06] ${className}`} />
}

export function ErrorState({ label = 'Impossible de charger ces données.' }: { label?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 shrink-0 text-red-500">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16h.01" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-red-700">{label}</p>
    </div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-ink/45">{label}</p>
}

/** Données présentes mais trop maigres pour en tirer une conclusion.
 * Distinct de « vide » : ici on sait qu'on ne sait pas encore. */
export function InsufficientData({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-sand bg-[#faf6f3] px-4 py-5">
      <p className="text-sm text-ink/55">{label}</p>
    </div>
  )
}

/** Donnée qui ne peut pas exister tant qu'une colonne n'est pas collectée.
 * Affichée telle quelle plutôt qu'estimée : un profit inventé est pire
 * qu'un profit absent. */
export function NotCollected({ what, needs }: { what: string; needs: string }) {
  return (
    <div className="rounded-lg border border-dashed border-sand bg-[#faf6f3] px-4 py-5">
      <p className="text-sm font-medium text-ink/70">{what} — donnée non collectée</p>
      <p className="mt-1 text-xs leading-relaxed text-ink/50">{needs}</p>
    </div>
  )
}
