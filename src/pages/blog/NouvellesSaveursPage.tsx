import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'
import RelatedArticles from './RelatedArticles'

const META = ARTICLES.find((a) => a.slug === 'nouvelles-saveurs-makroudh-blanc')!

const FLAVORS_FR = [
  'Pistache',
  'Vanille',
  'Figues',
  'Ananas',
  'Fraise',
  'Noisettes',
  'Café Laziz',
  'Zgougou',
]
const FLAVORS_AR = ['فستق', 'فانيليا', 'تين', 'أناناس', 'فراولة', 'بندق', 'قهوة لعزيز', 'زقوقو']

export default function NouvellesSaveursPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'المقروض الأبيض: نكهاتنا الجديدة الحصرية — مدونة عند لعزيز',
          description: 'فستق، فانيليا، تين، أناناس، فراولة، بندق، قهوة وزقوقو: التشكيلة الجديدة عند لعزيز، ما شفتوهاش في مكان آخر.',
          path: '/ar/journal/nouvelles-saveurs-makroudh-blanc',
          breadcrumb: 'نكهاتنا الجديدة',
          article: { datePublished: '2026-09-05' },
          image: META.image,
        }
      : {
          title: 'Makroudh blanc : nos nouvelles saveurs exclusives — Journal Chez Laziz',
          description:
            'Pistache, vanille, figues, ananas, fraise, noisette, café et zgougou : la nouvelle collection Chez Laziz, jamais vue ailleurs.',
          path: '/journal/nouvelles-saveurs-makroudh-blanc',
          breadcrumb: 'Nos nouvelles saveurs',
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
            <h1 className="font-display text-3xl leading-tight md:text-5xl">المقروض الأبيض: نكهاتنا الجديدة الحصرية</h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">بقلم فريق عند لعزيز</p>
            <img
              src={META.image}
              alt={META.imageAltAr}
              loading="lazy"
              className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />

            <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
              <p>
                بعد شغل طويل في المطبخ، فرحانين نقدملكم تشكيلة "المقروض الأبيض" — نسخة جديدة كليًا، ما شفتوها عند
                حتى حد قبل، بثمانية نكهات مختلفة صممناها بأنفسنا.
              </p>
              <h2 className="font-display text-xl text-ink">النكهات الجديدة</h2>
              <ul className="list-disc space-y-1 pe-5">
                {FLAVORS_AR.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <h2 className="font-display text-xl text-ink">أسماء وتركيبات حصرية عند لعزيز (™)</h2>
              <p>
                هاذي الأسماء والتركيبات اخترعناها بأنفسنا، ما هي موجودة في أي مكان آخر — تلقاو رمز ™ جنب كل اسم في
                موقعنا، علامة إنها إبداع خاص بينا.
              </p>
              <h2 className="font-display text-xl text-ink">ليش دشّنا هذي التشكيلة</h2>
              <p>
                بقينا نحبو نحافظو على المقروض التقليدي بنفس الجودة، لكن حبينا نجربو أفكار جديدة تجمع بين روح المقروض
                وأذواق عصرية — من غير ما نمسو التشكيلة التقليدية اللي تعرفوها ونحبوها.
              </p>
              <p>التفاصيل والصور الكاملة لكل نكهة تلقاوها في صفحة التشكيلة.</p>
            </div>

            <RelatedArticles slugs={META.related} isAr={true} />

            <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
              <p className="font-display text-xl text-ink">اكتشفوا التشكيلة الجديدة كاملة</p>
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
          <h1 className="font-display text-3xl leading-tight md:text-5xl">Makroudh blanc : nos nouvelles saveurs exclusives</h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-ink/40">Par l'équipe Chez Laziz</p>
          <img
            src={META.image}
            alt={META.imageAlt}
            loading="lazy"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Après un long travail en cuisine, nous sommes heureux de vous présenter la collection « Makroudh blanc
              » — une version entièrement nouvelle, jamais vue ailleurs, déclinée en huit saveurs que nous avons
              imaginées nous-mêmes.
            </p>
            <h2 className="font-display text-xl text-ink">Les nouvelles saveurs</h2>
            <ul className="list-disc space-y-1 ps-5">
              {FLAVORS_FR.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <h2 className="font-display text-xl text-ink">Des noms et des recettes exclusifs Chez Laziz (™)</h2>
            <p>
              Ces noms et ces compositions ont été inventés par nous, et n'existent nulle part ailleurs — vous
              trouverez le symbole ™ à côté de chaque nom sur notre site, signe qu'il s'agit d'une création qui nous
              appartient.
            </p>
            <h2 className="font-display text-xl text-ink">Pourquoi cette nouvelle collection</h2>
            <p>
              Nous tenons à préserver le makroudh traditionnel avec la même exigence de toujours, mais nous avions
              envie d'explorer de nouvelles idées mêlant l'esprit du makroudh à des goûts plus contemporains — sans
              toucher à la collection traditionnelle que vous connaissez et aimez.
            </p>
            <p>Retrouvez tous les détails et les photos de chaque saveur sur la page Collection.</p>
          </div>

          <RelatedArticles slugs={META.related} isAr={false} />

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Découvrez toute la nouvelle collection</p>
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
