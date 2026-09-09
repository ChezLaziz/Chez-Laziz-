import { describe, expect, it } from 'vitest'
import { parseRememberedCustomer, serializeRememberedCustomer } from './customerMemory'

describe('parseRememberedCustomer', () => {
  it('rend null sur du vide, du JSON cassé ou un tableau', () => {
    expect(parseRememberedCustomer(null)).toBeNull()
    expect(parseRememberedCustomer('')).toBeNull()
    expect(parseRememberedCustomer('{oops')).toBeNull()
    expect(parseRememberedCustomer('[]')).toBeNull()
    expect(parseRememberedCustomer('"texte"')).toBeNull()
  })

  it('rend null quand il n’y a ni nom ni téléphone à pré-remplir', () => {
    expect(parseRememberedCustomer('{"address":"12 rue X"}')).toBeNull()
  })

  it('relit un enregistrement complet', () => {
    const raw = serializeRememberedCustomer({
      name: 'Mohamed',
      phone: '23691039',
      governorate: 'Tunis',
      city: 'Le Bardo',
      delegationId: '42',
      address: '12 rue de la Kasbah',
    })
    expect(parseRememberedCustomer(raw)).toEqual({
      name: 'Mohamed',
      phone: '23691039',
      governorate: 'Tunis',
      city: 'Le Bardo',
      delegationId: '42',
      address: '12 rue de la Kasbah',
    })
  })

  it('remplace par du vide tout champ qui n’est pas une chaîne', () => {
    const got = parseRememberedCustomer('{"name":"Ali","phone":12345678,"address":{"x":1}}')
    expect(got).toEqual({ name: 'Ali', phone: '', governorate: '', city: '', delegationId: '', address: '' })
  })

  it('borne les champs trop longs', () => {
    const got = parseRememberedCustomer(JSON.stringify({ name: 'a'.repeat(5000), phone: '20000000' }))
    expect(got?.name).toHaveLength(200)
  })

  it('sérialise toujours les six champs, même partiels', () => {
    expect(JSON.parse(serializeRememberedCustomer({ name: 'Ali' }))).toEqual({
      name: 'Ali',
      phone: '',
      governorate: '',
      city: '',
      delegationId: '',
      address: '',
    })
  })
})
