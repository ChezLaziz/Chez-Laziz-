import { describe, it, expect } from "vitest";
import {
  CUSTOM_PACK_PACKAGING_MILLIMES,
  CUSTOM_PACK_SIZE,
  CUSTOM_PACK_WEIGHT_KG,
  FIXED_PACKS,
  FIXED_PACK_IDS,
  PACK_ITEM_WEIGHT_KG,
  customPackProductsTotal,
  customPackTotal,
  formatPriceDT,
  getFixedPack,
  isValidCustomSelection,
  normalizeCustomSelection,
  packContents,
  packItemPrice,
  packWeightKg,
} from "./packs";

const byId = Object.fromEntries(FIXED_PACKS.map((p) => [p.id, p]));

describe("packs prêts — données de vente (source de vérité)", () => {
  it("il existe exactement 4 packs prêts (+ le Custom Pack = 5 options)", () => {
    expect(FIXED_PACKS).toHaveLength(4);
    expect(FIXED_PACKS.map((p) => p.id)).toEqual([...FIXED_PACK_IDS]);
  });

  it("prix exacts, jamais recalculés", () => {
    expect(byId.vip.priceMillimes).toBe(69900);
    expect(byId.premium.priceMillimes).toBe(49900);
    expect(byId.delice.priceMillimes).toBe(39900);
    expect(byId.classique.priceMillimes).toBe(29900);
  });

  it("VIP et Premium contiennent 4 produits ; Délice et Classique SEULEMENT 3", () => {
    expect(byId.vip.contents).toHaveLength(4);
    expect(byId.premium.contents).toHaveLength(4);
    expect(byId.delice.contents).toHaveLength(3);
    expect(byId.classique.contents).toHaveLength(3);
  });

  it("poids totaux : 2 kg, 2 kg, 1,5 kg, 1,5 kg", () => {
    expect(packWeightKg(byId.vip)).toBe(2);
    expect(packWeightKg(byId.premium)).toBe(2);
    expect(packWeightKg(byId.delice)).toBe(1.5);
    expect(packWeightKg(byId.classique)).toBe(1.5);
  });

  it("chaque produit d'un pack pèse 500 g", () => {
    expect(PACK_ITEM_WEIGHT_KG).toBe(0.5);
    for (const pack of FIXED_PACKS) {
      for (const c of packContents(pack)) expect(c.weightKg).toBe(0.5);
    }
  });

  it("le premier produit du VIP est exactement « Makroudh Laziz » (pas renommé)", () => {
    expect(byId.vip.contents[0]).toBe("Makroudh Laziz");
    expect(byId.vip.contents).toEqual([
      "Makroudh Laziz",
      "Makroudh Blanc à la Pistache",
      "Makroudh Blanc au Fraise",
      "Makroudh Zgougou",
    ]);
  });

  it("contenus exacts des autres packs", () => {
    expect(byId.premium.contents).toEqual([
      "Makroudh Blanc aux Figues",
      "Makroudh aux Amandes",
      "Makroudh Jwayed",
      "Makroudh aux Noisettes",
    ]);
    expect(byId.delice.contents).toEqual([
      "Makroudh au Blé",
      "Makroudh Jwayed",
      "Makroudh Blanc à la Pistache",
    ]);
    expect(byId.classique.contents).toEqual([
      "Makroudh Laziz aux Dattes",
      "Makroudh Jwayed",
      "Makroudh aux Noisettes",
    ]);
  });

  it("getFixedPack ne connaît que les 4 identifiants", () => {
    expect(getFixedPack("vip")?.name).toBe("Laziz VIP");
    expect(getFixedPack("gold")).toBeUndefined();
  });
});

describe("Custom Pack — calcul dynamique", () => {
  it("4 × 500 g = 2 kg, packaging 10,000 DT", () => {
    expect(CUSTOM_PACK_SIZE).toBe(4);
    expect(CUSTOM_PACK_WEIGHT_KG).toBe(2);
    expect(CUSTOM_PACK_PACKAGING_MILLIMES).toBe(10000);
  });

  it("chaque produit est facturé 500 g depuis son prix au kilo", () => {
    expect(packItemPrice(40000)).toBe(20000);
    expect(packItemPrice(9000)).toBe(4500);
  });

  it("exemple du cahier des charges : produits 79 DT → 89 DT final", () => {
    const bases = [50000, 40000, 38000, 30000]; // 25 + 20 + 19 + 15 = 79 DT
    expect(customPackProductsTotal(bases)).toBe(79000);
    expect(customPackTotal(bases)).toBe(89000);
  });

  it("le total suit toujours la sélection (rien n'est codé en dur)", () => {
    expect(customPackTotal([40000, 22000, 15000, 17000])).toBe(47000 + 10000);
    expect(customPackTotal([8000, 9000, 10000, 12000])).toBe(19500 + 10000);
  });

  it("accepte exactement 4 produits différents", () => {
    expect(isValidCustomSelection([1, 2, 3, 4])).toBe(true);
    expect(isValidCustomSelection([4, 1, 16, 5])).toBe(true);
  });

  it("refuse les doublons, les sélections incomplètes ou trop grandes", () => {
    expect(isValidCustomSelection([1, 1, 2, 3])).toBe(false);
    expect(isValidCustomSelection([1, 2, 3])).toBe(false);
    expect(isValidCustomSelection([1, 2, 3, 4, 5])).toBe(false);
    expect(isValidCustomSelection([])).toBe(false);
    expect(isValidCustomSelection([1, 2, 3, 1.5])).toBe(false);
    expect(isValidCustomSelection([1, 2, 3, "4"])).toBe(false);
  });

  it("normalise l'ordre pour reconnaître deux packs identiques", () => {
    expect(normalizeCustomSelection([16, 4, 1, 5])).toEqual([1, 4, 5, 16]);
  });
});

describe("formatPriceDT", () => {
  it("écrit les prix à la tunisienne", () => {
    expect(formatPriceDT(69900)).toBe("69,900 DT");
    expect(formatPriceDT(89000)).toBe("89,000 DT");
    expect(formatPriceDT(8000)).toBe("8,000 DT");
    expect(formatPriceDT(4500)).toBe("4,500 DT");
    expect(formatPriceDT(0)).toBe("0,000 DT");
  });
});
