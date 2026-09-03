import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'

export default function CommentEstPreparePage() {
  useReveal()
  useSEO({
    title: 'Comment est préparé le véritable makroudh tunisien ? — Journal Chez Laziz',
    description:
      'De la pâte de semoule au bain de miel, les étapes de fabrication du makroudh — et ce qui distingue un makroudh fait main.',
    path: '/journal/comment-est-prepare-le-makroudh',
    breadcrumb: 'Comment est préparé le makroudh ?',
    article: { datePublished: '2026-09-03' },
  })

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">Le Journal</p>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            Comment est préparé le véritable makroudh tunisien ?
          </h1>

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              La préparation du makroudh traditionnel suit plusieurs étapes précises, où chaque geste compte pour
              obtenir la texture et le goût caractéristiques de cette pâtisserie.
            </p>
            <h2 className="font-display text-xl text-ink">1. La pâte de semoule</h2>
            <p>
              Tout commence par une pâte de semoule fine, pétrie avec de l'huile d'olive. Ce mélange, sans levure,
              donne au makroudh sa texture friable une fois frit — bien différente d'une pâte à pain ou à gâteau
              classique.
            </p>
            <h2 className="font-display text-xl text-ink">2. La garniture de dattes</h2>
            <p>
              La pâte de dattes, préparée à partir de dattes dénoyautées et travaillées jusqu'à obtenir une
              consistance homogène, est ensuite déposée au centre d'un boudin de pâte de semoule, qui est refermé
              autour d'elle.
            </p>
            <h2 className="font-display text-xl text-ink">3. Le façonnage au moule</h2>
            <p>
              Le boudin garni est pressé dans un moule en bois sculpté, le tabaâ, qui imprime son motif strié sur
              la pâte avant la découpe en losanges. C'est ce moule, transmis dans les familles et les ateliers
              artisanaux, qui donne au makroudh son apparence traditionnelle.
            </p>
            <h2 className="font-display text-xl text-ink">4. La friture et le bain de miel</h2>
            <p>
              Les losanges sont ensuite frits jusqu'à obtenir une couleur dorée, puis plongés — encore chauds —
              dans un sirop de miel. Cette dernière étape est essentielle : c'est elle qui donne au makroudh son
              brillant, sa légère humidité et sa conservation.
            </p>
            <h2 className="font-display text-xl text-ink">Ce qui distingue un makroudh fait main</h2>
            <p>
              Un makroudh préparé à la main, en petite quantité, permet un dosage plus juste de la pâte de dattes
              et un façonnage plus régulier au moule en bois — deux détails qui se remarquent immédiatement au
              goût et à la texture, par rapport à une production entièrement industrielle.
            </p>
          </div>

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">C'est exactement ainsi que nous le préparons, chaque jour</p>
            <Link to="/makroudh-aux-dattes" className="arrow-link mt-4 inline-flex justify-center">
              Découvrir notre makroudh aux dattes
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
