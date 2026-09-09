import { describe, it, expect } from "vitest";
import {
  computeCoreTotals,
  computeCustomerSplit,
  computeDeliveryImpact,
  computeGovernorateStats,
  computeProductStats,
  isValidOrder,
  normalizePhone,
  orderRevenueMillimes,
  percentChange,
  type AnalyticsOrder,
  type OrderItem,
} from "./metrics";

const product = (productId: number, name: string, qty: number, unit: number): OrderItem => ({
  kind: "product",
  productId,
  name,
  qty,
  unitPriceMillimes: unit,
});
const pack = (packId: string, name: string, qty: number, unit: number): OrderItem => ({
  kind: "pack",
  packId,
  name,
  qty,
  unitPriceMillimes: unit,
});

let nextId = 1;
function order(over: Partial<AnalyticsOrder> = {}): AnalyticsOrder {
  const items = over.items ?? [product(1, "Makroudh Dattes", 1, 20000)];
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
    ...over,
  };
}

describe("isValidOrder", () => {
  it("exclut les commandes annulées", () => {
    expect(isValidOrder({ status: "annulee", paymentStatus: "paid" })).toBe(false);
  });

  it("exclut un D17 rejeté — l'argent n'est jamais arrivé", () => {
    expect(isValidOrder({ status: "terminee", paymentStatus: "rejected" })).toBe(false);
  });

  it("garde une commande encore en préparation : la vente est réelle", () => {
    expect(isValidOrder({ status: "nouvelle", paymentStatus: "pending" })).toBe(true);
  });
});

describe("orderRevenueMillimes", () => {
  it("exclut les frais de livraison, encaissés pour le transporteur", () => {
    // 20 DT de produit + 8 DT de livraison : le CA est 20 DT, pas 28.
    expect(orderRevenueMillimes({ subtotalMillimes: 20000 })).toBe(20000);
  });
});

describe("normalizePhone", () => {
  it("ramène les formes d'un même numéro à une seule identité", () => {
    const forms = ["+216 20 123 456", "0021620123456", "20123456", "20 123 456"];
    const ids = new Set(forms.map(normalizePhone));
    expect(ids.size).toBe(1);
    expect(ids.has("20123456")).toBe(true);
  });

  it("renvoie null sur un numéro inexploitable plutôt qu'un faux client", () => {
    expect(normalizePhone("12")).toBeNull();
    expect(normalizePhone("n/a")).toBeNull();
  });
});

describe("computeCoreTotals", () => {
  it("agrège CA, commandes, unités et clients distincts", () => {
    const totals = computeCoreTotals([
      order({ phone: "20111111", items: [product(1, "A", 2, 10000)] }),
      order({ phone: "+216 20 111 111", items: [product(1, "A", 1, 10000)] }),
      order({ phone: "20222222", items: [product(2, "B", 3, 5000)] }),
    ]);
    expect(totals.revenueMillimes).toBe(20000 + 10000 + 15000);
    expect(totals.orders).toBe(3);
    expect(totals.unitsSold).toBe(6);
    // Les deux premières commandes sont le même client sous deux formes.
    expect(totals.customers).toBe(2);
    expect(totals.aovMillimes).toBe(15000);
  });

  it("ne divise pas par zéro sur une période vide", () => {
    expect(computeCoreTotals([])).toMatchObject({ aovMillimes: 0, orders: 0 });
  });

  it("compte les commandes sans identité exploitable à part", () => {
    const totals = computeCoreTotals([order({ phone: "??" })]);
    expect(totals.customers).toBe(0);
    expect(totals.ordersWithoutCustomerId).toBe(1);
    // Le CA reste compté : la vente a bien eu lieu.
    expect(totals.revenueMillimes).toBe(20000);
  });
});

