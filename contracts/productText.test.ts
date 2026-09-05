import { describe, it, expect } from "vitest";
import { productName, productDescription } from "./productText";

const full = {
  name: "Makroudh Jwayed",
  description: "Makroudh aux dattes et amandes.",
  nameAr: "مقروض جوايد",
  descriptionAr: "مقروض بالتمر واللوز.",
};

describe("productName", () => {
  it("returns the French name in French", () => {
    expect(productName(full, "fr")).toBe("Makroudh Jwayed");
  });

  it("returns the Arabic name in Arabic", () => {
    expect(productName(full, "ar")).toBe("مقروض جوايد");
  });

  it("falls back to French when the product has no Arabic name yet", () => {
    expect(productName({ name: "Nouveau produit" }, "ar")).toBe("Nouveau produit");
    expect(productName({ name: "X", nameAr: null }, "ar")).toBe("X");
    expect(productName({ name: "X", nameAr: "   " }, "ar")).toBe("X");
  });

  it("never returns the Arabic name on the French side", () => {
    expect(productName(full, "fr")).not.toBe(full.nameAr);
  });
});

describe("productDescription", () => {
  it("follows the language, with a French fallback", () => {
    expect(productDescription(full, "fr")).toBe("Makroudh aux dattes et amandes.");
    expect(productDescription(full, "ar")).toBe("مقروض بالتمر واللوز.");
    expect(productDescription({ name: "X", description: "Desc FR" }, "ar")).toBe("Desc FR");
  });

  it("returns null when there is no description in either language", () => {
    expect(productDescription({ name: "X" }, "ar")).toBeNull();
    expect(productDescription({ name: "X", description: null }, "fr")).toBeNull();
  });

  it("falls back independently of the name (a name can be translated but not the description)", () => {
    const partial = { name: "X", description: "Desc FR", nameAr: "س" };
    expect(productName(partial, "ar")).toBe("س");
    expect(productDescription(partial, "ar")).toBe("Desc FR");
  });
});
