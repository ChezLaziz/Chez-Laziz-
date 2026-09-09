import { describe, it, expect } from "vitest";
import { computeInventory, soldGramsByProduct, stockCoverage, MIN_HISTORY_DAYS } from "./inventory";
import type { AnalyticsOrder, OrderItem } from "./metrics";

const line = (productId: number | undefined, weightKg: number, qty: number, unit = 10000): OrderItem => ({
  kind: productId == null ? "pack" : "product",
  productId,
  name: `p${productId ?? "pack"}`,
  weightKg,
  qty,
  unitPriceMillimes: unit,
});

let nextId = 1;
const order = (items: OrderItem[]): AnalyticsOrder => ({
  id: nextId++,
  phone: "20123456",
  customerName: "T",
  governorate: "Sousse",
  status: "terminee",
  paymentMethod: "cod",
  paymentStatus: "paid",
  subtotalMillimes: items.reduce((s, i) => s + i.qty * i.unitPriceMillimes, 0),
  deliveryFeeMillimes: 8000,
  items,
  createdAt: new Date("2026-09-01T10:00:00"),
});

describe("soldGramsByProduct", () => {
  it("convertit le poids en grammes et multiplie par la quantité", () => {
    const sold = soldGramsByProduct([order([line(1, 1.5, 2)])]);
    expect(sold.get(1)).toBe(3000);
  });

  it("ignore les lignes sans productId — le rythme est donc un minimum", () => {
    const sold = soldGramsByProduct([order([line(undefined, 2, 1), line(1, 1, 1)])]);
    expect(sold.get(1)).toBe(1000);
    expect(sold.size).toBe(1);
  });
});

describe("computeInventory — projections", () => {
  const catalogue = [{ id: 1, name: "Dattes", stockGrams: 10000 }];

  it("ne projette rien tant que l'historique est trop court", () => {
    // 5 jours d'historique : « il reste 3 jours » serait une division
    // déguisée en prévision.
    const inv = computeInventory(catalogue, [order([line(1, 1, 10)])], 5);
    expect(inv.forecastAvailable).toBe(false);
    expect(inv.products[0]!.daysOfCover).toBeNull();
  });

  it("projette dès que l'historique suffit", () => {
    // 10 kg vendus sur 20 jours = 500 g/jour ; 10 kg en stock = 20 jours.
    const inv = computeInventory(catalogue, [order([line(1, 1, 10)])], 20);
    expect(inv.forecastAvailable).toBe(true);
    expect(inv.products[0]!.daysOfCover).toBeCloseTo(20);
  });

  it("ne projette pas un stock infini quand rien ne se vend", () => {
    const inv = computeInventory(catalogue, [], MIN_HISTORY_DAYS);
    expect(inv.products[0]!.daysOfCover).toBeNull();
    expect(inv.products[0]!.status).toBe("dormant");
  });
});

describe("computeInventory — statuts", () => {
  it("distingue stock non suivi et rupture de stock", () => {
    const inv = computeInventory(
      [
        { id: 1, name: "Non suivi", stockGrams: null },
        { id: 2, name: "Épuisé", stockGrams: 0 },
      ],
      [],
      30,
    );
    const untracked = inv.products.find((p) => p.productId === 1)!;
    const empty = inv.products.find((p) => p.productId === 2)!;
    // Deux situations opposées : l'une demande une saisie, l'autre un réassort.
    expect(untracked.status).toBe("non_suivi");
    expect(empty.status).toBe("rupture");
    expect(inv.untracked).toBe(1);
    expect(inv.outOfStock).toBe(1);
  });

  it("marque « faible » sous le seuil de couverture", () => {
    // 20 kg sur 20 jours = 1 kg/jour ; 5 kg restants = 5 jours < 10.
    const inv = computeInventory(
      [{ id: 1, name: "Bientôt fini", stockGrams: 5000 }],
      [order([line(1, 1, 20)])],
      20,
    );
    expect(inv.products[0]!.status).toBe("faible");
    expect(inv.lowStock).toBe(1);
  });

  it("classe l'urgent en premier", () => {
    const inv = computeInventory(
      [
        { id: 1, name: "OK", stockGrams: 100000 },
        { id: 2, name: "Non suivi", stockGrams: null },
        { id: 3, name: "Rupture", stockGrams: 0 },
        { id: 4, name: "Faible", stockGrams: 2000 },
      ],
      [order([line(1, 1, 20), line(4, 1, 20)])],
      20,
    );
    expect(inv.products.map((p) => p.name)).toEqual(["Rupture", "Faible", "OK", "Non suivi"]);
  });
});

describe("stockCoverage", () => {
  it("mesure la part du CA faite par des produits au stock suivi", () => {
    const coverage = stockCoverage(
      [
        { id: 1, stockGrams: 5000 },
        { id: 2, stockGrams: null },
      ],
      [order([line(1, 1, 1, 30000), line(2, 1, 1, 10000)])],
    );
    expect(coverage).toBeCloseTo(0.75);
  });

  it("compte les packs comme non couverts", () => {
    const coverage = stockCoverage(
      [{ id: 1, stockGrams: 5000 }],
      [order([line(undefined, 2, 1, 40000)])],
    );
    expect(coverage).toBe(0);
  });
});
