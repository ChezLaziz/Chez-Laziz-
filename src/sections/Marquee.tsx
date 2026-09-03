const ITEMS = [
  'Miel doré',
  'Pâte de dattes fondante',
  'Semoule dorée à l’huile d’olive',
  'Façonné à la main',
  'Croustillant dehors, fondant dedans',
  'Recette de Kairouan',
  'Frais chaque jour',
  'Sans additif',
]

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS]
  return (
    <div
      className="overflow-hidden border-y border-[#8f6f22]/30 bg-gradient-to-r from-[#8f6f22] via-[#b8912e] to-[#8f6f22] py-4"
      aria-hidden="true"
    >
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center">
                <span className="font-display whitespace-nowrap px-6 text-lg italic tracking-wide text-[#faf6f3] md:text-xl">
                  {item}
                </span>
                {/* Goutte de miel — écho discret au sirop qui donne au makroudh son brillant. */}
                <svg width="9" height="12" viewBox="0 0 10 13" aria-hidden="true">
                  <path
                    d="M5 0.5c1.8 2.6 3.5 4.9 3.5 7 0 2.1-1.6 4-3.5 4S1.5 9.6 1.5 7.5c0-2.1 1.7-4.4 3.5-7Z"
                    fill="#f5ece5"
                  />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
