import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'
import { ARTICLES } from './articles'

export default function BlogIndexPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'المدونة — عند لعزيز | المقروض التونسي بالشرح',
          description: 'التاريخ، التقليد، والحرفة حول المقروض التونسي والقيرواني — مقالات مدونة عند لعزيز.',
          path: '/ar/journal',
          breadcrumb: 'المدونة',
        }
      : {
          title: 'Journal — Chez Laziz | Le makroudh tunisien expliqué',
          description:
            "Histoire, tradition et savoir-faire du makroudh tunisien et kairouanais — les articles du Journal Chez Laziz.",
          path: '/journal',
          breadcrumb: 'Journal',
        },
  )

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <section className="mx-auto max-w-4xl px-5 py-24 md:px-10 md:py-32">
          <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            {isAr ? 'مدونة عند لعزيز' : 'Le Journal Chez Laziz'}
          </p>
          <h1 data-reveal className="font-display text-4xl leading-tight md:text-6xl">
            {isAr ? 'المقروض التونسي، محكي' : 'Le makroudh tunisien, raconté'}
          </h1>
          <p data-reveal className="mt-6 max-w-xl text-[15px] font-light leading-relaxed text-ink/70">
            {isAr
              ? 'تاريخ، تقليد وحرفة حول المقروض — باش نتعرفو أكثر على اللي نشكّلوه كل يوم في القيروان.'
              : 'Histoire, tradition et savoir-faire autour du makroudh — pour mieux connaître ce que nous façonnons chaque jour à Kairouan.'}
          </p>

          <div className="mt-14 space-y-6">
            {ARTICLES.map((a) => (
              <Link
                key={a.slug}
                to={isAr ? `/ar/journal/${a.slug}` : `/journal/${a.slug}`}
                data-reveal
                className="block rounded-2xl border border-sand/70 bg-white p-6 transition-colors hover:border-[#b8912e] md:p-8"
              >
                <h2 className="font-display text-2xl leading-snug text-ink md:text-3xl">
                  {isAr ? a.titleAr : a.title}
                </h2>
                <p className="mt-3 text-[15px] font-light leading-relaxed text-ink/65">
                  {isAr ? a.excerptAr : a.excerpt}
                </p>
                <span className="arrow-link mt-4 inline-flex text-sm">
                  {isAr ? 'اقرأ المقال' : "Lire l'article"}
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
                    <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
