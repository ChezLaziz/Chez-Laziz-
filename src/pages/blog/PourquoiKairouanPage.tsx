import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'

export default function PourquoiKairouanPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'ليش القيروان عاصمة المقروض التاريخية؟ — مدونة عند لعزيز',
          description: 'شنية اللي خلّى القيروان، قبل كل المدن التونسية الأخرى، المرجع الأول للمقروض.',
          path: '/ar/journal/pourquoi-kairouan-makroudh',
          breadcrumb: 'ليش القيروان عاصمة المقروض؟',
          article: { datePublished: '2026-09-05' },
        }
      : {
          title: 'Pourquoi Kairouan est la capitale historique du makroudh — Journal Chez Laziz',
          description:
            "Ce qui a fait de Kairouan, bien avant les autres villes tunisiennes, la référence incontournable du makroudh.",
          path: '/journal/pourquoi-kairouan-makroudh',
          breadcrumb: 'Pourquoi Kairouan et le makroudh',
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">ليش القيروان عاصمة المقروض التاريخية؟</h1>

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                في كل تونس، إذا قلت "مقروض" أغلب الناس يفكرو في القيروان. هاذي المدينة ما صارتش مرتبطة بالمقروض
                بالصدفة — فيه أسباب تاريخية وجغرافية حقيقية وراء هذا الارتباط.
              </p>
              <h2 className="font-display text-xl text-ink">مدينة دينية وتجارية من القرن التاسع</h2>
              <p>
                القيروان من أقدم المدن الإسلامية في المغرب العربي، تأسست في القرن السابع وازدهرت بشكل كبير في العهد
                الأغلبي (القرن التاسع)، بجامع عقبة بن نافع اللي يعتبر من أهم المعالم الدينية في المنطقة. هذا الوضع
                خلاها محطة عبور مهمة للتجار والزوار والحجاج.
              </p>
              <h2 className="font-display text-xl text-ink">حركة الزوار = سمعة تنتشر</h2>
              <p>
                مدينة تستقبل زوارًا وحجاجًا بانتظام من كل أنحاء البلاد وحتى من برا، طبيعي تصبح نقطة انطلاق لانتشار
                سمعة منتجاتها المحلية — والحلويات المصنوعة بعناية جزء أساسي من هذا. المقروض، بحرفيته العالية، كان من
                أبرز ما يميز المدينة.
              </p>
              <h2 className="font-display text-xl text-ink">تناقل الحرفة عائليًا</h2>
              <p>
                على مدى أجيال، الحرفيون والعائلات في القيروان تناقلو طريقة صناعة المقروض من جيل لجيل — القالب
                الخشبي (الطابع)، دقة عجينة السميد، وطريقة الغمس بالعسل — محافظين على مستوى جودة وأصالة صعب يتكرر في
                مكان آخر.
              </p>
              <h2 className="font-display text-xl text-ink">السمعة اللي تدوم</h2>
              <p>
                مع الوقت، "مقروض القيروان" صار تقريبًا مرادف لأعلى مستوى جودة يمكن يتوقعه أي تونسي — سمعة بنيت على
                قرون من الحرفة، مو حملة تسويقية حديثة.
              </p>
              <p>
                للمزيد حول تاريخ المقروض وطريقة صناعته بالتفصيل، شوفو مقالاتنا الأخرى في المدونة.
              </p>
            </div>

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">جرّبوا مقروض القيروان الأصيل، مصنوع باليد كل يوم</p>
              <Link to="/ar/makroudh-kairouan" className="arrow-link mt-4 inline-flex justify-center">
                اكتشفوا مقروض القيروان
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Pourquoi Kairouan est la capitale historique du makroudh</h1>

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Partout en Tunisie, dire « makroudh » évoque presque automatiquement Kairouan. Cette association n'est
              pas le fruit du hasard — elle repose sur des raisons historiques et géographiques bien réelles.
            </p>
            <h2 className="font-display text-xl text-ink">Une ville religieuse et marchande depuis le 9e siècle</h2>
            <p>
              Kairouan est l'une des plus anciennes villes islamiques du Maghreb, fondée au 7e siècle et florissante
              sous les Aghlabides (9e siècle), avec la Grande Mosquée Okba Ibn Nafaa comme l'un des lieux religieux
              majeurs de la région. Ce statut en a fait une étape de passage importante pour les marchands, les
              visiteurs et les pèlerins.
            </p>
            <h2 className="font-display text-xl text-ink">Le passage de visiteurs, moteur d'une réputation</h2>
            <p>
              Une ville accueillant régulièrement des visiteurs et pèlerins venus de tout le pays, et même de plus
              loin, devient naturellement un point de départ pour la diffusion de la réputation de ses produits
              locaux — et les pâtisseries soigneusement préparées en font partie intégrante. Le makroudh, par son
              haut niveau d'exigence artisanale, s'est démarqué comme l'une des spécialités phares de la ville.
            </p>
            <h2 className="font-display text-xl text-ink">Un savoir-faire transmis en famille</h2>
            <p>
              Sur plusieurs générations, artisans et familles de Kairouan se sont transmis la méthode de fabrication
              du makroudh — le moule en bois (le tabaâ), la précision de la pâte de semoule, la technique du bain de
              miel — préservant un niveau de qualité et d'authenticité difficile à reproduire ailleurs.
            </p>
            <h2 className="font-display text-xl text-ink">Une réputation qui dure</h2>
            <p>
              Avec le temps, « makroudh de Kairouan » est devenu presque synonyme du plus haut niveau de qualité
              qu'un Tunisien puisse attendre — une réputation bâtie sur des siècles de savoir-faire, pas sur une
              campagne marketing récente.
            </p>
            <p>Pour en savoir plus sur l'histoire et la fabrication du makroudh, consultez nos autres articles du Journal.</p>
          </div>

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Goûtez le vrai makroudh de Kairouan, fait main chaque jour</p>
            <Link to="/makroudh-kairouan" className="arrow-link mt-4 inline-flex justify-center">
              Découvrir le makroudh de Kairouan
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
