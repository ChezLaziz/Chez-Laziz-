import { describe, it, expect } from "vitest";
import { computeAcquisition, computeAdPerformance } from "./acquisition";
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

describe("computeAdPerformance — ce qu'une publicité a vraiment vendu", () => {
  const AD_A = "120249779868510674";
  const AD_B = "120249779869040674";

  it("compte les commandes PASSÉES, annulées comprises, et sépare ce qui a été vendu", () => {
    const p = computeAdPerformance([
      order({ acquisitionSource: "facebook", acquisitionContent: AD_A, subtotalMillimes: 40000 }),
      order({ acquisitionSource: "facebook", acquisitionContent: AD_A, subtotalMillimes: 60000 }),
      order({ acquisitionSource: "facebook", acquisitionContent: AD_A, status: "annulee", subtotalMillimes: 99000 }),
    ]);
    expect(p.rows).toHaveLength(1);
    const a = p.rows[0]!;
    expect(a.label).toBe(AD_A);
    expect(a.placed).toBe(3);
    expect(a.orders).toBe(2);
    expect(a.cancelled).toBe(1);
    // L'annulée ne compte ni dans le chiffre d'affaires ni dans le panier.
    expect(a.revenueMillimes).toBe(100000);
    expect(a.aovMillimes).toBe(50000);
  });

  it("une même publicité sur Facebook ET Instagram reste UNE publicité", () => {
    const p = computeAdPerformance([
      order({ acquisitionSource: "facebook", acquisitionContent: AD_A }),
      order({ acquisitionSource: "instagram", acquisitionContent: AD_A }),
      order({ acquisitionSource: "autre", acquisitionContent: AD_A }),
    ]);
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0]!.placed).toBe(3);
    expect(p.rows[0]!.sources).toEqual(["autre", "facebook", "instagram"]);
  });

  it("trie par commandes passées, la ligne sans étiquette TOUJOURS en dernier", () => {
    const p = computeAdPerformance([
      // Six commandes sans étiquette : le plus gros volume, mais ce n'est
      // pas une publicité et elle ne doit pas passer pour la meilleure.
      ...Array.from({ length: 6 }, () => order({ acquisitionSource: "facebook" })),
      order({ acquisitionSource: "facebook", acquisitionContent: AD_B }),
      order({ acquisitionSource: "facebook", acquisitionContent: AD_A }),
      order({ acquisitionSource: "facebook", acquisitionContent: AD_A }),
    ]);
    expect(p.rows.map((r) => r.label)).toEqual([AD_A, AD_B, null]);
    expect(p.rows[2]!.placed).toBe(6);
    // Le total reste le total : rien ne disparaît du tableau.
    expect(p.rows.reduce((n, r) => n + r.placed, 0)).toBe(p.placed);
  });

  it("range aussi sous « sans étiquette » les commandes d'origine inconnue", () => {
    const p = computeAdPerformance([order(), order({ acquisitionSource: "direct" })]);
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0]!.label).toBeNull();
    expect(p.rows[0]!.placed).toBe(2);
    expect(p.rows[0]!.sources).toEqual(["direct"]);
  });

  it("dit combien de commandes le Pixel a vues — par publicité et au total", () => {
    const p = computeAdPerformance([
      order({ acquisitionContent: AD_A, pixelSeen: true }),
      order({ acquisitionContent: AD_A, pixelSeen: false }),
      order({ acquisitionContent: AD_A }),
      order({ acquisitionContent: AD_B, pixelSeen: true, status: "annulee" }),
    ]);
    expect(p.rows.find((r) => r.label === AD_A)!.pixelSeen).toBe(1);
    // Une commande annulée a quand même été vue par le Pixel.
    expect(p.rows.find((r) => r.label === AD_B)!.pixelSeen).toBe(1);
    expect(p.pixelSeen).toBe(2);
    expect(p.pixelCoverage).toBe(0.5);
  });

  it("retient la campagne la plus fréquente et les dates de la première et de la dernière commande", () => {
    const p = computeAdPerformance([
      order({ acquisitionContent: AD_A, acquisitionCampaign: "C1", createdAt: new Date("2026-10-03T10:00:00Z") }),
      order({ acquisitionContent: AD_A, acquisitionCampaign: "C2", createdAt: new Date("2026-10-01T08:00:00Z") }),
      order({ acquisitionContent: AD_A, acquisitionCampaign: "C2", createdAt: new Date("2026-11-19T21:00:00Z") }),
    ]);
    const a = p.rows[0]!;
    expect(a.campaign).toBe("C2");
    expect(a.firstOrderAt).toBe("2026-10-01T08:00:00.000Z");
    expect(a.lastOrderAt).toBe("2026-11-19T21:00:00.000Z");
  });

  it("une étiquette faite d'espaces n'est pas une étiquette", () => {
    const p = computeAdPerformance([order({ acquisitionContent: "   " })]);
    expect(p.rows[0]!.label).toBeNull();
  });

  it("période vide : aucun taux inventé", () => {
    expect(computeAdPerformance([])).toEqual({ rows: [], placed: 0, pixelSeen: 0, pixelCoverage: 0 });
  });
});
