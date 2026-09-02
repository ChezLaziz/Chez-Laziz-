import { useReveal } from '../hooks/useReveal'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Hero from '../sections/Hero'
import Marquee from '../sections/Marquee'
import Story from '../sections/Story'
import Collection from '../sections/Collection'
import InstagramReel from '../sections/InstagramReel'
import Order from '../sections/Order'
import Gallery from '../sections/Gallery'
import Reviews from '../sections/Reviews'
import Visit from '../sections/Visit'
import Footer from '../sections/Footer'

export default function Home() {
  useReveal()

  return (
    <>
      <Cursor />
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Story />
        <Collection />
        <InstagramReel />
        <Order />
        <Gallery />
        <Reviews />
        <Visit />
      </main>
      <Footer />
    </>
  )
}
