import { describe, expect, it } from "vitest";
import { sansDemiCaracteres } from "./demiCaracteres";

describe("sansDemiCaracteres", () => {
  it("ne touche à rien dans un texte entier", () => {
    for (const texte of ["", "Amina Hamdi", "أمينة الحمدي", "ok 🎉 👋🏽 🇹🇳", "a\nb\tc", "€ • … —"]) {
      expect(sansDemiCaracteres(texte)).toBe(texte);
    }
  });

  it("retire une moitié orpheline, où qu'elle soit", () => {
    expect(sansDemiCaracteres("abc\uD83C")).toBe("abc"); // la première moitié, au bout
    expect(sansDemiCaracteres("\uDF89abc")).toBe("abc"); // la seconde, au début
    expect(sansDemiCaracteres("a\uD83Cb\uDF89c")).toBe("abc"); // séparées
    expect(sansDemiCaracteres("\uD83C🎉")).toBe("🎉"); // une orpheline devant un emoji entier
  });

  it("ce qui en sort passe toujours dans un lien", () => {
    // Toutes les coupes possibles d'un texte plein d'emojis.
    const texte = "Amina 😀🎉 أمينة 🌙👋🏽 fin";
    for (let i = 0; i <= texte.length; i++) {
      const coupe = sansDemiCaracteres(texte.slice(0, i));
      expect(() => encodeURIComponent(coupe)).not.toThrow();
      expect(coupe.length).toBeGreaterThanOrEqual(i - 1);
    }
  });
});
