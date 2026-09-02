const MAPS_URL =
  'https://www.google.com/maps/place/Chez+laziz+%D8%A7%D9%84%D9%82%D9%8A%D8%B1%D9%88%D8%A7%D9%86/data=!4m2!3m1!1s0x12fdcf004a648cdf:0xacd6eabb156c7203'

export default function Visit() {
  return (
    <section id="visite" className="bg-ink-deep py-24 text-[#faf6f3] md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-[#bc773f]">
          Nous trouver
        </p>
        <h2 data-reveal className="font-display max-w-3xl text-4xl leading-[1.08] md:text-6xl">
          La boutique vous attend à Kairouan
        </h2>

        <div className="mt-16 grid gap-12 border-t border-[#faf6f3]/15 pt-12 md:grid-cols-3">
          <div data-reveal>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#bc773f]">
              Adresse
            </h3>
            <p className="text-lg font-light leading-relaxed text-[#faf6f3]/85">
              M3MG+VJP
              <br />
              Kairouan, Tunisie
            </p>
            <a href={MAPS_URL} target="_blank" rel="noreferrer" className="arrow-link mt-6">
              Ouvrir dans Google Maps
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </a>
          </div>

          <div data-reveal style={{ transitionDelay: '0.12s' }}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#bc773f]">
              Horaires
            </h3>
            <ul className="space-y-2 text-lg font-light text-[#faf6f3]/85">
              <li className="flex justify-between gap-6">
                <span>Tous les jours</span>
                <span>07h00 – 00h00</span>
              </li>
            </ul>
            <p className="mt-4 text-sm font-light text-[#faf6f3]/55">
              Makroudh façonné et cuit chaque matin — venez tôt pour les
              nouveautés du jour.
            </p>
          </div>

          <div data-reveal style={{ transitionDelay: '0.24s' }}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#bc773f]">
              Contact
            </h3>
            <p className="text-lg font-light leading-relaxed text-[#faf6f3]/85">
              <a href="tel:+21623691039" className="transition-colors hover:text-[#bc773f]">
                +216 23 691 039
              </a>
            </p>
            <p className="mt-2 text-sm font-light text-[#faf6f3]/70">
              <a href="mailto:contact@chezlaziz.com" className="transition-colors hover:text-[#bc773f]">
                contact@chezlaziz.com
              </a>
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <a
                href="https://www.instagram.com/chezlaziz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[#faf6f3]/80 transition-colors hover:text-[#bc773f]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
                </svg>
                @chezlaziz — CHEZ.LAZIZ · عند لعزيز
              </a>
            </div>
            <a href="tel:+21623691039" className="arrow-link mt-6">
              Commander par téléphone
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
                <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
