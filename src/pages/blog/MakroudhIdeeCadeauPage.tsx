import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'

export default function MakroudhIdeeCadeauPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'المقروض، فكرة هدية تونسية بامتياز — مدونة عند لعزيز',
          description: 'للعيد، لعرس، ولا بس باش تفرّح حد: ليش المقروض يبقى من أكثر الهدايا المحبوبة في تونس.',
          path: '/ar/journal/makroudh-idee-cadeau',
          breadcrumb: 'المقروض كهدية',
          article: { datePublished: '2026-09-05' },
        }
      : {
          title: 'Le makroudh, une idée cadeau tunisienne par excellence — Journal Chez Laziz',
          description:
            "Pour l'Aïd, un mariage ou simplement pour faire plaisir : pourquoi le makroudh reste l'un des cadeaux les plus appréciés en Tunisie.",
          path: '/journal/makroudh-idee-cadeau',
          breadcrumb: 'Le makroudh comme cadeau',
          article: { datePublished: '2026-09-05' },
        },
  )

  if (isAr) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <Header />
        <main className="pt-16 md:pt-20">
          <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">المدونة</p>
            <h1 className="font-display text-3xl leading-tight md:text-5xl">المقروض، فكرة هدية تونسية بامتياز</h1>

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                في تونس، الحلويات التقليدية جزء أساسي من كل مناسبة — واستقبال الضيوف بدون حلو يعتبر ناقص. المقروض،
                بالذات، عنده مكانة خاصة في هذا التقليد.
              </p>
              <h2 className="font-display text-xl text-ink">تقليد الضيافة</h2>
              <p>
                تقديم صينية مقروض للضيف علامة كرم واحترام متجذّرة في العادات التونسية — سواء في زيارة عائلية عادية
                ولا في مناسبة كبيرة.
              </p>
              <h2 className="font-display text-xl text-ink">ليش يعتبر هدية موفقة</h2>
              <p>
                المقروض معروف ومحبوب عند الجميع تقريبًا، سهل النقل، وما يحتاجش تبريد فوري — يعني يقدر يوصل هدية لعائلة
                ولا صحاب بدون تعقيد. وهو أيضًا هدية "أصيلة" تحكي جزء من هوية تونس والقيروان بالذات.
              </p>
              <h2 className="font-display text-xl text-ink">كيفاش تقدمه بطريقة لائقة</h2>
              <p>
                التغليف يفرق بزاف — صندوق هدية مرتب، بريطة، وترتيب أنيق للقطع يحوّل صينية مقروض عادية لهدية تستاهل
                تتقدم. عندنا نوفرو خيارات تغليف مناسبة للهدايا.
              </p>
              <h2 className="font-display text-xl text-ink">لأي مناسبات</h2>
              <p>
                عيد الفطر، عيد الأضحى، الأعراس والخطوبات، الرجوع من سفر، ولا بس زيارة عائلية — المقروض يلائم أغلب
                المناسبات التونسية تقريبًا.
              </p>
              <p>عندك مناسبة وبدك كمية كبيرة؟ تواصل معنا ونرتبولك الطلب حسب احتياجك.</p>
            </div>

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">فرّحوا حد بهدية مقروض أصيلة من القيروان</p>
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Le makroudh, une idée cadeau tunisienne par excellence</h1>

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              En Tunisie, les pâtisseries traditionnelles font partie intégrante de chaque occasion — recevoir des
              invités sans douceur à offrir est presque impensable. Le makroudh, en particulier, occupe une place à
              part dans cette tradition.
            </p>
            <h2 className="font-display text-xl text-ink">Une tradition d'hospitalité</h2>
            <p>
              Offrir un plateau de makroudh à un invité est un geste de générosité et de respect profondément ancré
              dans les habitudes tunisiennes — que ce soit lors d'une visite familiale ordinaire ou d'un grand
              événement.
            </p>
            <h2 className="font-display text-xl text-ink">Pourquoi c'est un cadeau réussi</h2>
            <p>
              Le makroudh est connu et apprécié de presque tout le monde, facile à transporter, et ne nécessite pas
              de réfrigération immédiate — il peut donc arriver en cadeau chez une famille ou des amis sans
              complication. C'est aussi un cadeau « authentique », qui raconte une part de l'identité tunisienne, et
              kairouanaise en particulier.
            </p>
            <h2 className="font-display text-xl text-ink">Comment bien le présenter</h2>
            <p>
              L'emballage change beaucoup de choses — un coffret cadeau soigné, un ruban, une disposition élégante des
              pièces transforment un simple plateau de makroudh en un cadeau qui mérite d'être offert. Nous proposons
              des options d'emballage adaptées aux cadeaux.
            </p>
            <h2 className="font-display text-xl text-ink">Pour quelles occasions</h2>
            <p>
              L'Aïd el-Fitr, l'Aïd el-Adha, les mariages et fiançailles, un retour de voyage, ou simplement une
              visite familiale — le makroudh convient à la quasi-totalité des occasions tunisiennes.
            </p>
            <p>
              Vous avez un événement et souhaitez commander en grande quantité ? Contactez-nous et nous organisons
              votre commande selon vos besoins.
            </p>
          </div>

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Faites plaisir avec un vrai makroudh de Kairouan</p>
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
