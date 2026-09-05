import { describe, it, expect } from "vitest";
import {
  ALLOWED_WEIGHTS_KG,
  isValidWeight,
  formatWeight,
  priceForWeight,
  isValidPaymentMethod,
  DELIVERY_FEE_MILLIMES,
  formatDinars,
  TUNISIA_GOVERNORATES,
  GOVERNORATE_LABELS_AR,
  governorateLabel,
} from "./shop";

describe("weight rules", () => {
  it("accepts only the five allowed weights", () => {
    for (const w of ALLOWED_WEIGHTS_KG) expect(isValidWeight(w)).toBe(true);
  });

  it("rejects weights outside the allowed list", () => {
    expect(isValidWeight(0.25)).toBe(false);
    expect(isValidWeight(0.75)).toBe(false);
    expect(isValidWeight(3)).toBe(false);
    expect(isValidWeight("1")).toBe(false);
    expect(isValidWeight(null)).toBe(false);
  });

  it("formats sub-kilogram weights in grams", () => {
    expect(formatWeight(0.5)).toBe("500 g");
  });

  it("formats kilogram weights with a comma", () => {
    expect(formatWeight(1)).toBe("1 kg");
    expect(formatWeight(1.5)).toBe("1,5 kg");
    expect(formatWeight(2.5)).toBe("2,5 kg");
  });
});

describe("priceForWeight — 1kg base price is the source of truth", () => {
  it("computes every allowed weight proportionally from the 1kg price", () => {
    const basePricePerKg = 40000; // 40.000 TND
    expect(priceForWeight(basePricePerKg, 0.5)).toBe(20000);
    expect(priceForWeight(basePricePerKg, 1)).toBe(40000);
    expect(priceForWeight(basePricePerKg, 1.5)).toBe(60000);
    expect(priceForWeight(basePricePerKg, 2)).toBe(80000);
    expect(priceForWeight(basePricePerKg, 2.5)).toBe(100000);
  });

  it("never treats the stored price as a 500g price", () => {
    // Une erreur classique serait de diviser par 2 au lieu de multiplier —
    // ce test échouerait immédiatement si quelqu'un réintroduit ce bug.
    const basePricePerKg = 8000;
    expect(priceForWeight(basePricePerKg, 1)).toBe(8000);
    expect(priceForWeight(basePricePerKg, 0.5)).toBe(4000);
  });

  it("rounds to the nearest millime (no fractional currency units)", () => {
    expect(priceForWeight(8001, 0.5)).toBe(4001); // 4000.5 arrondi
  });
});

describe("payment method rules", () => {
  it("accepts only cod and d17", () => {
    expect(isValidPaymentMethod("cod")).toBe(true);
    expect(isValidPaymentMethod("d17")).toBe(true);
  });

  it("rejects any other payment method", () => {
    expect(isValidPaymentMethod("stripe")).toBe(false);
    expect(isValidPaymentMethod("paypal")).toBe(false);
    expect(isValidPaymentMethod("")).toBe(false);
    expect(isValidPaymentMethod(undefined)).toBe(false);
  });
});

describe("delivery fee", () => {
  it("is fixed at 8 DT regardless of order size", () => {
    expect(DELIVERY_FEE_MILLIMES).toBe(8000);
  });
});

describe("formatDinars", () => {
  it("drops the millimes entirely on whole dinars", () => {
    expect(formatDinars(8000)).toBe("8");
    expect(formatDinars(25000)).toBe("25");
    expect(formatDinars(0)).toBe("0");
  });

  it("keeps only the significant millimes", () => {
    expect(formatDinars(69900)).toBe("69,9");
    expect(formatDinars(4500)).toBe("4,5");
    expect(formatDinars(12750)).toBe("12,75");
    expect(formatDinars(8123)).toBe("8,123");
  });

  it("keeps the leading zero of a sub-100 millimes remainder", () => {
    expect(formatDinars(8050)).toBe("8,05");
    expect(formatDinars(8005)).toBe("8,005");
  });

  it("handles amounts below one dinar and negatives", () => {
    expect(formatDinars(500)).toBe("0,5");
    expect(formatDinars(-4500)).toBe("-4,5");
  });

  it("round-trips through the admin price input parser", () => {
    // L'admin réinjecte la valeur affichée dans un <input>, puis la reparse
    // (voir toMillimes dans AdminPage.tsx) — le format doit survivre au trajet.
    const parse = (s: string) => Math.round(parseFloat(s.replace(",", ".")) * 1000);
    for (const m of [8000, 69900, 4500, 12750, 8050, 25000, 500]) {
      expect(parse(formatDinars(m))).toBe(m);
    }
  });
});

describe("governorate labels", () => {
  it("translates every governorate, so no French name leaks into the Arabic form", () => {
    for (const g of TUNISIA_GOVERNORATES) {
      expect(GOVERNORATE_LABELS_AR[g], `missing Arabic label for ${g}`).toBeTruthy();
      expect(governorateLabel(g, "ar")).toBe(GOVERNORATE_LABELS_AR[g]);
    }
  });

  it("never changes the value sent to the server — only the displayed label", () => {
    // Le serveur valide la commande contre TUNISIA_GOVERNORATES : si un jour
    // quelqu'un traduit les valeurs et pas seulement les libellés, toute
    // commande arabe échouerait. Ce test est là pour l'empêcher.
    expect(governorateLabel("Kairouan", "fr")).toBe("Kairouan");
    expect(TUNISIA_GOVERNORATES).toContain("Kairouan");
    for (const label of Object.values(GOVERNORATE_LABELS_AR)) {
      expect(TUNISIA_GOVERNORATES).not.toContain(label as never);
    }
  });
});
