import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../sections/Header'
import Gallery from '../sections/Gallery'
import Reviews from '../sections/Reviews'
import Footer from '../sections/Footer'

export default function GaleriePage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'معرض الصور — عند لعزيز | صور من محلنا في القيروان',
          description: 'المحل، المصنع، والمقروض عند لعزيز بالصور — سميد وتمر وعسل، مصنوعين يدويًا في القيروان.',
          path: '/ar/galerie',
          breadcrumb: 'معرض الصور',
        }
      : {
          title: 'Galerie — Chez Laziz | Photos de notre pâtisserie à Kairouan',
          description:
            'La boutique, l\'atelier et le makroudh de Chez Laziz en images — semoule, dattes et miel, façonnés à la main à Kairouan.',
          path: '/galerie',
          breadcrumb: 'Galerie',
        },
  )
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-20">
        <Gallery headingLevel="h1" />
        <Reviews />
      </main>
      <Footer />
    </>
  )
}
