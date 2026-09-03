import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Hero from '../sections/Hero'
import Marquee from '../sections/Marquee'
import Order from '../sections/Order'
import Footer from '../sections/Footer'

export default function Home() {
  useReveal()
  useSEO({
    title: 'Chez Laziz — عند لعزيز · Makroudh de Kairouan',
    description:
      'Chez Laziz — عند لعزيز · Pâtisserie à Kairouan spécialisée dans le makroudh kairouanais authentique, fait main chaque jour. Dattes, fruits secs, pistache, fraise.',
    path: '/',
  })

  return (
    <>
      <Cursor />
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Order />
      </main>
      <Footer />
    </>
  )
}
