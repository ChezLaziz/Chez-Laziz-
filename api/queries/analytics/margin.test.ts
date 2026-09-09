import { describe, it, expect } from "vitest";
import { computeMargins, lineCostMillimes, type CostsByProductId } from "./margin";
import type { AnalyticsOrder, OrderItem } from "./metrics";

const costs: CostsByProductId = new Map([
  [1, 4000], // Dattes : 4 DT/kg de coût
  [2, 5000],
  [3, 12000],
]);

const product = (productId: number, name: string, weightKg: number, qty: number, unit: number): OrderItem => ({
  kind: "product",
  productId,
  name,
  weightKg: weightKg,
  qty,
  unitPriceMillimes: unit,
});

let nextId = 1;
function order(items: OrderItem[]): AnalyticsOrder {
  return {
    id: nextId++,
    phone: "20123456",
    customerName: "Test",
    governorate: "Sousse",
    status: "terminee",
    paymentMethod: "cod",
    paymentStatus: "paid",
    subtotalMillimes: items.reduce((s, i) => s + i.qty * i.unitPriceMillimes, 0),
    deliveryFeeMillimes: 8000,
    items,
    createdAt: new Date("2026-09-01T10:00:00"),
  };
}

describe("lineCostMillimes", () => {
  it("multiplie le coût au kilo par le poids et la quantité", () => {
    // 4 DT/kg × 1,5 kg × 2 = 12 DT
    expect(lineCostMillimes(product(1, "Dattes", 1.5, 2, 12000), costs)).toBe(12000);
  });

  it("renvoie null pour un produit sans coût saisi, jamais 0", () => {
    // Le piège : un coût nul afficherait 100 % de marge et hisserait ce
    // produit en tête du classement de rentabilité.
    expect(lineCostMillimes(product(99, "Inconnu", 1, 1, 20000), costs)).toBeNull();
  });

  it("additionne les composants d'un pack personnalisé", () => {
    const customPack: OrderItem = {
      kind: "custom",
      name: "Custom Pack",
      weightKg: 2,
      qty: 1,
      unitPriceMillimes: 39500,
      contents: [
        { productId: 1, name: "Dattes", weightKg: 0.5 },
        { productId: 2, name: "Jwayed", weightKg: 0.5 },
      ],
    }
    // (4000 × 0,5) + (5000 × 0,5) = 4500
    expect(lineCostMillimes(customPack, costs)).toBe(4500);
  });

  it("refuse un pack dont un seul composant manque de coût", () => {
    const partial: OrderItem = {
      kind: "custom",
      name: "Custom Pack",
      weightKg: 1,
      qty: 1,
      unitPriceMillimes: 30000,
      contents: [
        { productId: 1, name: "Dattes", weightKg: 0.5 },
        { productId: 99, name: "Inconnu", weightKg: 0.5 },
      ],
    }
    // Compter le composant connu seul sous-estimerait le coût et gonflerait
    // la marge : mieux vaut ne rien annoncer.
    expect(lineCostMillimes(partial, costs)).toBeNull();
  });

  it("refuse un pack prêt, dont les composants n'ont pas d'identifiant", () => {
    const vip: OrderItem = {
      kind: "pack",
      packId: "vip",
      name: "Laziz VIP",
      weightKg: 2,
      qty: 1,
      unitPriceMillimes: 69900,
      contents: [{ name: "Fruits Secs", weightKg: 0.5 }],
    }
    expect(lineCostMillimes(vip, costs)).toBeNull();
  });
});

describe("computeMargins", () => {
  it("calcule marge et taux sur les lignes couvertes", () => {
    const summary = computeMargins([order([product(1, "Dattes", 1, 1, 8000)])], costs);
    expect(summary.costMillimes).toBe(4000);
    expect(summary.marginMillimes).toBe(4000);
    expect(summary.marginRate).toBeCloseTo(0.5);
    expect(summary.revenueCoverage).toBe(1);
  });

  it("exclut les lignes sans coût du calcul ET le signale dans la couverture", () => {
    const summary = computeMargins(
      [order([product(1, "Dattes", 1, 1, 8000), product(99, "Inconnu", 1, 1, 32000)])],
      costs,
    );
    // La marge ne porte que sur les 8 000 couverts, pas sur les 40 000 vendus.
    expect(summary.coveredRevenueMillimes).toBe(8000);
    expect(summary.totalRevenueMillimes).toBe(40000);
    expect(summary.revenueCoverage).toBeCloseTo(0.2);
    expect(summary.marginMillimes).toBe(4000);
    // Le produit non couvert est nommé, avec ce qu'il pèse dans le CA.
    expect(summary.missingCost).toHaveLength(1);
    expect(summary.missingCost[0]!.name).toBe("Inconnu");
    expect(summary.missingCost[0]!.revenueMillimes).toBe(32000);
  });

  it("n'invente aucune marge quand aucun coût n'est saisi", () => {
    const summary = computeMargins([order([product(99, "Inconnu", 1, 1, 20000)])], new Map());
    expect(summary.revenueCoverage).toBe(0);
    expect(summary.marginMillimes).toBe(0);
    expect(summary.byProduct).toEqual([]);
  });

  it("classe par marge en dinars, pas par taux", () => {
    // Volume à 50 % : 40 DT de marge. Niche à 80 % : 8 DT. Le volume gagne.
    const summary = computeMargins(
      [
        order([product(1, "Volume", 1, 10, 8000)]), // CA 80, coût 40 → marge 40
        order([product(3, "Niche", 1, 1, 60000)]), // CA 60, coût 12 → marge 48
      ],
      costs,
    );
    expect(summary.byProduct[0]!.name).toBe("Niche");
    expect(summary.byProduct[0]!.marginMillimes).toBe(48000);
    expect(summary.byProduct[1]!.marginMillimes).toBe(40000);
    // …et le taux, lui, raconte l'autre moitié de l'histoire.
    expect(summary.byProduct[0]!.marginRate).toBeCloseTo(0.8);
    expect(summary.byProduct[1]!.marginRate).toBeCloseTo(0.5);
  });

  it("gère une marge négative sans la masquer", () => {
    const summary = computeMargins([order([product(3, "Vendu à perte", 1, 1, 10000)])], costs);
    expect(summary.marginMillimes).toBe(-2000);
    expect(summary.marginRate).toBeLessThan(0);
  });
});
