import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useLang } from '@/lib/i18n'

/** Un mot du titre, animé lettre par lettre en latin. En arabe, le mot
 * entier est UNE seule unité : couper « عند » en trois <span> casse la
 * liaison des lettres — chacune s'affiche sous sa forme isolée, et le mot
 * devient illisible. */
function StaggerWord({ word, base, whole }: { word: string; base: number; whole: boolean }) {
  const parts = whole ? [word] : word.split('')
  return (
    <span className="hero-line" aria-hidden="true">
      {parts.map((c, i) => (
        <span key={i} className="hero-char" style={{ transitionDelay: `${base + i * 38}ms` }}>
          {c}
        </span>
      ))}
    </span>
  )
}

const DEFAULT_EYEBROW = 'Pâtisserie artisanale — Kairouan'
const DEFAULT_EYEBROW_AR = 'حرفة صناعة الحلويات — القيروان'
const DEFAULT_TITLE = 'CHEZ LAZIZ'
const DEFAULT_TITLE_AR = 'عند لعزيز'
const DEFAULT_SUBTITLE_AR = 'عند لعزيز — مقروض قيرواني أصيل'
const DEFAULT_SUBTITLE_FR =
  'L’art du makroudh kairouanais authentique — fait main chaque jour, au goût traditionnel qui ne change jamais.'
// Pas encore de champ CMS dédié pour ce paragraphe en arabe (voir
// homeSubtitleAr, qui reste la courte formule décorative) — traduction
// fixe en attendant, cohérent avec le reste de la page d'accueil arabe.
const DESCRIPTION_AR =
  'فن المقروض القيرواني الأصيل — يُصنع يدويًا كل يوم، بنفس الطعم التقليدي الذي لا يتغيّر أبدًا.'

const ARABIC = /[؀-ۿ]/

/* Les trois réponses qu'un client venu d'une publicité cherche avant de
   commander : c'est fait par qui, je paie comment, ça arrive quand. Toutes
   trois sont vraies et déjà écrites ailleurs sur le site — rien d'inventé,
   pas de « 100 % naturel » ni de « qualité garantie » qu'on ne peut pas
   prouver. */
function trustItems(isAr: boolean) {
  return [
    {
      label: isAr ? 'صناعة يدوية كل يوم' : 'Fait main, chaque jour',
      icon: (
        // Le losange du makroudh, motif dans motif : la forme même du produit.
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d4af4f" strokeWidth="1.4" aria-hidden="true">
          <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" strokeLinejoin="round" />
          <path d="M12 7 17 12l-5 5-5-5z" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: isAr ? 'الدفع عند الاستلام' : 'Paiement à la livraison',
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d4af4f" strokeWidth="1.4" aria-hidden="true">
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 9.5h.01M18 14.5h.01" strokeLinecap="round" strokeWidth="2" />
        </svg>
      ),
    },
    {
      label: isAr ? 'توصيل لكل تونس · 24 ساعة' : 'Livraison toute la Tunisie · 24h',
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d4af4f" strokeWidth="1.4" aria-hidden="true">
          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" strokeLinejoin="round" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="18" cy="18" r="1.6" />
        </svg>
      ),
    },
  ]
}

