import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import OrderPage from './pages/OrderPage'
import AdminPage from './pages/AdminPage'
import { useTrackVisit } from './hooks/useTrackVisit'

export default function App() {
  useTrackVisit()
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/commande" element={<OrderPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
