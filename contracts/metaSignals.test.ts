import { describe, expect, it } from 'vitest'
import { clientIpFromHeaders, metaUserSignals, readCookie } from './metaSignals'

const FBC = 'fb.1.1719500000000.IwAR0abcdef'
const FBP = 'fb.1.1719500000000.123456789'

describe('readCookie', () => {
  it('trouve le cookie demandé au milieu des autres', () => {
    expect(readCookie(`a=1; _fbp=${FBP}; b=2`, '_fbp')).toBe(FBP)
  })

  it('ne confond pas un nom qui contient l’autre', () => {
    expect(readCookie('_fbclid=xxx; other=1', '_fbc')).toBeUndefined()
  })

  it('rend undefined sur en-tête absent, vide ou sans valeur', () => {
    expect(readCookie(null, '_fbc')).toBeUndefined()
    expect(readCookie('', '_fbc')).toBeUndefined()
    expect(readCookie('_fbc=', '_fbc')).toBeUndefined()
    expect(readCookie('nimportequoi', '_fbc')).toBeUndefined()
  })
})

describe('clientIpFromHeaders', () => {
  it('prend le PREMIER élément de x-forwarded-for : le client, pas le relai', () => {
    expect(clientIpFromHeaders('41.226.1.5, 10.0.0.1, 172.16.0.2', null)).toBe('41.226.1.5')
  })

  it('se rabat sur x-real-ip', () => {
    expect(clientIpFromHeaders(null, '41.226.1.5')).toBe('41.226.1.5')
    expect(clientIpFromHeaders('', '41.226.1.5')).toBe('41.226.1.5')
  })

  it('rend undefined quand il n’y a rien d’exploitable', () => {
    expect(clientIpFromHeaders(null, null)).toBeUndefined()
    expect(clientIpFromHeaders('x'.repeat(60), null)).toBeUndefined()
  })
})

describe('metaUserSignals', () => {
  it('SANS cookie du Pixel, ne rend RIEN — pas de consentement, pas d’IP envoyée', () => {
    expect(
      metaUserSignals({
        cookie: 'laziz_session=abc',
        xForwardedFor: '41.226.1.5',
        userAgent: 'Mozilla/5.0 (Linux; Android 13)',
      }),
    ).toBeNull()
    expect(metaUserSignals({})).toBeNull()
  })

  it('avec les cookies du Pixel, rassemble les quatre signaux', () => {
    expect(
      metaUserSignals({
        cookie: `_fbc=${FBC}; _fbp=${FBP}`,
        xForwardedFor: '41.226.1.5, 10.0.0.1',
        userAgent: 'Mozilla/5.0 (Linux; Android 13)',
      }),
    ).toEqual({
      fbc: FBC,
      fbp: FBP,
      clientIp: '41.226.1.5',
      clientUserAgent: 'Mozilla/5.0 (Linux; Android 13)',
    })
  })

  it('un seul des deux cookies suffit à déclencher la collecte', () => {
    expect(metaUserSignals({ cookie: `_fbp=${FBP}` })).toEqual({ fbp: FBP })
    expect(metaUserSignals({ cookie: `_fbc=${FBC}` })).toEqual({ fbc: FBC })
  })

  it('borne les valeurs venues de l’extérieur', () => {
    const s = metaUserSignals({ cookie: `_fbc=${'x'.repeat(900)}`, userAgent: 'u'.repeat(900) })
    expect(s?.fbc).toHaveLength(255)
    expect(s?.clientUserAgent).toHaveLength(400)
  })
})
