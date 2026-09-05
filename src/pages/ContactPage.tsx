import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import Header from '../sections/Header'
import Visit from '../sections/Visit'
import Footer from '../sections/Footer'

export default function ContactPage() {
  useReveal()
  const lang = useLang()
  const isAr = lang === 'ar'
  useSEO(
    isAr
      ? {
          title: 'تواصل معنا — عند لعزيز | العنوان وأوقات العمل في القيروان',
          description:
            'عند لعزيز في القيروان، تونس — مفتوح 7 أيام على 7 من 07:00 إلى منتصف الليل. العنوان، أوقات العمل، الهاتف، ورابط خرائط جوجل.',
          path: '/ar/contact',
          breadcrumb: 'تواصل معنا',
        }
      : {
          title: 'Nous trouver — Chez Laziz | Adresse et horaires à Kairouan',
          description:
            'Chez Laziz à Kairouan, Tunisie — ouvert 7j/7 de 07h00 à minuit. Adresse, horaires, téléphone et itinéraire Google Maps.',
          path: '/contact',
          breadcrumb: 'Nous trouver',
        },
  )
  return (
    <>
      <Header />
      <main className="pt-16 md:pt-20">
        <Visit headingLevel="h1" />
      </main>
      <Footer hideVisit />
    </>
  )
}
