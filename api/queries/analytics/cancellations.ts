import { CANCEL_REASONS, isCancelReason, type CancelReason } from "@contracts/cancelReasons";
import { orderRevenueMillimes, type AnalyticsOrder } from "./metrics";

/** Pourquoi les commandes meurent.
 *
 * Le tableau de bord donnait le taux d'annulation et la somme perdue, et
 * s'arrêtait là : « 18 % » ne dit pas quoi corriger. La raison, elle, est
 * notée depuis longtemps au moment d'annuler (quatre boutons sur Telegram,
 * les mêmes dans le carnet de commandes) — elle dormait dans la base, lue
 * une commande à la fois. Ici on la compte.
 *
 * Trois choses que ce calcul ne fait PAS :
 *
 *  — Ranger une annulation sans raison sous une raison. Elle a sa ligne,
 *    « non notée », et son nombre dit à quel point le reste est fiable.
 *  — Cacher une raison à zéro. « Personne n'a annulé pour le prix » est une
 *    information ; une ligne absente ne dit rien.
 *  — Recompter l'argent autrement que la carte d'à côté : le montant perdu
 *    est celui de computeDeliveryImpact, au millime. */

export type CancellationReasonRow = {
  /** null : annulée sans raison notée — ou avec un code que la liste ne
   * connaît plus, ce qui revient au même pour qui lit. */
  code: CancelReason | null;
  orders: number;
  /** Part des annulations de la période, entre 0 et 1. */
  share: number;
  lostRevenueMillimes: number;
};

export type Cancellations = {
  /** Toutes les commandes passées sur la période, annulées comprises. */
  placed: number;
  cancelled: number;
  /** Annulées / passées. */
  rate: number;
  lostRevenueMillimes: number;
  /** Combien d'annulations portent une raison. */
  withReason: number;
  /** Les quatre raisons, toujours, la plus fréquente d'abord ; puis « non
   * notée », seulement s'il y en a. */
  rows: CancellationReasonRow[];
  /** La période d'avant, pour dire si ça s'arrange. */
  previous: { placed: number; cancelled: number; rate: number };
};

/** Prend TOUTES les commandes des deux périodes, annulées comprises. */
export function computeCancellations(
  allOrders: AnalyticsOrder[],
  previousAllOrders: AnalyticsOrder[],
): Cancellations {
  const parRaison = new Map<CancelReason | null, { orders: number; lostRevenueMillimes: number }>();
  for (const r of CANCEL_REASONS) parRaison.set(r.code, { orders: 0, lostRevenueMillimes: 0 });
  parRaison.set(null, { orders: 0, lostRevenueMillimes: 0 });

  let cancelled = 0;
  let lostRevenueMillimes = 0;
  for (const o of allOrders) {
    if (o.status !== "annulee") continue;
    const perte = orderRevenueMillimes(o);
    cancelled++;
    lostRevenueMillimes += perte;
    const ligne = parRaison.get(isCancelReason(o.cancelReason) ? o.cancelReason : null)!;
    ligne.orders++;
    ligne.lostRevenueMillimes += perte;
  }

  const ligne = (code: CancelReason | null): CancellationReasonRow => {
    const l = parRaison.get(code)!;
    return { code, ...l, share: cancelled === 0 ? 0 : l.orders / cancelled };
  };
  // Le tri est stable : à égalité, l'ordre de la liste — celui des boutons
  // que l'équipe a sous les yeux.
  const raisons = CANCEL_REASONS.map((r) => ligne(r.code)).sort((a, b) => b.orders - a.orders);
  const nonNotee = ligne(null);

  const previousCancelled = previousAllOrders.filter((o) => o.status === "annulee").length;
  return {
    placed: allOrders.length,
    cancelled,
    rate: allOrders.length === 0 ? 0 : cancelled / allOrders.length,
    lostRevenueMillimes,
    withReason: cancelled - nonNotee.orders,
    rows: nonNotee.orders > 0 ? [...raisons, nonNotee] : raisons,
    previous: {
      placed: previousAllOrders.length,
      cancelled: previousCancelled,
      rate: previousAllOrders.length === 0 ? 0 : previousCancelled / previousAllOrders.length,
    },
  };
}
