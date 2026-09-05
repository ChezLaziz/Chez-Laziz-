import { useEffect } from 'react'
import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO, setJsonLd } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'

const FAQ_FR = [
  {
    q: "Qu'est-ce que le makroudh ?",
    a: 'Une pâtisserie tunisienne traditionnelle en losange, à base de pâte de semoule garnie de dattes, frite puis trempée dans du miel. Voir notre article complet pour en savoir plus.',
  },
  {
    q: 'Le makroudh contient-il du gluten ?',
    a: "Oui : le makroudh traditionnel est fait de semoule, donc de blé, et contient du gluten. Certaines variantes à base d'amande (makroudh el louz) sont généralement sans gluten, mais vérifiez toujours la composition auprès du fabricant.",
  },
  {
    q: 'Le makroudh est-il calorique ?',
    a: "C'est une pâtisserie frite puis trempée dans le miel, donc assez riche — à savourer comme une gourmandise occasionnelle plutôt qu'au quotidien, comme la plupart des pâtisseries traditionnelles.",
  },
  {
    q: 'Peut-on congeler le makroudh ?',
    a: 'Oui, bien emballé, il se congèle plusieurs semaines à quelques mois. Laissez-le décongeler à température ambiante avant de le déguster.',
  },
  {
    q: "D'où vient le makroudh ?",
    a: 'Le makroudh est une pâtisserie du Maghreb, historiquement associée à Kairouan en Tunisie, où sa fabrication est restée particulièrement vivante.',
  },
  {
    q: 'Quelle est la différence avec le baklava ?',
    a: "Le makroudh est fait de pâte de semoule frite et garnie de dattes, tandis que le baklava est fait de fines couches de pâte filo cuites au four et garnies de fruits secs — deux traditions distinctes.",
  },
  {
    q: 'Combien de temps se conserve un makroudh frais ?',
    a: 'Dans une boîte hermétique à température ambiante, en général une à deux semaines. Voir notre guide de conservation pour plus de détails.',
  },
] as const

const FAQ_AR = [
  {
    q: 'شنية المقروض؟',
    a: 'حلوى تونسية تقليدية على شكل معينات، أساسها عجينة سميد محشية بالتمر، تُقلى وتُغمس في العسل. شوفو مقالنا الكامل لمزيد التفاصيل.',
  },
  {
    q: 'المقروض فيه غلوتين؟',
    a: 'إيه، المقروض التقليدي أساسه سميد (قمح)، يعني فيه غلوتين. بعض النسخ المبنية على اللوز (مقروض اللوز) عمومًا خالية من الغلوتين، لكن دايمًا تأكد من المكونات عند البائع.',
  },
  {
    q: 'المقروض فيه سعرات حرارية كثيرة؟',
    a: 'هو حلوى مقلية ومغموسة بالعسل، يعني غني نسبيًا — الأفضل تتلذذ بيه بمناسبات، مثل أغلب الحلويات التقليدية.',
  },
  {
    q: 'يمكن نحطو في الفريزر؟',
    a: 'إيه، إذا كان ملفوف بإحكام، يقدر يدوم في الفريزر من كم أسبوع لكم شهر. خليه يذوب في درجة حرارة الغرفة قبل ما تاكله.',
  },
  {
    q: 'المقروض من وين أصله؟',
    a: 'المقروض حلوى مغاربية، مرتبطة تاريخيًا بالقيروان في تونس، وين صناعته مازالت حية بقوة.',
  },
  {
    q: 'شنية الفرق بينه وبين البقلاوة؟',
    a: 'المقروض أساسه عجينة سميد مقلية ومحشية بالتمر، أما البقلاوة أساسها طبقات رقيقة من عجينة الفيلو مخبوزة ومحشية بالمكسرات — تقليدان مختلفان.',
  },
  {
    q: 'قداش يدوم المقروض الطازج؟',
    a: 'في علبة محكمة في درجة حرارة الغرفة، عمومًا أسبوع لأسبوعين. شوفو دليل الحفظ الكامل لمزيد التفاصيل.',
  },
] as const

export default function FaqMakroudhPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  const FAQ = isAr ? FAQ_AR : FAQ_FR
  useSEO(
    isAr
      ? {
          title: 'أسئلة شائعة عن المقروض: كل الأجوبة — مدونة عند لعزيز',
          description: 'المكونات، الغلوتين، السعرات، الحفظ، الأصل: أجوبة قصيرة وواضحة على الأسئلة اللي نتلقاوها أكثر.',
          path: '/ar/journal/faq-makroudh',
          breadcrumb: 'أسئلة شائعة عن المقروض',
          article: { datePublished: '2026-09-05' },
        }
      : {
          title: 'FAQ makroudh : toutes les réponses aux questions les plus posées — Journal Chez Laziz',
          description:
            "Ingrédients, gluten, calories, conservation, origine : les réponses courtes et claires aux questions qu'on nous pose le plus souvent.",
          path: '/journal/faq-makroudh',
          breadcrumb: 'FAQ makroudh',
          article: { datePublished: '2026-09-05' },
        },
  )

  useEffect(
    () =>
      setJsonLd('faq-makroudh-jsonld', {
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
      <main className="pt-16 md:pt-20">
        <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            {isAr ? 'المدونة' : 'Le Journal'}
          </p>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            {isAr ? 'أسئلة شائعة عن المقروض: كل الأجوبة' : 'FAQ makroudh : toutes les réponses aux questions les plus posées'}
          </h1>

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

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">
              {isAr ? 'جرّبوا المقروض الأصيل عند لعزيز' : 'Goûtez le vrai makroudh Chez Laziz'}
            </p>
            <Link to={isAr ? '/ar/commande' : '/commande'} className="arrow-link mt-4 inline-flex justify-center">
              {isAr ? 'اطلبوا الحين' : 'Commander maintenant'}
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </Link>
          </div>

          <Link to={isAr ? '/ar/journal' : '/journal'} className="arrow-link mt-14 inline-flex">
            {isAr ? 'الرجوع للمدونة' : 'Retour au Journal'}
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </article>
      </main>
      <Footer />
    </div>
  )
}
