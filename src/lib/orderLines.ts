import { cartLineKey, type CartLine } from '@/lib/cartLine'
import { productName } from '@contracts/productText'
import { formatWeight, priceForWeight, type WeightKg } from '@contracts/shop'
import {
  CUSTOM_PACK_NAME,
  CUSTOM_PACK_NAME_AR,
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
  nameAr?: string | null
  descriptionAr?: string | null
  priceMillimes: number
  category: string
  badge: string | null
  imageUrl: string | null
  available: boolean
  isExclusiveCreation: boolean
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
  /** Vrai seulement pour une ligne "produit" dont le nom est une création
   * exclusive Chez Laziz (voir CatalogProduct) — jamais pour un pack, dont
   * le nom n'est pas lui-même l'une de ces créations. */
  isExclusiveCreation: boolean
}

/** "2 KG" / "1,5 KG" pour les totaux de pack, "500 g" pour un produit. */
export function kgLabel(kg: number, lang: 'fr' | 'ar' = 'fr'): string {
  if (kg >= 1) return `${String(kg).replace('.', ',')} ${lang === 'ar' ? 'كغ' : 'KG'}`
  return `${Math.round(kg * 1000)} ${lang === 'ar' ? 'غ' : 'g'}`
}

export function buildDisplayLines(lines: CartLine[], catalog: CatalogProduct[], lang: 'fr' | 'ar' = 'fr'): DisplayLine[] {
  const out: DisplayLine[] = []
  for (const line of lines) {
    const key = cartLineKey(line)
    if (line.kind === 'product') {
      const p = catalog.find((c) => c.id === line.productId)
      if (!p) continue
      out.push({
        key,
        line,
        name: productName(p, lang),
        qty: line.qty,
        weightKg: line.weightKg,
        unitPriceMillimes: priceForWeight(p.priceMillimes, line.weightKg),
        contents: [],
        packagingMillimes: 0,
        analyticsId: String(p.id),
        variant: formatWeight(line.weightKg, lang),
        isExclusiveCreation: p.isExclusiveCreation,
      })
    } else if (line.kind === 'pack') {
      const pack = getFixedPack(line.packId)
      if (!pack) continue
      out.push({
        key,
        line,
        name: lang === 'ar' ? pack.nameAr : pack.name,
        qty: line.qty,
        weightKg: packWeightKg(pack),
        unitPriceMillimes: pack.priceMillimes,
        contents: pack.contents.map((n) => {
          const product = catalog.find((c) => c.name === n)
          const label = product ? productName(product, lang) : n
          return `${label} — ${formatWeight(PACK_ITEM_WEIGHT_KG, lang)}`
        }),
        packagingMillimes: 0,
        analyticsId: `pack:${pack.id}`,
        variant: kgLabel(packWeightKg(pack), lang),
        isExclusiveCreation: false,
      })
    } else {
      const products = line.productIds.map((id) => catalog.find((c) => c.id === id))
      if (products.some((p) => !p)) continue
      const found = products as CatalogProduct[]
      out.push({
        key,
        line,
        name: lang === 'ar' ? CUSTOM_PACK_NAME_AR : CUSTOM_PACK_NAME,
        qty: line.qty,
        weightKg: CUSTOM_PACK_WEIGHT_KG,
        unitPriceMillimes: customPackTotal(found.map((p) => p.priceMillimes)),
        contents: found.map((p) => `${productName(p, lang)} — ${formatWeight(PACK_ITEM_WEIGHT_KG, lang)}`),
        packagingMillimes: CUSTOM_PACK_PACKAGING_MILLIMES,
        analyticsId: `custom:${line.productIds.join('-')}`,
        variant: kgLabel(CUSTOM_PACK_WEIGHT_KG, lang),
        isExclusiveCreation: false,
      })
    }
  }
  return out
}
