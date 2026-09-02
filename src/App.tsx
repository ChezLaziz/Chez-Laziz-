import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import { useTrackVisit } from './hooks/useTrackVisit'

// Chargées à la demande seulement — évite d'alourdir le premier
// chargement de la page d'accueil avec le code de la commande/l'admin
// (et surtout recharts, utilisé uniquement dans le tableau de bord admin).
const OrderPage = lazy(() => import('./pages/OrderPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

export default function App() {
  useTrackVisit()
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/commande"
        element={
          <Suspense fallback={null}>
            <OrderPage />
          </Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={null}>
            <AdminPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
