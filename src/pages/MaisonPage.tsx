import { useReveal } from '../hooks/useReveal'
import Cursor from '../components/Cursor'
import Header from '../sections/Header'
import Story from '../sections/Story'
import MakroudhHistory from '../sections/MakroudhHistory'
import Footer from '../sections/Footer'

export default function MaisonPage() {
  useReveal()
  return (
    <>
      <Cursor />
      <Header />
      <main className="pt-16 md:pt-20">
        <Story />
        <MakroudhHistory />
      </main>
      <Footer />
    </>
  )
}
