import { useState } from 'react'
import ProductImage from '@/components/ProductImage'
import type { CatalogProduct } from '@/lib/orderLines'
import { ALLOWED_WEIGHTS_KG, formatWeight, priceForWeight, type WeightKg } from '@contracts/shop'
import { formatPriceDT } from '@contracts/packs'
import { useLang } from '@/lib/i18n'
import { productName, productDescription } from '@contracts/productText'

const stepperBtnCls =
  'flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-white text-xl transition-colors hover:border-[#b8912e] hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/50 disabled:opacity-30'

/** Carte « à la carte » : un produit, un poids au choix (500 g à 2,5 kg,
 * prix calculé depuis le prix au kilo), une quantité libre. Toutes les
 * lignes déjà dans la commande pour ce produit restent visibles. */
export default function ProductOrderCard({
  product,
  qtyByWeight,
  onAdd,
  onSetQty,
}: {
  product: CatalogProduct
  /** Quantité déjà commandée pour chaque poids de ce produit. */
  qtyByWeight: Partial<Record<WeightKg, number>>
  onAdd: (weightKg: WeightKg) => void
  onSetQty: (weightKg: WeightKg, qty: number) => void
}) {
  const lang = useLang()
  const isAr = lang === 'ar'
  const displayName = productName(product, lang)
  const displayDescription = productDescription(product, lang)
  const inCart = (Object.keys(qtyByWeight) as unknown as string[]).map(Number) as WeightKg[]
  const [weight, setWeight] = useState<WeightKg>(inCart[0] ?? 1)
  const qty = qtyByWeight[weight] ?? 0
  const price = priceForWeight(product.priceMillimes, weight)
  const otherLines = inCart.filter((w) => w !== weight && (qtyByWeight[w] ?? 0) > 0)

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        inCart.length > 0 ? 'border-[#b8912e] ring-1 ring-[#b8912e]/40' : 'border-sand/80'
      }`}
      aria-label={`${displayName} — ${formatPriceDT(product.priceMillimes, lang)} ${isAr ? 'للكيلوغرام' : 'le kilo'}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-sand/30">
        <ProductImage src={product.imageUrl} alt={displayName} compact />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-[#faf6f3]/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">
            {product.badge}
          </span>
        )}
        {inCart.length > 0 && (
          <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#b8912e] text-white shadow" aria-hidden="true">
            ✓
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5 md:p-4">
        <p className="break-words font-medium leading-snug">{displayName}</p>
        {displayDescription && (
          <p className="mt-1 line-clamp-2 text-xs font-light leading-relaxed text-ink/55">{displayDescription}</p>
        )}
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-ink/50">
          {formatPriceDT(product.priceMillimes, lang)} {isAr ? '/ كغ' : '/ kg'}
        </p>

        <label className="mt-3 block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/50">{isAr ? 'الوزن' : 'Poids'}</span>
          <select
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value) as WeightKg)}
            aria-label={`${isAr ? 'الوزن' : 'Poids'} — ${displayName}`}
            className="mt-1 h-11 w-full rounded-lg border border-sand bg-white px-3 text-sm text-ink outline-none focus:border-[#b8912e] focus:ring-2 focus:ring-[#b8912e]/25"
          >
            {ALLOWED_WEIGHTS_KG.map((w) => (
              <option key={w} value={w}>
                {formatWeight(w, lang)} — {formatPriceDT(priceForWeight(product.priceMillimes, w), lang)}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
          <span className="whitespace-nowrap font-display text-lg text-accent">{formatPriceDT(price, lang)}</span>
          {qty === 0 ? (
            <button
              type="button"
              onClick={() => onAdd(weight)}
              className="min-h-10 shrink-0 rounded-full border border-ink/20 px-4 text-[11px] font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/60"
            >
              {isAr ? '+ أضف' : '+ Ajouter'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5" role="group" aria-label={`${isAr ? 'الكمية' : 'Quantité'} — ${displayName} ${formatWeight(weight, lang)}`}>
              <button type="button" aria-label={isAr ? `إنقاص ${displayName}` : `Retirer un ${displayName}`} onClick={() => onSetQty(weight, qty - 1)} className={stepperBtnCls}>
                −
              </button>
              <span className="w-7 text-center font-display text-lg" aria-live="polite">
                {qty}
              </span>
              <button type="button" aria-label={isAr ? `زيادة ${displayName}` : `Ajouter un ${displayName}`} onClick={() => onSetQty(weight, qty + 1)} className={stepperBtnCls}>
                +
              </button>
            </div>
          )}
        </div>

        {otherLines.length > 0 && (
          <p className="mt-2 text-[11px] text-ink/55">
            {isAr ? 'أيضًا في الطلب: ' : 'Aussi dans la commande : '}
            {otherLines.map((w) => `${qtyByWeight[w]} × ${formatWeight(w, lang)}`).join(', ')}
          </p>
        )}
      </div>
    </article>
  )
}
