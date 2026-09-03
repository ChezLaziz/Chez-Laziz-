import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { type WeightKg } from '@contracts/shop'

export type CartLine = { productId: number; weightKg: WeightKg; qty: number }
type CartMap = Record<string, number>

const STORAGE_KEY = 'chezlaziz_cart_v2'
const DEFAULT_WEIGHT: WeightKg = 1

function makeCartKey(productId: number, weightKg: WeightKg): string {
  return `${productId}:${weightKg}`
}

function parseCartKey(key: string): { productId: number; weightKg: WeightKg } {
  const [id, w] = key.split(':')
  return { productId: Number(id), weightKg: Number(w) as WeightKg }
}

type CartContextValue = {
  cart: CartMap
  lines: CartLine[]
  count: number
  qtyFor: (productId: number, weightKg?: WeightKg) => number
  add: (productId: number, weightKg?: WeightKg, qty?: number) => void
  setQty: (productId: number, weightKg: WeightKg, qty: number) => void
  setWeight: (productId: number, fromWeightKg: WeightKg, toWeightKg: WeightKg) => void
  remove: (productId: number, weightKg: WeightKg) => void
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

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => ({ ...parseCartKey(key), qty }))

    return {
      cart,
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      qtyFor: (productId, weightKg = DEFAULT_WEIGHT) => cart[makeCartKey(productId, weightKg)] ?? 0,
      add: (productId, weightKg = DEFAULT_WEIGHT, qty = 1) =>
        setCart((c) => {
          const key = makeCartKey(productId, weightKg)
          return { ...c, [key]: Math.max(0, (c[key] ?? 0) + qty) }
        }),
      setQty: (productId, weightKg, qty) =>
        setCart((c) => {
          const key = makeCartKey(productId, weightKg)
          const next = { ...c }
          if (qty <= 0) delete next[key]
          else next[key] = qty
          return next
        }),
      setWeight: (productId, fromWeightKg, toWeightKg) =>
        setCart((c) => {
          const fromKey = makeCartKey(productId, fromWeightKg)
          const toKey = makeCartKey(productId, toWeightKg)
          const qty = c[fromKey]
          if (!qty) return c
          const next = { ...c }
          delete next[fromKey]
          next[toKey] = qty + (next[toKey] ?? 0)
          return next
        }),
      remove: (productId, weightKg) =>
        setCart((c) => {
          const next = { ...c }
          delete next[makeCartKey(productId, weightKg)]
          return next
        }),
      clear: () => setCart({}),
    }
  }, [cart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
