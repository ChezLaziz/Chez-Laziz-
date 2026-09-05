import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../sections/Header'
import Story from '../sections/Story'
import MakroudhHistory from '../sections/MakroudhHistory'
import Footer from '../sections/Footer'

export default function MaisonPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'دارنا — عند لعزيز | حرفة المقروض القيرواني',
          description:
            'اكتشفو قصة وحرفة عند لعزيز: مقروض قيرواني مشكّل باليد، سميد ذهبي، عجينة تمر وعسل — تقليد من القيروان.',
          path: '/ar/la-maison',
          breadcrumb: 'دارنا',
        }
      : {
          title: 'La Maison — Chez Laziz | Savoir-faire du makroudh kairouanais',
          description:
            "Découvrez l'histoire et le savoir-faire de Chez Laziz : makroudh kairouanais façonné à la main, semoule dorée, pâte de dattes et miel — une tradition de Kairouan.",
          path: '/la-maison',
          breadcrumb: 'La Maison',
        },
  )
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-20">
        <Story headingLevel="h1" />
        <MakroudhHistory />
      </main>
      <Footer />
    </>
  )
}
