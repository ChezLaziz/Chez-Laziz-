import { describe, it, expect } from "vitest";
import { aggregateTopProducts } from "./dashboard";

// Formes réelles produites par ordersRouter.create :
// - produit au poids : productId, pas de packId
// - pack prêt        : packId, PAS de productId
// - Custom Pack      : ni l'un ni l'autre
const product = (productId: number, name: string, qty: number, unit: number) => ({
  kind: "product" as const,
  productId,
  name,
  qty,
  unitPriceMillimes: unit,
});
const pack = (packId: string, name: string, qty: number, unit: number) => ({
  kind: "pack" as const,
  packId,
  name,
  qty,
  unitPriceMillimes: unit,
});
const custom = (qty: number, unit: number) => ({
  kind: "custom" as const,
  name: "Custom Pack",
  qty,
  unitPriceMillimes: unit,
});

describe("aggregateTopProducts", () => {
  it("keeps each fixed pack as its own row instead of merging them all", () => {
    // Régression : le regroupement se faisait sur it.productId seul. Les
    // packs n'en ont pas, donc VIP, Premium et le Custom Pack tombaient tous
    // dans la même entrée `undefined` et étaient additionnés sous le nom du
    // premier — le classement des meilleures ventes devenait faux.
    const top = aggregateTopProducts([
      [pack("vip", "Laziz VIP", 1, 69900)],
      [pack("premium", "Laziz Premium", 2, 49900)],
      [custom(1, 55000)],
    ]);

    expect(top.map((t) => t.name).sort()).toEqual([
      "Custom Pack",
      "Laziz Premium",
      "Laziz VIP",
    ]);
    expect(top.find((t) => t.name === "Laziz VIP")).toMatchObject({
      qtySold: 1,
      revenueMillimes: 69900,
    });
    expect(top.find((t) => t.name === "Laziz Premium")).toMatchObject({
      qtySold: 2,
      revenueMillimes: 99800,
    });
  });

  it("sums the same pack sold across several orders", () => {
    const top = aggregateTopProducts([
      [pack("vip", "Laziz VIP", 1, 69900)],
      [pack("vip", "Laziz VIP", 3, 69900)],
    ]);
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({ qtySold: 4, revenueMillimes: 279600 });
  });

  it("still groups plain products by id, and keeps packs separate from them", () => {
    const top = aggregateTopProducts([
      [product(1, "Makroudh aux Dattes", 2, 8000), pack("vip", "Laziz VIP", 1, 69900)],
      [product(1, "Makroudh aux Dattes", 3, 8000)],
    ]);
    expect(top).toHaveLength(2);
    expect(top.find((t) => t.productId === 1)).toMatchObject({
      qtySold: 5,
      revenueMillimes: 40000,
    });
  });

  it("ranks by quantity sold and respects the limit", () => {
    const top = aggregateTopProducts(
      [
        [product(1, "A", 1, 1000)],
        [product(2, "B", 9, 1000)],
        [product(3, "C", 5, 1000)],
      ],
      2,
    );
    expect(top.map((t) => t.name)).toEqual(["B", "C"]);
  });

  it("does not crash on legacy lines that carry no identifier at all", () => {
    const top = aggregateTopProducts([[{ name: "Ancienne ligne", qty: 2, unitPriceMillimes: 5000 }]]);
    expect(top).toEqual([
      { productId: 0, name: "Ancienne ligne", qtySold: 2, revenueMillimes: 10000 },
    ]);
  });
});
