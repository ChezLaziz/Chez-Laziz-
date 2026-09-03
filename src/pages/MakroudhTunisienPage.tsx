import { Link } from 'react-router'
import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import Ornament from '../components/Ornament'

export default function MakroudhTunisienPage() {
  useReveal()
  useSEO({
    title: 'Makroudh Tunisien Authentique — Chez Laziz | Kairouan',
    description:
      'Le makroudh tunisien traditionnel — semoule dorée, pâte de dattes et miel — façonné à la main chaque jour par Chez Laziz, à Kairouan. Découvrez notre makroudh et commandez en ligne.',
    path: '/makroudh-tunisien',
    breadcrumb: 'Makroudh Tunisien',
  })

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <section className="mx-auto max-w-3xl px-5 py-24 md:px-10 md:py-32">
          <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            Tradition & Savoir-Faire
          </p>
          <h1 data-reveal className="font-display text-4xl leading-tight md:text-6xl">
            Makroudh Tunisien — Tradition & Savoir-Faire
          </h1>

          <div data-reveal className="mt-10 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
            <p>
              Le <strong className="font-medium text-ink">makroudh tunisien</strong> est l'une des pâtisseries
              les plus emblématiques de Tunisie : un losange de semoule fine, garni de pâte de dattes, frit puis
              trempé dans un sirop de miel encore tiède. C'est une douceur incontournable des tables tunisiennes —
              présente aux fêtes, aux mariages, à l'Aïd, et tout simplement au quotidien avec un thé à la menthe.
            </p>
            <p>
              Sa recette varie selon les régions et les familles, mais le principe reste le même depuis des
              générations : une pâte de semoule pétrie à l'huile d'olive, une garniture de dattes fondante, et
              un façonnage à la main dans un moule en bois sculpté qui donne au makroudh son motif strié
              caractéristique.
            </p>
          </div>

          <div
            data-reveal
            dir="rtl"
            lang="ar"
            className="mt-10 rounded-2xl border border-sand/70 bg-white p-6 text-right text-[15px] font-light leading-relaxed text-ink/75 md:p-8"
          >
            <p>
              المقروض التونسي من أشهر الحلويات التقليدية في تونس — عجينة سميد ذهبية محشوة بعجينة التمر، تُقلى
              ثم تُغمس في شراب العسل. حاضر في كل المناسبات: الأعياد، الأعراس، وحتى في الحياة اليومية مع كأس
              أتاي بالنعناع.
            </p>
          </div>

          <div data-reveal className="mt-14">
            <Ornament />
          </div>

          <div data-reveal className="mt-14">
            <h2 className="font-display text-2xl leading-tight md:text-3xl">Le makroudh tunisien selon Chez Laziz</h2>
            <div className="mt-5 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
              <p>
                Chez Laziz (عند لعزيز), à Kairouan, nous façonnons notre makroudh à la main chaque jour, avec de
                la semoule fine, de la pâte de dattes et du miel — sans raccourci industriel. Chaque pièce passe
                par le même moule en bois sculpté, la même friture, le même bain de miel que la tradition
                kairouanaise l'a toujours voulu.
              </p>
              <p>
                Notre boutique est ouverte 7j/7 de 07h00 à 00h00 à Kairouan. Vous pouvez découvrir l'ensemble de
                notre gamme — classiques, signatures et nouveautés — sur la page{' '}
                <Link to="/collection" className="text-accent underline underline-offset-2">
                  Collection
                </Link>
                , ou composer directement votre{' '}
                <Link to="/commande" className="text-accent underline underline-offset-2">
                  commande en ligne
                </Link>
                .
              </p>
            </div>
          </div>

          <div data-reveal className="mt-14 rounded-2xl bg-ink-deep p-8 text-center text-[#faf6f3] md:p-12">
            <p className="font-display text-2xl md:text-3xl">Envie de goûter le vrai makroudh de Kairouan&nbsp;?</p>
            <Link
              to="/commande"
              className="gold-cta mt-6 inline-flex rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
            >
              Commander maintenant
            </Link>
          </div>

          <p data-reveal className="mt-10 text-xs uppercase tracking-[0.2em] text-ink/40">
            À lire aussi :{' '}
            <Link to="/makroudh-kairouan" className="text-accent hover:underline">Makroudh de Kairouan</Link>
            {' · '}
            <Link to="/makroudh-aux-dattes" className="text-accent hover:underline">Makroudh aux dattes</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
