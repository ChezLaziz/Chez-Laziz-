import { describe, expect, it } from "vitest";
import { CANCEL_REASONS } from "@contracts/cancelReasons";
import { computeCancellations } from "./cancellations";
import { computeDeliveryImpact, type AnalyticsOrder } from "./metrics";

let nextId = 1;
function order(over: Partial<AnalyticsOrder> = {}): AnalyticsOrder {
  return {
    id: nextId++,
    phone: "20123456",
    customerName: "Test",
    governorate: "Sousse",
    status: "terminee",
    paymentMethod: "cod",
    paymentStatus: "pending",
    subtotalMillimes: 20000,
    deliveryFeeMillimes: 8000,
    items: [],
    createdAt: new Date("2026-11-01T10:00:00"),
    ...over,
  };
}
const annulee = (cancelReason: string | null, subtotalMillimes = 20000) =>
  order({ status: "annulee", cancelReason, subtotalMillimes });

describe("computeCancellations", () => {
  it("compte chaque raison, la plus fréquente d'abord, avec ce qu'elle a coûté", () => {
    const c = computeCancellations(
      [
        order(),
        order(),
        order({ status: "nouvelle" }),
        annulee("sans_reponse", 30000),
        annulee("sans_reponse", 10000),
        annulee("sans_reponse", 24000),
        annulee("change_avis", 16000),
      ],
      [],
    );
    expect(c.placed).toBe(7);
    expect(c.cancelled).toBe(4);
    expect(c.rate).toBeCloseTo(4 / 7, 10);
    expect(c.lostRevenueMillimes).toBe(80000);
    expect(c.withReason).toBe(4);
    expect(c.rows.map((r) => [r.code, r.orders, r.lostRevenueMillimes])).toEqual([
      ["sans_reponse", 3, 64000],
      ["change_avis", 1, 16000],
      ["trop_cher", 0, 0],
      ["faux_numero", 0, 0],
    ]);
    expect(c.rows[0]!.share).toBeCloseTo(0.75, 10);
  });

  it("garde les quatre raisons même à zéro : « personne n'annule pour le prix » est une information", () => {
    const c = computeCancellations([order(), annulee("faux_numero")], []);
    expect(c.rows).toHaveLength(CANCEL_REASONS.length);
    expect(c.rows.map((r) => r.code).sort()).toEqual(CANCEL_REASONS.map((r) => r.code).sort());
    expect(c.rows[0]!.code).toBe("faux_numero");
    // À égalité (ici, trois raisons à zéro) : l'ordre des boutons.
    expect(c.rows.slice(1).map((r) => r.code)).toEqual(["sans_reponse", "change_avis", "trop_cher"]);
  });

  it("une annulation sans raison a sa propre ligne, jamais rangée sous une raison", () => {
    const c = computeCancellations(
      [annulee("sans_reponse"), annulee(null, 50000), annulee(null), annulee(undefined as unknown as null)],
      [],
    );
    expect(c.cancelled).toBe(4);
    expect(c.withReason).toBe(1);
    const derniere = c.rows.at(-1)!;
    expect(derniere).toMatchObject({ code: null, orders: 3, lostRevenueMillimes: 90000 });
    expect(derniere.share).toBeCloseTo(0.75, 10);
    // Les parts ferment le total.
    expect(c.rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 10);
    expect(c.rows.reduce((s, r) => s + r.orders, 0)).toBe(c.cancelled);
  });

  it("un code que la liste ne connaît pas compte comme « non notée », il n'invente pas de ligne", () => {
    const c = computeCancellations([annulee("autre"), annulee(""), annulee("SANS_REPONSE")], []);
    expect(c.rows.map((r) => r.code)).toEqual([...CANCEL_REASONS.map((r) => r.code), null]);
    expect(c.rows.at(-1)!.orders).toBe(3);
    expect(c.withReason).toBe(0);
  });

  it("n'affiche pas de ligne « non notée » quand toutes les annulations ont leur raison", () => {
    const c = computeCancellations([annulee("trop_cher"), order()], []);
    expect(c.rows.some((r) => r.code === null)).toBe(false);
  });

  it("ignore la raison restée sur une commande qui n'est plus annulée", () => {
    // Annulée par erreur, puis remise en préparation : le champ garde sa
    // valeur en base, mais ce n'est plus une annulation.
    const c = computeCancellations([order({ status: "en_preparation", cancelReason: "sans_reponse" }), order()], []);
    expect(c.cancelled).toBe(0);
    expect(c.rows.every((r) => r.orders === 0)).toBe(true);
  });

  it("une période sans commande ne divise pas par zéro", () => {
    const c = computeCancellations([], []);
    expect(c).toMatchObject({ placed: 0, cancelled: 0, rate: 0, lostRevenueMillimes: 0, withReason: 0 });
    expect(c.rows.every((r) => r.share === 0 && r.orders === 0)).toBe(true);
    expect(c.previous).toEqual({ placed: 0, cancelled: 0, rate: 0 });
  });

  it("donne la période d'avant, pour dire si ça s'arrange", () => {
    const c = computeCancellations(
      [order(), order(), order(), annulee("sans_reponse")],
      [order(), annulee(null), annulee("trop_cher"), order({ status: "prete" })],
    );
    expect(c.rate).toBeCloseTo(0.25, 10);
    expect(c.previous).toEqual({ placed: 4, cancelled: 2, rate: 0.5 });
  });

  it("dit le même montant perdu et le même taux que la carte « Statut des commandes »", () => {
    const commandes = [
      order(),
      order({ status: "prete" }),
      annulee("sans_reponse", 31500),
      annulee(null, 12250),
      annulee("change_avis", 8000),
    ];
    const c = computeCancellations(commandes, []);
    const d = computeDeliveryImpact(commandes);
    expect(c.lostRevenueMillimes).toBe(d.lostRevenueMillimes);
    expect(c.cancelled).toBe(d.cancelled);
    expect(c.rate).toBe(d.cancellationRate);
    expect(c.rows.reduce((s, r) => s + r.lostRevenueMillimes, 0)).toBe(d.lostRevenueMillimes);
  });
});
