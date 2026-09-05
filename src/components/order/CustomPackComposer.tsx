import ProductImage from '@/components/ProductImage'
import { kgLabel, type CatalogProduct } from '@/lib/orderLines'
import { formatWeight } from '@contracts/shop'
import {
  CUSTOM_PACK_NAME,
  CUSTOM_PACK_NAME_AR,
  CUSTOM_PACK_PACKAGING_LABEL,
  CUSTOM_PACK_PACKAGING_LABEL_AR,
  CUSTOM_PACK_PACKAGING_MILLIMES,
  CUSTOM_PACK_SIZE,
  CUSTOM_PACK_SUBTITLE,
  CUSTOM_PACK_SUBTITLE_AR,
  CUSTOM_PACK_WEIGHT_KG,
  PACK_ITEM_WEIGHT_KG,
  customPackProductsTotal,
  customPackTotal,
  formatPriceDT,
  packItemPrice,
} from '@contracts/packs'
import { useLang, type Lang } from '@/lib/i18n'
import { productName } from '@contracts/productText'

/** Carte produit sélectionnable (500 g). Tout le bloc est le bouton :
 * grande cible tactile, état sélectionné très visible. */
function ProductPickCard({
  product,
  selected,
  position,
  disabled,
  onToggle,
  lang,
}: {
  product: CatalogProduct
  selected: boolean
  /** Rang dans le pack (1 à 4) quand sélectionné. */
  position: number | null
  disabled: boolean
  onToggle: () => void
  lang: Lang
}) {
  const isAr = lang === 'ar'
  const displayName = productName(product, lang)
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${displayName}, ${formatWeight(PACK_ITEM_WEIGHT_KG, lang)}, ${formatPriceDT(packItemPrice(product.priceMillimes), lang)}${
        selected ? (isAr ? '، مُختار' : ', sélectionné') : ''
      }`}
      className={`group flex min-w-0 flex-col overflow-hidden whitespace-normal rounded-2xl border bg-white text-left shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/60 ${
        selected
          ? 'border-[#b8912e] ring-2 ring-[#b8912e]/40'
          : 'border-sand/80 hover:border-[#b8912e]/60 hover:shadow-md'
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-sand/30">
        <ProductImage src={product.imageUrl} alt={displayName} compact />
        {selected && position !== null && (
          <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#b8912e] font-display text-sm text-white shadow">
            {position}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5 md:p-4">
        <p className="break-words font-medium leading-snug">{displayName}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink/50">
          {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <span className="whitespace-nowrap font-display text-lg text-accent">{formatPriceDT(packItemPrice(product.priceMillimes), lang)}</span>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              selected ? 'bg-[#b8912e] text-white' : 'border border-ink/20 text-ink group-hover:border-[#b8912e] group-hover:text-accent'
            }`}
          >
            {selected ? (isAr ? '✓ مُختار' : '✓ Sélectionné') : isAr ? '+ أضف' : '+ Ajouter'}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function CustomPackComposer({
  products,
  isLoading,
  selected,
  onToggle,
  onRemove,
  onAdd,
  justAdded,
}: {
  products: CatalogProduct[]
  isLoading: boolean
  /** Identifiants des produits choisis, dans l'ordre de sélection. */
  selected: number[]
  onToggle: (productId: number) => void
  onRemove: (productId: number) => void
  onAdd: () => void
  justAdded: boolean
}) {
  const lang = useLang()
  const isAr = lang === 'ar'
  const chosen = selected.map((id) => products.find((p) => p.id === id)).filter((p): p is CatalogProduct => !!p)
  const count = chosen.length
  const complete = count === CUSTOM_PACK_SIZE
  const remaining = CUSTOM_PACK_SIZE - count
  const bases = chosen.map((p) => p.priceMillimes)
  const productsTotal = customPackProductsTotal(bases)
  const total = customPackTotal(bases)
  const ordinalsAr = ['الأول', 'الثاني', 'الثالث', 'الرابع']
  const ordinalsFr = ['premier', 'deuxième', 'troisième', 'quatrième']

  return (
    <div id="composer" className="scroll-mt-24">
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">{isAr ? CUSTOM_PACK_NAME_AR : CUSTOM_PACK_NAME}</p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">{isAr ? CUSTOM_PACK_SUBTITLE_AR : CUSTOM_PACK_SUBTITLE}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] font-light leading-relaxed text-ink/65">
          {isAr
            ? `اختاروا ${CUSTOM_PACK_SIZE} نكهات — ${formatWeight(PACK_ITEM_WEIGHT_KG, lang)} لكل واحدة، ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)} بالمجموع. السعر يُحسب تلقائيًا.`
            : `Choisissez vos ${CUSTOM_PACK_SIZE} saveurs — ${formatWeight(PACK_ITEM_WEIGHT_KG, lang)} chacune, ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)} au total. Le prix se calcule automatiquement.`}
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Sélection */}
        <div className="min-w-0 lg:col-span-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/70">
              {isAr ? `اختاروا ${CUSTOM_PACK_SIZE} نكهات` : `Choisissez vos ${CUSTOM_PACK_SIZE} saveurs`}
            </p>
            <p className="rounded-full border border-sand bg-white px-3.5 py-1.5 text-sm" aria-live="polite">
              {complete ? (
                <span className="font-semibold text-accent">{isAr ? 'الحزمة مكتملة ✓' : 'Pack complet ✓'}</span>
              ) : isAr ? (
                <>
                  <span className="font-semibold">{count}</span> / {CUSTOM_PACK_SIZE} مُختارة
                </>
              ) : (
                <>
                  <span className="font-semibold">{count}</span> / {CUSTOM_PACK_SIZE} sélectionnés
                </>
              )}
            </p>
          </div>
          <ol className="mb-6 grid grid-cols-4 gap-2" aria-label={isAr ? 'التقدم' : 'Progression'}>
            {Array.from({ length: CUSTOM_PACK_SIZE }).map((_, i) => (
              <li
                key={i}
                className={`h-1.5 rounded-full ${i < count ? 'bg-[#b8912e]' : 'bg-sand'}`}
                aria-current={i === count ? 'step' : undefined}
              />
            ))}
          </ol>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-white">
                  <div className="aspect-square bg-sand/40" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-3/4 rounded bg-sand/50" />
                    <div className="h-3 w-1/3 rounded bg-sand/40" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 2xl:grid-cols-3">
              {products.map((p) => {
                const idx = selected.indexOf(p.id)
                const isSelected = idx !== -1
                return (
                  <ProductPickCard
                    key={p.id}
                    product={p}
                    selected={isSelected}
                    position={isSelected ? idx + 1 : null}
                    disabled={!isSelected && complete}
                    onToggle={() => onToggle(p.id)}
                    lang={lang}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Votre Pack */}
        <div className="min-w-0 lg:col-span-5">
          <div className="rounded-2xl bg-ink-deep p-6 text-[#faf6f3] md:p-8 lg:sticky lg:top-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#b8912e]">{isAr ? CUSTOM_PACK_NAME_AR : CUSTOM_PACK_NAME}</p>
            <h3 className="mt-2 font-display text-2xl">{isAr ? 'حزمتكم' : 'Votre Pack'}</h3>
            <p className="mt-1 text-sm text-[#faf6f3]/60" aria-live="polite">
              {isAr ? `${count} / ${CUSTOM_PACK_SIZE} مُختارة` : `${count} / ${CUSTOM_PACK_SIZE} sélectionnés`}
            </p>

            <ol className="mt-5 space-y-2.5">
              {Array.from({ length: CUSTOM_PACK_SIZE }).map((_, i) => {
                const p = chosen[i]
                return (
                  <li
                    key={i}
                    className={`flex min-h-11 items-center gap-3 rounded-lg border px-3.5 py-2 text-[15px] ${
                      p ? 'border-[#b8912e]/50 bg-[#b8912e]/10' : 'border-dashed border-[#faf6f3]/20 text-[#faf6f3]/40'
                    }`}
                  >
                    {p ? (
                      <>
                        <span className="text-[#b8912e]" aria-hidden="true">
                          ✓
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {productName(p, lang)} <span className="text-[#faf6f3]/55">— {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}</span>
                        </span>
                        <span className="font-display text-[#b8912e]">{formatPriceDT(packItemPrice(p.priceMillimes), lang)}</span>
                        <button
                          type="button"
                          aria-label={isAr ? `إزالة ${productName(p, lang)} من الحزمة` : `Retirer ${productName(p, lang)} du pack`}
                          onClick={() => onRemove(p.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#faf6f3]/50 transition-colors hover:bg-[#faf6f3]/10 hover:text-[#faf6f3]"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-display">{i + 1}</span>
                        <span>
                          {isAr
                            ? `اختاروا منتجكم ${ordinalsAr[i]}`
                            : `Choisissez votre ${ordinalsFr[i]} produit`}
                        </span>
                      </>
                    )}
                  </li>
                )
              })}
            </ol>

            <div className="mt-5 space-y-1.5 border-t border-[#faf6f3]/15 pt-4 text-sm font-light text-[#faf6f3]/75">
              <div className="flex items-baseline justify-between">
                <span>{isAr ? 'الوزن' : 'Poids'}</span>
                <span>
                  {count} × {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}
                  {complete
                    ? ` · ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)}`
                    : isAr
                      ? ` (من ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)})`
                      : ` (sur ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)})`}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span>{isAr ? 'المنتجات' : 'Produits'}</span>
                <span>{formatPriceDT(productsTotal, lang)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span>{isAr ? CUSTOM_PACK_PACKAGING_LABEL_AR : CUSTOM_PACK_PACKAGING_LABEL}</span>
                <span>+ {formatPriceDT(CUSTOM_PACK_PACKAGING_MILLIMES, lang)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline border-t border-[#faf6f3]/15 pt-4">
              <span className="text-sm uppercase tracking-[0.2em]">{isAr ? 'المجموع' : 'Total'}</span>
              <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
              <span className="font-display text-2xl text-[#b8912e]" aria-live="polite">
                {formatPriceDT(total, lang)}
              </span>
            </div>

            <button
              type="button"
              onClick={onAdd}
              disabled={!complete}
              className="gold-cta mt-5 h-12 w-full rounded-full text-sm font-semibold uppercase tracking-[0.14em] text-white transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#faf6f3]/70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAr ? 'أضف إلى السلة' : 'Ajouter au panier'}
            </button>
            <p className="mt-3 text-center text-xs font-light text-[#faf6f3]/60" aria-live="polite">
              {justAdded && count === 0
                ? isAr
                  ? 'أُضيفت الحزمة الخاصة إلى طلبكم ✓'
                  : 'Custom Pack ajouté à votre commande ✓'
                : complete
                  ? isAr
                    ? 'الحزمة مكتملة ✓ — أضيفوها إلى طلبكم.'
                    : 'Pack complet ✓ — ajoutez-le à votre commande.'
                  : isAr
                    ? `اختاروا ${remaining} منتج${remaining > 1 ? 'ات' : ''} إضافي${remaining > 1 ? 'ة' : ''} لإكمال حزمتكم.`
                    : `Choisissez encore ${remaining} produit${remaining > 1 ? 's' : ''} pour compléter votre pack.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
