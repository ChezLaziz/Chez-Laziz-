import { describe, expect, it } from "vitest";
import { ETIQUETTE_LONGUEUR_MAX, etiquettePropre } from "./etiquette";

describe("étiquette d'un lien — ce qu'on a le droit de garder", () => {
  it("ne touche pas à un identifiant de publicité", () => {
    expect(etiquettePropre("120249779868510674")).toBe("120249779868510674");
    expect(etiquettePropre("link_in_bio")).toBe("link_in_bio");
    expect(etiquettePropre("حملة نوفمبر")).toBe("حملة نوفمبر");
  });

  it("retire les caractères de contrôle, où qu'ils soient", () => {
    // Le caractère nul fait refuser la commande entière par Postgres.
    expect(etiquettePropre("\u0000")).toBe("");
    expect(etiquettePropre("abc\u0000def")).toBe("abcdef");
    expect(etiquettePropre("a\tb\nc\r\u007f\u0085d")).toBe("abcd");
  });

  it("retire les espaces autour, y compris ceux qu'un caractère de contrôle cachait", () => {
    expect(etiquettePropre("  pub  ")).toBe("pub");
    expect(etiquettePropre(" \u0000 pub \u0000 ")).toBe("pub");
  });

  it("borne la longueur sans laisser une moitié d'emoji", () => {
    const longue = "x".repeat(ETIQUETTE_LONGUEUR_MAX - 1) + "😀" + "suite";
    const propre = etiquettePropre(longue);
    expect(propre).toBe("x".repeat(ETIQUETTE_LONGUEUR_MAX - 1));
    expect(() => encodeURIComponent(propre)).not.toThrow();
    expect(etiquettePropre("y".repeat(500))).toHaveLength(ETIQUETTE_LONGUEUR_MAX);
  });

  it("retire un demi-caractère arrivé tel quel", () => {
    expect(etiquettePropre("promo\ud83d")).toBe("promo");
    expect(etiquettePropre("\udc00promo")).toBe("promo");
  });

  it("rend une chaîne vide pour tout ce qui n'est pas un texte", () => {
    expect(etiquettePropre(null)).toBe("");
    expect(etiquettePropre(undefined)).toBe("");
    expect(etiquettePropre(42 as unknown as string)).toBe("");
  });

  it("est stable : nettoyer deux fois ne change plus rien", () => {
    for (const brut of ["  a\u0000 b ", "x".repeat(130) + " ", "😀".repeat(70), " \u0000 "]) {
      const une = etiquettePropre(brut);
      expect(etiquettePropre(une)).toBe(une);
    }
  });
});
