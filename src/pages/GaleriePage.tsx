import { useReveal } from '../hooks/useReveal'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Gallery from '../sections/Gallery'
import Reviews from '../sections/Reviews'
import Footer from '../sections/Footer'

export default function GaleriePage() {
  useReveal()
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
