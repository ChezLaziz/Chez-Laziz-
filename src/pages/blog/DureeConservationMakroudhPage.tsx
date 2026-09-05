import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'duree-conservation-makroudh')!

export default function DureeConservationMakroudhPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'قداش يدوم المقروض؟ الدليل العملي — مدونة عند لعزيز',
          description: 'في درجة حرارة الغرفة، في الثلاجة ولا في الفريزر: كيفاش تحافظ على مقروضك بلا ما يخسر قوامه ولا طعمه.',
          path: '/ar/journal/duree-conservation-makroudh',
          breadcrumb: 'قداش يدوم المقروض؟',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: 'Combien de temps se conserve le makroudh ? — Journal Chez Laziz',
          description:
            "À température ambiante, au frigo ou au congélateur : comment conserver son makroudh sans perdre sa texture ni son goût.",
          path: '/journal/duree-conservation-makroudh',
          breadcrumb: 'Combien de temps se conserve le makroudh ?',
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">قداش يدوم المقروض؟ الدليل العملي</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                العسل عنده خاصية طبيعية تحافظ على الأكل — وهذا اللي يخلي المقروض المغموس فيه يدوم مدة معقولة إذا
                تحافظ عليه بالطريقة الصحيحة. هاذي أهم النصائح العملية.
              </p>
              <h2 className="font-display text-xl text-ink">في درجة حرارة الغرفة</h2>
              <p>
                هذي أفضل طريقة عمومًا للمقروض المغموس بالعسل — في علبة محكمة الغلق، بعيد عن الرطوبة والحرارة المباشرة
                (بلا شمس ولا جنب الفرن)، يقدر يحافظ على قوامه وطعمه لمدة أسبوع لأسبوعين تقريبًا. الوقت بالضبط يختلف
                حسب حرارة الجو ونسبة العسل.
              </p>
              <h2 className="font-display text-xl text-ink">في الثلاجة</h2>
              <p>
                ما ننصحوش بيها عمومًا — البرودة تخلي عجينة السميد تصلب وتخسر جزء من ليونتها، وتخفف من بريق ونكهة
                العسل. إذا كان الجو سخون برشا واضطريت تحطه بالثلاجة، خرجه وخليه يرجع لحرارة الغرفة قبل ما تاكله.
              </p>
              <h2 className="font-display text-xl text-ink">في الفريزر</h2>
              <p>
                للحفظ على مدى أطول (كم أسبوع لشهرين تقريبًا)، الفريزر خيار جيد — لفه بإحكام باش ما يدخلش عليه هواء،
                وخليه يذوب بالتدريج في درجة حرارة الغرفة قبل ما تقدمه.
              </p>
              <h2 className="font-display text-xl text-ink">علامات إنه ما عادش يصلح للأكل</h2>
              <p>
                ريحة غريبة، عفن ظاهر، ولا جفاف مبالغ فيه أكثر من العادي — هذي علامات واضحة إنه لازم ما تاكلوش.
              </p>
              <p>
                نصيحة عملية: إذا عندك مناسبة بتاريخ محدد، الأحسن تطلب مقروضك قريب من التاريخ — عندنا نحضّروه طازج
                بالطلب، مو نخزنوه.
              </p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">اطلبوا مقروض طازج، محضّر يوم الطلب</p>
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Combien de temps se conserve le makroudh ?</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Le miel a une propriété naturellement conservatrice — c'est ce qui permet au makroudh qui y est trempé
              de se garder raisonnablement bien, à condition de le conserver correctement. Voici les recommandations
              pratiques.
            </p>
            <h2 className="font-display text-xl text-ink">À température ambiante</h2>
            <p>
              C'est généralement la meilleure option pour un makroudh trempé au miel — dans une boîte hermétique, à
              l'abri de l'humidité et de la chaleur directe (pas au soleil, ni près d'un four), il garde en général
              sa texture et son goût pendant une à deux semaines environ. Le délai exact varie selon la température
              ambiante et la proportion de miel.
            </p>
            <h2 className="font-display text-xl text-ink">Au réfrigérateur</h2>
            <p>
              Ce n'est généralement pas recommandé — le froid durcit la pâte de semoule et lui fait perdre une
              partie de son moelleux, tout en atténuant le brillant et l'arôme du miel. Si la chaleur ambiante vous
              y oblige, laissez-le revenir à température ambiante avant de le déguster.
            </p>
            <h2 className="font-display text-xl text-ink">Au congélateur</h2>
            <p>
              Pour une conservation plus longue (de quelques semaines à environ deux mois), le congélateur est une
              bonne option — enveloppez-le bien pour éviter tout contact avec l'air, et laissez-le décongeler
              progressivement à température ambiante avant de le servir.
            </p>
            <h2 className="font-display text-xl text-ink">Les signes qu'il ne faut plus le consommer</h2>
            <p>
              Une odeur inhabituelle, une trace de moisissure visible, ou une sécheresse excessive au-delà de la
              normale sont des signes clairs qu'il vaut mieux ne pas le consommer.
            </p>
            <p>
              Conseil pratique : si vous avez un événement à une date précise, commandez votre makroudh au plus
              proche de cette date — chez nous, il est préparé frais à la commande, jamais stocké à l'avance.
            </p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Commandez un makroudh frais, préparé le jour même</p>
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
