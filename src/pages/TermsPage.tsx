import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO } from '../hooks/useSEO'

export default function TermsPage() {
  useSEO({
    title: 'Conditions générales — Chez Laziz',
    description: 'Conditions générales de vente de Chez Laziz — Kairouan, Tunisie.',
    path: '/conditions-generales',
    breadcrumb: 'Conditions générales',
  })
  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Chez Laziz
        </p>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Conditions générales
        </h1>
        <p className="mt-4 text-sm text-ink/50">Dernière mise à jour : septembre 2026</p>

        <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Notre activité</h2>
            <p>
              Chez Laziz (عند لعزيز) est une pâtisserie artisanale spécialisée dans le
              makroudh kairouanais, basée à Kairouan, Tunisie. Boutique ouverte 7j/7
              de 07h00 à 00h00.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Commandes</h2>
            <p>
              Une commande passée via ce site (page « Commander ») ou par téléphone /
              Messenger est une demande de réservation. Elle est confirmée par notre
              équipe par téléphone ou Messenger avant préparation. Les prix affichés
              sont en dinars tunisiens (TND) et peuvent évoluer sans préavis selon la
              saison et la disponibilité des ingrédients.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Paiement</h2>
            <p>
              Deux moyens de paiement : en espèces à la livraison, ou par virement D17
              (une capture d'écran du paiement est alors obligatoire et vérifiée par
              notre équipe avant confirmation). Aucune carte bancaire n'est demandée
              ou traitée sur ce site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Livraison et retrait</h2>
            <p>
              Nos produits sont préparés le jour même. Les commandes passées via ce
              site sont livrées à domicile partout en Tunisie sous 24h (8.000 TND de
              frais de livraison, voir la page{' '}
              <Link to="/livraison" className="text-accent underline underline-offset-2">Livraison</Link>). Vous pouvez aussi passer
              directement à la boutique de Kairouan, ouverte 7j/7 de 07h00 à minuit,
              sans frais de livraison.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Annulation</h2>
            <p>
              Vous pouvez annuler ou modifier une commande en nous contactant
              directement par téléphone avant sa préparation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Contact</h2>
            <p>
              Pour toute question relative à ces conditions, contactez-nous au{' '}
              <a href="tel:+21623691039" className="text-accent underline underline-offset-2">+216 23 691 039</a>{' '}
              ou par email à{' '}
              <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2">contact@chezlaziz.com</a>.
            </p>
          </section>
        </div>

        <Link to="/" className="arrow-link mt-14 inline-flex">
          Retour à l'accueil
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
            <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
      </main>
      <Footer />
    </div>
  )
}
