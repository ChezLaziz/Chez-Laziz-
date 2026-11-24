import PriceSticker from '@/components/PriceSticker'
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
      className={`group flex min-w-0 flex-col overflow-hidden whitespace-normal rounded-2xl border bg-surface text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
        selected
          ? 'border-gold ring-2 ring-gold/40'
          : 'border-sand/60 hover:border-gold/60'
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <div className="relative w-full">
        <div className="aspect-square w-full overflow-hidden bg-cream">
          <ProductImage src={product.imageUrl} alt={displayName} compact />
        </div>
        {selected && position !== null && (
          <span className="chiffres absolute end-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-on-gold shadow">
            {position}
          </span>
        )}
        {/* Le prix de la part de 500 g qui entre dans le pack — même
            étiquette que partout, en petit. */}
        <PriceSticker
          millimes={packItemPrice(product.priceMillimes)}
          lang={lang}
          per={formatWeight(PACK_ITEM_WEIGHT_KG, lang)}
          size="sm"
          className="absolute -bottom-4 end-2.5 z-10"
        />
      </div>
      <div className="flex flex-1 flex-col p-3.5 pt-6 md:p-4 md:pt-7">
        <p className="mb-3 break-words text-[15px] font-medium leading-snug">
          {displayName}
          {product.isExclusiveCreation && (
            <sup className="ms-0.5 text-xs font-semibold text-accent" title={isAr ? 'اسم حصري لعند لعزيز' : 'Création exclusive Chez Laziz'}>
              ™
            </sup>
          )}
        </p>
        <span
          className={`mt-auto flex min-h-10 w-full items-center justify-center rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
            selected
              ? 'bg-gold text-on-gold'
              : 'border border-gold/50 bg-gold/10 text-accent group-hover:bg-gold group-hover:text-on-gold'
          }`}
        >
          {selected ? (isAr ? '✓ مُختار' : '✓ Choisi') : isAr ? '+ أضف' : '+ Ajouter'}
        </span>
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
            <p className="rounded-full border border-sand bg-surface px-3.5 py-1.5 text-sm" aria-live="polite">
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
                className={`h-1.5 rounded-full ${i < count ? 'bg-gold' : 'bg-sand'}`}
                aria-current={i === count ? 'step' : undefined}
              />
            ))}
          </ol>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-surface">
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
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">{isAr ? CUSTOM_PACK_NAME_AR : CUSTOM_PACK_NAME}</p>
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
                      p ? 'border-gold/50 bg-gold/10' : 'border-dashed border-[#faf6f3]/20 text-[#faf6f3]/40'
                    }`}
                  >
                    {p ? (
                      <>
                        <span className="text-gold" aria-hidden="true">
                          ✓
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {productName(p, lang)}
                          {p.isExclusiveCreation && <sup className="text-xs font-semibold text-accent">™</sup>}{' '}
                          <span className="text-[#faf6f3]/55">— {formatWeight(PACK_ITEM_WEIGHT_KG, lang)}</span>
                        </span>
                        <span className="chiffres font-bold text-gold">{formatPriceDT(packItemPrice(p.priceMillimes), lang)}</span>
                        <button
                          type="button"
                          aria-label={isAr ? `إزالة ${productName(p, lang)} من الحزمة` : `Retirer ${productName(p, lang)} du pack`}
                          onClick={() => onRemove(p.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#faf6f3]/50 transition-colors hover:bg-white/10 hover:text-[#faf6f3]"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="chiffres font-medium">{i + 1}</span>
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
              <span className="chiffres text-2xl font-bold text-gold" aria-live="polite">
                {formatPriceDT(total, lang)}
              </span>
            </div>

            <button
              type="button"
              onClick={onAdd}
              disabled={!complete}
              className="gold-cta mt-5 h-12 w-full rounded-full text-sm font-semibold uppercase tracking-[0.14em] text-on-gold transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#faf6f3]/70 disabled:cursor-not-allowed disabled:opacity-40"
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
                    ? `اختاروا ${remaining === 1 ? 'منتجًا إضافيًا واحدًا' : remaining === 2 ? 'منتجين إضافيين' : `${remaining} منتجات إضافية`} لإكمال حزمتكم.`
                    : `Choisissez encore ${remaining} produit${remaining > 1 ? 's' : ''} pour compléter votre pack.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
