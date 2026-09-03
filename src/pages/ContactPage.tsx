import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import Header from '../sections/Header'
import Visit from '../sections/Visit'
import Footer from '../sections/Footer'

export default function ContactPage() {
  useReveal()
  useSEO({
    title: 'Nous trouver — Chez Laziz | Adresse et horaires à Kairouan',
    description:
      'Chez Laziz à Kairouan, Tunisie — ouvert 7j/7 de 07h00 à minuit. Adresse, horaires, téléphone et itinéraire Google Maps.',
    path: '/contact',
    breadcrumb: 'Nous trouver',
  })
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-20">
        <Visit headingLevel="h1" />
      </main>
      <Footer />
    </>
  )
}
