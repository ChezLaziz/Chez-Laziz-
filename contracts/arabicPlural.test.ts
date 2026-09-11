import { describe, expect, it } from 'vitest'
import { itemsLabelAr, pluralAr } from './arabicPlural'

const F = { un: 'un', deux: 'deux', peu: 'peu', beaucoup: 'beaucoup' }

describe('pluralAr', () => {
  it('suit les quatre temps de l’arabe', () => {
    expect(pluralAr(1, F)).toBe('un')
    expect(pluralAr(2, F)).toBe('deux')
    for (const n of [3, 4, 7, 10]) expect(pluralAr(n, F)).toBe('peu')
    for (const n of [11, 12, 25, 100, 1000]) expect(pluralAr(n, F)).toBe('beaucoup')
  })

  it('compte zéro comme un petit nombre — « 0 عناصر », pas « 0 عنصرًا »', () => {
    expect(pluralAr(0, F)).toBe('peu')
    expect(itemsLabelAr(0)).toBe('0 عناصر')
  })

  it('ignore le signe et les décimales', () => {
    expect(pluralAr(-2, F)).toBe('deux')
    expect(pluralAr(3.7, F)).toBe('peu')
  })
})

describe('itemsLabelAr', () => {
  it('écrit ce qu’un lecteur arabe attend', () => {
    expect(itemsLabelAr(1)).toBe('1 عنصر')
    expect(itemsLabelAr(2)).toBe('2 عنصران')
    expect(itemsLabelAr(5)).toBe('5 عناصر')
    expect(itemsLabelAr(12)).toBe('12 عنصرًا')
  })
})
