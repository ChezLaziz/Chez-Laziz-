import { Link } from 'react-router'
import { useReveal } from '../../hooks/useReveal'
import { useSEO } from '../../hooks/useSEO'
import Header from '../../sections/Header'
import Footer from '../../sections/Footer'

export default function MakroudhKairouanHistoirePage() {
  useReveal()
  useSEO({
    title: 'Makroudh de Kairouan : histoire, tradition et savoir-faire — Journal Chez Laziz',
    description:
      'Pourquoi Kairouan est associée au makroudh dans tout le pays, et comment cette réputation continue de se transmettre aujourd\'hui.',
    path: '/journal/makroudh-kairouan-histoire-tradition',
    breadcrumb: 'Makroudh de Kairouan : histoire et tradition',
    article: { datePublished: '2026-09-03' },
  })

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <article className="mx-auto max-w-2xl px-5 py-24 md:px-10 md:py-32">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">Le Journal</p>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            Makroudh de Kairouan : histoire, tradition et savoir-faire
          </h1>

          <div className="mt-10 space-y-6 text-[15px] font-light leading-relaxed text-ink/80">
            <p>
              Kairouan est l'une des plus anciennes villes de Tunisie, connue pour son patrimoine historique et
              religieux — mais aussi, dans la culture populaire tunisienne, pour son savoir-faire pâtissier.
              Le nom de la ville est aujourd'hui spontanément associé au makroudh par de nombreux Tunisiens, au
              point que l'on parle souvent de « makroudh kairouanais » comme d'une référence de qualité.
            </p>
            <h2 className="font-display text-xl text-ink">Une réputation qui se transmet</h2>
            <p>
              Cette réputation ne vient pas d'une seule boutique ou d'une seule famille, mais d'une tradition
              pâtissière locale, transmise de génération en génération à Kairouan : le choix de la semoule, le
              dosage de la pâte de dattes, le façonnage au moule en bois, et le bain de miel final. Ce sont ces
              détails, répétés avec constance, qui font la différence entre un makroudh ordinaire et un makroudh
              kairouanais authentique.
            </p>
            <h2 className="font-display text-xl text-ink">Chez Laziz, à Kairouan même</h2>
            <p>
              Chez Laziz n'importe pas cette tradition : notre boutique est installée à Kairouan, et c'est là que
              nous façonnons notre makroudh chaque jour, à la main, avec les mêmes gestes que la ville a toujours
              connus — de la semoule dorée à la pâte de dattes, jusqu'au bain de miel final.
            </p>
            <p>
              C'est aussi pour cela que nous tenons à rester une boutique artisanale : préparer localement, en
              petites quantités, plutôt que d'industrialiser une recette qui doit justement sa qualité à
              l'attention portée à chaque pièce.
            </p>
          </div>

          <div className="mt-14 rounded-2xl border border-sand/70 bg-white p-8 text-center">
            <p className="font-display text-xl text-ink">Notre boutique vous attend à Kairouan</p>
            <Link to="/contact" className="arrow-link mt-4 inline-flex justify-center">
              Voir l'adresse et les horaires
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
