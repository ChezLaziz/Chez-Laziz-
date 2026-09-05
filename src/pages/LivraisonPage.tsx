import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import { formatTND, PHONE_DISPLAY, PHONE_TEL, D17_NUMBER_DISPLAY, ALLOWED_WEIGHTS_KG, DELIVERY_FEE_MILLIMES, formatWeight } from '@/lib/shop'

export default function LivraisonPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  useSEO(
    isAr
      ? {
          title: 'التوصيل — عند لعزيز | لكل تونس خلال 24 ساعة',
          description: 'توصيل مقروض عند لعزيز لكل أنحاء تونس، للمنزل، خلال 24 ساعة — 8 د.ت. الدفع عند التسليم أو عبر D17.',
          path: '/ar/livraison',
          breadcrumb: 'التوصيل',
        }
      : {
          title: 'Livraison — Chez Laziz | Toute la Tunisie sous 24h',
          description:
            'Livraison de makroudh Chez Laziz partout en Tunisie, à domicile, sous 24h — 8 DT. Paiement à la livraison ou par D17.',
          path: '/livraison',
          breadcrumb: 'Livraison',
        },
  )
  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Chez Laziz
        </p>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">{isAr ? 'التوصيل' : 'Livraison'}</h1>

        <div className="mt-10 grid grid-cols-3 gap-4 rounded-2xl border border-sand/70 bg-white py-6 text-center shadow-sm">
          {(
            isAr
              ? [
                  ['كل تونس', 'المنطقة'],
                  [formatTND(DELIVERY_FEE_MILLIMES) + ' د.ت', 'مصاريف ثابتة'],
                  ['24 س', 'المدة'],
                ]
              : [
                  ['Toute la Tunisie', 'Zone'],
                  [formatTND(DELIVERY_FEE_MILLIMES) + ' DT', 'Frais fixes'],
                  ['24h', 'Délai'],
                ]
          ).map(([n, label]) => (
            <div key={label}>
              <div className="font-display text-xl text-[#b8912e] md:text-2xl">{n}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink/50 md:text-[11px]">{label}</div>
            </div>
          ))}
        </div>

        {isAr ? (
          <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
            <section>
              <h2 className="mb-2 font-display text-xl text-ink">وين نوصلو؟</h2>
              <p>لكل أنحاء تونس، في الـ24 ولاية. كل طلبية تتوصل للمنزل، على العنوان الكامل اللي تحطوه وقت الطلب.</p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">المصاريف والمدة</h2>
              <p>
                التوصيل يكلف {formatTND(DELIVERY_FEE_MILLIMES)} د.ت، مهما كان عدد المنتجات المطلوبة، ويستغرق حوالي 24
                ساعة من وقت تأكيد طلبيتكم بالهاتف.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">الأوزان المتوفرة</h2>
              <p>
                كل مقروض يُطلب بالوزن: {ALLOWED_WEIGHTS_KG.map((w) => formatWeight(w, 'ar')).join('، ')}. الثمن
                المعروض في التشكيلة هو ثمن الكيلو الواحد؛ الوزن يُختار في صفحة{' '}
                <Link to="/ar/commande" className="text-accent underline underline-offset-2">اطلب أونلاين</Link>.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">الدفع</h2>
              <p>
                طريقتين للدفع: نقدًا عند التسليم، أو تحويل عبر D17 لـ{D17_NUMBER_DISPLAY} (صورة الدفع لازم ترفق وقت
                الطلب، ويتحقق منها فريقنا).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">تأكيد الطلبية</h2>
              <p>بعد إرسال استمارة الطلب، فريقنا يتصل بيكم لتأكيد المنتجات، العنوان، وطريقة الدفع قبل التحضير والإرسال.</p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">الاستلام من المحل</h2>
              <p>تقدرو أيضًا تجيو مباشرة لمحل القيروان، مفتوح 7 أيام على 7 من 07:00 إلى منتصف الليل — بلا أي مصاريف توصيل.</p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">للتواصل</h2>
              <p>
                عندك سؤال على طلبيتكم؟ اتصلو بينا على{' '}
                <a href={PHONE_TEL} className="text-accent underline underline-offset-2" dir="ltr">{PHONE_DISPLAY}</a>.
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Où livrons-nous ?</h2>
              <p>
                Partout en Tunisie, dans les 24 gouvernorats. Chaque commande est livrée
                à domicile, porte-à-porte, à l'adresse complète indiquée lors de la
                commande.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Frais et délai</h2>
              <p>
                La livraison coûte {formatTND(DELIVERY_FEE_MILLIMES)} TND, quel que soit
                le nombre de produits commandés, et prend environ 24h à compter de la
                confirmation de votre commande par téléphone.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Poids disponibles</h2>
              <p>
                Chaque makroudh se commande par poids : {ALLOWED_WEIGHTS_KG.map((w) => formatWeight(w)).join(', ')}.
                Le prix affiché sur la collection est le prix pour 1 kg ; le poids se
                choisit sur la page{' '}
                <Link to="/commande" className="text-accent underline underline-offset-2">Commander</Link>.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Paiement</h2>
              <p>
                Deux moyens de paiement : en espèces à la livraison, ou par virement D17
                au {D17_NUMBER_DISPLAY} (capture d'écran du paiement à joindre lors de la
                commande, vérifiée par notre équipe).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Confirmation de commande</h2>
              <p>
                Après l'envoi du formulaire de commande, notre équipe vous appelle pour
                confirmer les produits, l'adresse et le moyen de paiement avant
                préparation et expédition.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Retrait en boutique</h2>
              <p>
                Vous pouvez aussi passer directement à la boutique de Kairouan, ouverte
                7j/7 de 07h00 à minuit — aucun frais de livraison dans ce cas.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-display text-xl text-ink">Contact</h2>
              <p>
                Une question sur votre livraison ? Appelez-nous au{' '}
                <a href={PHONE_TEL} className="text-accent underline underline-offset-2">{PHONE_DISPLAY}</a>.
              </p>
            </section>
          </div>
        )}

        <Link to={isAr ? '/ar/commande' : '/commande'} className="arrow-link mt-14 inline-flex">
          {isAr ? 'اطلب توّا' : 'Passer commande'}
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
            <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
      </main>
      <Footer />
    </div>
  )
}
