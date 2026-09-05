import ProductImage from '@/components/ProductImage'
import { kgLabel } from '@/lib/orderLines'
import { formatWeight } from '@contracts/shop'
import { PACK_ITEM_WEIGHT_KG, formatPriceDT, packWeightKg, type FixedPack } from '@contracts/packs'
import { useLang } from '@/lib/i18n'

const stepperBtnCls =
  'flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-white text-xl transition-colors hover:border-[#b8912e] hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/50 disabled:opacity-30'

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
 * pack.name / pack.tagline / pack.contents viennent de contracts/packs.ts
 * (données catalogue, testées exhaustivement dans packs.test.ts) et restent
 * en français pour l'instant — même limitation connue que les noms/
 * descriptions produits ailleurs sur le site. Seul le texte d'interface
 * autour (boutons, libellés) se traduit. */
export default function PackCard({
  pack,
  photos,
  qty,
  onAdd,
  onSetQty,
  onGoToOrder,
}: {
  pack: FixedPack
  /** Photo de chaque produit inclus, dans l'ordre (null = pas encore de photo). */
  photos: { src: string | null; alt: string }[]
  qty: number
  onAdd: () => void
  onSetQty: (qty: number) => void
  onGoToOrder: () => void
}) {
  const lang = useLang()
  const isAr = lang === 'ar'
  const highlight = pack.id === 'vip'
  const weight = packWeightKg(pack)
  const n = pack.contents.length

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        highlight ? 'border-[#b8912e] ring-1 ring-[#b8912e]/40' : 'border-sand/80'
      } ${qty > 0 ? 'ring-2 ring-[#b8912e]/50' : ''}`}
      aria-label={`${pack.name} — ${formatPriceDT(pack.priceMillimes, lang)}`}
    >
      {pack.badge && (
        <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#2e2a27] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e9c766]">
          <CrownIcon />
          {pack.badge}
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
      <div className="grid aspect-[5/4] min-h-0 grid-cols-2 grid-rows-2 gap-0.5 bg-sand/40">
        {photos.map((ph, i) => (
          <div key={i} className={`min-h-0 min-w-0 overflow-hidden ${n === 3 && i === 0 ? 'row-span-2' : ''}`}>
            <ProductImage src={ph.src} alt={ph.alt} compact />
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3 className="font-display text-2xl leading-tight">{pack.name}</h3>
        <p className="mt-1.5 text-sm font-light leading-relaxed text-ink/60">{pack.tagline}</p>

        <ul className="mt-4 space-y-2 text-[15px]">
          {pack.contents.map((name) => (
            <li key={name} className="flex items-start gap-2.5">
              <span className="mt-[3px] text-accent" aria-hidden="true">
                ✓
              </span>
              <span>
                {name} <span className="text-ink/45">— {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-sand/70 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50">
              {n} × {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}
            </p>
            <p className="mt-0.5 font-display text-xl">{kgLabel(weight, lang)}</p>
          </div>
          <p className="font-display text-2xl text-accent md:text-[1.7rem]">{formatPriceDT(pack.priceMillimes, lang)}</p>
        </div>

        {qty === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="gold-cta mt-5 h-12 w-full rounded-full text-sm font-semibold uppercase tracking-[0.14em] text-white transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/60"
          >
            {isAr ? 'اطلب' : 'Commander'}
          </button>
        ) : (
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2" role="group" aria-label={`${isAr ? 'الكمية' : 'Quantité'} — ${pack.name}`}>
              <button type="button" aria-label={isAr ? `إنقاص ${pack.name}` : `Retirer un ${pack.name}`} onClick={() => onSetQty(qty - 1)} className={stepperBtnCls}>
                −
              </button>
              <span className="w-7 text-center font-display text-lg" aria-live="polite">
                {qty}
              </span>
              <button type="button" aria-label={isAr ? `زيادة ${pack.name}` : `Ajouter un ${pack.name}`} onClick={() => onSetQty(qty + 1)} className={stepperBtnCls}>
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
