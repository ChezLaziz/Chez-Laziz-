import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type CartItem = { id: number; qty: number }
type CartMap = Record<number, number>

const STORAGE_KEY = 'chezlaziz_cart_v1'

type CartContextValue = {
  cart: CartMap
  count: number
  add: (id: number, qty?: number) => void
  setQty: (id: number, qty: number) => void
  remove: (id: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readStoredCart(): CartMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartMap>(() => readStoredCart())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // stockage indisponible (navigation privée, etc.) — on continue sans persister
    }
  }, [cart])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: Object.values(cart).reduce((s, q) => s + q, 0),
      add: (id, qty = 1) =>
        setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + qty) })),
      setQty: (id, qty) =>
        setCart((c) => {
          const next = { ...c }
          if (qty <= 0) delete next[id]
          else next[id] = qty
          return next
        }),
      remove: (id) =>
        setCart((c) => {
          const next = { ...c }
          delete next[id]
          return next
        }),
      clear: () => setCart({}),
    }),
    [cart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
