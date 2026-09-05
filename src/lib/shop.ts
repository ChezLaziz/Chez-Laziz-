import { formatDinars } from '@contracts/shop'

export const PHONE_DISPLAY = '+216 23 691 039'
export const PHONE_TEL = 'tel:+21623691039'
// Lien direct vers la messagerie Messenger de la page Facebook Chez Laziz
// (ID numérique de la page — fonctionne sans nom d'utilisateur personnalisé).
export const MESSENGER_URL = 'https://m.me/61573444418563'

/** 8000 → "8", 69900 → "69,9" — le libellé de devise est ajouté par
 * l'appelant (TND / د.ت). Voir formatDinars dans contracts/shop.ts. */
export function formatTND(millimes: number): string {
  return formatDinars(millimes)
}

export * from '@contracts/shop'
