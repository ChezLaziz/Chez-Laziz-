import { Link } from 'react-router'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import { useSEO } from '../hooks/useSEO'
import { analyticsEnabled } from '@/lib/analytics'

export default function PrivacyPage() {
  useSEO({
    title: 'Politique de confidentialité — Chez Laziz',
    description: 'Politique de confidentialité de Chez Laziz — Kairouan, Tunisie.',
    path: '/politique-de-confidentialite',
    breadcrumb: 'Politique de confidentialité',
  })
  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-28 md:px-10 md:py-36">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Chez Laziz
        </p>
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm text-ink/50">Dernière mise à jour : septembre 2026</p>

        <div className="mt-10 space-y-8 text-[15px] font-light leading-relaxed text-ink/80">
          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Qui sommes-nous</h2>
            <p>
              Chez Laziz (عند لعزيز) est une pâtisserie artisanale basée à Kairouan,
              Tunisie. Ce site est utilisé pour présenter nos produits et recevoir des
              demandes de commande ou de contact.
            </p>
            <p className="mt-2">
              Contact : <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2">contact@chezlaziz.com</a> · <a href="tel:+21623691039" className="text-accent underline underline-offset-2">+216 23 691 039</a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Quelles données nous collectons</h2>
            <p>Lorsque vous utilisez le formulaire de commande ou de contact, nous recevons :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Votre nom et numéro de téléphone</li>
              <li>Votre adresse de livraison (gouvernorat, ville, adresse, code postal)</li>
              <li>Le détail de votre commande ou de votre message</li>
              <li>
                Si vous payez par D17 : la capture d'écran du paiement, utilisée
                uniquement pour vérifier la transaction
              </li>
            </ul>
            <p className="mt-2">
              Nous ne demandons ni mot de passe, ni adresse email, ni numéro de carte
              bancaire — aucun paiement en ligne n'est traité sur ce site (paiement en
              espèces ou par virement D17 uniquement).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Comment nous utilisons ces données</h2>
            <p>
              Ces informations servent uniquement à préparer, livrer et confirmer
              votre commande, à vérifier un paiement D17, ou à répondre à votre
              message (par téléphone ou WhatsApp). Elles sont conservées dans notre
              base de données pour le suivi des commandes et ne sont ni vendues, ni
              partagées avec des tiers à des fins commerciales. La capture d'écran
              D17 n'est accessible qu'à notre équipe, jamais publiée ni partagée.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Statistiques de visite</h2>
            {analyticsEnabled ? (
              <p>
                Nous mesurons le nombre de pages vues de deux façons : un compteur
                anonyme sur notre propre serveur, et Google Analytics (adresse IP
                anonymisée) pour comprendre d'où viennent les visiteurs et quelles
                pages ils consultent. Aucune donnée saisie dans les formulaires
                (nom, téléphone, adresse, capture d'écran) n'est transmise à Google —
                seuls les produits consultés ou commandés et les montants le sont.
                Pas de pixel publicitaire.
              </p>
            ) : (
              <p>
                Nous mesurons de façon anonyme le nombre de pages vues sur notre propre
                serveur, sans cookies publicitaires ni outil de suivi tiers (pas de
                Google Analytics, pas de pixel Meta). Ces chiffres nous aident
                uniquement à comprendre la fréquentation du site.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Vos droits</h2>
            <p>
              Vous pouvez à tout moment nous demander de consulter, corriger ou
              supprimer les informations que vous nous avez transmises, en nous
              contactant directement par téléphone ou par email.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-xl text-ink">Contact</h2>
            <p>
              Pour toute question concernant vos données personnelles, contactez-nous
              au <a href="tel:+21623691039" className="text-accent underline underline-offset-2">+216 23 691 039</a> ou par email à <a href="mailto:contact@chezlaziz.com" className="text-accent underline underline-offset-2">contact@chezlaziz.com</a>.
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
