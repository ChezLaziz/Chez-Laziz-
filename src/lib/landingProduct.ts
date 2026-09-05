import { useEffect } from 'react'
import { setJsonLd } from '@/hooks/useSEO'

export type LandingCatalogProduct = {
  id: number
  name: string
  priceMillimes: number
  imageUrl: string | null
}

/** Retrouve, dans le catalogue, le produit correspondant à une page de
 * renvoi marketing (ex. "fruits secs") — par mot-clé plutôt que par ID :
 * l'ID en base peut changer (produit recréé depuis l'admin), le nom
 * affiché beaucoup plus rarement. Même logique que SPOTLIGHT_KEYWORDS
 * dans OrderPage.tsx. */
export function findProductByKeyword<T extends LandingCatalogProduct>(
  products: T[] | undefined,
  keyword: string,
): T | undefined {
  return products?.find((p) => p.name.toLowerCase().includes(keyword))
}

/** Prix le plus bas du catalogue — pour une page qui présente une catégorie
 * entière (ex. "le makroudh tunisien") plutôt qu'une fiche précise : pas de
 * schéma Product ici (ce serait faux de désigner un seul produit), juste un
 * "à partir de" honnête et toujours à jour. */
export function cheapestPriceMillimes(products: LandingCatalogProduct[] | undefined): number | undefined {
  if (!products?.length) return undefined
  return Math.min(...products.map((p) => p.priceMillimes))
}

/** Pose (ou retire) le schéma Product/Offer d'une page de renvoi marketing
 * liée à un produit précis du catalogue — le prix DOIT correspondre à celui
 * affiché sur la page (règle Google), d'où le lien direct avec le produit
 * réel plutôt qu'un prix codé en dur. */
export function useProductJsonLd({
  id,
  product,
  name,
  description,
  url,
}: {
  /** Identifiant du bloc <script> — un par page appelante. */
  id: string
  product: LandingCatalogProduct | undefined
  name: string
  description: string
  url: string
}) {
  useEffect(() => {
    if (!product) {
      document.getElementById(id)?.remove()
      return
    }
    return setJsonLd(id, {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: product.imageUrl ? `https://chezlaziz.com${product.imageUrl}` : 'https://chezlaziz.com/images/hero.jpg',
      url: `https://chezlaziz.com${url}`,
      brand: { '@type': 'Brand', name: 'Chez Laziz' },
      offers: {
        '@type': 'Offer',
        url: `https://chezlaziz.com${url}`,
        priceCurrency: 'TND',
        price: (product.priceMillimes / 1000).toFixed(3),
        availability: 'https://schema.org/InStock',
        seller: { '@id': 'https://chezlaziz.com/#business' },
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, product?.id, product?.priceMillimes, product?.imageUrl, name, description, url])
}
