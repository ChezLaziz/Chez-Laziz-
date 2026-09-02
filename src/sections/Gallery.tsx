import Ornament from '../components/Ornament'

const PHOTOS = [
  { src: '/images/display.jpg', alt: 'Pyramides de makroudh dorés dans la vitrine de la boutique' },
  { src: '/images/makroudh.jpg', alt: 'Makroudh aux dattes saupoudré de sucre, servi avec du thé à la menthe' },
  { src: '/images/hands.jpg', alt: 'Façonnage à la main du makroudh dans l’atelier' },
  { src: '/images/tea.jpg', alt: 'Thé à la menthe versé de haut, le compagnon du makroudh' },
]

export default function Gallery() {
  return (
    <section id="galerie" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <p data-reveal className="mb-5 text-center text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          La Boutique
        </p>
        <h2 data-reveal className="font-display mx-auto max-w-2xl text-center text-4xl leading-tight md:text-5xl">
          La semoule, les dattes, le miel
        </h2>

        {/* Grille uniforme — même ratio, même alignement pour chaque photo */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {PHOTOS.map((p) => (
            <div key={p.src} data-reveal className="mask-reveal aspect-[4/5]">
              <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        <blockquote data-reveal className="mx-auto mt-14 max-w-xl text-center">
          <p className="font-display text-2xl leading-snug text-ink md:text-[1.7rem]">
            « Fait avec amour, au goût traditionnel qui ne change jamais. »
          </p>
          <cite className="mt-3 block text-xs uppercase not-italic tracking-[0.22em] text-muted-warm">
            Chez Laziz — عند لعزيز
          </cite>
        </blockquote>
      </div>
      <Ornament className="mt-20 md:mt-28" />
    </section>
  )
}
