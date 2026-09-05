import { useEffect } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { track } from '@/lib/analytics'
import ProductImage from '@/components/ProductImage'
import { useLang } from '@/lib/i18n'
import { productName, productDescription } from '@contracts/productText'

type Product = {
  id: number
  name: string
  description: string | null
  nameAr?: string | null
  descriptionAr?: string | null
  priceMillimes: number
  category: string
  badge: string | null
  imageUrl: string | null
  isExclusiveCreation: boolean
}

/** Jusqu'à 4 produits mis en avant sur l'accueil : d'abord les signatures
 * qui ont une vraie photo, puis les autres produits photographiés. */
function pickFeatured(products: Product[]): Product[] {
  const withPhoto = products.filter((p) => p.imageUrl)
  const signatures = withPhoto.filter((p) => p.category === 'Les signatures')
  const rest = withPhoto.filter((p) => p.category !== 'Les signatures')
  return [...signatures, ...rest].slice(0, 4)
}

export default function Signatures() {
  const lang = useLang()
  const { data: products, isLoading } = trpc.products.list.useQuery()
  const featured = products ? pickFeatured(products as Product[]) : []

  useEffect(() => {
    if (featured.length > 0) {
      track('view_item_list', {
        item_list_id: 'home_signatures',
        item_list_name: 'Nos signatures',
        items: featured.map((p) => ({ item_id: String(p.id), item_name: p.name, price: p.priceMillimes / 1000 })),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featured.length])

  if (!isLoading && featured.length === 0) return null

  return (
    <section className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p data-reveal className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
              {lang === 'ar' ? 'إبداعاتنا المميزة' : 'Nos signatures'}
            </p>
            <h2 data-reveal className="font-display text-3xl leading-tight md:text-5xl">
              {lang === 'ar' ? 'تشكيلة من أشهر إبداعاتنا' : 'Une sélection de nos créations emblématiques'}
            </h2>
          </div>
          <Link data-reveal to={lang === 'ar' ? '/ar/collection' : '/collection'} className="arrow-link">
            {lang === 'ar' ? 'شاهد التشكيلة كاملة' : 'Voir toute la collection'}
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={lang === 'ar' ? 'rotate-180' : ''}>
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-white">
                <div className="aspect-[4/5] bg-sand/40" />
                <div className="space-y-2 p-5">
                  <div className="h-4 w-3/4 rounded bg-sand/50" />
                  <div className="h-3 w-1/2 rounded bg-sand/40" />
                </div>
              </div>
            ))}
          {featured.map((p) => (
            <Link
              key={p.id}
              to={lang === 'ar' ? '/ar/commande' : '/commande'}
              data-reveal
              className="group flex flex-col overflow-hidden rounded-2xl border border-sand bg-white transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(46,42,39,0.25)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <ProductImage
                  src={p.imageUrl}
                  alt={productName(p, lang)}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                {p.badge && (
                  <span className="absolute left-3 top-3 rounded-full bg-[#faf6f3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent shadow">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4 md:p-5">
                <h3 className="font-display text-base leading-snug md:text-lg">
                  {productName(p, lang)}
                  {p.isExclusiveCreation && (
                    <sup className="ms-0.5 text-xs font-semibold text-accent" title={lang === 'ar' ? 'اسم حصري لعند لعزيز' : 'Création exclusive Chez Laziz'}>
                      ™
                    </sup>
                  )}
                </h3>
                {productDescription(p, lang) && (
                  <p className="mt-1 line-clamp-2 text-sm font-light leading-relaxed text-ink/55">
                    {productDescription(p, lang)}
                  </p>
                )}
                <p className="mt-auto pt-3 font-display text-lg text-accent">
                  {formatTND(p.priceMillimes)} <span className="text-xs">{lang === 'ar' ? 'د.ت / كغ' : 'DT / kg'}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p data-reveal className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-warm">
          {lang === 'ar'
            ? 'السعر لكل 1 كغ — الوزن حسب اختياركم من 500 غ إلى 2,5 كغ عند الطلب'
            : 'Prix pour 1 kg — poids au choix de 500 g à 2,5 kg à la commande'}
        </p>
      </div>
    </section>
  )
}
