import { Link } from 'react-router'
import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { cheapestPriceMillimes } from '@/lib/landingProduct'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import Ornament from '../components/Ornament'

export default function MakroudhKairouanPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'مقروض القيروان — التقليد التونسي الأصيل | عند لعزيز',
          description:
            'القيروان معروفة في كامل تونس بحلوياتها بالسميد. اكتشفو مقروض القيروان كيفاش عند لعزيز يشكّله باليد كل يوم، في مدينته الأصلية.',
          path: '/ar/makroudh-kairouan',
          breadcrumb: 'مقروض القيروان',
        }
      : {
          title: "Makroudh de Kairouan — L'Authentique Tradition Tunisienne | Chez Laziz",
          description:
            'Kairouan est réputée dans toute la Tunisie pour ses pâtisseries à la semoule. Découvrez le makroudh kairouanais tel que Chez Laziz le façonne à la main, chaque jour, dans sa ville d\'origine.',
          path: '/makroudh-kairouan',
          breadcrumb: 'Makroudh de Kairouan',
        },
  )

  // Page de catégorie (pas une fiche produit précise) — un "à partir de"
  // basé sur le prix le plus bas du catalogue, pas de schéma Product ici
  // (ce serait faux de désigner un seul produit pour toute la gamme).
  const { data: products } = trpc.products.list.useQuery()
  const cheapest = cheapestPriceMillimes(products)
  const priceLabel = cheapest
    ? isAr
      ? `ابتداءً من ${formatTND(cheapest)} د.ت / كغ`
      : `À partir de ${formatTND(cheapest)} DT / kg`
    : null

  if (isAr) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <Header />
        <main className="pt-16 md:pt-20">
          <section className="mx-auto max-w-3xl px-5 py-24 md:px-10 md:py-32">
            <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
              القيروان، تونس
            </p>
            <h1 data-reveal className="font-display text-4xl leading-tight md:text-6xl">
              مقروض القيروان — التقليد التونسي الأصيل
            </h1>
            {priceLabel && (
              <p data-reveal className="mt-4 text-xs uppercase tracking-[0.2em] text-accent">
                {priceLabel}
              </p>
            )}

            <div data-reveal className="mt-10 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
              <p>
                القيروان، المدينة التاريخية في وسط تونس، معروفة في كامل البلاد بحرفة صناعة الحلويات بالسميد والتمر
                والعسل. <strong className="font-medium text-ink">مقروض القيروان</strong> هو الرمز الأشهر لها:
                معين ذهبي، مشكّل باليد في قالب خشبي منقوش، محشو بعجينة التمر ومنتهي بالعسل.
              </p>
              <p>
                برشا من التونسيين يربطو اسم القيروان بالمقروض بشكل طبيعي — كيما مدن أخرى في البلاد مرتبطة
                بتخصصاتها الخاصة. هذي السمعة اللي عند لعزيز يحملها، من محله المتواجد في القيروان بالذات.
              </p>
            </div>

            <div data-reveal className="mt-14">
              <Ornament />
            </div>

            <div data-reveal className="mt-14">
              <h2 className="font-display text-2xl leading-tight md:text-3xl">صناعة في القيروان، كيما لازم</h2>
              <div className="mt-5 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
                <p>
                  عند لعزيز موش حلويات تستوحي من القيروان عن بعد: محلنا في القيروان بالذات، مفتوح 7 أيام على 7 من
                  07:00 إلى منتصف الليل. كل مقروض نبيعوه — في المحل ولا بالطلب أونلاين — يُشكّل في نفس المكان،
                  نفس النهار.
                </p>
                <p>
                  اكتشفو كامل تشكيلتنا في صفحة{' '}
                  <Link to="/ar/collection" className="text-accent underline underline-offset-2">
                    التشكيلة
                  </Link>
                  ، قصتنا وحرفتنا في{' '}
                  <Link to="/ar/la-maison" className="text-accent underline underline-offset-2">
                    قصتنا
                  </Link>
                  ، أو العنوان الدقيق للمحل في{' '}
                  <Link to="/ar/contact" className="text-accent underline underline-offset-2">
                    تواصل معنا
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div data-reveal className="mt-14 rounded-2xl bg-ink-deep p-8 text-center text-[#faf6f3] md:p-12">
              <p className="font-display text-2xl md:text-3xl">زورو محلنا في القيروان</p>
              <Link
                to="/ar/contact"
                className="gold-cta mt-6 inline-flex rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
              >
                شوفو العنوان والطريق
              </Link>
            </div>

            <p data-reveal className="mt-10 text-xs uppercase tracking-[0.2em] text-ink/40">
              اقرأو أيضًا:{' '}
              <Link to="/ar/makroudh-tunisien" className="text-accent hover:underline">المقروض التونسي</Link>
              {' · '}
              <Link to="/ar/makroudh-aux-dattes" className="text-accent hover:underline">مقروض بالتمر</Link>
              {' · '}
              <Link to="/ar/makroudh-fruits-secs" className="text-accent hover:underline">مقروض بالفواكه الجافة</Link>
            </p>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <section className="mx-auto max-w-3xl px-5 py-24 md:px-10 md:py-32">
          <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            Kairouan, Tunisie
          </p>
          <h1 data-reveal className="font-display text-4xl leading-tight md:text-6xl">
            Makroudh de Kairouan — L'Authentique Tradition Tunisienne
          </h1>
          {priceLabel && (
            <p data-reveal className="mt-4 text-xs uppercase tracking-[0.2em] text-accent">
              {priceLabel}
            </p>
          )}

          <div data-reveal className="mt-10 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
            <p>
              Kairouan, ville historique du centre de la Tunisie, est réputée dans tout le pays pour son
              savoir-faire pâtissier à base de semoule, de dattes et de miel. Le{' '}
              <strong className="font-medium text-ink">makroudh kairouanais</strong> en est le symbole le plus
              connu : un losange doré, façonné à la main dans un moule en bois sculpté, garni de pâte de dattes
              et fini au miel.
            </p>
            <p>
              De nombreux Tunisiens associent naturellement le nom de Kairouan au makroudh — au même titre que
              d'autres villes du pays sont associées à leurs propres spécialités. C'est cette réputation que Chez
              Laziz porte, depuis sa boutique installée à Kairouan même.
            </p>
          </div>

          <div
            data-reveal
            dir="rtl"
            lang="ar"
            className="mt-10 rounded-2xl border border-sand/70 bg-white p-6 text-right text-[15px] font-light leading-relaxed text-ink/75 md:p-8"
          >
            <p>
              مقروض القيروان من أعرق الحلويات التونسية — مدينة القيروان معروفة في كامل تونس بحرفة صناعة حلويات
              السميد والتمر والعسل. عند لعزيز، نحضّر المقروض القيرواني الأصيل يدويًا كل يوم، في قلب المدينة
              نفسها.
            </p>
          </div>

          <div data-reveal className="mt-14">
            <Ornament />
          </div>

          <div data-reveal className="mt-14">
            <h2 className="font-display text-2xl leading-tight md:text-3xl">Fait à Kairouan, comme il se doit</h2>
            <div className="mt-5 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
              <p>
                Chez Laziz n'est pas une pâtisserie qui s'inspire de Kairouan à distance : notre boutique est à
                Kairouan, ouverte 7j/7 de 07h00 à 00h00. Chaque makroudh que nous vendons — en boutique ou en
                commande en ligne — est façonné sur place, le jour même.
              </p>
              <p>
                Retrouvez toute notre gamme sur la page{' '}
                <Link to="/collection" className="text-accent underline underline-offset-2">
                  Collection
                </Link>
                , notre histoire et notre savoir-faire sur{' '}
                <Link to="/la-maison" className="text-accent underline underline-offset-2">
                  La Maison
                </Link>
                , ou l'adresse exacte de la boutique sur{' '}
                <Link to="/contact" className="text-accent underline underline-offset-2">
                  Nous trouver
                </Link>
                .
              </p>
            </div>
          </div>

          <div data-reveal className="mt-14 rounded-2xl bg-ink-deep p-8 text-center text-[#faf6f3] md:p-12">
            <p className="font-display text-2xl md:text-3xl">Visitez notre boutique à Kairouan</p>
            <Link
              to="/contact"
              className="gold-cta mt-6 inline-flex rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
            >
              Voir l'adresse et l'itinéraire
            </Link>
          </div>

          <p data-reveal className="mt-10 text-xs uppercase tracking-[0.2em] text-ink/40">
            À lire aussi :{' '}
            <Link to="/makroudh-tunisien" className="text-accent hover:underline">Makroudh tunisien</Link>
            {' · '}
            <Link to="/makroudh-aux-dattes" className="text-accent hover:underline">Makroudh aux dattes</Link>
            {' · '}
            <Link to="/makroudh-fruits-secs" className="text-accent hover:underline">Makroudh aux fruits secs</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
