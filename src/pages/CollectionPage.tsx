import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import Header from '../sections/Header'
import Collection from '../sections/Collection'
import InstagramReel from '../sections/InstagramReel'
import Footer from '../sections/Footer'

export default function CollectionPage() {
  useReveal()
  useSEO({
    title: 'La Collection — Chez Laziz | Makroudh classiques, signatures et nouveautés',
    description:
      'Le catalogue Chez Laziz : makroudh aux dattes, fruits secs, pistache et nos nouveautés — façonnés à la main chaque jour à Kairouan. Prix en dinars tunisiens.',
    path: '/collection',
    breadcrumb: 'La Collection',
  })
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-20">
        <Collection headingLevel="h1" />
        <InstagramReel />
      </main>
      <Footer />
    </>
  )
}
