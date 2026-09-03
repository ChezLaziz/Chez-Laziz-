import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO } from '../hooks/useSEO'
import { PHONE_DISPLAY, PHONE_TEL } from '@/lib/shop'

export default function NotFoundPage() {
  useSEO({
    title: 'Page introuvable — Chez Laziz',
    description: "Cette page n'existe pas ou a été déplacée.",
    path: window.location.pathname,
    noindex: true,
  })

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-32 text-center md:py-44">
        <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">Erreur 404</p>
        <h1 className="font-display text-4xl leading-tight md:text-6xl">Cette page n'existe pas</h1>
        <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-ink/70">
          Le lien est peut-être erroné ou la page a été déplacée. Nos makroudh,
          eux, sont toujours là.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            to="/collection"
            className="gold-cta rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
          >
            Voir la collection
          </Link>
          <Link
            to="/"
            className="rounded-full border border-ink/25 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-[#faf6f3]"
          >
            Retour à l'accueil
          </Link>
        </div>
        <p className="mt-10 text-sm font-light text-ink/50">
          Une question ? <a href={PHONE_TEL} className="text-accent underline underline-offset-2">{PHONE_DISPLAY}</a>
        </p>
      </main>
      <Footer />
    </div>
  )
}
