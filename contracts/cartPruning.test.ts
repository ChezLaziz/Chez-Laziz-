import { describe, expect, it } from 'vitest'
import { lineIsResolvable, unresolvableLines, type PrunableLine } from './cartPruning'
import { FIXED_PACKS } from './packs'

const ids = new Set([1, 2, 3])

describe('lineIsResolvable', () => {
  it('garde un produit encore au catalogue, écarte celui qui a disparu', () => {
    expect(lineIsResolvable({ kind: 'product', productId: 2 }, ids)).toBe(true)
    expect(lineIsResolvable({ kind: 'product', productId: 9 }, ids)).toBe(false)
  })

  it('garde un pack prêt tant qu’on ne lui donne pas les noms du catalogue', () => {
    expect(lineIsResolvable({ kind: 'pack', packId: 'vip' }, new Set())).toBe(true)
  })

  it('écarte un pack sur mesure dès qu’UN seul de ses produits manque', () => {
    expect(lineIsResolvable({ kind: 'custom', productIds: [1, 2, 3] }, ids)).toBe(true)
    expect(lineIsResolvable({ kind: 'custom', productIds: [1, 2, 9] }, ids)).toBe(false)
  })

  it('avec un catalogue vide, rien de chiffrable ne survit — d’où la garde exigée de l’appelant', () => {
    expect(lineIsResolvable({ kind: 'product', productId: 1 }, new Set())).toBe(false)
    expect(lineIsResolvable({ kind: 'custom', productIds: [1] }, new Set())).toBe(false)
  })
})

describe('unresolvableLines', () => {
  it('ne rend que les lignes orphelines, dans leur ordre', () => {
    const lines: PrunableLine[] = [
      { kind: 'product', productId: 1 },
      { kind: 'product', productId: 42 },
      { kind: 'pack', packId: 'vip' },
      { kind: 'custom', productIds: [1, 2, 3] },
      { kind: 'custom', productIds: [3, 77] },
    ]
    expect(unresolvableLines(lines, [1, 2, 3])).toEqual([
      { kind: 'product', productId: 42 },
      { kind: 'custom', productIds: [3, 77] },
    ])
  })

  it('rend un tableau vide quand tout se résout', () => {
    expect(unresolvableLines([{ kind: 'product', productId: 1 }], [1])).toEqual([])
  })
})

describe('packs prêts et disponibilité du catalogue', () => {
  // Le serveur refuse un pack dès qu'un seul de ses makroudh manque
  // (packIsAvailable + api/ordersRouter.ts). Le panier doit appliquer la
  // même règle AVANT que le client remplisse six champs pour rien.
  const pack = FIXED_PACKS[0]!
  const tousLesNoms = new Set(pack.contents)

  it('garde le pack quand tous ses makroudh sont au catalogue', () => {
    expect(lineIsResolvable({ kind: 'pack', packId: pack.id }, new Set(), tousLesNoms)).toBe(true)
  })

  it('écarte le pack dès qu’UN de ses makroudh manque', () => {
    const amputé = new Set([...tousLesNoms].slice(1))
    expect(lineIsResolvable({ kind: 'pack', packId: pack.id }, new Set(), amputé)).toBe(false)
  })

  it('écarte un pack qui n’existe plus dans le code', () => {
    expect(lineIsResolvable({ kind: 'pack', packId: 'pack-supprimé' }, new Set(), tousLesNoms)).toBe(false)
  })

  it('SANS la liste des noms, ne juge pas : le pack survit', () => {
    // Catalogue pas encore chargé — on ne vide jamais le panier d'un vrai
    // client sur une panne réseau.
    expect(lineIsResolvable({ kind: 'pack', packId: pack.id }, new Set())).toBe(true)
  })
})
