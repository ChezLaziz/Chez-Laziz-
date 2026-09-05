import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '../lib/i18n'
import Header from '../sections/Header'
import Collection from '../sections/Collection'
import InstagramReel from '../sections/InstagramReel'
import Footer from '../sections/Footer'

export default function CollectionPage() {
  useReveal()
  const lang = useLang()
  const isAr = lang === 'ar'
  useSEO({
    title: isAr
      ? 'التشكيلة — عند لعزيز | مقروض كلاسيكي ومميز وأصناف جديدة'
      : 'La Collection — Chez Laziz | Makroudh classiques, signatures et nouveautés',
    description: isAr
      ? 'كاتالوج عند لعزيز: مقروض بالتمر والفواكه الجافة والفستق وأصنافنا الجديدة — صناعة يدوية كل يوم في القيروان. الأسعار بالدينار التونسي.'
      : 'Le catalogue Chez Laziz : makroudh aux dattes, fruits secs, pistache et nos nouveautés — façonnés à la main chaque jour à Kairouan. Prix en dinars tunisiens.',
    path: isAr ? '/ar/collection' : '/collection',
    breadcrumb: isAr ? 'التشكيلة' : 'La Collection',
    alternates: { fr: '/collection', ar: '/ar/collection' },
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
