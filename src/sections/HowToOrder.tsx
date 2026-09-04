import { Link } from 'react-router'
import { formatTND, DELIVERY_FEE_MILLIMES, D17_NUMBER_DISPLAY } from '@/lib/shop'
import { useLang } from '@/lib/i18n'

const STEPS_FR = [
  {
    n: '01',
    title: 'Choisissez',
    text: 'Vos makroudh et leur poids — 500 g, 1 kg, 1,5 kg, 2 kg ou 2,5 kg. Le prix s’ajuste au poids choisi.',
  },
  {
    n: '02',
    title: 'Indiquez votre adresse',
    text: `Livraison à domicile partout en Tunisie, sous 24h, pour ${formatTND(DELIVERY_FEE_MILLIMES)} TND — quel que soit le nombre de produits.`,
  },
  {
    n: '03',
    title: 'Payez comme vous préférez',
    text: `En espèces à la livraison, ou par D17 au ${D17_NUMBER_DISPLAY} avec une capture d’écran. Nous vous appelons pour confirmer.`,
  },
]

const STEPS_AR = [
  {
    n: '01',
    title: 'اختاروا',
    text: 'المقروض ووزنه — 500 غ، 1 كغ، 1.5 كغ، 2 كغ أو 2.5 كغ. السعر يتغيّر حسب الوزن المختار.',
  },
  {
    n: '02',
    title: 'أدخلوا عنوانكم',
    text: `توصيل إلى المنزل في كل الجمهوريات التونسية، خلال 24 ساعة، مقابل ${formatTND(DELIVERY_FEE_MILLIMES)} د.ت — مهما كان عدد المنتجات.`,
  },
  {
    n: '03',
    title: 'ادفعوا بالطريقة التي تناسبكم',
    // ⁦…⁩ (isolat directionnel) : sans lui, un numéro à groupes
    // espacés ("24 41 07 35") s'inverse visuellement une fois inséré dans
    // une phrase arabe (RTL) — l'algorithme bidi le traite comme plusieurs
    // segments faibles au lieu d'un seul nombre à préserver tel quel.
    text: `نقدًا عند الاستلام، أو عبر D17 على الرقم ⁦${D17_NUMBER_DISPLAY}⁩ مع صورة إثبات الدفع. نتصل بكم لتأكيد الطلب.`,
  },
]

export default function HowToOrder() {
  const lang = useLang()
  const isAr = lang === 'ar'
  const STEPS = isAr ? STEPS_AR : STEPS_FR
  return (
    <section className="border-y border-sand/70 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            {isAr ? 'كيفية الطلب' : 'Comment commander'}
          </p>
          <h2 data-reveal className="font-display text-3xl leading-tight md:text-5xl">
            {isAr ? 'يوصلكم أينما كنتم في تونس' : 'Livré chez vous, partout en Tunisie'}
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s) => (
            <div key={s.n} data-reveal className="relative border-t border-sand pt-6">
              <span className="font-display text-3xl text-[#b8912e]/50">{s.n}</span>
              <h3 className="mt-2 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-[15px] font-light leading-relaxed text-ink/65">{s.text}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-14 flex flex-col items-center gap-5 text-center">
          <Link
            to="/commande"
            className="gold-cta rounded-full px-9 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-transform duration-300 hover:scale-[1.02]"
          >
            {isAr ? 'اطلب أونلاين' : 'Commander en ligne'}
          </Link>
          <p className="text-sm font-light text-ink/55">
            {isAr
              ? 'أو مرّوا بمتجرنا في القيروان، مفتوح طوال الأسبوع من 07:00 إلى منتصف الليل.'
              : 'Ou passez à la boutique de Kairouan, ouverte 7j/7 de 07h00 à minuit.'}
            {' '}
            <Link to="/livraison" className="text-accent underline underline-offset-2">
              {isAr ? 'تفاصيل التوصيل' : 'Détails livraison'}
            </Link>
            {' · '}
            <Link to="/faq" className="text-accent underline underline-offset-2">
              {isAr ? 'الأسئلة الشائعة' : 'Questions fréquentes'}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
