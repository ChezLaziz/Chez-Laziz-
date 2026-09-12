// Les garde-fous de la vignette : une largeur libre laisserait n'importe qui
// fabriquer des milliers d'objets dans le seau, et une clé mal formée
// écraserait l'originale.
import { describe, expect, it } from "vitest";
import { LARGEURS_VIGNETTES, estLargeurServie } from "./r2";

describe("estLargeurServie", () => {
  it("n'accepte QUE la liste fermée", () => {
    for (const w of LARGEURS_VIGNETTES) expect(estLargeurServie(w)).toBe(true);
    for (const w of [0, 1, 199, 401, 1600, 99999, -400, 3.5]) {
      expect(estLargeurServie(w)).toBe(false);
    }
  });

  it("couvre les tailles réellement affichées : vignette, carte, grande carte", () => {
    // ~96 px (puce de saveur), ~190 px (carte à deux colonnes sur téléphone),
    // et le double pour les écrans à forte densité.
    expect(LARGEURS_VIGNETTES).toEqual([200, 400, 800]);
  });
});
