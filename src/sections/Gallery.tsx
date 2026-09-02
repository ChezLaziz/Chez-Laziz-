import Ornament from '../components/Ornament'

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

        {/* Asymmetric editorial grid with offset rhythm */}
        <div className="mt-16 grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="mask-reveal aspect-[2/3] md:col-span-5">
            <img
              src="/images/display.jpg"
              alt="Pyramides de makroudh dorés dans la vitrine de la boutique"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="md:col-span-7 md:pt-24">
            <div className="mask-reveal aspect-[3/2]">
              <img
                src="/images/makroudh.jpg"
                alt="Makroudh aux dattes saupoudré de sucre, servi avec du thé à la menthe"
                className="h-full w-full object-cover"
              />
            </div>
            <blockquote data-reveal className="mt-10 max-w-md md:ml-auto md:text-right">
              <p className="font-display text-2xl leading-snug text-ink md:text-[1.7rem]">
                « Fait avec amour, au goût traditionnel qui ne change jamais. »
              </p>
              <cite className="mt-3 block text-xs uppercase not-italic tracking-[0.22em] text-muted-warm">
                Chez Laziz — عند لعزيز
              </cite>
            </blockquote>
          </div>
          <div className="mask-reveal aspect-[2/3] md:col-span-7">
            <img
              src="/images/hands.jpg"
              alt="Façonnage à la main du makroudh dans l’atelier"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="md:col-span-5 md:-mt-16">
            <div className="mask-reveal aspect-square">
              <img
                src="/images/tea.jpg"
                alt="Thé à la menthe versé de haut, le compagnon du makroudh"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
      <Ornament className="mt-20 md:mt-28" />
    </section>
  )
}
