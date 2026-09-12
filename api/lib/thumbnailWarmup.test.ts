import { describe, expect, it } from "vitest";
import { cleDepuisUrl } from "./thumbnailWarmup";

describe("cleDepuisUrl", () => {
  it("extrait la clé d'une photo uploadée, sans la largeur demandée", () => {
    expect(cleDepuisUrl("/api/uploads/products/1788457118039-463bf3b96922.jpg")).toBe(
      "products/1788457118039-463bf3b96922.jpg",
    );
    expect(cleDepuisUrl("/api/uploads/site/abc.jpg?w=400")).toBe("site/abc.jpg");
  });

  it("ignore les photos du thème, les liens externes et le vide", () => {
    expect(cleDepuisUrl("/images/products/makroudh-dattes.jpg")).toBeNull();
    expect(cleDepuisUrl("https://example.com/x.jpg")).toBeNull();
    expect(cleDepuisUrl("")).toBeNull();
    expect(cleDepuisUrl(null)).toBeNull();
  });

  it("refuse une clé qui sortirait des dossiers autorisés", () => {
    expect(cleDepuisUrl("/api/uploads/../secret.jpg")).toBeNull();
    expect(cleDepuisUrl("/api/uploads/products/x.exe")).toBeNull();
  });
});