export default function Hero() {
  const [on, setOn] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const { data } = trpc.content.pages.useQuery()
  const lang = useLang()
  const isAr = lang === 'ar'

  const eyebrow = isAr ? data?.homeEyebrowAr || DEFAULT_EYEBROW_AR : data?.homeEyebrow || DEFAULT_EYEBROW
  // En arabe, le titre est le nom arabe de la maison, pas la transcription
  // latine : un visiteur qui a choisi l'arabe lit « عند لعزيز », et le
  // mot-symbole « CHEZ LAZIZ » passe en ligne d'appui pour que la marque
  // reste reconnaissable entre la publicité et la page.
  const title = isAr ? data?.homeTitleAr || DEFAULT_TITLE_AR : data?.homeTitle || DEFAULT_TITLE
  const support = isAr ? data?.homeTitle || DEFAULT_TITLE : data?.homeSubtitleAr || DEFAULT_SUBTITLE_AR
  const description = isAr ? DESCRIPTION_AR : data?.homeSubtitleFr || DEFAULT_SUBTITLE_FR
  const titleIsArabic = ARABIC.test(title)

  // Délai d'apparition de chaque mot : cumul des lettres des mots précédents
  // (calculé sans variable mutée pendant le rendu). Un mot arabe compte pour
  // une seule unité, puisqu'il n'est pas découpé.
  const words = title.split(' ').filter(Boolean)
  const unit = (w: string) => (titleIsArabic ? 1 : w.length)
  const bases = words.reduce<number[]>((acc, _w, i) => {
    acc.push(i === 0 ? 250 : acc[i - 1] + unit(words[i - 1]) * 38 + 60)
    return acc
  }, [])
  const titleWords = words.map((word, i) => (
    <span key={i}>
      {i > 0 && <span className="inline-block w-[0.3em]" />}
      <StaggerWord word={word} base={bases[i]} whole={titleIsArabic} />
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
          imgRef.current.style.transform = `translateY(${y * 0.22}px) scale(1.06)`
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const fadeIn = (delay: number) => ({
    opacity: on ? 1 : 0,
    transform: on ? 'none' : 'translateY(14px)',
    transition: `opacity 0.9s ease ${delay}s, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
  })
  const shadow = { textShadow: '0 1px 2px rgba(0,0,0,0.75), 0 3px 12px rgba(0,0,0,0.45)' }

  return (
    <section id="accueil" className="relative flex min-h-svh flex-col overflow-hidden bg-ink-deep md:min-h-[680px]">
      {/* Sur téléphone, la scène est composée pour le format vertical : le
          haut est calme (fondu de la même photo) pour porter le texte, le
          plateau occupe le bas, sans voile par-dessus — c'est le produit
          qu'on vend, il doit rester doré. L'ordinateur garde le plateau
          large. */}
      <picture>
        <source media="(max-width: 767px)" srcSet="/images/hero-mobile.webp" />
        <img
          ref={imgRef}
          src="/images/hero.webp"
          alt="Makroudh de Kairouan dorés au miel, dressés sur un plateau"
          className="absolute inset-0 h-full w-full object-cover object-bottom md:object-center"
          fetchPriority="high"
          decoding="async"
          style={{
            transform: 'scale(1.06)',
            opacity: on ? 1 : 0,
            transition: 'opacity 1.2s ease',
          }}
        />
      </picture>
      {/* Deux voiles seulement, là où il y a du texte : en haut sous le titre,
          en bas sous la ligne de confiance. Le milieu — le plateau — reste nu. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1f1a16]/70 via-[#1f1a16]/25 via-45% to-transparent to-65%" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#1f1a16]/85 via-[#1f1a16]/45 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-5 pb-40 pt-24 text-center md:justify-center md:pb-36 md:pt-32">
        <p
          className="mb-4 flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#faf6f3]/85 md:mb-6 md:text-xs"
          style={{ ...shadow, ...fadeIn(0.15) }}
        >
          <span className="hidden h-px w-10 bg-[#dec9b8] md:inline-block" />
          {eyebrow}
          <span className="hidden h-px w-10 bg-[#dec9b8] md:inline-block" />
        </p>

        <h1
          dir={titleIsArabic ? 'rtl' : 'ltr'}
          className={`font-display text-[#faf6f3] ${titleIsArabic ? 'leading-[1.2]' : 'leading-[0.95]'} ${on ? 'hero-title-on' : ''}`}
          aria-label={title}
          style={{
            fontSize: titleIsArabic ? 'clamp(3.6rem, 15vw, 9rem)' : 'clamp(3.2rem, 12vw, 10rem)',
            letterSpacing: titleIsArabic ? 0 : '0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 4px 14px rgba(0,0,0,0.6), 0 2px 40px rgba(0,0,0,0.4)',
          }}
        >
          {titleWords}
        </h1>

        <p
          dir={ARABIC.test(support) ? 'rtl' : 'ltr'}
          className={`font-display text-[#e6cf8a] ${
            ARABIC.test(support) ? 'mt-3 text-2xl md:text-3xl' : 'mt-2 text-base tracking-[0.3em] md:text-lg'
          }`}
          style={{ ...shadow, ...fadeIn(0.75) }}
        >
          {support}
        </p>

        <p
          className="mt-4 max-w-md text-[15px] font-light leading-relaxed text-[#faf6f3]/90 md:mt-5 md:max-w-xl md:text-lg"
          style={{ ...shadow, ...fadeIn(0.95) }}
        >
          {description}
        </p>

        {/* Le bouton doré mène là où se passe la vente — la page de commande,
            qui montre déjà toute la gamme. La collection est le second
            chemin, pour qui veut d'abord regarder. */}
        <div className="mt-7 flex w-full max-w-xs flex-col items-center gap-3 md:mt-10 md:max-w-none md:flex-row md:justify-center md:gap-6" style={fadeIn(1.15)}>
          <Link
            to={isAr ? '/ar/commande' : '/commande'}
            className="gold-cta flex min-h-12 w-full items-center justify-center gap-3 rounded-full px-8 text-sm font-semibold tracking-[0.06em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:w-auto md:text-xs md:uppercase md:tracking-[0.16em]"
          >
            {isAr ? 'اطلب الآن' : 'Commander maintenant'}
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
          <Link to={isAr ? '/ar/collection' : '/collection'} className="arrow-link !text-[#faf6f3]">
            {isAr ? 'اكتشف التشكيلة' : 'Découvrir la collection'}
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
              <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Ligne de confiance : trois faits, puis le téléphone. */}
      <div className="absolute inset-x-0 bottom-0 z-10" style={{ opacity: on ? 1 : 0, transition: 'opacity 1s ease 1.4s' }}>
        <div className="mx-auto max-w-5xl px-4 pb-4 md:px-10">
          <ul className="grid grid-cols-3 gap-2 md:gap-6">
            {trustItems(isAr).map((t) => (
              <li key={t.label} className="flex flex-col items-center gap-2 text-center text-[12px] font-medium leading-snug text-[#faf6f3] md:flex-row md:justify-center md:text-left md:text-[13px]" style={shadow}>
                <span className="shrink-0 md:me-1">{t.icon}</span>
                <span className="max-w-[9rem] md:max-w-none">{t.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-[#faf6f3]/15 pt-2 text-[12px] tracking-[0.12em] text-[#faf6f3]/80 md:mt-4 md:pt-3 md:text-[13px]" style={shadow}>
            <span className="hidden items-center gap-2 md:flex">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#d4af4f" aria-hidden="true">
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
              </svg>
              {isAr ? '5.0 على غوغل' : '5,0 sur Google'}
            </span>
            <span className="hidden md:inline">{isAr ? 'مفتوح طوال الأسبوع · 07:00 — 00:00' : 'Ouvert 7j/7 · 07h00 — 00h00'}</span>
            <a href="tel:+21623691039" dir="ltr" className="tap gap-2 text-[15px] font-medium text-[#faf6f3] md:text-[13px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af4f" strokeWidth="1.6" aria-hidden="true">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
              </svg>
              +216 23 691 039
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
