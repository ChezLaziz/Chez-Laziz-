import { useReveal } from '../hooks/useReveal'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Visit from '../sections/Visit'
import Footer from '../sections/Footer'

export default function ContactPage() {
  useReveal()
  return (
    <>
      <Cursor />
      <Header />
      <main className="pt-16 md:pt-20">
        <Visit />
      </main>
      <Footer />
    </>
  )
}
