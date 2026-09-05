import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'makroudh-vs-baklava-difference')!

export default function MakroudhVsBaklavaPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'المقروض ولا البقلاوة: شنية الفرق؟ — مدونة عند لعزيز',
          description: 'حلويان يتخلطو بزاف بينهم، لكن مختلفين بزاف في العجينة والطهي والأصل — المقارنة الكاملة.',
          path: '/ar/journal/makroudh-vs-baklava-difference',
          breadcrumb: 'المقروض ولا البقلاوة؟',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: 'Makroudh ou baklava : quelle différence ? — Journal Chez Laziz',
          description:
            "Deux douceurs souvent confondues, mais très différentes dans la pâte, la cuisson et l'origine — le comparatif complet.",
          path: '/journal/makroudh-vs-baklava-difference',
          breadcrumb: 'Makroudh ou baklava ?',
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">المقروض ولا البقلاوة: شنية الفرق؟</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                المقروض والبقلاوة، حلويان تلقاهم في كل حفلة وعيد في شمال إفريقيا والشرق الأوسط، وبزاف ناس يخلطو بينهم
                لأنهم الاثنين مقطعين معينات ومغموسين في شراب حلو. لكن الحقيقة، هذوما حلويان من عالمين مختلفين تمامًا —
                من العجينة للطهي للأصل.
              </p>
              <h2 className="font-display text-xl text-ink">1. الأصل</h2>
              <p>
                المقروض حلوى مغاربية أصيلة، مرتبطة تاريخيًا بالقيروان وتونس. البقلاوة أصلها من الإمبراطورية العثمانية،
                وانتشرت بعدها في تركيا، بلاد الشام، واليونان والبلقان — كل منطقة عندها نسختها الخاصة.
              </p>
              <h2 className="font-display text-xl text-ink">2. العجينة</h2>
              <p>
                المقروض عجينته من السميد، معجونة بزيت الزيتون، سميكة نسبيًا وبلا خميرة. البقلاوة بالعكس، تُصنع من ورقات
                رقيقة جدًا (عجينة الفيلو)، متراكمة فوق بعضها وممسوحة بالزبدة أو السمن — عشرات الطبقات في القطعة
                الواحدة.
              </p>
              <h2 className="font-display text-xl text-ink">3. الطهي</h2>
              <p>
                المقروض يُقلى في الزيت حتى يصير ذهبي، وبعدها يُغمس وهو سخون في شراب العسل. البقلاوة تُخبز في الفرن (ما
                تتقلاش)، وبعد الخبز مباشرة يُصب عليها شراب سكر سخون أو بارد (أحيانًا معطر بماء الورد أو زهر البرتقال).
              </p>
              <h2 className="font-display text-xl text-ink">4. الحشوة</h2>
              <p>
                حشوة المقروض التقليدية هي عجينة التمر، وأحيانًا اللوز في بعض النسخ. حشوة البقلاوة غالبًا مكسرات
                مفرومة — فستق، جوز، ولا لوز — موزعة بين طبقات الفيلو.
              </p>
              <h2 className="font-display text-xl text-ink">5. القوام والطعم</h2>
              <p>
                المقروض قوامه كثيف وهش شوية من برا، رطب من جوّا بفضل عجينة التمر والعسل — حلاوته متوازنة ونكهته
                قريبة من التمر والزيت. البقلاوة قوامها مقرمش وطبقاتها رقيقة تتكسر بسهولة، وحلاوتها أقوى بفضل شراب
                السكر المركّز.
              </p>
              <p>
                خلاصة القول: مش حلوى أحسن من الأخرى — هذوما تقليدان مختلفان، كل وحد يستاهل يتذوقه لحاله. عندنا بالطبع
                نتخصصو في المقروض، وبالضبط الطريقة التقليدية القيروانية.
              </p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">اكتشفو المقروض التونسي الأصيل عندنا</p>
              <Link to="/ar/collection" className="arrow-link mt-4 inline-flex justify-center">
                شوفو التشكيلة كاملة
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Makroudh ou baklava : quelle différence ?</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Makroudh et baklava se retrouvent tous les deux sur toutes les tables de fête, du Maghreb au
              Moyen-Orient, et beaucoup de gens les confondent : les deux sont découpés en losanges et trempés dans
              un sirop sucré. Pourtant, ce sont deux pâtisseries qui viennent de traditions bien distinctes — de la
              pâte à la cuisson en passant par l'origine.
            </p>
            <h2 className="font-display text-xl text-ink">1. L'origine</h2>
            <p>
              Le makroudh est une pâtisserie maghrébine authentique, historiquement associée à Kairouan et à la
              Tunisie. Le baklava vient de l'Empire ottoman, et s'est ensuite répandu en Turquie, au Levant, en
              Grèce et dans les Balkans — chaque région ayant sa propre version.
            </p>
            <h2 className="font-display text-xl text-ink">2. La pâte</h2>
            <p>
              Le makroudh est fait d'une pâte de semoule pétrie à l'huile d'olive, relativement épaisse et sans
              levure. Le baklava, à l'inverse, se compose de très fines feuilles de pâte filo empilées et badigeonnées
              de beurre ou de ghee — plusieurs dizaines de couches par pièce.
            </p>
            <h2 className="font-display text-xl text-ink">3. La cuisson</h2>
            <p>
              Le makroudh est frit dans l'huile jusqu'à obtenir une couleur dorée, puis plongé encore chaud dans un
              sirop de miel. Le baklava est cuit au four (jamais frit), et un sirop de sucre chaud ou froid (parfois
              parfumé à l'eau de rose ou de fleur d'oranger) est versé dessus juste après la cuisson.
            </p>
            <h2 className="font-display text-xl text-ink">4. La garniture</h2>
            <p>
              La garniture traditionnelle du makroudh est une pâte de dattes, parfois remplacée par des amandes dans
              certaines variantes. Le baklava est généralement garni de fruits secs concassés — pistache, noix ou
              amande — répartis entre les couches de filo.
            </p>
            <h2 className="font-display text-xl text-ink">5. La texture et le goût</h2>
            <p>
              Le makroudh a une texture dense, légèrement friable à l'extérieur et moelleuse à l'intérieur grâce à
              la pâte de dattes et au miel — une douceur équilibrée, aux notes de datte et d'huile d'olive. Le
              baklava a une texture croustillante, en couches fines qui se brisent facilement, et une douceur plus
              marquée grâce au sirop de sucre concentré.
            </p>
            <p>
              En résumé : ce n'est pas une pâtisserie « meilleure » que l'autre — ce sont deux traditions distinctes,
              qui méritent chacune d'être découvertes pour ce qu'elles sont. Chez nous, on se concentre sur le
              makroudh, et sur sa version la plus authentique : celle de Kairouan.
            </p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Découvrez le vrai makroudh tunisien</p>
            <Link to="/collection" className="arrow-link mt-4 inline-flex justify-center">
              Voir toute la collection
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
