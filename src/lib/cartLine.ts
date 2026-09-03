import type { WeightKg } from '@contracts/shop'
import { normalizeCustomSelection, type FixedPackId } from '@contracts/packs'

/** Une ligne du panier : un produit au poids, un pack prêt, ou un Custom
 * Pack (4 produits différents, 500 g chacun). */
export type ProductLine = { kind: 'product'; productId: number; weightKg: WeightKg; qty: number }
export type PackLine = { kind: 'pack'; packId: FixedPackId; qty: number }
export type CustomLine = { kind: 'custom'; productIds: number[]; qty: number }
export type CartLine = ProductLine | PackLine | CustomLine

/** Clé stable d'une ligne : deux Custom Packs aux mêmes produits partagent
 * la même clé, quel que soit l'ordre de sélection. */
export function cartLineKey(line: CartLine): string {
  switch (line.kind) {
    case 'product':
      return `product:${line.productId}:${line.weightKg}`
    case 'pack':
      return `pack:${line.packId}`
    case 'custom':
      return `custom:${normalizeCustomSelection(line.productIds).join('-')}`
  }
}
