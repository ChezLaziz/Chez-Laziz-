/** Seuils d'inventaire, partagés entre le calcul (serveur) et son
 * explication (interface).
 *
 * Définis ici pour que la page ne puisse pas annoncer un seuil différent de
 * celui qui a réellement servi à classer les produits. */

/** Jours d'historique minimum avant de publier une projection.
 *
 * En dessous, « il reste 3 jours de stock » n'est qu'une division présentée
 * comme une prévision : quelques jours de ventes ne décrivent pas un rythme. */
export const MIN_HISTORY_DAYS = 14;

/** Sous cette couverture, le réassort devient urgent. */
export const LOW_STOCK_DAYS = 10;
