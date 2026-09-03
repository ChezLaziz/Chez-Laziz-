import { trpc } from '@/providers/trpc'
import { useCart } from '@/providers/cart'
import { formatTND, PHONE_TEL } from '@/lib/shop'

type DbProduct = {
  id: number
  name: string
  description: string | null
  priceMillimes: number
  category: string
  badge: string | null
  imageUrl: string | null
}

const CATEGORY_ORDER = ['Les classiques', 'Les signatures', 'Les nouveautés']
const CATEGORY_NOTES: Record<string, string> = {
  'Les nouveautés': 'Selon la saison — à découvrir en boutique ou sur Instagram',
}
// Une photo réelle représentative par catégorie (pas de visuel par produit
// pour l'instant — on ne met pas d'image générique là où on n'a pas la vraie).
const CATEGORY_IMAGE: Record<string, string> = {
  'Les classiques': '/images/makroudh.jpg',
  'Les signatures': '/images/display.jpg',
  'Les nouveautés': '/images/hands.jpg',
}

function groupByCategory(products: DbProduct[]) {
  const categories = [...new Set(products.map((p) => p.category))]
  categories.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return categories.map((title) => ({
    title,
    note: CATEGORY_NOTES[title],
    image: CATEGORY_IMAGE[title] ?? '/images/makroudh.jpg',
    products: products.filter((p) => p.category === title),
  }))
}

function ProductCard({
  product,
  image,
  qty,
  onAdd,
  onSetQty,
}: {
  product: DbProduct
  image: string
  qty: number
  onAdd: () => void
  onSetQty: (qty: number) => void
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(46,42,39,0.25)]">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-[#faf6f3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent shadow">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Titre court */}
        <h4 className="font-display text-lg leading-snug">{product.name}</h4>

        {/* Description courte */}
        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-sm font-light leading-relaxed text-ink/55">
            {product.description}
          </p>
        )}

        {/* Prix — sous le titre/description */}
        <p className="mt-3 font-display text-xl text-accent">
          {formatTND(product.priceMillimes)} <span className="text-xs">TND</span>
        </p>

        {/* Action */}
        <div className="mt-4">
          {qty === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="w-full rounded-full border border-[#b8912e]/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-colors duration-300 hover:bg-[#b8912e] hover:text-white"
            >
              + Ajouter
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-full border border-[#b8912e] bg-[#f5ece5] px-3 py-1.5">
              <button
                type="button"
                aria-label="Retirer un"
                onClick={() => onSetQty(qty - 1)}
                className="flex h-7 w-7 items-center justify-center text-accent"
              >
                −
              </button>
              <span className="text-sm font-semibold text-accent">{qty}</span>
              <button
                type="button"
                aria-label="Ajouter un"
                onClick={onAdd}
                className="flex h-7 w-7 items-center justify-center text-accent"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const DEFAULT_EYEBROW = 'La Collection'
const DEFAULT_TITLE = 'Le makroudh, dans tous ses états'
const DEFAULT_SUBTITLE =
  'Des classiques aux créations de saison — chaque pièce est façonnée à la main, chaque jour. Prix en dinars tunisiens (TND).'

export default function Collection() {
  const { data: products, isLoading } = trpc.products.list.useQuery()
  const { data: pages } = trpc.content.pages.useQuery()
  const { cart, add, setQty } = useCart()
  const groups = products ? groupByCategory(products as DbProduct[]) : []

  return (
    <section id="collection" className="bg-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            {pages?.collectionEyebrow || DEFAULT_EYEBROW}
          </p>
          <h2 data-reveal className="font-display text-4xl leading-[1.05] md:text-6xl">
            {pages?.collectionTitle || DEFAULT_TITLE}
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-md text-[15px] font-light leading-relaxed text-ink/70">
            {pages?.collectionSubtitle || DEFAULT_SUBTITLE}
          </p>
          <a data-reveal href={PHONE_TEL} className="arrow-link mt-8 inline-flex">
            Commander par téléphone
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </a>
        </div>

        {isLoading && (
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-white">
                <div className="aspect-square bg-sand/40" />
                <div className="space-y-2 p-5">
                  <div className="h-4 w-3/4 rounded bg-sand/50" />
                  <div className="h-3 w-1/2 rounded bg-sand/40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && groups.length === 0 && (
          <p className="mt-16 rounded-xl border border-sand bg-white p-10 text-center text-sm text-ink/50">
            Le catalogue est en cours de mise à jour — revenez très vite, ou
            appelez-nous directement au {PHONE_TEL.replace('tel:', '')}.
          </p>
        )}

        {groups.map((cat) => (
          <div key={cat.title} data-reveal className="mt-16 first:mt-20">
            <div className="mb-8 flex items-baseline gap-5">
              <h3 className="font-display text-2xl md:text-3xl">{cat.title}</h3>
              <span className="h-px flex-1 bg-[#b8912e]/50" />
            </div>
            {cat.note && (
              <p className="-mt-4 mb-6 text-xs uppercase tracking-[0.18em] text-muted-warm">
                {cat.note}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {cat.products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  image={p.imageUrl || cat.image}
                  qty={cart[p.id] ?? 0}
                  onAdd={() => add(p.id, 1)}
                  onSetQty={(q) => setQty(p.id, q)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
