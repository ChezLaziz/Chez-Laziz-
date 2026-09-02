import Ornament from '../components/Ornament'

export default function Story() {
  return (
    <section id="maison" className="relative overflow-hidden py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          {/* Photography — offset, mask reveal */}
          <div className="lg:col-span-7">
            <div className="mask-reveal aspect-[2/3] max-h-[760px] w-full lg:w-[92%]">
              <img
                src="/images/hands.jpg"
                alt="Façonnage à la main du makroudh : semoule, pâte de dattes et moule en bois sculpté"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Dark editorial panel overlapping the photograph */}
          <div className="relative z-10 lg:col-span-5 lg:-ml-24 lg:mt-32">
            <div className="bg-ink-deep p-8 text-[#faf6f3] md:p-12" data-reveal>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-[#b8912e]">
                La Maison
              </p>
              <h2 className="font-display text-3xl leading-tight md:text-[2.6rem]">
                L’art du makroudh kairouanais authentique
              </h2>
              <div className="mt-6 space-y-5 text-[15px] font-light leading-relaxed text-[#faf6f3]/80">
                <p>
                  Enraciné dans l’héritage intemporel de Kairouan, notre
                  makroudh est une célébration du savoir-faire tunisien,
                  raffiné pour les palais d’aujourd’hui.
                </p>
                <p>
                  Chaque losange est façonné à la main avec des ingrédients
                  soigneusement choisis : semoule dorée, pâte de dattes
                  fondante, miel — et un goût traditionnel qui ne change
                  jamais.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-[#faf6f3]/15 pt-8 text-center">
                {[
                  ['100%', 'Fait main'],
                  ['5,0', 'Note Google'],
                  ['7j/7', 'Ouvert'],
                ].map(([n, label]) => (
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
