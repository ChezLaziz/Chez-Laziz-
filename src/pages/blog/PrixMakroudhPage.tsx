import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'prix-makroudh-tunisie')!

export default function PrixMakroudhPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'ثمن المقروض في تونس: على شنو يتوقف بالضبط — مدونة عند لعزيز',
          description: 'جودة التمر، عسل حقيقي ولا شراب سكر، صناعة يدوية ولا صناعية: شنية اللي يفسّر فرق الأسعار.',
          path: '/ar/journal/prix-makroudh-tunisie',
          breadcrumb: 'ثمن المقروض في تونس',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: 'Prix du makroudh en Tunisie : à quoi ça dépend vraiment — Journal Chez Laziz',
          description:
            "Qualité des dattes, miel réel ou sirop de sucre, fait main ou industriel : ce qui explique les écarts de prix.",
          path: '/journal/prix-makroudh-tunisie',
          breadcrumb: 'Prix du makroudh en Tunisie',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        },
  )

  if (isAr) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <Header />
        <main className="pt-16 md:pt-20">
          <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">المدونة</p>
            <h1 className="font-display text-3xl leading-tight md:text-5xl">ثمن المقروض في تونس: على شنو يتوقف بالضبط</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                تلقى فرق واضح في ثمن المقروض من بائع لآخر — وهذا الفرق مو صدفة. هاذي أهم العوامل اللي فعليًا تأثر على
                الثمن، باش تفهم على شنو تدفع بالضبط.
              </p>
              <h2 className="font-display text-xl text-ink">جودة وكمية التمر</h2>
              <p>
                عجينة تمر حقيقية وسخية الكمية تكلف أكثر من حشوة فيها تمر قليل ومعوّض بسكر. المقروض اللي حشوته سخية
                وطعمها واضح، طبيعي يكون ثمنه أعلى.
              </p>
              <h2 className="font-display text-xl text-ink">عسل حقيقي ولا شراب سكر</h2>
              <p>
                العسل الطبيعي أغلى بزاف من السكر العادي. مقروض مغموس بعسل حقيقي غالبًا يكلف أكثر من مقروض بشراب سكر
                بس — لكن الفرق في الطعم والجودة يبان بوضوح.
              </p>
              <h2 className="font-display text-xl text-ink">صناعة يدوية ولا صناعية</h2>
              <p>
                التشكيل باليد بالقالب التقليدي يحتاج وقت وخبرة أكثر من الإنتاج الآلي بكميات ضخمة. هذا يفسر جزء كبير
                من الفرق بين المقروض الحرفي بكمية صغيرة والمقروض الصناعي الموزع على نطاق واسع.
              </p>
              <h2 className="font-display text-xl text-ink">الطزاجة والطلب حسب الحاجة</h2>
              <p>
                مقروض محضّر طازج عند الطلب (بلا تخزين طويل) يحتاج تنظيم إنتاج أدق من مخزون جاهز مسبقًا — وهذا أيضًا
                عامل يدخل في الحساب.
              </p>
              <h2 className="font-display text-xl text-ink">التغليف والمناسبة</h2>
              <p>
                صندوق هدية أنيق لمناسبة (عيد، عرس) يزيد شوية في الثمن مقارنة بتغليف عادي — لكنه يستاهل خصوصًا كهدية.
              </p>
              <p>
                خلاصة: ثمن أعلى شوية غالبًا معناه تمر حقيقي، عسل حقيقي، وصناعة يدوية — وهذا اللي يفرق فعليًا في
                الطعم.
              </p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">شوفوا أسعارنا وتشكيلتنا الكاملة</p>
              <Link to="/ar/collection" className="arrow-link mt-4 inline-flex justify-center">
                شوفو التشكيلة
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className="rotate-180">
                  <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </Link>
            </div>

            <Link to="/ar/journal" className="arrow-link mt-14 inline-flex">
              الرجوع للمدونة
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className="rotate-180">
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </Link>
          </article>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">Le Journal</p>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Prix du makroudh en Tunisie : à quoi ça dépend vraiment</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              On trouve des écarts de prix parfois marqués d'un vendeur à l'autre — et ce n'est pas un hasard. Voici
              les facteurs qui influencent réellement le prix, pour comprendre exactement ce que vous payez.
            </p>
            <h2 className="font-display text-xl text-ink">La qualité et la quantité de dattes</h2>
            <p>
              Une vraie pâte de dattes, généreuse en quantité, coûte plus cher qu'une garniture pauvre en dattes et
              compensée par du sucre. Un makroudh à la garniture généreuse et au goût net a naturellement un prix
              plus élevé.
            </p>
            <h2 className="font-display text-xl text-ink">Miel réel ou sirop de sucre</h2>
            <p>
              Le miel naturel coûte beaucoup plus cher que le sucre ordinaire. Un makroudh trempé dans du vrai miel
              coûte souvent plus cher qu'un makroudh au sirop de sucre seul — mais la différence de goût et de
              qualité se ressent nettement.
            </p>
            <h2 className="font-display text-xl text-ink">Fabrication artisanale ou industrielle</h2>
            <p>
              Le façonnage à la main avec le moule traditionnel demande plus de temps et de savoir-faire qu'une
              production automatisée en grande série. Cela explique une grande partie de l'écart entre un makroudh
              artisanal produit en petite quantité et un makroudh industriel distribué à grande échelle.
            </p>
            <h2 className="font-display text-xl text-ink">La fraîcheur et la production à la commande</h2>
            <p>
              Un makroudh préparé frais à la commande (sans long stockage) demande une organisation de production
              plus fine qu'un stock déjà prêt à l'avance — c'est aussi un facteur qui entre en compte.
            </p>
            <h2 className="font-display text-xl text-ink">L'emballage et l'occasion</h2>
            <p>
              Un joli coffret cadeau pour une occasion (Aïd, mariage) coûte un peu plus cher qu'un emballage
              standard — mais il en vaut la peine, surtout en cadeau.
            </p>
            <p>
              En résumé : un prix un peu plus élevé signifie souvent de vraies dattes, du vrai miel, et une
              fabrication artisanale — c'est ce qui fait réellement la différence de goût.
            </p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Découvrez nos tarifs et notre collection complète</p>
            <Link to="/collection" className="arrow-link mt-4 inline-flex justify-center">
              Voir la collection
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </Link>
          </div>

          <Link to="/journal" className="arrow-link mt-14 inline-flex">
            Retour au Journal
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </article>
      </main>
      <Footer />
    </div>
  )
}
