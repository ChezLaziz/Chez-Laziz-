import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { formatTND, MESSENGER_URL, PHONE_TEL, PHONE_DISPLAY } from '@/lib/shop'
import { useLang } from '@/lib/i18n'

export default function Order() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const { data: products } = trpc.products.list.useQuery()
  const quick = products ?? []
  return (
    <section id="commande" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          {/* Photo pleine hauteur — s'aligne sur la hauteur du panneau de prix
              (qui grandit avec le nombre de produits) au lieu d'un cadre fixe
              trop petit à côté d'une liste plus longue. */}
          <div className="lg:col-span-6">
            <div className="mask-reveal h-full min-h-[320px]">
              <img
                src="/images/makroudh.webp"
                alt="Makroudh Chez Laziz, façonnés à la main"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Order panel */}
          <div className="lg:col-span-6">
            <div className="bg-ink-deep p-8 text-[#faf6f3] md:p-12" data-reveal>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-[#b8912e]">
                {isAr ? 'اطلبوا' : 'Commander'}
              </p>
              <h2 className="font-display text-3xl leading-tight md:text-5xl">
                {isAr ? (
                  <>
                    اطلبوا أونلاين،
                    <br />
                    يوصلكم إلى المنزل
                  </>
                ) : (
                  <>
                    Commandez en ligne,
                    <br />
                    livré chez vous
                  </>
                )}
              </h2>
              <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#faf6f3]/80">
                {isAr
                  ? "اختاروا المقروض ووزنه، أدخلوا عنوانكم — التوصيل لكل الجمهوريات التونسية خلال 24 ساعة (8.000 د.ت)، والدفع عند الاستلام أو عبر D17. تفضّلون التحدث مع أحد؟ اتصلوا بنا أو راسلونا عبر ماسنجر. نرحّب بالطلبات الخاصة للأعراس والحفلات والأعياد."
                  : "Choisissez vos makroudh et leur poids, indiquez votre adresse — livraison partout en Tunisie sous 24h (8.000 TND), paiement à la livraison ou par D17. Vous préférez parler à quelqu'un ? Appelez-nous ou écrivez-nous sur Messenger. Commandes spéciales pour mariages, fêtes et Aïd bienvenues."}
              </p>

              {/* Quick price recap — prix pour 1 kg */}
              <ul className="mt-8 space-y-3 border-t border-[#faf6f3]/15 pt-8">
                {quick.map((q) => (
                  <li key={q.id} className="flex items-baseline text-[15px] font-light">
                    <span>{q.name}</span>
                    <span
                      className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25"
                      aria-hidden="true"
                    />
                    <span className="font-display text-[#b8912e]">
                      {formatTND(q.priceMillimes)} <span className="text-xs">{isAr ? 'د.ت / كغ' : 'TND / kg'}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {quick.length > 0 && (
                <p className="mt-3 text-xs font-light tracking-wide text-[#faf6f3]/50">
                  {isAr
                    ? 'السعر لكل 1 كغ — الوزن حسب اختياركم من 500 غ إلى 2,5 كغ عند الطلب.'
                    : 'Prix pour 1 kg — poids au choix de 500 g à 2,5 kg à la commande.'}
                </p>
              )}

              {/* Big CTAs */}
              <div className="mt-10 flex flex-col gap-4">
                <Link
                  to={isAr ? '/ar/commande' : '/commande'}
                  className="gold-cta flex items-center justify-center gap-3 rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.03]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="9" cy="20" r="1.4" />
                    <circle cx="17" cy="20" r="1.4" />
                  </svg>
                  {isAr ? 'اطلب أونلاين' : 'Commander en ligne'}
                </Link>
                <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href={MESSENGER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-3 rounded-full bg-[#0084FF] px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.03]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.5c-5.5 0-9.5 4-9.5 9.2 0 3 1.4 5.6 3.6 7.4v3l3.3-1.8c.8.2 1.7.3 2.6.3 5.5 0 9.5-4 9.5-9.2S17.5 2.5 12 2.5Z" />
                    <path d="M7 12.8l3.3-3.5 2.2 2.3 3.5-3.6-3.3 5.2-2.2-2.3-3.5 3.9Z" fill="#0084FF" stroke="none" />
                  </svg>
                  Messenger
                </a>
                <a
                  href={PHONE_TEL}
                  dir="ltr"
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
                {isAr ? 'ردّ سريع · مفتوح طوال الأسبوع من 07:00 إلى منتصف الليل' : 'Réponse rapide · Ouvert 7j/7 de 07h00 à minuit'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
