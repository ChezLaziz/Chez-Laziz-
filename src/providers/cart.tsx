import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isValidWeight, type WeightKg } from '@contracts/shop'
import { FIXED_PACK_IDS, isValidCustomSelection, normalizeCustomSelection, type FixedPackId } from '@contracts/packs'
import { cartLineKey, type CartLine } from '@/lib/cartLine'

export type { CartLine, CustomLine, PackLine, ProductLine } from '@/lib/cartLine'

const STORAGE_KEY = 'chezlaziz_cart_v3'
const LEGACY_STORAGE_KEY = 'chezlaziz_cart_v2' // { "productId:weightKg": qty }
const DEFAULT_WEIGHT: WeightKg = 1

function isValidLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object') return false
  const l = value as Record<string, unknown>
  if (typeof l.qty !== 'number' || !Number.isInteger(l.qty) || l.qty <= 0) return false
  if (l.kind === 'product') return Number.isInteger(l.productId) && isValidWeight(l.weightKg)
  if (l.kind === 'pack') return (FIXED_PACK_IDS as readonly string[]).includes(String(l.packId))
  if (l.kind === 'custom') return Array.isArray(l.productIds) && isValidCustomSelection(l.productIds)
  return false
}

function readStoredLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const lines = Array.isArray(parsed?.lines) ? parsed.lines : []
      return lines.filter(isValidLine)
    }
    // Migration de l'ancien panier (v2 : produits au poids uniquement).
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const map = JSON.parse(legacy) as Record<string, number>
      const lines: CartLine[] = []
      for (const [key, qty] of Object.entries(map ?? {})) {
        const [id, w] = key.split(':')
        const line = { kind: 'product', productId: Number(id), weightKg: Number(w), qty } as unknown
        if (isValidLine(line)) lines.push(line)
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      return lines
    }
  } catch {
    // stockage indisponible ou corrompu — on repart d'un panier vide
  }
  return []
}

type CartContextValue = {
  lines: CartLine[]
  /** Nombre d'articles (produits + packs), toutes quantités confondues. */
  count: number
  // — produits au poids (page Collection) —
  qtyFor: (productId: number, weightKg?: WeightKg) => number
  add: (productId: number, weightKg?: WeightKg, qty?: number) => void
  setQty: (productId: number, weightKg: WeightKg, qty: number) => void
  setWeight: (productId: number, fromWeightKg: WeightKg, toWeightKg: WeightKg) => void
  remove: (productId: number, weightKg: WeightKg) => void
  // — packs (page Commande) —
  packQty: (packId: FixedPackId) => number
  addPack: (packId: FixedPackId, qty?: number) => void
  addCustom: (productIds: number[], qty?: number) => void
  // — toute ligne, par clé —
  setLineQty: (key: string, qty: number) => void
  removeLine: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

/** Ajoute `delta` à la quantité de la ligne (créée si absente, retirée à 0). */
function upsert(lines: CartLine[], line: CartLine, delta: number): CartLine[] {
  const key = cartLineKey(line)
  const existing = lines.find((l) => cartLineKey(l) === key)
  if (!existing) return delta > 0 ? [...lines, { ...line, qty: delta }] : lines
  const qty = existing.qty + delta
  return qty <= 0
    ? lines.filter((l) => cartLineKey(l) !== key)
    : lines.map((l) => (cartLineKey(l) === key ? { ...l, qty } : l))
}

function withQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => cartLineKey(l) !== key)
  return lines.map((l) => (cartLineKey(l) === key ? { ...l, qty } : l))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStoredLines())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines }))
    } catch {
      // stockage indisponible (navigation privée, etc.) — on continue sans persister
    }
  }, [lines])

  const value = useMemo<CartContextValue>(() => {
    const productKey = (productId: number, weightKg: WeightKg) =>
      cartLineKey({ kind: 'product', productId, weightKg, qty: 1 })
    const findQty = (key: string) => lines.find((l) => cartLineKey(l) === key)?.qty ?? 0

    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      qtyFor: (productId, weightKg = DEFAULT_WEIGHT) => findQty(productKey(productId, weightKg)),
      add: (productId, weightKg = DEFAULT_WEIGHT, qty = 1) =>
        setLines((ls) => upsert(ls, { kind: 'product', productId, weightKg, qty: 1 }, qty)),
      setQty: (productId, weightKg, qty) =>
        setLines((ls) => {
          const key = productKey(productId, weightKg)
          const exists = ls.some((l) => cartLineKey(l) === key)
          if (!exists) return qty > 0 ? [...ls, { kind: 'product', productId, weightKg, qty }] : ls
          return withQty(ls, key, qty)
        }),
      setWeight: (productId, fromWeightKg, toWeightKg) =>
        setLines((ls) => {
          const fromKey = productKey(productId, fromWeightKg)
          const qty = ls.find((l) => cartLineKey(l) === fromKey)?.qty
          if (!qty) return ls
          const without = ls.filter((l) => cartLineKey(l) !== fromKey)
          return upsert(without, { kind: 'product', productId, weightKg: toWeightKg, qty: 1 }, qty)
        }),
      remove: (productId, weightKg) =>
        setLines((ls) => ls.filter((l) => cartLineKey(l) !== productKey(productId, weightKg))),
      packQty: (packId) => findQty(`pack:${packId}`),
      addPack: (packId, qty = 1) => setLines((ls) => upsert(ls, { kind: 'pack', packId, qty: 1 }, qty)),
      addCustom: (productIds, qty = 1) => {
        if (!isValidCustomSelection(productIds)) return
        setLines((ls) =>
          upsert(ls, { kind: 'custom', productIds: normalizeCustomSelection(productIds), qty: 1 }, qty),
        )
      },
      setLineQty: (key, qty) => setLines((ls) => withQty(ls, key, qty)),
      removeLine: (key) => setLines((ls) => ls.filter((l) => cartLineKey(l) !== key)),
      clear: () => setLines([]),
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocalisé avec son provider
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
