import { describe, it, expect } from "vitest";
import { computeAcquisition } from "./acquisition";
import type { AnalyticsOrder } from "./metrics";

let nextId = 1;
function order(over: Partial<AnalyticsOrder> = {}): AnalyticsOrder {
  return {
    id: nextId++,
    phone: "20123456",
    customerName: "T",
    governorate: "Sousse",
    status: "terminee",
    paymentMethod: "cod",
    paymentStatus: "paid",
    subtotalMillimes: 10000,
    deliveryFeeMillimes: 8000,
    items: [],
    createdAt: new Date("2026-09-01T10:00:00"),
    ...over,
  };
}

describe("computeAcquisition — origine inconnue", () => {
  it("ne range pas une origine absente en « direct »", () => {
    // Confondre « non mesuré » et « venu directement » ferait croire que la
    // publicité n'apporte rien.
    const a = computeAcquisition([order(), order()]);
    expect(a.bySource).toEqual([]);
    expect(a.attributedOrders).toBe(0);
    expect(a.unknownOrders).toBe(2);
    expect(a.orderCoverage).toBe(0);
    expect(a.hasAnyAttribution).toBe(false);
  });

  it("distingue « direct » explicite d'une origine absente", () => {
    const a = computeAcquisition([order({ acquisitionSource: "direct" }), order()]);
    expect(a.bySource).toHaveLength(1);
    expect(a.bySource[0]!.source).toBe("direct");
    expect(a.attributedOrders).toBe(1);
    expect(a.unknownOrders).toBe(1);
    expect(a.orderCoverage).toBeCloseTo(0.5);
  });
});

describe("computeAcquisition — répartition", () => {
  it("agrège commandes, CA et panier par origine", () => {
    const a = computeAcquisition([
      order({ acquisitionSource: "tiktok", subtotalMillimes: 30000 }),
      order({ acquisitionSource: "tiktok", subtotalMillimes: 10000 }),
      order({ acquisitionSource: "instagram", subtotalMillimes: 40000 }),
    ]);
    const tiktok = a.bySource.find((s) => s.source === "tiktok")!;
    expect(tiktok.orders).toBe(2);
    expect(tiktok.revenueMillimes).toBe(40000);
    expect(tiktok.aovMillimes).toBe(20000);
    // Classé par CA : Instagram et TikTok sont à égalité à 40 000.
    expect(a.bySource).toHaveLength(2);
  });

  it("calcule la part sur le CA attribué, pas sur le total", () => {
    // Une commande non attribuée ne doit pas diluer les parts, sinon elles
    // bougeraient quand la couverture change sans qu'aucune vente ne change.
    const a = computeAcquisition([
      order({ acquisitionSource: "tiktok", subtotalMillimes: 30000 }),
      order({ acquisitionSource: "instagram", subtotalMillimes: 10000 }),
      order({ subtotalMillimes: 60000 }),
    ]);
    expect(a.bySource.find((s) => s.source === "tiktok")!.revenueShare).toBeCloseTo(0.75);
    expect(a.revenueCoverage).toBeCloseTo(0.4);
  });
});

describe("computeAcquisition — campagnes et créatives", () => {
  it("ne fusionne pas deux campagnes homonymes de plateformes différentes", () => {
    // « bio » sur TikTok et « bio » sur Facebook sont deux campagnes : les
    // regrouper sous le seul libellé en rendait une invisible.
    const a = computeAcquisition([
      order({ acquisitionSource: "tiktok", acquisitionCampaign: "bio", subtotalMillimes: 30000 }),
      order({ acquisitionSource: "facebook", acquisitionCampaign: "bio", subtotalMillimes: 10000 }),
    ]);
    expect(a.byCampaign).toHaveLength(2);
    expect(new Set(a.byCampaign.map((c) => c.key)).size).toBe(2);
    expect(a.byCampaign.map((c) => c.label)).toEqual(["bio", "bio"]);
    expect(a.byCampaign.find((c) => c.source === "tiktok")!.revenueMillimes).toBe(30000);
  });

  it("regroupe bien la même campagne sur la même plateforme", () => {
    const a = computeAcquisition([
      order({ acquisitionSource: "tiktok", acquisitionCampaign: "bio", subtotalMillimes: 10000 }),
      order({ acquisitionSource: "tiktok", acquisitionCampaign: "bio", subtotalMillimes: 20000 }),
    ]);
    expect(a.byCampaign).toHaveLength(1);
    expect(a.byCampaign[0]!.orders).toBe(2);
    expect(a.byCampaign[0]!.revenueMillimes).toBe(30000);
  });

  it("sépare les créatives de la même façon", () => {
    const a = computeAcquisition([
      order({ acquisitionSource: "tiktok", acquisitionContent: "video-1" }),
      order({ acquisitionSource: "instagram", acquisitionContent: "video-1" }),
    ]);
    expect(a.byCreative).toHaveLength(2);
    expect(new Set(a.byCreative.map((c) => c.key)).size).toBe(2);
  });
});

describe("computeAcquisition — appareils", () => {
  it("compte les appareils indépendamment de l'origine", () => {
    // Le type d'appareil est connu même quand l'origine ne l'est pas.
    const a = computeAcquisition([
      order({ deviceType: "mobile", subtotalMillimes: 30000 }),
      order({ deviceType: "desktop", subtotalMillimes: 10000 }),
    ]);
    expect(a.attributedOrders).toBe(0);
    expect(a.byDevice).toHaveLength(2);
    expect(a.byDevice[0]!.device).toBe("mobile");
    expect(a.byDevice[0]!.share).toBeCloseTo(0.75);
  });
});
