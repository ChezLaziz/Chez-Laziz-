import { Link } from 'react-router'
import Ornament from '../components/Ornament'
import { trpc } from '@/providers/trpc'
import { useLang } from '@/lib/i18n'

const DEFAULT_EYEBROW = 'La Maison'
const DEFAULT_EYEBROW_AR = 'دارنا'
const DEFAULT_TITLE = 'L’art du makroudh kairouanais authentique'
const DEFAULT_TITLE_AR = 'فن المقروض القيرواني الأصيل'
const DEFAULT_P1 =
  'Enraciné dans l’héritage intemporel de Kairouan, notre makroudh est une célébration du savoir-faire tunisien, raffiné pour les palais d’aujourd’hui.'
const DEFAULT_P1_AR =
  'متجذّر في تراث القيروان الخالد، مقروضنا احتفاء بالحرفية التونسية الأصيلة، مُعاد صياغته ليلائم أذواق اليوم.'
const DEFAULT_P2 =
  'Chaque losange est façonné à la main avec des ingrédients soigneusement choisis : semoule dorée, pâte de dattes fondante, miel — et un goût traditionnel qui ne change jamais.'
const DEFAULT_P2_AR =
  'كل قطعة تُصنع يدويًا بمكونات مُنتقاة بعناية: سميد ذهبي، عجينة تمر طرية، عسل — وطعم تقليدي لا يتغيّر أبدًا.'

export default function Story({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const Heading = headingLevel
  const { data } = trpc.content.pages.useQuery()
  const lang = useLang()
  const isAr = lang === 'ar'
  const eyebrow = isAr ? data?.maisonEyebrowAr || DEFAULT_EYEBROW_AR : data?.maisonEyebrow || DEFAULT_EYEBROW
  const title = isAr ? data?.maisonTitleAr || DEFAULT_TITLE_AR : data?.maisonTitle || DEFAULT_TITLE
  const p1 = isAr ? data?.maisonP1Ar || DEFAULT_P1_AR : data?.maisonP1 || DEFAULT_P1
  const p2 = isAr ? data?.maisonP2Ar || DEFAULT_P2_AR : data?.maisonP2 || DEFAULT_P2

  return (
    <section id="maison" className="relative overflow-hidden py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="grid items-start gap-16 lg:grid-cols-12 lg:gap-10">
          {/* Photographie éditoriale : le plateau de makroudh, encadré d'un
              filet doré décalé, avec un médaillon « détail » en photo réelle. */}
          <div className="lg:col-span-7">
            <div className="relative w-full lg:w-[92%]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 translate-x-3 translate-y-3 border border-[#b8912e]/60 md:translate-x-5 md:translate-y-5"
              />
              <div className="mask-reveal relative aspect-[2/3] max-h-[760px] w-full bg-[#e9dccf]">
                <img
                  src="/images/maison.webp"
                  width={774}
                  height={1018}
                  alt="Plateau doré de makroudh kairouanais estampés, deux pièces coupées révélant la pâte de dattes"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <p className="absolute left-4 top-4 rounded-full bg-[#faf6f3]/90 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-[#2e2a27] backdrop-blur-sm md:left-5 md:top-5">
                  {isAr ? 'القيروان · صناعة يدوية' : 'Kairouan · fait main'}
                </p>
              </div>

              <figure
                className="absolute -bottom-8 -left-3 w-[38%] max-w-[230px] border-[5px] border-[#faf6f3] bg-[#faf6f3] shadow-[0_28px_60px_-22px_rgba(0,0,0,0.5)] md:-bottom-10 md:-left-8"
                data-reveal
              >
                <img
                  src="/images/maison-detail.webp"
                  width={640}
                  height={640}
                  alt="Gros plan sur des makroudh enrobés de graines de sésame"
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>
          </div>

          {/* Panneau éditorial sombre chevauchant la photographie */}
          <div className="relative z-10 lg:col-span-5 lg:-ml-24 lg:mt-32">
            <div className="bg-ink-deep p-8 text-[#faf6f3] md:p-12" data-reveal>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-[#b8912e]">
                {eyebrow}
              </p>
              <Heading className="font-display text-3xl leading-tight md:text-[2.6rem]">
                {title}
              </Heading>
              <div className="mt-6 space-y-5 text-[15px] font-light leading-relaxed text-[#faf6f3]/80">
                <p>{p1}</p>
                <p>{p2}</p>
              </div>

              <Link
                to={isAr ? '/ar/makroudh-kairouan' : '/makroudh-kairouan'}
                className="arrow-link mt-6 inline-flex text-sm text-[#faf6f3]/85 hover:text-[#b8912e]"
              >
                {isAr ? 'لماذا القيروان هي مرجع المقروض' : 'Pourquoi Kairouan est la référence du makroudh'}
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
                  <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </Link>

              <p
                className="mt-7 text-left font-display text-2xl leading-none text-[#b8912e]/90"
                lang="ar"
                dir="rtl"
              >
                عند لعزيز
              </p>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[#faf6f3]/15 pt-8 text-center">
                {(isAr
                  ? [
                      ['100%', 'صناعة يدوية'],
                      ['5.0', 'تقييم غوغل'],
                      ['كل يوم', 'مفتوح'],
                    ]
                  : [
                      ['100%', 'Fait main'],
                      ['5,0', 'Note Google'],
                      ['7j/7', 'Ouvert'],
                    ]
                ).map(([n, label]) => (
                  <div key={label}>
                    <div className="font-display text-3xl text-[#b8912e] md:text-4xl">{n}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#faf6f3]/60">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Ornament className="mt-20 md:mt-28" />
    </section>
  )
}
