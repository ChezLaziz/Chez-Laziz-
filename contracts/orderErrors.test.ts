import { describe, expect, it } from 'vitest'
import { ORDER_ERROR, orderErrorMessage } from './orderErrors'
import { CUSTOM_PACK_SIZE } from './packs'

const FALLBACK = 'Une erreur est survenue.'

describe('orderErrorMessage', () => {
  it('traduit chaque jeton connu dans les deux langues', () => {
    for (const token of Object.values(ORDER_ERROR)) {
      const fr = orderErrorMessage(token, 'fr', FALLBACK)
      const ar = orderErrorMessage(token, 'ar', FALLBACK)
      expect(fr).not.toBe(FALLBACK)
      expect(ar).not.toBe(FALLBACK)
      expect(fr).not.toBe(ar)
      expect(ar).toMatch(/[؀-ۿ]/) // vraiment de l'arabe
    }
  })

  it('interpole la taille du pack sur mesure', () => {
    expect(orderErrorMessage(ORDER_ERROR.customPackTaille, 'fr', FALLBACK)).toContain(String(CUSTOM_PACK_SIZE))
  })

  it('remplace TOUT message inconnu par le repli — c’est la raison d’être du fichier', () => {
    const fuites = [
      'Unable to transform response from server',
      '[{"code":"invalid_type","expected":"string"}]',
      '<html><body>502 Bad Gateway</body></html>',
      'ECONNRESET',
      'Produit indisponible', // l’ancien message en clair ne passe plus non plus
      'CL_jeton_qui_nexiste_pas',
    ]
    for (const f of fuites) expect(orderErrorMessage(f, 'fr', FALLBACK)).toBe(FALLBACK)
  })

  it('rend le repli sur une absence de message', () => {
    expect(orderErrorMessage(undefined, 'ar', FALLBACK)).toBe(FALLBACK)
    expect(orderErrorMessage('', 'fr', FALLBACK)).toBe(FALLBACK)
  })

  it('tolère les espaces autour du jeton', () => {
    expect(orderErrorMessage(`  ${ORDER_ERROR.preuveD17Requise}\n`, 'fr', FALLBACK)).not.toBe(FALLBACK)
  })
})
