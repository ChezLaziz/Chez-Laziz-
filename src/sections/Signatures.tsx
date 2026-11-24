import { useEffect } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import PriceSticker from '@/components/PriceSticker'
import { track } from '@/lib/analytics'
import ProductImage from '@/components/ProductImage'
import { useLang } from '@/lib/i18n'
import { productBadge, productName, productDescription } from '@contracts/productText'

type Product = {
  id: number
  name: string
  description: string | null
  nameAr?: string | null
  descriptionAr?: string | null
  priceMillimes: number
  category: string
  badge: string | null
  badgeAr?: string | null
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
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-surface">
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
              className="group flex flex-col overflow-hidden rounded-2xl border border-sand/60 bg-surface transition-colors duration-300 hover:border-gold/60"
            >
              <div className="relative">
                <div className="aspect-[4/5] overflow-hidden bg-cream">
                  <ProductImage
                    src={p.imageUrl}
                    alt={productName(p, lang)}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                {productBadge(p, lang) && (
                  <span className={`absolute start-2.5 top-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[9px] font-semibold text-accent backdrop-blur-sm ${lang === 'ar' ? 'tracking-normal' : 'uppercase tracking-[0.14em]'}`}>
                    {productBadge(p, lang)}
                  </span>
                )}
                <PriceSticker
                  millimes={p.priceMillimes}
                  lang={lang}
                  per={lang === 'ar' ? 'الكيلو' : 'le kilo'}
                  className="absolute -bottom-4 end-2.5 z-10"
                />
              </div>
              <div className="flex flex-1 flex-col p-4 pt-6 md:p-5 md:pt-7">
                <h3 className="font-display text-base leading-snug md:text-lg">
                  {productName(p, lang)}
                  {p.isExclusiveCreation && (
                    <sup className="ms-0.5 text-xs font-semibold text-accent" title={lang === 'ar' ? 'اسم حصري لعند لعزيز' : 'Création exclusive Chez Laziz'}>
                      ™
                    </sup>
                  )}
                </h3>
                {productDescription(p, lang) && (
                  <p dir="auto" className="mt-1 line-clamp-2 text-sm font-light leading-relaxed text-ink/55">
                    {productDescription(p, lang)}
                  </p>
                )}
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
