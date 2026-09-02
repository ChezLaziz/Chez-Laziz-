import { useEffect, useRef, useState } from 'react'

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

export default function Hero() {
  const [on, setOn] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

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
        src="/images/hero.jpg"
        alt="Makroudh de Kairouan dorés au miel, dressés sur un plateau de cuivre"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: 'scale(1.12)',
          opacity: on ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#2e2a27]/70 via-[#2e2a27]/25 to-[#2e2a27]/80" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p
          className="mb-6 flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.35em] text-[#faf6f3]/85 md:text-xs"
          style={{
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 0.15s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s',
          }}
        >
          <span className="hidden h-px w-10 bg-[#dec9b8] md:inline-block" />
          Pâtisserie artisanale — Kairouan
          <span className="hidden h-px w-10 bg-[#dec9b8] md:inline-block" />
        </p>

        <h1
          className={`font-display leading-[0.95] text-[#faf6f3] ${on ? 'hero-title-on' : ''}`}
          aria-label="Chez Laziz"
          style={{ fontSize: 'clamp(3.4rem, 13vw, 11rem)', letterSpacing: '0.02em' }}
        >
          <StaggerWord word="CHEZ" base={250} />
          <span className="inline-block w-[0.35em]" />
          <StaggerWord word="LAZIZ" base={250 + 4 * 38 + 60} />
        </h1>

        <p
          dir="rtl"
          className="mt-4 text-2xl text-[#dec9b8] md:text-3xl"
          style={{
            fontFamily: "'Marcellus', 'Traditional Arabic', serif",
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 0.75s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.75s',
          }}
        >
          عند لعزيز — مقروض قيرواني أصيل
        </p>

        <p
          className="mt-5 max-w-xl text-base font-light leading-relaxed text-[#faf6f3]/85 md:text-lg"
          style={{
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 0.95s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.95s',
          }}
        >
          L’art du makroudh kairouanais authentique — fait main chaque jour,
          au goût traditionnel qui ne change jamais.
        </p>

        <div
          className="mt-10 flex flex-col items-center gap-5 sm:flex-row"
          style={{
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(14px)',
            transition: 'opacity 0.9s ease 1.15s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 1.15s',
          }}
        >
          <a
            href="#collection"
            className="gold-cta rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
          >
            Découvrir la collection
          </a>
          <a href="#visite" className="arrow-link !text-[#faf6f3]">
            Nous trouver
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </a>
        </div>
      </div>

      {/* Bottom info bar */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 border-t border-[#faf6f3]/15"
        style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease 1.4s' }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-4 text-[11px] uppercase tracking-[0.22em] text-[#faf6f3]/70 sm:flex-row md:px-10">
          <span>Ouvert 7j/7 · 07h00 — 00h00</span>
          <span className="hidden items-center gap-2 sm:flex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#b8912e" aria-hidden="true">
              <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
            </svg>
            5,0 sur Google
          </span>
          <span>+216 23 691 039</span>
        </div>
      </div>
    </section>
  )
}
