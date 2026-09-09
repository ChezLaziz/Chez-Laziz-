import { describe, expect, it } from 'vitest'
import { metaContentId } from './metaContentId'

describe('metaContentId', () => {
  it('un produit à l’unité est son identifiant', () => {
    expect(metaContentId({ kind: 'product', productId: 7 })).toBe('7')
  })

  it('un pack prêt porte son préfixe', () => {
    expect(metaContentId({ kind: 'pack', packId: 'vip' })).toBe('pack:vip')
  })

  it('un pack sur mesure porte ses produits, TRIÉS', () => {
    expect(metaContentId({ kind: 'custom', productIds: [12, 3, 7] })).toBe('custom:3-7-12')
  })

  it('le même pack composé dans un autre ordre donne la MÊME référence', () => {
    const a = metaContentId({ kind: 'custom', productIds: [1, 2, 3, 4] })
    const b = metaContentId({ kind: 'custom', productIds: [4, 3, 2, 1] })
    expect(a).toBe(b)
  })

  it('deux packs sur mesure différents ne se confondent pas', () => {
    expect(metaContentId({ kind: 'custom', productIds: [1, 2] })).not.toBe(
      metaContentId({ kind: 'custom', productIds: [1, 3] }),
    )
  })

  it('navigateur et serveur produisent la même chaîne pour la même ligne', () => {
    // Côté navigateur : la ligne du panier. Côté serveur : les contenus
    // relus depuis la commande enregistrée. Deux chemins, une référence.
    const navigateur = metaContentId({ kind: 'custom', productIds: [9, 4, 1, 6] })
    const contenusServeur = [{ productId: 4 }, { productId: 1 }, { productId: 9 }, { productId: 6 }]
    const serveur = metaContentId({ kind: 'custom', productIds: contenusServeur.map((c) => c.productId) })
    expect(serveur).toBe(navigateur)
  })
})
