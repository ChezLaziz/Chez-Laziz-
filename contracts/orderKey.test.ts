import { describe, expect, it } from 'vitest'
import { cartFingerprint, orderIdempotencyKey } from './orderKey'

describe('cartFingerprint', () => {
  it('est stable : même contenu, même empreinte', () => {
    expect(cartFingerprint('[{"kind":"product","productId":1,"qty":1}]')).toBe(
      cartFingerprint('[{"kind":"product","productId":1,"qty":1}]'),
    )
  })

  it('change dès que la quantité change', () => {
    const un = cartFingerprint('[{"productId":1,"qty":1}]')
    const deux = cartFingerprint('[{"productId":1,"qty":2}]')
    expect(un).not.toBe(deux)
  })

  it('change dès qu’une ligne est ajoutée', () => {
    expect(cartFingerprint('[{"a":1}]')).not.toBe(cartFingerprint('[{"a":1},{"b":2}]'))
  })

  it('fait toujours 8 caractères hexadécimaux, panier vide compris', () => {
    for (const s of ['', '[]', 'x'.repeat(5000), '[{"productId":999999,"qty":42}]']) {
      expect(cartFingerprint(s)).toMatch(/^[0-9a-f]{8}$/)
    }
  })
})

describe('orderIdempotencyKey', () => {
  const salt = '5f1c9b6e-6c0a-4a1e-9d3b-0b2f8c7a1e44'
  const panier = '[{"kind":"product","productId":1,"weightKg":1,"qty":1}]'

  it('ne bouge pas quand on réessaie le MÊME panier — le double clic reste couvert', () => {
    expect(orderIdempotencyKey(salt, panier)).toBe(orderIdempotencyKey(salt, panier))
  })

  it('change dès que le panier change — le serveur ne renverra pas l’ancienne commande', () => {
    const modifie = '[{"kind":"product","productId":1,"weightKg":1,"qty":2}]'
    expect(orderIdempotencyKey(salt, panier)).not.toBe(orderIdempotencyKey(salt, modifie))
  })

  it('change quand le salt est renouvelé — même panier commandé deux fois = deux commandes', () => {
    expect(orderIdempotencyKey(salt, panier)).not.toBe(orderIdempotencyKey('autre-salt', panier))
  })

  it('respecte les bornes du serveur : entre 8 et 64 caractères', () => {
    const k = orderIdempotencyKey(salt, panier)
    expect(k.length).toBeGreaterThanOrEqual(8)
    expect(k.length).toBeLessThanOrEqual(64)
  })
})
