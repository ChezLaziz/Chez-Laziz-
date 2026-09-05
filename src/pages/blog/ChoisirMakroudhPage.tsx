import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'comment-choisir-son-makroudh')!

export default function ChoisirMakroudhPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'كيفاش تختار مقروض بنّان: الدليل الكامل — مدونة عند لعزيز',
          description: 'القوام، الحشوة، الشراب، الأصل — العلامات اللي تفرّق بين مقروض حرفي بنّان ومقروض صناعي.',
          path: '/ar/journal/comment-choisir-son-makroudh',
          breadcrumb: 'كيفاش تختار مقروض بنّان؟',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: 'Comment bien choisir son makroudh : le guide complet — Journal Chez Laziz',
          description:
            "Texture, garniture, sirop, origine — les signes qui distinguent un bon makroudh artisanal d'un makroudh industriel.",
          path: '/journal/comment-choisir-son-makroudh',
          breadcrumb: 'Comment choisir son makroudh ?',
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">كيفاش تختار مقروض بنّان: الدليل الكامل</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                مش كل مقروض متشابه. بين النسخة الحرفية المصنوعة باليد والنسخة الصناعية المنتجة بكمية كبيرة، فيه فرق
                حقيقي في الطعم والقوام والجودة. هاذي أهم العلامات اللي تخليك تختار مقروض بنّان فعلاً.
              </p>
              <h2 className="font-display text-xl text-ink">1. القوام</h2>
              <p>
                المقروض البنّان يكون رطب من جوّا وهش شوية من برا — لا يابس بزاف ولا مغرّق بالزيت. إذا حسّيت إنه جاف
                وصلب، فمعناها قعد وقت طويل ولا القلي ما كانش مضبوط.
              </p>
              <h2 className="font-display text-xl text-ink">2. الحشوة</h2>
              <p>
                عجينة التمر الحقيقية لونها غامق وقوامها متجانس، وطعمها قريب من التمر الطبيعي — مو حلو بزاف بطريقة
                مصطنعة. إذا الحشوة حلوة قوية بلا طعم تمر واضح، فالغالب فيها سكر مضاف بزاف بدل التمر الحقيقي.
              </p>
              <h2 className="font-display text-xl text-ink">3. الشراب</h2>
              <p>
                المقروض المغموس في عسل حقيقي يكون براقه ولونه ذهبي، وريحته واضحة. الشراب المصنوع من سكر بس (بلا عسل)
                يكون أقل بريقًا وأقل عمقًا في النكهة، حتى لو حلاوته قوية.
              </p>
              <h2 className="font-display text-xl text-ink">4. الشكل</h2>
              <p>
                مقروض مصنوع باليد بالقالب التقليدي (الطابع) يكون شكله منقوش بس مو مثالي 100% — كل قطعة تختلف شوية عن
                الأخرى. إذا كل القطع متطابقة تمامًا بشكل آلي، فالغالب إنتاج صناعي بكمية كبيرة.
              </p>
              <h2 className="font-display text-xl text-ink">5. المصدر</h2>
              <p>
                المقروض المرتبط بالقيروان، مصنوع بكميات صغيرة وطلبات طازجة، غالبًا يحافظ أكثر على الطريقة التقليدية
                من إنتاج ضخم موجه للتوزيع الواسع.
              </p>
              <p>
                خلاصة: أفضل طريقة تتأكد هي تجرب — طعم واحد بنّان يبان من أول قضمة.
              </p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">جرّبوا مقروض عند لعزيز، مصنوع باليد كل يوم في القيروان</p>
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Comment bien choisir son makroudh : le guide complet</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Tous les makroudh ne se valent pas. Entre la version artisanale faite à la main et la version
              industrielle produite en grande quantité, il existe une vraie différence de goût, de texture et de
              qualité. Voici les signes qui permettent de reconnaître un makroudh vraiment réussi.
            </p>
            <h2 className="font-display text-xl text-ink">1. La texture</h2>
            <p>
              Un bon makroudh est moelleux à l'intérieur et légèrement friable à l'extérieur — ni trop sec, ni
              détrempé d'huile. S'il vous semble sec et dur, c'est souvent le signe qu'il a été conservé trop
              longtemps, ou que la friture n'a pas été bien maîtrisée.
            </p>
            <h2 className="font-display text-xl text-ink">2. La garniture</h2>
            <p>
              Une vraie pâte de dattes a une couleur sombre, une texture homogène, et un goût proche de la datte
              naturelle — pas une douceur artificielle et uniforme. Si la garniture est très sucrée sans note de
              datte identifiable, elle contient probablement plus de sucre ajouté que de datte réelle.
            </p>
            <h2 className="font-display text-xl text-ink">3. Le sirop</h2>
            <p>
              Un makroudh trempé dans du vrai miel a un aspect brillant, une couleur dorée, et un parfum
              caractéristique. Un sirop fait uniquement de sucre (sans miel) paraît plus terne et moins riche en
              arôme, même s'il est très sucré.
            </p>
            <h2 className="font-display text-xl text-ink">4. La forme</h2>
            <p>
              Un makroudh façonné à la main avec le moule traditionnel (le tabaâ) porte un motif net, mais jamais
              parfaitement identique d'une pièce à l'autre. Si toutes les pièces sont rigoureusement identiques, il
              s'agit probablement d'une production industrielle en grande série.
            </p>
            <h2 className="font-display text-xl text-ink">5. La provenance</h2>
            <p>
              Un makroudh rattaché à Kairouan, produit en petites quantités et préparé sur commande fraîche, respecte
              en général davantage la méthode traditionnelle qu'une production de masse destinée à une large
              distribution.
            </p>
            <p>Au final, la meilleure façon de s'assurer de la qualité reste de goûter : un bon makroudh se reconnaît dès la première bouchée.</p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Goûtez le makroudh Chez Laziz, fait main chaque jour à Kairouan</p>
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