describe("percentChange", () => {
  it("calcule la variation", () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange(80, 100)).toBeCloseTo(-20);
  });

  it("renvoie null quand la période précédente est à zéro", () => {
    // « +100 % » à partir de rien n'informe sur rien.
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("computeCustomerSplit", () => {
  it("sépare nouveaux et revenants sur l'historique antérieur", () => {
    const split = computeCustomerSplit(
      [
        order({ phone: "20111111", items: [product(1, "A", 1, 10000)] }),
        order({ phone: "20222222", items: [product(1, "A", 1, 30000)] }),
        order({ phone: "20222222", items: [product(1, "A", 1, 20000)] }),
      ],
      new Set(["20222222"]),
    );
    expect(split.newCustomers).toBe(1);
    expect(split.returningCustomers).toBe(1);
    expect(split.newRevenueMillimes).toBe(10000);
    expect(split.returningRevenueMillimes).toBe(50000);
    expect(split.repeatOrderRate).toBeCloseTo(2 / 3);
  });
});

describe("computeProductStats", () => {
  it("ne fusionne pas les packs sous une même entrée", () => {
    const stats = computeProductStats([
      order({ items: [pack("p1", "Pack Fête", 1, 60000), pack("p2", "Pack Duo", 1, 40000)] }),
    ]);
    expect(stats).toHaveLength(2);
    // Chaque clé est unique — sert de key React sans collision.
    expect(new Set(stats.map((s) => s.key)).size).toBe(2);
  });

  it("classe par CA et calcule la part du total", () => {
    const stats = computeProductStats([
      order({ items: [product(1, "Cher", 1, 75000), product(2, "Moins cher", 1, 25000)] }),
    ]);
    expect(stats[0]!.name).toBe("Cher");
    expect(stats[0]!.revenueShare).toBeCloseTo(0.75);
    expect(stats[1]!.revenueShare).toBeCloseTo(0.25);
  });

  it("compte une commande une seule fois même si l'article y figure deux fois", () => {
    const stats = computeProductStats([
      order({ items: [product(1, "A", 1, 10000), product(1, "A", 2, 10000)] }),
    ]);
    expect(stats[0]!.orders).toBe(1);
    expect(stats[0]!.unitsSold).toBe(3);
  });
});

describe("computeGovernorateStats", () => {
  it("donne le produit préféré de chaque gouvernorat", () => {
    const stats = computeGovernorateStats([
      order({ governorate: "Sousse", phone: "20111111", items: [product(1, "Pistache", 5, 10000)] }),
      order({ governorate: "Sousse", phone: "20222222", items: [product(2, "Dattes", 1, 10000)] }),
      order({ governorate: "Tunis", phone: "20333333", items: [product(2, "Dattes", 2, 10000)] }),
    ]);
    const sousse = stats.find((s) => s.governorate === "Sousse")!;
    expect(sousse.topProductName).toBe("Pistache");
    expect(sousse.customers).toBe(2);
    expect(sousse.revenueMillimes).toBe(60000);
    expect(stats.find((s) => s.governorate === "Tunis")!.topProductName).toBe("Dattes");
  });
});

describe("computeDeliveryImpact", () => {
  it("mesure le CA perdu et les taux sur TOUTES les commandes", () => {
    const impact = computeDeliveryImpact([
      order({ status: "terminee", items: [product(1, "A", 1, 10000)] }),
      order({ status: "terminee", items: [product(1, "A", 1, 10000)] }),
      order({ status: "nouvelle", items: [product(1, "A", 1, 10000)] }),
      order({ status: "annulee", items: [product(1, "A", 1, 40000)] }),
    ]);
    expect(impact.completed).toBe(2);
    expect(impact.cancelled).toBe(1);
    expect(impact.inProgress).toBe(1);
    expect(impact.cancellationRate).toBeCloseTo(0.25);
    expect(impact.lostRevenueMillimes).toBe(40000);
    // Pas de frais de livraison pour une commande annulée.
    expect(impact.deliveryCostMillimes).toBe(24000);
  });
});
