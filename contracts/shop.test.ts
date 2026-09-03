import { describe, it, expect } from "vitest";
import {
  ALLOWED_WEIGHTS_KG,
  isValidWeight,
  formatWeight,
  priceForWeight,
  isValidPaymentMethod,
  DELIVERY_FEE_MILLIMES,
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
  it("is fixed at 8.000 TND regardless of order size", () => {
    expect(DELIVERY_FEE_MILLIMES).toBe(8000);
  });
});
