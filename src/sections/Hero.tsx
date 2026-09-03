import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'

function StaggerWord({ word, base }: { word: string; base: number }) {
  return (
    <span className="hero-line" aria-hidden="true">
      {word.split('').map((c, i) => (
        <span key={i} className="hero-char" style={{ transitionDelay: `${base + i * 38}ms` }}>
          {c}
        </span>
      ))}
    </span>
  )
}

const DEFAULT_EYEBROW = 'Pâtisserie artisanale — Kairouan'
const DEFAULT_TITLE = 'CHEZ LAZIZ'
const DEFAULT_SUBTITLE_AR = 'عند لعزيز — مقروض قيرواني أصيل'
const DEFAULT_SUBTITLE_FR =
  'L’art du makroudh kairouanais authentique — fait main chaque jour, au goût traditionnel qui ne change jamais.'

export default function Hero() {
  const [on, setOn] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const { data } = trpc.content.pages.useQuery()

  const eyebrow = data?.homeEyebrow || DEFAULT_EYEBROW
  const title = data?.homeTitle || DEFAULT_TITLE
  const subtitleAr = data?.homeSubtitleAr || DEFAULT_SUBTITLE_AR
  const subtitleFr = data?.homeSubtitleFr || DEFAULT_SUBTITLE_FR

  // Délai d'apparition de chaque mot : cumul des lettres des mots précédents
  // (calculé sans variable mutée pendant le rendu).
  const words = title.split(' ').filter(Boolean)
  const bases = words.reduce<number[]>((acc, _w, i) => {
    acc.push(i === 0 ? 250 : acc[i - 1] + words[i - 1].length * 38 + 60)
    return acc
  }, [])
  const titleWords = words.map((word, i) => (
    <span key={i}>
      {i > 0 && <span className="inline-block w-[0.35em]" />}
      <StaggerWord word={word} base={bases[i]} />
    </span>
  ))

  // entrance
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // scroll parallax on the hero photograph
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (imgRef.current) {
          const y = Math.min(window.scrollY, window.innerHeight)
          imgRef.current.style.transform = `translateY(${y * 0.28}px) scale(1.12)`
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="accueil" className="relative h-svh min-h-[620px] overflow-hidden bg-ink-deep">
      {/* Photograph with load-settle + scroll parallax */}
      <img
        ref={imgRef}
        src="/images/hero.webp"
        srcSet="/images/hero-mobile.webp 960w, /images/hero.webp 2048w"
        sizes="100vw"
        alt="Makroudh de Kairouan dorés au miel, dressés sur un plateau de cuivre"
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
        style={{
          transform: 'scale(1.12)',
          opacity: on ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#2e2a27]/70 via-[#2e2a27]/25 to-[#2e2a27]/80" />
      {/* Vignette centrée : assombrit surtout la zone du texte, sans écraser
          la photo sur les bords — la lisibilité vient de là où on regarde. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(20,17,14,0.68) 0%, rgba(20,17,14,0.22) 60%, transparent 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p
          className="mb-6 flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.35em] text-[#faf6f3]/85 md:text-xs"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 2px 10px rgba(0,0,0,0.45)',
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 0.15s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s',
          }}
        >
          <span className="hidden h-px w-10 bg-[#dec9b8] md:inline-block" />
          {eyebrow}
          <span className="hidden h-px w-10 bg-[#dec9b8] md:inline-block" />
        </p>

        <h1
          className={`font-display leading-[0.95] text-[#faf6f3] ${on ? 'hero-title-on' : ''}`}
          aria-label={title}
          style={{
            fontSize: 'clamp(3.4rem, 13vw, 11rem)',
            letterSpacing: '0.02em',
            textShadow:
              '0 1px 2px rgba(0,0,0,0.85), 0 4px 14px rgba(0,0,0,0.6), 0 2px 40px rgba(0,0,0,0.4)',
          }}
        >
          {titleWords}
        </h1>

        <p
          dir="rtl"
          className="mt-4 text-2xl text-[#dec9b8] md:text-3xl"
          style={{
            fontFamily: "'Marcellus', 'Traditional Arabic', serif",
            textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)',
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 0.75s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.75s',
          }}
        >
          {subtitleAr}
        </p>

        <p
          className="mt-5 max-w-xl text-base font-light leading-relaxed text-[#faf6f3]/85 md:text-lg"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 3px 12px rgba(0,0,0,0.45)',
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 0.95s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.95s',
          }}
        >
          {subtitleFr}
        </p>

        <div
          className="mt-10 flex flex-col items-center gap-5 sm:flex-row"
          style={{
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 1.15s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 1.15s',
          }}
        >
          <Link
            to="/collection"
            className="gold-cta rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
          >
            Découvrir la collection
          </Link>
          <Link to="/commande" className="arrow-link !text-[#faf6f3]">
            Commander en ligne
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom info bar — les 4 réponses qu'un visiteur cherche en 5 secondes :
          c'est ouvert ?, ça livre ?, c'est sérieux ?, comment joindre ? */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 border-t border-[#faf6f3]/15"
        style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease 1.4s' }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4 text-[11px] uppercase tracking-[0.22em] text-[#faf6f3]/70 md:justify-between md:px-10">
          <span className="hidden sm:inline">Ouvert 7j/7 · 07h00 — 00h00</span>
          <span className="flex items-center gap-2 text-[#faf6f3]/85">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8912e" strokeWidth="2" aria-hidden="true">
              <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" strokeLinejoin="round" />
              <circle cx="7" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" />
            </svg>
            Livraison toute la Tunisie · 24h
          </span>
          <span className="hidden items-center gap-2 sm:flex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#b8912e" aria-hidden="true">
              <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
            </svg>
            5,0 sur Google
          </span>
          <a href="tel:+21623691039" className="hover:text-[#faf6f3]">+216 23 691 039</a>
        </div>
      </div>
    </section>
  )
}
