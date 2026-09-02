const ITEMS = [
  'Makroudh aux dattes',
  'Makroudh Jwayed',
  'Fruits secs',
  'Blanc à la pistache',
  'Goût fraise',
  'Enrobé chocolat',
  'Fait main chaque jour',
  'Recette traditionnelle',
]

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS]
  return (
    <div className="overflow-hidden border-y border-[#8f6f22]/40 bg-[#b8912e] py-4" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center">
                <span className="font-display whitespace-nowrap px-6 text-lg text-[#faf6f3] md:text-xl">
                  {item}
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M5 0 L6.5 3.5 L10 5 L6.5 6.5 L5 10 L3.5 6.5 L0 5 L3.5 3.5 Z" fill="#f5ece5" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
