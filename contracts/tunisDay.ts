/** Jour civil à Tunis (UTC+1, sans heure d'été) : « aujourd'hui » pour les
 * gens qui travaillent à la boutique, pas pour le serveur. */
export function tunisDayKey(d: Date): string {
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}
