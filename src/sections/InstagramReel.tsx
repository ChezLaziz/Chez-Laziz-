import { useEffect, useRef, useState } from 'react'

const REEL_URL = 'https://www.instagram.com/chezlaziz'

export default function InstagramReel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  // Only attach the real video source once the section is actually visible —
  // keeps this heavy asset out of the initial page load entirely.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (inView && videoRef.current) {
      videoRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    }
  }, [inView])

  return (
    <section className="bg-ink-deep py-20 md:py-28" ref={wrapRef}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-5 md:flex-row md:gap-20 md:px-10">
        {/* Phone-frame video */}
        <div className="relative mx-auto w-[240px] shrink-0 md:w-[300px]">
          <div className="relative overflow-hidden rounded-[2.2rem] border-[6px] border-[#faf6f3]/15 bg-black shadow-2xl">
            <div className="aspect-[9/16] w-full">
              {inView ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  poster="/images/reel-poster.webp"
                  muted={muted}
                  loop
                  playsInline
                  preload="none"
                  onClick={(e) => {
                    const v = e.currentTarget
                    if (v.paused) {
                      v.play()
                      setPlaying(true)
                    } else {
                      v.pause()
                      setPlaying(false)
                    }
                  }}
                >
                  <source src="/video/reel.mp4" type="video/mp4" />
                </video>
              ) : (
                <img
                  src="/images/reel-poster.webp"
                  alt="Aperçu de notre dernière vidéo Instagram — Chez Laziz"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            {/* Play/pause hint */}
            {inView && !playing && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#2e2a27">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
            {/* Mute / unmute toggle */}
            {inView && (
              <button
                type="button"
                aria-label={muted ? 'Activer le son' : 'Couper le son'}
                onClick={(e) => {
                  e.stopPropagation()
                  setMuted((m) => !m)
                }}
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" strokeLinejoin="round" />
                    <path d="M23 9l-6 6M17 9l6 6" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" strokeLinejoin="round" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
          {/* Instagram badge */}
          <a
            href={REEL_URL}
            target="_blank"
            rel="noreferrer"
            className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#faf6f3] px-4 py-2 text-xs font-semibold text-ink shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8912e" strokeWidth="2">
              <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.6" cy="6.4" r="1.1" fill="#b8912e" stroke="none" />
            </svg>
            @chezlaziz
          </a>
        </div>

        {/* Text */}
        <div className="text-center md:text-left">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            Vu sur Instagram
          </p>
          <h2 className="font-display text-3xl leading-tight text-[#faf6f3] md:text-5xl">
            Le makroudh goût fraise,
            <br />
            en direct de notre atelier.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] font-light leading-relaxed text-[#faf6f3]/70 md:mx-0">
            Une nouveauté façonnée à la main comme toujours, dévoilée pour la
            première fois à Kairouan. Suivez-nous pour ne rien manquer.
          </p>
          <a
            href={REEL_URL}
            target="_blank"
            rel="noreferrer"
            className="arrow-link !text-[#faf6f3] mt-8 inline-flex"
          >
            Voir sur Instagram
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}

