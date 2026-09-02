import { useReveal } from '../hooks/useReveal'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Collection from '../sections/Collection'
import InstagramReel from '../sections/InstagramReel'
import Footer from '../sections/Footer'

export default function CollectionPage() {
  useReveal()
  return (
    <>
      <Cursor />
      <Header />
      <main className="pt-16 md:pt-20">
        <Collection />
        <InstagramReel />
      </main>
      <Footer />
    </>
  )
}
