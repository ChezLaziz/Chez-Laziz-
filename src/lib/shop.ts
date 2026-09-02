export const PHONE_DISPLAY = '+216 23 691 039'
export const PHONE_TEL = 'tel:+21623691039'
export const WA_LINK =
  'https://wa.me/21623691039?text=' +
  encodeURIComponent('Bonjour Chez Laziz ! Je voudrais passer une commande de makroudh.')

/** 8000 → "8.000" */
export function formatTND(millimes: number): string {
  return (millimes / 1000).toFixed(3)
}
