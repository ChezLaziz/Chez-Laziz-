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
      <Route path="/journal/quest-ce-que-le-makroudh-tunisien" element={<Lazy Component={QuestCeQueLeMakroudhPage} />} />
      <Route path="/journal/makroudh-kairouan-histoire-tradition" element={<Lazy Component={MakroudhKairouanHistoirePage} />} />
      <Route path="/journal/comment-est-prepare-le-makroudh" element={<Lazy Component={CommentEstPreparePage} />} />
      <Route path="*" element={<Lazy Component={NotFoundPage} />} />
      </Routes>
      <CookieConsent />
    </>
  )
}
