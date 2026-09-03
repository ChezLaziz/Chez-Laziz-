import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO } from '../hooks/useSEO'
import { formatTND, PHONE_DISPLAY, PHONE_TEL, D17_NUMBER_DISPLAY, ALLOWED_WEIGHTS_KG, DELIVERY_FEE_MILLIMES, formatWeight } from '@/lib/shop'

export default function LivraisonPage() {
  useSEO({
    title: 'Livraison — Chez Laziz | Toute la Tunisie sous 24h',
    description:
      'Livraison de makroudh Chez Laziz partout en Tunisie, à domicile, sous 24h — 8.000 TND. Paiement à la livraison ou par D17.',
    path: '/livraison',
    breadcrumb: 'Livraison',
  })
  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Chez Laziz
        </p>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">Livraison</h1>

        <div className="mt-10 grid grid-cols-3 gap-4 rounded-2xl border border-sand/70 bg-white py-6 text-center shadow-sm">
          {[
            ['Toute la Tunisie', 'Zone'],
            [formatTND(DELIVERY_FEE_MILLIMES) + ' TND', 'Frais fixes'],
            ['24h', 'Délai'],
          ].map(([n, label]) => (
            <div key={label}>
              <div className="font-display text-xl text-[#b8912e] md:text-2xl">{n}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink/50 md:text-[11px]">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Où livrons-nous ?</h2>
            <p>
              Partout en Tunisie, dans les 24 gouvernorats. Chaque commande est livrée
              à domicile, porte-à-porte, à l'adresse complète indiquée lors de la
              commande.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Frais et délai</h2>
            <p>
              La livraison coûte {formatTND(DELIVERY_FEE_MILLIMES)} TND, quel que soit
              le nombre de produits commandés, et prend environ 24h à compter de la
              confirmation de votre commande par téléphone.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Poids disponibles</h2>
            <p>
              Chaque makroudh se commande par poids : {ALLOWED_WEIGHTS_KG.map(formatWeight).join(', ')}.
              Le prix affiché sur la collection est le prix pour 1 kg ; le poids se
              choisit sur la page{' '}
              <Link to="/commande" className="text-accent underline underline-offset-2">Commander</Link>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Paiement</h2>
            <p>
              Deux moyens de paiement : en espèces à la livraison, ou par virement D17
              au {D17_NUMBER_DISPLAY} (capture d'écran du paiement à joindre lors de la
              commande, vérifiée par notre équipe).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Confirmation de commande</h2>
            <p>
              Après l'envoi du formulaire de commande, notre équipe vous appelle pour
              confirmer les produits, l'adresse et le moyen de paiement avant
              préparation et expédition.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Retrait en boutique</h2>
            <p>
              Vous pouvez aussi passer directement à la boutique de Kairouan, ouverte
              7j/7 de 07h00 à minuit — aucun frais de livraison dans ce cas.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Contact</h2>
            <p>
              Une question sur votre livraison ? Appelez-nous au{' '}
              <a href={PHONE_TEL} className="text-accent underline underline-offset-2">{PHONE_DISPLAY}</a>.
            </p>
          </section>
        </div>

        <Link to="/commande" className="arrow-link mt-14 inline-flex">
          Passer commande
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
            <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
      </main>
      <Footer />
    </div>
  )
}
