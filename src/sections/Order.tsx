import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { formatTND, WA_LINK, PHONE_TEL, PHONE_DISPLAY } from '@/lib/shop'

export default function Order() {
  const { data: products } = trpc.products.list.useQuery()
  const quick = (products ?? []).slice(0, 4)
  return (
    <section id="commande" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* Gift box photo */}
          <div className="lg:col-span-6">
            <div className="mask-reveal aspect-[3/2]">
              <img
                src="/images/box.jpg"
                alt="Coffret de makroudh Chez Laziz prêt à offrir ou à emporter"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Order panel */}
          <div className="lg:col-span-6">
            <div className="bg-ink-deep p-8 text-[#faf6f3] md:p-12" data-reveal>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-[#bc773f]">
                Commander
              </p>
              <h2 className="font-display text-3xl leading-tight md:text-5xl">
                Un coup de fil,
                <br />
                et c’est prêt
              </h2>
              <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#faf6f3]/80">
                Appelez ou écrivez-nous sur WhatsApp, dites-nous la quantité et
                le parfum — vos makroudh vous attendent en boutique, frais du
                jour. Commandes spéciales pour mariages, fêtes et Aïd bienvenues.
              </p>

              {/* Quick price recap */}
              <ul className="mt-8 space-y-3 border-t border-[#faf6f3]/15 pt-8">
                {quick.map((q) => (
                  <li key={q.id} className="flex items-baseline text-[15px] font-light">
                    <span>{q.name}</span>
                    <span
                      className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25"
                      aria-hidden="true"
                    />
                    <span className="font-display text-[#bc773f]">
                      {formatTND(q.priceMillimes)} <span className="text-xs">TND</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Big CTAs */}
              <div className="mt-10 flex flex-col gap-4">
                <Link
                  to="/commande"
                  className="flex items-center justify-center gap-3 rounded-full bg-[#bc773f] px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.03]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="9" cy="20" r="1.4" />
                    <circle cx="17" cy="20" r="1.4" />
                  </svg>
                  Commander en ligne
                </Link>
                <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-3 rounded-full bg-[#25D366] px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#12351f] transition-transform duration-300 hover:scale-[1.03]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12 2Zm5.7 14.1c-.2.7-1.4 1.3-1.9 1.3-.5.1-1.1.2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.4.8-.8 1-.6 1.3.8 1.3 1.8 2.2 3.1 2.8.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.9Z" />
                  </svg>
                  WhatsApp
                </a>
                <a
                  href={PHONE_TEL}
                  className="flex flex-1 items-center justify-center gap-3 rounded-full border border-[#faf6f3]/40 px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#faf6f3] transition-colors duration-300 hover:bg-[#faf6f3] hover:text-[#2e2a27]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                  </svg>
                  {PHONE_DISPLAY}
                </a>
                </div>
              </div>

              <p className="mt-6 text-center text-xs font-light tracking-wide text-[#faf6f3]/50">
                Réponse rapide · Ouvert 7j/7 de 07h00 à minuit
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
