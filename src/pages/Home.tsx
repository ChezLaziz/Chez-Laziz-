import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '../lib/i18n'
import Header from '../sections/Header'
import Hero from '../sections/Hero'
import Marquee from '../sections/Marquee'
import Signatures from '../sections/Signatures'
import HowToOrder from '../sections/HowToOrder'
import Story from '../sections/Story'
import Order from '../sections/Order'
import Footer from '../sections/Footer'

// Parcours de l'accueil : ce qu'on vend (signatures) → comment l'obtenir
// (commande, livraison, paiement) → qui nous sommes (la maison) → dernier
// appel à commander. L'adresse, les horaires et le contact vivent dans le
// pied de page (bandeau « Nous trouver »), présent sur toutes les pages.
export default function Home() {
  useReveal()
  const lang = useLang()
  const isAr = lang === 'ar'
  useSEO({
    title: isAr
      ? 'عند لعزيز — مقروض قيرواني أصيل، يوصلكم في كل تونس'
      : 'Chez Laziz — عند لعزيز · Makroudh de Kairouan, livré partout en Tunisie',
    description: isAr
      ? 'عند لعزيز — حلويات القيروان المتخصصة في المقروض القيرواني الأصيل، صناعة يدوية كل يوم. اطلبوا أونلاين، توصيل لكل الجمهوريات التونسية خلال 24 ساعة.'
      : 'Chez Laziz — عند لعزيز · Pâtisserie à Kairouan spécialisée dans le makroudh kairouanais authentique, fait main chaque jour. Commande en ligne, livraison partout en Tunisie sous 24h.',
    path: isAr ? '/ar' : '/',
    alternates: { fr: '/', ar: '/ar' },
  })

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Signatures />
        <HowToOrder />
        <Story />
        <Order />
      </main>
      <Footer />
    </>
  )
}
