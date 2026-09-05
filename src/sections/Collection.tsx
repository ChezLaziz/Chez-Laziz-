import { useEffect } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useCart } from '@/providers/cart'
import { formatTND, PHONE_TEL } from '@/lib/shop'
import { track } from '@/lib/analytics'
import { setJsonLd } from '@/hooks/useSEO'
import ProductImage from '@/components/ProductImage'
import { useLang } from '@/lib/i18n'
import { CATEGORY_LABELS_AR } from '@/lib/categories'

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
const CATEGORY_NOTES_AR: Record<string, string> = {
  'Les nouveautés': 'حسب الموسم — اكتشفوها في المتجر أو على إنستغرام',
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
    noteAr: CATEGORY_NOTES_AR[title],
    products: products.filter((p) => p.category === title),
  }))
}

function ProductCard({
  product,
  qty,
  onAdd,
  onSetQty,
  lang,
}: {
  product: DbProduct
  qty: number
  onAdd: () => void
  onSetQty: (qty: number) => void
  lang: 'fr' | 'ar'
}) {
  const isAr = lang === 'ar'
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(46,42,39,0.25)]">
      <div className="relative aspect-square overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="transition-transform duration-500 hover:scale-105"
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

        {/* Prix — sous le titre/description. Prix pour 1 kg ; le poids
            (500 g à 2,5 kg) se choisit à l'étape de la commande. */}
        <p className="mt-3 font-display text-xl text-accent">
          {formatTND(product.priceMillimes)} <span className="text-xs">{isAr ? 'د.ت / كغ' : 'TND / kg'}</span>
        </p>

        {/* Action — ajoute 1 kg ; le poids se change ensuite sur la page Commander */}
        <div className="mt-auto pt-4">
          {qty === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="w-full rounded-full border border-[#b8912e]/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-colors duration-300 hover:bg-[#b8912e] hover:text-white"
            >
              {isAr ? '+ أضف' : '+ Ajouter'}
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-full border border-[#b8912e] bg-[#f5ece5] px-2 py-1">
              <button
                type="button"
                aria-label={isAr ? `إنقاص ${product.name}` : `Retirer un ${product.name}`}
                onClick={() => onSetQty(qty - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-accent hover:bg-[#b8912e]/15"
              >
                −
              </button>
              <span className="text-sm font-semibold text-accent" aria-live="polite">
                {qty} <span className="font-normal text-accent/70">{isAr ? '× 1 كغ' : '× 1 kg'}</span>
              </span>
              <button
                type="button"
                aria-label={isAr ? `زيادة ${product.name}` : `Ajouter un ${product.name}`}
                onClick={onAdd}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-accent hover:bg-[#b8912e]/15"
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
const DEFAULT_EYEBROW_AR = 'التشكيلة'
const DEFAULT_TITLE = 'Le makroudh, dans tous ses états'
const DEFAULT_TITLE_AR = 'المقروض، بكل أشكاله'
const DEFAULT_SUBTITLE =
  'Des classiques aux créations de saison — chaque pièce est façonnée à la main, chaque jour. Prix en dinars tunisiens (TND).'
const DEFAULT_SUBTITLE_AR =
  'من الكلاسيكيات إلى إبداعات المواسم — كل قطعة تُصنع يدويًا كل يوم. الأسعار بالدينار التونسي (TND).'

export default function Collection({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel
  const lang = useLang()
  const isAr = lang === 'ar'
  const { data: products, isLoading } = trpc.products.list.useQuery()
  const { data: pages } = trpc.content.pages.useQuery()
  const { qtyFor, add, setQty } = useCart()
  const groups = products ? groupByCategory(products as DbProduct[]) : []

  // Schema.org ItemList/Product — aide Google à comprendre le catalogue
  // (nom, prix pour 1 kg, disponibilité) au-delà du simple texte de la page.
  useEffect(() => {
    if (!products || products.length === 0) return
    const list = products as DbProduct[]
    track('view_item_list', {
      item_list_id: 'collection',
      item_list_name: 'La Collection',
      items: list.map((p) => ({ item_id: String(p.id), item_name: p.name, price: p.priceMillimes / 1000 })),
    })
    return setJsonLd('collection-products-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          category: p.category,
          ...(p.description ? { description: p.description } : {}),
          ...(p.imageUrl ? { image: `https://chezlaziz.com${p.imageUrl}` } : {}),
          offers: {
            '@type': 'Offer',
            price: (p.priceMillimes / 1000).toFixed(3),
            priceCurrency: 'TND',
            availability: 'https://schema.org/InStock',
            url: 'https://chezlaziz.com/collection',
          },
        },
      })),
    })
  }, [products])

  return (
    <section id="collection" className="bg-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            {isAr ? pages?.collectionEyebrowAr || DEFAULT_EYEBROW_AR : pages?.collectionEyebrow || DEFAULT_EYEBROW}
          </p>
          <Heading data-reveal className="font-display text-4xl leading-[1.05] md:text-6xl">
            {isAr ? pages?.collectionTitleAr || DEFAULT_TITLE_AR : pages?.collectionTitle || DEFAULT_TITLE}
          </Heading>
          <p data-reveal className="mx-auto mt-6 max-w-md text-[15px] font-light leading-relaxed text-ink/70">
            {isAr
              ? pages?.collectionSubtitleAr || DEFAULT_SUBTITLE_AR
              : pages?.collectionSubtitle || DEFAULT_SUBTITLE}
          </p>
          <a data-reveal href={PHONE_TEL} dir="ltr" className="arrow-link mt-8 inline-flex">
            {isAr ? 'اطلب عبر الهاتف' : 'Commander par téléphone'}
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </a>
          <div data-reveal className="mt-4">
            <Link to="/makroudh-aux-dattes" className="text-xs uppercase tracking-[0.18em] text-ink/45 underline underline-offset-4 hover:text-accent">
              {isAr ? 'الوصفة التقليدية لمقروض التمر' : 'La recette traditionnelle du makroudh aux dattes'}
            </Link>
          </div>
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
            {isAr ? (
              <>الكاتالوج قيد التحديث — عودوا قريبًا، أو اتصلوا بنا مباشرة على <span dir="ltr">{PHONE_TEL.replace('tel:', '')}</span>.</>
            ) : (
              <>Le catalogue est en cours de mise à jour — revenez très vite, ou appelez-nous directement au {PHONE_TEL.replace('tel:', '')}.</>
            )}
          </p>
        )}

        {groups.map((cat) => (
          <div key={cat.title} data-reveal className="mt-16 first:mt-20">
            <div className="mb-8 flex items-baseline gap-5">
              <h3 className="font-display text-2xl md:text-3xl">{isAr ? CATEGORY_LABELS_AR[cat.title] || cat.title : cat.title}</h3>
              <span className="h-px flex-1 bg-[#b8912e]/50" />
            </div>
            {(isAr ? cat.noteAr : cat.note) && (
              <p className="-mt-4 mb-6 text-xs uppercase tracking-[0.18em] text-muted-warm">
                {isAr ? cat.noteAr : cat.note}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {cat.products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={qtyFor(p.id)}
                  lang={lang}
                  onAdd={() => {
                    add(p.id)
                    track('add_to_cart', {
                      value: p.priceMillimes / 1000,
                      items: [{ item_id: String(p.id), item_name: p.name, item_variant: '1 kg', price: p.priceMillimes / 1000, quantity: 1 }],
                    })
                  }}
                  onSetQty={(q) => setQty(p.id, 1, q)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
