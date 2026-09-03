import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'

export default function QuestCeQueLeMakroudhPage() {
  useReveal()
  useSEO({
    title: 'Qu\'est-ce que le makroudh tunisien ? — Journal Chez Laziz',
    description:
      "Origines, ingrédients et place du makroudh dans la pâtisserie tunisienne — une présentation complète pour qui découvre cette douceur.",
    path: '/journal/quest-ce-que-le-makroudh-tunisien',
    breadcrumb: 'Qu\'est-ce que le makroudh tunisien ?',
    article: { datePublished: '2026-09-03' },
  })

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">Le Journal</p>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            Qu'est-ce que le makroudh tunisien ?
          </h1>

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Le makroudh est une pâtisserie traditionnelle tunisienne, reconnaissable à sa forme de losange et à
              sa couleur dorée. Il se compose de deux éléments : une pâte de semoule fine, pétrie à l'huile
              d'olive, et une garniture — le plus souvent une pâte de dattes, mais parfois des fruits secs ou de
              la pistache selon les variantes.
            </p>
            <h2 className="font-display text-xl text-ink">Un dessert de tous les jours, et des grandes occasions</h2>
            <p>
              Contrairement à certaines pâtisseries réservées aux fêtes, le makroudh se consomme aussi bien au
              quotidien — avec un café ou un thé à la menthe — que lors des grandes occasions : Aïd, mariages,
              naissances. Il occupe une place particulière dans la culture tunisienne, où offrir une boîte de
              makroudh est un geste d'hospitalité courant.
            </p>
            <h2 className="font-display text-xl text-ink">Semoule, dattes et miel : le trio de base</h2>
            <p>
              La pâte de semoule donne au makroudh sa texture friable et son croustillant après friture. La
              garniture de dattes — la variante la plus répandue — apporte le moelleux et la douceur naturelle,
              sans nécessiter de sucre ajouté. Enfin, le bain de miel, appliqué juste après la friture pendant que
              la pièce est encore chaude, scelle l'ensemble et donne au makroudh son brillant caractéristique.
            </p>
            <h2 className="font-display text-xl text-ink">Une pâtisserie façonnée à la main</h2>
            <p>
              Traditionnellement, le makroudh est façonné dans un moule en bois sculpté qui imprime son motif
              strié sur la pâte avant la découpe en losanges. C'est un geste qui se transmet dans les familles et
              les boutiques artisanales, et qui reste, encore aujourd'hui, difficilement remplaçable par une
              production entièrement mécanisée si l'on veut préserver le rendu traditionnel.
            </p>
          </div>

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Découvrez notre makroudh, façonné à la main à Kairouan</p>
            <Link to="/makroudh-tunisien" className="arrow-link mt-4 inline-flex justify-center">
              En savoir plus sur notre makroudh
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
