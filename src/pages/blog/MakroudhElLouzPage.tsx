import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'makroudh-el-louz-vs-traditionnel')!

export default function MakroudhElLouzPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'مقروض اللوز ولا المقروض التقليدي: شنو تختار؟ — مدونة عند لعزيز',
          description: 'سميد مقلي بالعسل ولا عجينة لوز بلا قلي: مقروضان مختلفان بزاف، لكل وحد رغبته.',
          path: '/ar/journal/makroudh-el-louz-vs-traditionnel',
          breadcrumb: 'مقروض اللوز ولا التقليدي؟',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: 'Makroudh el louz ou makroudh traditionnel : lequel choisir ? — Journal Chez Laziz',
          description:
            "Semoule frite au miel ou pâte d'amande non frite : deux makroudh très différents, pour deux envies différentes.",
          path: '/journal/makroudh-el-louz-vs-traditionnel',
          breadcrumb: 'Makroudh el louz ou traditionnel ?',
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">مقروض اللوز ولا المقروض التقليدي: شنو تختار؟</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                "مقروض اللوز" اسم يسمعوه بزاف، بالذات عند التوانسة والمغاربة، ويتخيلو بعض المرات إنه بس نسخة تانية من
                المقروض التقليدي. الحقيقة، هذوما حلويان مبنيان على أساس مختلف تمامًا.
              </p>
              <h2 className="font-display text-xl text-ink">المقروض التقليدي</h2>
              <p>
                أساسه عجينة سميد معجونة بزيت الزيتون، محشية بعجينة التمر، مشكّلة بالقالب الخشبي (الطابع)، مقلية في
                الزيت، وبعدها مغموسة سخونة في شراب العسل. قوامه هش من برا ورطب من جوّا، وطعمه قريب من التمر والزيت.
              </p>
              <h2 className="font-display text-xl text-ink">مقروض اللوز</h2>
              <p>
                أساسه عجينة لوز (لوز مطحون ممزوج بسكر أو عسل)، بلا قلي — يُشكّل ويُترك يجف ولا يُخبز خفيف، وأحيانًا
                يُغمس في طبقة سكر خفيفة ولا شكولاطة. قوامه أنعم وأقرب لحلويات اللوز الأخرى (زي القرنيطة)، وحلاوته
                أخف من ثقل العسل.
              </p>
              <h2 className="font-display text-xl text-ink">الفرق في المكونات: نقطة مهمة</h2>
              <p>
                المقروض التقليدي أساسه سميد (قمح)، يعني فيه غلوتين. مقروض اللوز عمومًا ما فيهش سميد — أساسه اللوز
                بس — يعني في الغالب يكون خالي من الغلوتين، لكن دايمًا تأكد من المكونات عند البائع لأن بعض الوصفات
                تزيد شوية دقيق.
              </p>
              <h2 className="font-display text-xl text-ink">أيهما تختار؟</h2>
              <p>
                إذا تحب طعم التمر والعسل الأصيل، مقروض التقليدي هو الخيار. إذا تحب حلاوة اللوز الأخف وقوام أنعم، ولا
                تدور على خيار غالبًا بلا غلوتين، مقروض اللوز يناسبك أكثر. عندنا، نتخصصو في المقروض التقليدي القيرواني
                الأصيل.
              </p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">اكتشفو مقروضنا التقليدي، مصنوع باليد كل يوم</p>
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Makroudh el louz ou makroudh traditionnel : lequel choisir ?</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              « Makroudh el louz » (makroudh à l'amande) est un nom que l'on entend souvent, notamment chez les
              Tunisiens et Maghrébins, et qu'on imagine parfois comme une simple variante du makroudh traditionnel.
              En réalité, ce sont deux pâtisseries construites sur des bases totalement différentes.
            </p>
            <h2 className="font-display text-xl text-ink">Le makroudh traditionnel</h2>
            <p>
              Sa base est une pâte de semoule pétrie à l'huile d'olive, garnie de pâte de dattes, façonnée au moule
              en bois (le tabaâ), frite dans l'huile, puis plongée chaude dans un sirop de miel. Sa texture est
              friable à l'extérieur et moelleuse à l'intérieur, avec un goût proche de la datte et de l'huile
              d'olive.
            </p>
            <h2 className="font-display text-xl text-ink">Le makroudh el louz</h2>
            <p>
              Sa base est une pâte d'amande (amandes moulues mélangées à du sucre ou du miel), sans friture — elle
              est façonnée puis séchée ou légèrement cuite, parfois enrobée d'une fine couche de sucre ou de
              chocolat. Sa texture est plus fondante, proche d'autres pâtisseries à l'amande, et sa douceur est
              moins marquée que celle du miel.
            </p>
            <h2 className="font-display text-xl text-ink">La différence d'ingrédients : un point important</h2>
            <p>
              Le makroudh traditionnel a pour base la semoule (blé), donc il contient du gluten. Le makroudh el louz
              ne contient en général pas de semoule — sa base est uniquement l'amande — ce qui en fait généralement
              une option sans gluten, mais vérifiez toujours la composition auprès du fabricant, certaines recettes
              ajoutant un peu de farine.
            </p>
            <h2 className="font-display text-xl text-ink">Lequel choisir ?</h2>
            <p>
              Si vous aimez le goût authentique de la datte et du miel, le makroudh traditionnel est le bon choix.
              Si vous préférez une douceur d'amande plus légère, une texture plus fondante, ou que vous recherchez
              une option généralement sans gluten, le makroudh el louz vous conviendra davantage. Chez nous, nous
              nous concentrons sur le makroudh traditionnel kairouanais, dans sa version la plus authentique.
            </p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Découvrez notre makroudh traditionnel, fait main chaque jour</p>
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
