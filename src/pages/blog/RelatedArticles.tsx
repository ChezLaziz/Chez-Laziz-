import { Link } from 'react-router'
import { ARTICLES } from './articles'

/** Bloc "à lire aussi" affiché en fin d'article — relie chaque article à
 * 2-3 autres du Journal (le site n'avait jusqu'ici aucun lien interne entre
 * articles, seulement retour vers l'index). */
export default function RelatedArticles({ slugs, isAr }: { slugs: readonly string[]; isAr: boolean }) {
  const items = slugs.map((slug) => ARTICLES.find((a) => a.slug === slug)).filter((a): a is (typeof ARTICLES)[number] => !!a)
  if (items.length === 0) return null

  return (
    <div className="mt-14">
      <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.3em] text-ink/45">
        {isAr ? 'اقرأو أيضًا' : 'À lire aussi'}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((a) => (
          <Link
            key={a.slug}
            to={isAr ? `/ar/journal/${a.slug}` : `/journal/${a.slug}`}
            className="block rounded-xl border border-sand/70 bg-white p-4 text-sm transition-colors hover:border-[#b8912e]"
          >
            <span className="font-display leading-snug text-ink">{isAr ? a.titleAr : a.title}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
