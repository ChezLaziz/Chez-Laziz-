import PriceSticker from '@/components/PriceSticker'
import ProductImage from '@/components/ProductImage'
import { kgLabel } from '@/lib/orderLines'
import { formatWeight } from '@contracts/shop'
import { PACK_ITEM_WEIGHT_KG, formatPriceDT, packWeightKg, type FixedPack } from '@contracts/packs'
import { useLang } from '@/lib/i18n'

const stepperBtnCls =
  'flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-surface text-xl transition-colors hover:border-gold hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-30'

function CrownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" />
    </svg>
  )
}

/** Carte d'un pack prêt : mosaïque des produits inclus (vraies photos du
 * catalogue), liste du contenu, poids total, prix fixe et bouton Commander.
 * Une fois ajouté, la carte affiche la quantité et un raccourci vers la
 * commande.
 *
 * pack.contents liste les produits par leur nom français exact — c'est la
 * clé qui relie un pack au catalogue (voir packPhotos dans OrderPage) et
 * elle ne doit jamais être traduite. Le nom affiché, lui, vient du produit
 * correspondant (contentsAr) pour que la carte arabe soit entièrement en
 * arabe sans casser cette liaison. */
export default function PackCard({
  pack,
  photo,
  photos,
  contentsAr,
  qty,
  onAdd,
  onSetQty,
  onGoToOrder,
}: {
  pack: FixedPack
  /** La photo du COFFRET, quand elle existe (téléversée depuis l'admin).
   * Absente, la carte retombe sur la mosaïque des produits — jamais sur du
   * vide. */
  photo?: string | null
  /** Photo de chaque produit inclus, dans l'ordre (null = pas encore de photo). */
  photos: { src: string | null; alt: string }[]
  /** Nom affiché de chaque produit inclus, dans l'ordre — déjà traduit. */
  contentsAr: string[]
  qty: number
  onAdd: () => void
  onSetQty: (qty: number) => void
  onGoToOrder: () => void
}) {
  const lang = useLang()
  const isAr = lang === 'ar'
  const packName = isAr ? pack.nameAr : pack.name
  const packBadge = isAr ? pack.badgeAr : pack.badge
  const highlight = pack.id === 'vip'
  const weight = packWeightKg(pack)
  const n = pack.contents.length

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-surface ${
        highlight ? 'border-gold ring-1 ring-gold/40' : 'border-sand/60'
      } ${qty > 0 ? 'ring-2 ring-gold/50' : ''}`}
      aria-label={`${packName} — ${formatPriceDT(pack.priceMillimes, lang)}`}
    >
      {packBadge && (
        // tracking-[0.2em] casse les ligatures de l'écriture arabe : la
        // pastille passe en interlettrage normal sur la version arabe.
        <span
          className={`absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#2e2a27] px-3 py-1.5 text-[10px] font-semibold text-[#e9c766] ${
            isAr ? 'tracking-normal' : 'uppercase tracking-[0.2em]'
          }`}
        >
          <CrownIcon />
          {packBadge}
        </span>
      )}

      {/* Mosaïque des produits inclus. Les photos réelles ont des cadrages très
          différents (portrait, panoramique…) : dans une grille CSS à lignes
          `1fr`, un <img> conserve par défaut sa taille intrinsèque comme
          hauteur minimale, ce qui peut faire exploser la grille bien au-delà
          de aspect-[5/4] (une photo étirée dans une case beaucoup trop haute
          se retrouve alors zoomée/coupée). min-h-0/min-w-0 neutralise ce
          minimum automatique pour que les cases restent bien à leur taille
          prévue, quel que soit le cadrage d'origine des photos. */}
      <div className="relative">
        {photo ? (
          // La photo du coffret l'emporte : c'est l'objet qu'on offre, et
          // c'est lui qu'on achète. La mosaïque ne montrait que le contenu
          // en vrac.
          <div className="aspect-[5/4] min-h-0 overflow-hidden bg-cream">
            <ProductImage src={photo} alt={packName} />
          </div>
        ) : (
          <div className="grid aspect-[5/4] min-h-0 grid-cols-2 grid-rows-2 gap-0.5 bg-cream">
            {photos.map((ph, i) => (
              <div key={i} className={`min-h-0 min-w-0 overflow-hidden ${n === 3 && i === 0 ? 'row-span-2' : ''}`}>
                <ProductImage src={ph.src} alt={ph.alt} compact />
              </div>
            ))}
          </div>
        )}
        {/* Même étiquette que sur les produits, en plus grand : le prix du
            coffret est un prix fini, pas un prix au kilo, et c'est écrit. */}
        <PriceSticker
          millimes={pack.priceMillimes}
          lang={lang}
          per={isAr ? 'الحزمة كاملة' : 'le pack complet'}
          size="lg"
          className="absolute -bottom-5 end-4 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 pt-8 md:p-6 md:pt-9">
        <h3 className="font-display text-2xl leading-tight">{packName}</h3>
        <p className="mt-1.5 text-sm font-light leading-relaxed text-ink/60">{isAr ? pack.taglineAr : pack.tagline}</p>

        <ul className="mb-5 mt-4 space-y-2 text-[15px]">
          {pack.contents.map((name, i) => (
            <li key={name} className="flex items-start gap-2.5">
              <span className="mt-[3px] text-accent" aria-hidden="true">
                ✓
              </span>
              <span>
                {isAr ? (contentsAr[i] ?? name) : name}{' '}
                <span className="text-ink/45">— {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Le poids total, en une ligne. Le prix n'est plus répété ici : il
            est sur l'étiquette, et deux prix dans une carte font chercher la
            différence. */}
        <p className="chiffres mt-auto border-t border-sand/60 pt-4 text-[13px] text-ink/60">
          {n} × {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}
          <span aria-hidden="true" className="mx-2 text-ink/30">=</span>
          <span className="font-semibold text-ink">{kgLabel(weight, lang)}</span>
        </p>

        {qty === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="gold-cta mt-4 h-12 w-full rounded-full text-sm font-semibold uppercase tracking-[0.14em] text-on-gold transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            {isAr ? 'اطلب' : 'Commander'}
          </button>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2" role="group" aria-label={`${isAr ? 'الكمية' : 'Quantité'} — ${packName}`}>
              <button type="button" aria-label={isAr ? `إنقاص ${packName}` : `Retirer un ${packName}`} onClick={() => onSetQty(qty - 1)} className={stepperBtnCls}>
                −
              </button>
              <span className="chiffres w-7 text-center text-lg font-semibold" aria-live="polite">
                {qty}
              </span>
              <button type="button" aria-label={isAr ? `زيادة ${packName}` : `Ajouter un ${packName}`} onClick={() => onSetQty(qty + 1)} className={stepperBtnCls}>
                +
              </button>
            </div>
            <button
              type="button"
              onClick={onGoToOrder}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-accent underline-offset-4 hover:underline"
            >
              {isAr ? 'أُضيف ✓ · شاهد الطلب' : 'Ajouté ✓ · Voir la commande'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
