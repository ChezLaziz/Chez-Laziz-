import { Link } from 'react-router'
import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import Ornament from '../components/Ornament'

export default function MakroudhDattesPage() {
  useReveal()
  useSEO({
    title: 'Makroudh aux Dattes — La Recette Tunisienne Traditionnelle | Chez Laziz',
    description:
      'Makroudh aux dattes façonné à la main : semoule dorée, pâte de dattes fondante et miel. Découvrez la recette traditionnelle telle que Chez Laziz la prépare chaque jour à Kairouan.',
    path: '/makroudh-aux-dattes',
    breadcrumb: 'Makroudh aux Dattes',
  })

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Cursor />
      <Header />
      <main className="pt-16 md:pt-20">
        <section className="mx-auto max-w-3xl px-5 py-24 md:px-10 md:py-32">
          <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            La recette traditionnelle
          </p>
          <h1 data-reveal className="font-display text-4xl leading-tight md:text-6xl">
            Makroudh aux Dattes — La Recette Tunisienne Traditionnelle
          </h1>

          <div data-reveal className="mt-10 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
            <p>
              Le <strong className="font-medium text-ink">makroudh aux dattes</strong> est la version la plus
              classique et la plus répandue du makroudh tunisien. Sa garniture est une pâte de dattes fondante,
              enveloppée dans une pâte de semoule fine pétrie à l'huile d'olive, puis façonnée en losanges dans un
              moule en bois sculpté.
            </p>
            <p>
              La Tunisie est l'un des grands pays producteurs de dattes au monde, notamment la variété deglet
              nour — un ingrédient central de la pâtisserie tunisienne depuis toujours. C'est cette richesse qui
              donne au makroudh sa saveur profonde et son moelleux caractéristique, sans excès de sucre ajouté :
              la datte suffit.
            </p>
            <p>
              Après le façonnage, chaque pièce est frite puis plongée, encore chaude, dans un sirop de miel — une
              étape qui scelle le croustillant à l'extérieur et le fondant à l'intérieur.
            </p>
          </div>

          <div
            data-reveal
            dir="rtl"
            lang="ar"
            className="mt-10 rounded-2xl border border-sand/70 bg-white p-6 text-right text-[15px] font-light leading-relaxed text-ink/75 md:p-8"
          >
            <p>
              المقروض بالتمر هو الشكل الأكثر شهرة من المقروض التونسي — عجينة سميد بزيت الزيتون، محشوة بعجينة
              تمر طبيعية، تُقلى ثم تُغمس في العسل. عند لعزيز، نحضّره يدويًا كل يوم بمكونات حقيقية، بدون اختصارات.
            </p>
          </div>

          <div data-reveal className="mt-14">
            <Ornament />
          </div>

          <div data-reveal className="mt-14">
            <h2 className="font-display text-2xl leading-tight md:text-3xl">Notre makroudh aux dattes</h2>
            <div className="mt-5 space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
              <p>
                Chez Laziz, le makroudh aux dattes est notre grand classique — celui que nous préparons en plus
                grande quantité, chaque jour, à Kairouan. Il fait partie de notre catégorie « Les classiques »,
                aux côtés de nos autres créations à base de fruits secs et de pistache.
              </p>
              <p>
                Découvrez l'ensemble de notre{' '}
                <Link to="/collection" className="text-accent underline underline-offset-2">
                  Collection
                </Link>{' '}
                et composez votre{' '}
                <Link to="/commande" className="text-accent underline underline-offset-2">
                  commande en ligne
                </Link>
                , à retirer en boutique.
              </p>
            </div>
          </div>

          <div data-reveal className="mt-14 rounded-2xl bg-ink-deep p-8 text-center text-[#faf6f3] md:p-12">
            <p className="font-display text-2xl md:text-3xl">Le vrai makroudh aux dattes, fait main</p>
            <Link
              to="/commande"
              className="gold-cta mt-6 inline-flex rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
            >
              Commander maintenant
            </Link>
          </div>

          <p data-reveal className="mt-10 text-xs uppercase tracking-[0.2em] text-ink/40">
            À lire aussi :{' '}
            <Link to="/makroudh-tunisien" className="text-accent hover:underline">Makroudh tunisien</Link>
            {' · '}
            <Link to="/makroudh-kairouan" className="text-accent hover:underline">Makroudh de Kairouan</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
