import { describe, expect, it } from 'vitest'
import { lineIsResolvable, unresolvableLines, type PrunableLine } from './cartPruning'

const ids = new Set([1, 2, 3])

describe('lineIsResolvable', () => {
  it('garde un produit encore au catalogue, écarte celui qui a disparu', () => {
    expect(lineIsResolvable({ kind: 'product', productId: 2 }, ids)).toBe(true)
    expect(lineIsResolvable({ kind: 'product', productId: 9 }, ids)).toBe(false)
  })

  it('garde toujours un pack prêt : son prix ne dépend pas du catalogue', () => {
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
