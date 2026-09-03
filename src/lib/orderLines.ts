import { cartLineKey, type CartLine } from '@/lib/cartLine'
import { formatWeight, priceForWeight, type WeightKg } from '@contracts/shop'
import {
  CUSTOM_PACK_NAME,
  CUSTOM_PACK_PACKAGING_MILLIMES,
  CUSTOM_PACK_WEIGHT_KG,
  PACK_ITEM_WEIGHT_KG,
  customPackTotal,
  getFixedPack,
  packWeightKg,
} from '@contracts/packs'

export type CatalogProduct = {
  id: number
  name: string
  description: string | null
  priceMillimes: number
  category: string
  badge: string | null
  imageUrl: string | null
  available: boolean
}

/** Une ligne du panier, résolue contre le catalogue : nom, prix unitaire,
 * poids, contenu (pour les packs). Les prix affichés ici sont indicatifs —
 * le serveur recalcule tout à la commande. */
export type DisplayLine = {
  key: string
  line: CartLine
  name: string
  qty: number
  weightKg: WeightKg
  unitPriceMillimes: number
  /** Produits inclus (packs), déjà formatés : « Makroudh Jwayed — 500 g ». */
  contents: string[]
  packagingMillimes: number
  analyticsId: string
  variant: string
}

/** "2 KG" / "1,5 KG" pour les totaux de pack, "500 g" pour un produit. */
export function kgLabel(kg: number): string {
  if (kg >= 1) return `${String(kg).replace('.', ',')} KG`
  return `${Math.round(kg * 1000)} g`
}

export function buildDisplayLines(lines: CartLine[], catalog: CatalogProduct[]): DisplayLine[] {
  const out: DisplayLine[] = []
  for (const line of lines) {
    const key = cartLineKey(line)
    if (line.kind === 'product') {
      const p = catalog.find((c) => c.id === line.productId)
      if (!p) continue
      out.push({
        key,
        line,
        name: p.name,
        qty: line.qty,
        weightKg: line.weightKg,
        unitPriceMillimes: priceForWeight(p.priceMillimes, line.weightKg),
        contents: [],
        packagingMillimes: 0,
        analyticsId: String(p.id),
        variant: formatWeight(line.weightKg),
      })
    } else if (line.kind === 'pack') {
      const pack = getFixedPack(line.packId)
      if (!pack) continue
      out.push({
        key,
        line,
        name: pack.name,
        qty: line.qty,
        weightKg: packWeightKg(pack),
        unitPriceMillimes: pack.priceMillimes,
        contents: pack.contents.map((n) => `${n} — ${formatWeight(PACK_ITEM_WEIGHT_KG)}`),
        packagingMillimes: 0,
        analyticsId: `pack:${pack.id}`,
        variant: kgLabel(packWeightKg(pack)),
      })
    } else {
      const products = line.productIds.map((id) => catalog.find((c) => c.id === id))
      if (products.some((p) => !p)) continue
      const found = products as CatalogProduct[]
      out.push({
        key,
        line,
        name: CUSTOM_PACK_NAME,
        qty: line.qty,
        weightKg: CUSTOM_PACK_WEIGHT_KG,
        unitPriceMillimes: customPackTotal(found.map((p) => p.priceMillimes)),
        contents: found.map((p) => `${p.name} — ${formatWeight(PACK_ITEM_WEIGHT_KG)}`),
        packagingMillimes: CUSTOM_PACK_PACKAGING_MILLIMES,
        analyticsId: `custom:${line.productIds.join('-')}`,
        variant: kgLabel(CUSTOM_PACK_WEIGHT_KG),
      })
    }
  }
  return out
}
