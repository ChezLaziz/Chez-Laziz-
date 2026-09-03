import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'

// Vignettes dédiées (600px) — la bande défilante n'affiche ces photos qu'à
// 144–288px de large, inutile d'y charger les mêmes fichiers pleine résolution
// utilisés ailleurs sur le site.
const STRIP = [
  '/images/hero-thumb.webp',
  '/images/makroudh-thumb.webp',
  '/images/hands-thumb.webp',
  '/images/display-thumb.webp',
  '/images/tea-thumb.webp',
  '/images/box-thumb.webp',
]

const DEFAULT_TAGLINE =
  "Pâtisserie artisanale — Kairouan, Tunisie. Le makroudh kairouanais authentique, fait main chaque jour."
const DEFAULT_COPYRIGHT = '© 2026 Chez Laziz — عند لعزيز · Kairouan. Tous droits réservés.'

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  Facebook: (
    <path d="M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V2.5h-2.5A4 4 0 0 0 10.5 6.5v2H8V12h2.5v9.5H14V12h2.5l.5-3.5H14Z" fill="currentColor" stroke="none" />
  ),
  TikTok: (
    <path d="M16.5 3c.4 2.2 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4-1.3v6.9a5.5 5.5 0 1 1-5.5-5.5c.3 0 .7 0 1 .1v3.1a2.5 2.5 0 1 0 1.5 2.3V3h3Z" fill="currentColor" stroke="none" />
  ),
}

export default function Footer() {
  const { data } = trpc.content.footer.useQuery()
  const socials = [
    { name: 'Instagram', href: data?.instagram || 'https://www.instagram.com/chezlaziz' },
    { name: 'Facebook', href: data?.facebook || 'https://www.facebook.com/profile.php?id=61573444418563' },
    { name: 'TikTok', href: data?.tiktok || 'https://www.tiktok.com/search?q=chez%20laziz%20kairouan' },
  ]

  return (
    <footer className="bg-ink-deep text-[#faf6f3]">
      {/* Continuous auto-scrolling image strip */}
      <div className="overflow-hidden border-t border-[#faf6f3]/10" aria-hidden="true">
        <div className="marquee-track marquee-slow py-6">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0">
              {STRIP.map((src, i) => (
                <img
                  key={`${half}-${i}`}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="mx-3 h-36 w-56 rounded-sm object-cover opacity-80 transition-opacity duration-300 hover:opacity-100 md:h-44 md:w-72"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#faf6f3]/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-5 py-14 text-center md:px-10">
          <img src="/images/logo.webp" alt="Chez Laziz — عند لعزيز" className="h-24 w-24 md:h-28 md:w-28" loading="lazy" />
          <p className="max-w-md text-sm font-light leading-relaxed text-[#faf6f3]/60">
            {data?.tagline || DEFAULT_TAGLINE}
          </p>

          {/* Social profiles */}
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.name}
                title={s.name}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#faf6f3]/25 text-[#faf6f3]/80 transition-all duration-300 hover:border-[#b8912e] hover:text-[#b8912e]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  {SOCIAL_ICONS[s.name]}
                </svg>
              </a>
            ))}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-[#faf6f3]/70">
            <Link to="/la-maison" className="transition-colors hover:text-[#b8912e]">La Maison</Link>
            <Link to="/collection" className="transition-colors hover:text-[#b8912e]">La Collection</Link>
            <Link to="/galerie" className="transition-colors hover:text-[#b8912e]">Galerie</Link>
            <Link to="/commande" className="transition-colors hover:text-[#b8912e]">Commander</Link>
            <Link to="/contact" className="transition-colors hover:text-[#b8912e]">Nous trouver</Link>
          </nav>
          <div className="h-px w-24 bg-[#b8912e]/60" />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-[#faf6f3]/50">
            <Link to="/makroudh-tunisien" className="transition-colors hover:text-[#b8912e]">Makroudh tunisien</Link>
            <Link to="/makroudh-kairouan" className="transition-colors hover:text-[#b8912e]">Makroudh de Kairouan</Link>
            <Link to="/makroudh-aux-dattes" className="transition-colors hover:text-[#b8912e]">Makroudh aux dattes</Link>
            <Link to="/journal" className="transition-colors hover:text-[#b8912e]">Journal</Link>
            <Link to="/livraison" className="transition-colors hover:text-[#b8912e]">Livraison</Link>
            <Link to="/faq" className="transition-colors hover:text-[#b8912e]">FAQ</Link>
          </nav>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-[#faf6f3]/45">
            <Link to="/politique-de-confidentialite" className="transition-colors hover:text-[#b8912e]">Politique de confidentialité</Link>
            <Link to="/conditions-generales" className="transition-colors hover:text-[#b8912e]">Conditions générales</Link>
          </nav>
          <p className="text-xs font-light text-[#faf6f3]/45">
            {data?.copyright || DEFAULT_COPYRIGHT}
          </p>
        </div>
      </div>
    </footer>
  )
}
