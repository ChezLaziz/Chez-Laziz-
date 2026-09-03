import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Gallery from '../sections/Gallery'
import Reviews from '../sections/Reviews'
import Footer from '../sections/Footer'

export default function GaleriePage() {
  useReveal()
  useSEO({
    title: 'Galerie — Chez Laziz | Photos de notre pâtisserie à Kairouan',
    description:
      'La boutique, l\'atelier et le makroudh de Chez Laziz en images — semoule, dattes et miel, façonnés à la main à Kairouan.',
    path: '/galerie',
  })
  return (
    <>
      <Cursor />
      <Header />
      <main className="pt-16 md:pt-20">
        <Gallery />
        <Reviews />
      </main>
      <Footer />
    </>
  )
}
