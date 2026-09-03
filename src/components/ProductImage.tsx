/** Photo d'un produit, ou un emplacement neutre s'il n'en a pas encore.
 *
 * On ne montre jamais la photo d'un autre produit (ou une photo générique
 * de makroudh) à la place : un client qui commande "Makroudh au blé" en
 * voyant une photo de makroudh aux dattes est induit en erreur. Un
 * emplacement sobre est plus honnête — et la vraie photo peut être ajoutée
 * à tout moment depuis l'admin. */
export default function ProductImage({
  src,
  alt,
  className = '',
  compact = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  /** Version miniature (liste de commande) : logo seul, sans légende. */
  compact?: boolean
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={`${alt} — photo à venir`}
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[#f5ece5] ${className}`}
    >
      <img
        src="/images/logo.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={compact ? 'h-7 w-7 opacity-40' : 'h-12 w-12 opacity-40'}
      />
      {!compact && (
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/35">Photo à venir</span>
      )}
    </div>
  )
}
