import { trpc } from '@/providers/trpc'
import { formatTND, PHONE_TEL } from '@/lib/shop'

type DbProduct = {
  id: number
  name: string
  description: string | null
  priceMillimes: number
  category: string
  badge: string | null
}

const CATEGORY_ORDER = ['Les classiques', 'Les signatures', 'Les nouveautés']
const CATEGORY_NOTES: Record<string, string> = {
  'Les nouveautés': 'Selon la saison — à découvrir en boutique ou sur Instagram',
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
    products: products.filter((p) => p.category === title),
  }))
}

export default function Collection() {
  const { data: products } = trpc.products.list.useQuery()
  const groups = products ? groupByCategory(products as DbProduct[]) : []

  return (
    <section id="collection" className="bg-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="grid gap-14 lg:grid-cols-12">
          {/* Sticky heading column */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-1/2 lg:-translate-y-1/2">
              <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
                La Collection
              </p>
              <h2 data-reveal className="font-display text-4xl leading-[1.05] md:text-6xl">
                Le makroudh,
                <br />
                dans tous
                <br />
                ses états
              </h2>
              <p
                data-reveal
                className="mt-6 max-w-xs text-[15px] font-light leading-relaxed text-ink/70"
              >
                Des classiques aux créations de saison — chaque pièce est
                façonnée à la main, chaque jour. Prix en dinars tunisiens (TND).
              </p>
              <a data-reveal href={PHONE_TEL} className="arrow-link mt-8">
                Commander par téléphone
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                  <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
            </div>
          </div>

          {/* Products */}
          <div className="lg:col-span-8">
            {groups.map((cat) => (
              <div key={cat.title} data-reveal className="mb-16 last:mb-0">
                <div className="mb-8 flex items-baseline gap-5">
                  <h3 className="font-display text-2xl md:text-3xl">{cat.title}</h3>
                  <span className="h-px flex-1 bg-[#bc773f]/50" />
                </div>
                {cat.note && (
                  <p className="-mt-4 mb-6 text-xs uppercase tracking-[0.18em] text-muted-warm">
                    {cat.note}
                  </p>
                )}
                <ul className="space-y-6">
                  {cat.products.map((p) => (
                    <li key={p.id}>
                      <div className="flex items-baseline">
                        <span className="text-lg font-medium">{p.name}</span>
                        {p.badge && (
                          <span className="ml-3 rounded-full border border-[#bc773f] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                            {p.badge}
                          </span>
                        )}
                        <span className="leader" aria-hidden="true" />
                        <span className="font-display shrink-0 text-lg text-accent">
                          {formatTND(p.priceMillimes)}
                          <span className="ml-1 text-xs">TND</span>
                        </span>
                      </div>
                      {p.description && (
                        <p className="mt-1 max-w-md text-sm font-light text-ink/60">{p.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
