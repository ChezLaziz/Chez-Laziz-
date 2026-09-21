import { describe, expect, it } from 'vitest'
import { clientIpFromHeaders, metaSignalsForOrder, metaUserSignals, readCookie } from './metaSignals'

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

describe("metaSignalsForOrder — le bogue qui a coûté trente jours d'attribution", () => {
  const complet = {
    fbc: "fb.1.1726900000.IwAR_abc",
    fbp: "fb.1.1726900000.1234567890",
    clientIp: "197.15.1.1",
    clientUserAgent: "Mozilla/5.0 (iPhone)",
  };

  it("rend EXACTEMENT les quatre noms de colonnes de la commande", () => {
    // Ce test est la raison d'être de la fonction. Le routeur étalait
    // `...signals` dans createOrder : les noms ne correspondaient pas, les
    // quatre valeurs tombaient dans le vide, et TypeScript ne disait rien
    // parce que les colonnes sont facultatives. Zéro commande a porté fbc
    // ou fbp, et Meta n'a attribué aucun achat à aucune publicité.
    expect(metaSignalsForOrder(complet)).toEqual({
      metaFbc: "fb.1.1726900000.IwAR_abc",
      metaFbp: "fb.1.1726900000.1234567890",
      metaClientIp: "197.15.1.1",
      metaClientUserAgent: "Mozilla/5.0 (iPhone)",
    });
  });

  it("n'utilise aucun des noms du contrat — c'est là qu'était l'erreur", () => {
    const rendu = metaSignalsForOrder(complet) as Record<string, unknown>;
    for (const nom of ["fbc", "fbp", "clientIp", "clientUserAgent"]) {
      expect(rendu).not.toHaveProperty(nom);
    }
  });

  it("ne pose que ce qui existe — un champ absent ne devient pas undefined", () => {
    expect(metaSignalsForOrder({ fbp: "fb.1.2.3" })).toEqual({ metaFbp: "fb.1.2.3" });
  });

  it("rend un objet vide sans consentement, pour être étalé sans risque", () => {
    expect(metaSignalsForOrder(null)).toEqual({});
    expect(metaSignalsForOrder(undefined)).toEqual({});
  });

  it("boucle avec metaUserSignals : du cookie brut jusqu'aux colonnes", () => {
    const signaux = metaUserSignals({
      cookie: "_fbp=fb.1.1726900000.1234567890; _fbc=fb.1.1726900000.IwAR_abc; autre=x",
      xForwardedFor: "197.15.1.1, 10.0.0.1",
      userAgent: "Mozilla/5.0 (iPhone)",
    });
    const pourLaCommande = metaSignalsForOrder(signaux);
    expect(pourLaCommande.metaFbc).toBe("fb.1.1726900000.IwAR_abc");
    expect(pourLaCommande.metaFbp).toBe("fb.1.1726900000.1234567890");
    expect(pourLaCommande.metaClientIp).toBe("197.15.1.1");
  });
});
