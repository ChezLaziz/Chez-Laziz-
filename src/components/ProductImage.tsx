import { useState } from 'react'
import { useLang } from '@/lib/i18n'

function Placeholder({ alt, className, compact }: { alt: string; className: string; compact: boolean }) {
  const isAr = useLang() === 'ar'
  return (
    <div
      role="img"
      aria-label={isAr ? `${alt} — الصورة قريبًا` : `${alt} — photo à venir`}
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
        <span className={`text-[10px] text-ink/35 ${isAr ? '' : 'uppercase tracking-[0.2em]'}`}>
          {isAr ? 'الصورة قريبًا' : 'Photo à venir'}
        </span>
      )}
    </div>
  )
}

/** Photo d'un produit, ou un emplacement neutre s'il n'en a pas encore —
 * ou si le fichier existe mais ne s'affiche pas (upload corrompu, objet
 * supprimé du stockage, erreur réseau passagère).
 *
 * On ne montre jamais la photo d'un autre produit (ou une photo générique
 * de makroudh) à la place : un client qui commande "Makroudh au blé" en
 * voyant une photo de makroudh aux dattes est induit en erreur. Un
 * emplacement sobre est plus honnête — et la vraie photo peut être ajoutée
 * (ou remplacée) à tout moment depuis l'admin. */
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
  const [failed, setFailed] = useState(false)
  // Un changement de produit (nouvelle src) mérite un nouvel essai — l'échec
  // précédent ne doit pas s'appliquer à une autre photo. Ajusté pendant le
  // rendu plutôt que dans un effet (pas de rendu supplémentaire inutile).
  const [prevSrc, setPrevSrc] = useState(src)
  if (src !== prevSrc) {
    setPrevSrc(src)
    if (failed) setFailed(false)
  }

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return <Placeholder alt={alt} className={className} compact={compact} />
}
