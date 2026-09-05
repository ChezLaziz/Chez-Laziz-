import { useEffect } from 'react'
import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO, setJsonLd } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import { formatTND, PHONE_DISPLAY, PHONE_TEL, D17_NUMBER_DISPLAY, ALLOWED_WEIGHTS_KG, DELIVERY_FEE_MILLIMES, formatWeight } from '@/lib/shop'

const FAQ_FR: { q: string; a: string }[] = [
  {
    q: "Qu'est-ce que le makroudh ?",
    a: "Une pâtisserie tunisienne traditionnelle à base de semoule et de miel, généralement fourrée de pâte de dattes, originaire de Kairouan.",
  },
  { q: 'Où est basé Chez Laziz ?', a: 'À Kairouan, en Tunisie — boutique ouverte 7j/7 de 07h00 à minuit.' },
  {
    q: 'Quels poids sont disponibles ?',
    a: `Chaque makroudh se commande par poids : ${ALLOWED_WEIGHTS_KG.map((w) => formatWeight(w)).join(', ')}. Le prix affiché sur la collection est le prix pour 1 kg.`,
  },
  { q: 'Combien coûte la livraison ?', a: `${formatTND(DELIVERY_FEE_MILLIMES)} TND, frais fixes, quel que soit le nombre de produits.` },
  { q: 'Livrez-vous partout en Tunisie ?', a: 'Oui, dans les 24 gouvernorats, à domicile (porte-à-porte).' },
  { q: 'Quel est le délai de livraison ?', a: 'Environ 24h à compter de la confirmation téléphonique de votre commande.' },
  { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Deux moyens : paiement en espèces à la livraison, ou virement D17.' },
  {
    q: 'Comment fonctionne le paiement D17 ?',
    a: `Vous envoyez le montant total au ${D17_NUMBER_DISPLAY}, puis vous joignez la capture d'écran du paiement lors de la commande. Notre équipe vérifie la capture avant de confirmer.`,
  },
  { q: 'La capture d\'écran D17 est-elle obligatoire ?', a: 'Oui — une commande D17 ne peut pas être envoyée sans capture d\'écran du paiement.' },
  { q: 'Comment fonctionne le paiement à la livraison ?', a: 'Vous payez en espèces directement au livreur, à la réception de votre commande.' },
  { q: 'Chez Laziz m\'appelle-t-il après ma commande ?', a: 'Oui, nous vous appelons systématiquement pour confirmer les produits, l\'adresse et le paiement avant préparation.' },
]

const FAQ_AR: { q: string; a: string }[] = [
  {
    q: 'شنية المقروض؟',
    a: 'حلوى تونسية تقليدية أساسها السميد والعسل، محشوة عادة بعجينة التمر، أصلها من القيروان.',
  },
  { q: 'وين موجودة عند لعزيز؟', a: 'في القيروان، تونس — المحل مفتوح 7 أيام على 7 من 07:00 إلى منتصف الليل.' },
  {
    q: 'شنية الأوزان المتوفرة؟',
    a: `كل مقروض يُطلب بالوزن: ${ALLOWED_WEIGHTS_KG.map((w) => formatWeight(w, 'ar')).join('، ')}. الثمن المعروض في التشكيلة هو ثمن الكيلو الواحد.`,
  },
  { q: 'قداش ثمن التوصيل؟', a: `${formatTND(DELIVERY_FEE_MILLIMES)} د.ت، مصاريف ثابتة، مهما كان عدد المنتجات.` },
  { q: 'توصلو لكل تونس؟', a: 'إي، في الـ24 ولاية، توصيل للمنزل.' },
  { q: 'قداش مدة التوصيل؟', a: 'حوالي 24 ساعة من وقت تأكيد الطلبية بالهاتف.' },
  { q: 'شنية طرق الدفع المتوفرة؟', a: 'طريقتين: الدفع نقدًا عند التسليم، أو تحويل عبر D17.' },
  {
    q: 'كيفاش يخدم الدفع عبر D17؟',
    a: `تبعثو المبلغ الكامل لـ${D17_NUMBER_DISPLAY}، وبعدها ترفقو صورة الدفع مع الطلبية. فريقنا يتحقق من الصورة قبل ما يأكد الطلبية.`,
  },
  { q: 'صورة الدفع D17 إجبارية؟', a: 'إي — ما نقدروش نأكدو طلبية D17 بلا صورة الدفع.' },
  { q: 'كيفاش يخدم الدفع عند التسليم؟', a: 'تخلصو نقدًا مباشرة للموزع، وقت ما توصلكم الطلبية.' },
  { q: 'عند لعزيز يتصل بيا بعد الطلبية؟', a: 'إي، نتصلو بيكم ديمة لتأكيد المنتجات والعنوان وطريقة الدفع قبل التحضير.' },
]

export default function FAQPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const FAQ = isAr ? FAQ_AR : FAQ_FR
  useSEO(
    isAr
      ? {
          title: 'الأسئلة الشائعة — عند لعزيز | التوصيل، الدفع، الطلب',
          description: 'الأسئلة الشائعة عند لعزيز: التوصيل في تونس، المدة، الدفع عند التسليم أو D17، الأوزان المتوفرة.',
          path: '/ar/faq',
          breadcrumb: 'الأسئلة الشائعة',
        }
      : {
          title: 'FAQ — Chez Laziz | Livraison, paiement, commande',
          description:
            'Questions fréquentes Chez Laziz : livraison en Tunisie, délai, paiement à la livraison ou D17, poids disponibles.',
          path: '/faq',
          breadcrumb: 'FAQ',
        },
  )

  useEffect(
    () =>
      setJsonLd('faq-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }),
    [FAQ],
  )

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Chez Laziz
        </p>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">{isAr ? 'الأسئلة الشائعة' : 'Questions fréquentes'}</h1>

        <div className="mt-10 divide-y divide-sand/70 border-y border-sand/70">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-ink">
                {item.q}
                <span className="shrink-0 text-accent transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] font-light leading-relaxed text-ink/70">{item.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-sm font-light text-ink/60">
          {isAr ? 'عندك سؤال آخر؟ اتصل بينا على ' : 'Une autre question ? Appelez-nous au '}
          <a href={PHONE_TEL} className="text-accent underline underline-offset-2" dir="ltr">{PHONE_DISPLAY}</a>.
        </p>

        <Link to={isAr ? '/ar/commande' : '/commande'} className="arrow-link mt-10 inline-flex">
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
