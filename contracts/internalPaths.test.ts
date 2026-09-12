import { describe, expect, it } from "vitest";
import { estCheminInterne } from "./internalPaths";

describe("estCheminInterne", () => {
  it("reconnaît les pages de travail", () => {
    expect(estCheminInterne("/admin")).toBe(true);
    expect(estCheminInterne("/atelier")).toBe(true);
    expect(estCheminInterne("/admin/commandes")).toBe(true);
  });

  it("laisse passer tout le site public, arabe compris", () => {
    for (const p of ["/", "/ar", "/collection", "/ar/commande", "/makroudh-fruits-secs"]) {
      expect(estCheminInterne(p)).toBe(false);
    }
  });

  it("ne se laisse pas avoir par un chemin public qui COMMENCE pareil", () => {
    // Sans le test de frontière, une page publique « /atelier-de-laziz »
    // disparaîtrait des statistiques sans que personne ne le remarque.
    expect(estCheminInterne("/atelier-de-laziz")).toBe(false);
    expect(estCheminInterne("/administration-des-ventes")).toBe(false);
  });
});
