import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import Home from './pages/Home'
import { useTrackVisit } from './hooks/useTrackVisit'
import CookieConsent from './components/CookieConsent'
import { langFromPathname } from './lib/i18n'

// Chargées à la demande seulement — évite d'alourdir le premier
// chargement de la page d'accueil (et surtout recharts, utilisé
// uniquement dans le tableau de bord admin).
const OrderPage = lazy(() => import('./pages/OrderPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const MaisonPage = lazy(() => import('./pages/MaisonPage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const GaleriePage = lazy(() => import('./pages/GaleriePage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const LivraisonPage = lazy(() => import('./pages/LivraisonPage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const MakroudhTunisienPage = lazy(() => import('./pages/MakroudhTunisienPage'))
const MakroudhKairouanPage = lazy(() => import('./pages/MakroudhKairouanPage'))
const MakroudhDattesPage = lazy(() => import('./pages/MakroudhDattesPage'))
const MakroudhFruitsSecsPage = lazy(() => import('./pages/MakroudhFruitsSecsPage'))
const BlogIndexPage = lazy(() => import('./pages/blog/BlogIndexPage'))
const QuestCeQueLeMakroudhPage = lazy(() => import('./pages/blog/QuestCeQueLeMakroudhPage'))
const MakroudhKairouanHistoirePage = lazy(() => import('./pages/blog/MakroudhKairouanHistoirePage'))
const CommentEstPreparePage = lazy(() => import('./pages/blog/CommentEstPreparePage'))
const MakroudhVsBaklavaPage = lazy(() => import('./pages/blog/MakroudhVsBaklavaPage'))
const ChoisirMakroudhPage = lazy(() => import('./pages/blog/ChoisirMakroudhPage'))
const DureeConservationMakroudhPage = lazy(() => import('./pages/blog/DureeConservationMakroudhPage'))
const MakroudhIdeeCadeauPage = lazy(() => import('./pages/blog/MakroudhIdeeCadeauPage'))
const MakroudhElLouzPage = lazy(() => import('./pages/blog/MakroudhElLouzPage'))
const PrixMakroudhPage = lazy(() => import('./pages/blog/PrixMakroudhPage'))
const MakroudhEtrangerPage = lazy(() => import('./pages/blog/MakroudhEtrangerPage'))
const FaqMakroudhPage = lazy(() => import('./pages/blog/FaqMakroudhPage'))
const PourquoiKairouanPage = lazy(() => import('./pages/blog/PourquoiKairouanPage'))
const NouvellesSaveursPage = lazy(() => import('./pages/blog/NouvellesSaveursPage'))

function Lazy({ Component }: { Component: React.ComponentType }) {
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/** Synchronise <html lang> et <html dir> avec la langue de la page courante
 * (préfixe /ar) — nécessaire pour l'affichage RTL correct et l'accessibilité
 * (lecteurs d'écran), aucune des deux ne pouvant être déduite du seul HTML
 * statique dans une SPA. */
function HtmlLangSync() {
  const { pathname } = useLocation()
  useEffect(() => {
    const lang = langFromPathname(pathname)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [pathname])
  return null
}

export default function App() {
  useTrackVisit()
  return (
    <>
      <ScrollToTop />
      <HtmlLangSync />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ar" element={<Home />} />
      <Route path="/la-maison" element={<Lazy Component={MaisonPage} />} />
      <Route path="/ar/la-maison" element={<Lazy Component={MaisonPage} />} />
      <Route path="/collection" element={<Lazy Component={CollectionPage} />} />
      <Route path="/ar/collection" element={<Lazy Component={CollectionPage} />} />
      <Route path="/galerie" element={<Lazy Component={GaleriePage} />} />
      <Route path="/ar/galerie" element={<Lazy Component={GaleriePage} />} />
      <Route path="/contact" element={<Lazy Component={ContactPage} />} />
      <Route path="/ar/contact" element={<Lazy Component={ContactPage} />} />
      <Route path="/commande" element={<Lazy Component={OrderPage} />} />
      <Route path="/ar/commande" element={<Lazy Component={OrderPage} />} />
      <Route path="/admin" element={<Lazy Component={AdminPage} />} />
      <Route path="/politique-de-confidentialite" element={<Lazy Component={PrivacyPage} />} />
      <Route path="/ar/politique-de-confidentialite" element={<Lazy Component={PrivacyPage} />} />
      <Route path="/conditions-generales" element={<Lazy Component={TermsPage} />} />
      <Route path="/ar/conditions-generales" element={<Lazy Component={TermsPage} />} />
      <Route path="/livraison" element={<Lazy Component={LivraisonPage} />} />
      <Route path="/ar/livraison" element={<Lazy Component={LivraisonPage} />} />
      <Route path="/faq" element={<Lazy Component={FAQPage} />} />
      <Route path="/ar/faq" element={<Lazy Component={FAQPage} />} />
      <Route path="/makroudh-tunisien" element={<Lazy Component={MakroudhTunisienPage} />} />
      <Route path="/ar/makroudh-tunisien" element={<Lazy Component={MakroudhTunisienPage} />} />
      <Route path="/makroudh-kairouan" element={<Lazy Component={MakroudhKairouanPage} />} />
      <Route path="/ar/makroudh-kairouan" element={<Lazy Component={MakroudhKairouanPage} />} />
      <Route path="/makroudh-aux-dattes" element={<Lazy Component={MakroudhDattesPage} />} />
      <Route path="/ar/makroudh-aux-dattes" element={<Lazy Component={MakroudhDattesPage} />} />
      <Route path="/makroudh-fruits-secs" element={<Lazy Component={MakroudhFruitsSecsPage} />} />
      <Route path="/ar/makroudh-fruits-secs" element={<Lazy Component={MakroudhFruitsSecsPage} />} />
      <Route path="/journal" element={<Lazy Component={BlogIndexPage} />} />
      <Route path="/ar/journal" element={<Lazy Component={BlogIndexPage} />} />
      <Route path="/journal/quest-ce-que-le-makroudh-tunisien" element={<Lazy Component={QuestCeQueLeMakroudhPage} />} />
      <Route path="/ar/journal/quest-ce-que-le-makroudh-tunisien" element={<Lazy Component={QuestCeQueLeMakroudhPage} />} />
      <Route path="/journal/makroudh-kairouan-histoire-tradition" element={<Lazy Component={MakroudhKairouanHistoirePage} />} />
      <Route path="/ar/journal/makroudh-kairouan-histoire-tradition" element={<Lazy Component={MakroudhKairouanHistoirePage} />} />
      <Route path="/journal/comment-est-prepare-le-makroudh" element={<Lazy Component={CommentEstPreparePage} />} />
      <Route path="/ar/journal/comment-est-prepare-le-makroudh" element={<Lazy Component={CommentEstPreparePage} />} />
      <Route path="/journal/makroudh-vs-baklava-difference" element={<Lazy Component={MakroudhVsBaklavaPage} />} />
      <Route path="/ar/journal/makroudh-vs-baklava-difference" element={<Lazy Component={MakroudhVsBaklavaPage} />} />
      <Route path="/journal/comment-choisir-son-makroudh" element={<Lazy Component={ChoisirMakroudhPage} />} />
      <Route path="/ar/journal/comment-choisir-son-makroudh" element={<Lazy Component={ChoisirMakroudhPage} />} />
      <Route path="/journal/duree-conservation-makroudh" element={<Lazy Component={DureeConservationMakroudhPage} />} />
      <Route path="/ar/journal/duree-conservation-makroudh" element={<Lazy Component={DureeConservationMakroudhPage} />} />
      <Route path="/journal/makroudh-idee-cadeau" element={<Lazy Component={MakroudhIdeeCadeauPage} />} />
      <Route path="/ar/journal/makroudh-idee-cadeau" element={<Lazy Component={MakroudhIdeeCadeauPage} />} />
      <Route path="/journal/makroudh-el-louz-vs-traditionnel" element={<Lazy Component={MakroudhElLouzPage} />} />
      <Route path="/ar/journal/makroudh-el-louz-vs-traditionnel" element={<Lazy Component={MakroudhElLouzPage} />} />
      <Route path="/journal/prix-makroudh-tunisie" element={<Lazy Component={PrixMakroudhPage} />} />
      <Route path="/ar/journal/prix-makroudh-tunisie" element={<Lazy Component={PrixMakroudhPage} />} />
      <Route path="/journal/makroudh-tunisiens-etranger" element={<Lazy Component={MakroudhEtrangerPage} />} />
      <Route path="/ar/journal/makroudh-tunisiens-etranger" element={<Lazy Component={MakroudhEtrangerPage} />} />
      <Route path="/journal/faq-makroudh" element={<Lazy Component={FaqMakroudhPage} />} />
      <Route path="/ar/journal/faq-makroudh" element={<Lazy Component={FaqMakroudhPage} />} />
      <Route path="/journal/pourquoi-kairouan-makroudh" element={<Lazy Component={PourquoiKairouanPage} />} />
      <Route path="/ar/journal/pourquoi-kairouan-makroudh" element={<Lazy Component={PourquoiKairouanPage} />} />
      <Route path="/journal/nouvelles-saveurs-makroudh-blanc" element={<Lazy Component={NouvellesSaveursPage} />} />
      <Route path="/ar/journal/nouvelles-saveurs-makroudh-blanc" element={<Lazy Component={NouvellesSaveursPage} />} />
      <Route path="*" element={<Lazy Component={NotFoundPage} />} />
      </Routes>
      <CookieConsent />
    </>
  )
}
