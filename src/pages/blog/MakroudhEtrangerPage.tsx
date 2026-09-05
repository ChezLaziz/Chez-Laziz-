import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'makroudh-tunisiens-etranger')!

export default function MakroudhEtrangerPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'المقروض للتوانسة بره تونس: كيفاش تلقى الأصلي — مدونة عند لعزيز',
          description: 'حنين للبلاد، هدايا للعائلة في الزيارة: شنو لازم تعرفو باش تلقاو طعم المقروض الأصلي بعيد على تونس.',
          path: '/ar/journal/makroudh-tunisiens-etranger',
          breadcrumb: 'المقروض للتوانسة بره تونس',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: "Makroudh pour les Tunisiens de l'étranger : comment en trouver du vrai — Journal Chez Laziz",
          description:
            "Nostalgie du pays, cadeaux à la famille en visite : ce qu'il faut savoir pour retrouver le goût du vrai makroudh loin de la Tunisie.",
          path: '/journal/makroudh-tunisiens-etranger',
          breadcrumb: "Makroudh pour les Tunisiens de l'étranger",
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">المقروض للتوانسة بره تونس: كيفاش تلقى الأصلي</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                من أكثر الأشياء اللي تفتقدها الجالية التونسية بره البلاد هي طعم الحلويات التقليدية — وبالذات المقروض.
                هاذي بعض الأفكار العملية باش تقرّب من طعم البلاد وانت بعيد.
              </p>
              <h2 className="font-display text-xl text-ink">في متاجر المغاربة والتوانسة بالخارج</h2>
              <p>
                في بعض المدن الكبيرة بره تونس، تلقى محلات تبيع منتجات مغاربية ولا تونسية، ومن بينها مقروض. الجودة
                تختلف بزاف من محل لآخر — أفضل طريقة تتأكد هي تسأل ولا تجرب قبل ما تشري كمية كبيرة.
              </p>
              <h2 className="font-display text-xl text-ink">إذا عندك زيارة قريبة لتونس</h2>
              <p>
                إذا رايح تزور تونس ولا عندك حد قريب جاي، المقروض الطازج المشترى محليًا وينقل بعدها (بالفريزر ولا
                مغلف بإحكام) يبقى أقرب طريقة تحصل بيها على الطعم الأصلي. دايمًا تأكد من قوانين الجمارك للبلد اللي
                رايح ليه بخصوص المأكولات قبل ما تسافر بيها.
              </p>
              <h2 className="font-display text-xl text-ink">هدية للعائلة الزايرة من الخارج</h2>
              <p>
                إذا عندك عائلة تونسية بالخارج جايين يزورو تونس، طلب مقروض طازج ليهم يوم وصولهم ولا قبل رجوعهم فكرة
                بسيطة تفرحهم بزاف — وأسهل من محاولة نقله هوما بأنفسهم.
              </p>
              <h2 className="font-display text-xl text-ink">التوصيل الحين</h2>
              <p>
                عند لعزيز، نوصلو حاليًا في كامل تراب الجمهورية التونسية فقط. إذا عندك عائلة ولا صحاب في تونس، تقدر
                تطلب ليهم مباشرة وهما يتلذذو بالطازج — ولا تخزنو لك كمية باش تاخدها معاك في السفرة الجاية.
              </p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">اطلبوا مقروض طازج لعائلتكم في تونس</p>
              <Link to="/ar/commande" className="arrow-link mt-4 inline-flex justify-center">
                اطلبوا الحين
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Makroudh pour les Tunisiens de l'étranger : comment en trouver du vrai</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              L'une des choses qui manquent le plus à la communauté tunisienne à l'étranger, c'est le goût des
              pâtisseries traditionnelles — et le makroudh en particulier. Voici quelques pistes concrètes pour se
              rapprocher de ce goût, même loin du pays.
            </p>
            <h2 className="font-display text-xl text-ink">Dans les épiceries maghrébines et tunisiennes à l'étranger</h2>
            <p>
              Dans certaines grandes villes hors de Tunisie, on trouve des épiceries vendant des produits maghrébins
              ou tunisiens, dont du makroudh. La qualité varie beaucoup d'une boutique à l'autre — le plus sûr est
              de vous renseigner ou de goûter avant d'acheter en grande quantité.
            </p>
            <h2 className="font-display text-xl text-ink">Si vous avez un voyage prévu en Tunisie</h2>
            <p>
              Si vous partez bientôt en Tunisie, ou qu'un proche vient vous rendre visite, un makroudh frais acheté
              sur place puis transporté (congelé ou bien emballé) reste le moyen le plus proche de retrouver le vrai
              goût. Vérifiez toujours la réglementation douanière du pays de destination concernant les denrées
              alimentaires avant de voyager avec.
            </p>
            <h2 className="font-display text-xl text-ink">Un cadeau pour la famille en visite depuis l'étranger</h2>
            <p>
              Si des proches tunisiens vivant à l'étranger viennent visiter la Tunisie, leur commander du makroudh
              frais à leur arrivée — ou juste avant leur retour — est une idée simple qui leur fait vraiment plaisir,
              et bien plus pratique que d'essayer de le transporter eux-mêmes.
            </p>
            <h2 className="font-display text-xl text-ink">La livraison aujourd'hui</h2>
            <p>
              Chez Laziz, nous livrons actuellement uniquement sur tout le territoire tunisien. Si vous avez de la
              famille ou des amis en Tunisie, vous pouvez commander directement pour eux et leur faire profiter du
              produit frais — ou leur demander de vous en garder pour votre prochain voyage.
            </p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Commandez du makroudh frais pour votre famille en Tunisie</p>
            <Link to="/commande" className="arrow-link mt-4 inline-flex justify-center">
              Commander maintenant
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
