/** Vocabulaire de période partagé entre le client et le serveur.
 *
 * Défini ici pour que l'admin et l'API ne puissent pas diverger : si le
 * client propose « 90 jours » et que le serveur ne connaît pas ce preset,
 * l'utilisateur voit un chiffre pour une période qu'il n'a pas demandée. */
export const PRESET_RANGES = ["today", "7d", "30d", "90d"] as const;
export type PresetRange = (typeof PRESET_RANGES)[number];
