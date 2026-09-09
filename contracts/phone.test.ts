import { describe, expect, it } from 'vitest'
import { isValidTunisianPhone, tunisianLocalPhone } from './phone'

describe('tunisianLocalPhone', () => {
  it('accepte les huit chiffres, quelle que soit la mise en forme', () => {
    for (const raw of ['23691039', '23 691 039', '23-69-10-39', ' 23.691.039 ']) {
      expect(tunisianLocalPhone(raw)).toBe('23691039')
    }
  })

  it('accepte les trois graphies internationales', () => {
    for (const raw of ['+216 23 691 039', '216 23 691 039', '00216 23 691 039', '+216-23691039']) {
      expect(tunisianLocalPhone(raw)).toBe('23691039')
    }
  })

  it('garde entier un numéro local qui commence par 216 — le défaut d’origine', () => {
    expect(tunisianLocalPhone('21612345')).toBe('21612345')
    expect(tunisianLocalPhone('21 612 345')).toBe('21612345')
  })

  it('refuse ce qui n’est pas un numéro complet', () => {
    for (const raw of ['', '2369103', '236910399', '216', '00216', 'appelez-moi', '+33 6 12 34 56 78']) {
      expect(tunisianLocalPhone(raw)).toBeNull()
    }
  })

  it('isValidTunisianPhone dit la même chose', () => {
    expect(isValidTunisianPhone('00216 23 691 039')).toBe(true)
    expect(isValidTunisianPhone('123')).toBe(false)
  })
})
