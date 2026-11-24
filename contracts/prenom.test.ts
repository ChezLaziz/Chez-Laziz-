import { describe, expect, it } from "vitest";
import { prenomPourSaluer } from "./prenom";

describe("prenomPourSaluer", () => {
  it("prend le premier mot d'un nom ordinaire, en latin comme en arabe", () => {
    expect(prenomPourSaluer("Amina Hamdi")).toBe("Amina");
    expect(prenomPourSaluer("  أمينة  الحمدي ")).toBe("أمينة");
    expect(prenomPourSaluer("Abdelkader")).toBe("Abdelkader");
  });

  it("ne salue pas par un titre", () => {
    for (const nom of ["Mme Hamdi", "Mr. Ali", "M. Trabelsi", "Dr Sana", "السيدة أمينة", "الحاج محمد", "Si Ahmed"]) {
      expect(prenomPourSaluer(nom), nom).toBe("");
    }
  });

  it("ne coupe pas un nom de famille ou un prénom composé en deux", () => {
    for (const nom of ["Ben Ali Mohamed", "بن علي محمد", "عبد الله", "Abd El Kader", "Bou Azizi", "El Hamdi Sami"]) {
      expect(prenomPourSaluer(nom), nom).toBe("");
    }
  });

  it("ne rend rien pour un champ sans lettre", () => {
    expect(prenomPourSaluer("")).toBe("");
    expect(prenomPourSaluer("   ")).toBe("");
    expect(prenomPourSaluer("20123456")).toBe("");
    expect(prenomPourSaluer("...")).toBe("");
  });

  it("borne la longueur : le champ vient d'un formulaire public", () => {
    expect(prenomPourSaluer("A".repeat(80)).length).toBe(24);
  });

  it("ne rend jamais la moitié d'un emoji : encodeURIComponent lèverait sur le lien", () => {
    // Vingt-trois unités puis un emoji : la coupe à vingt-quatre tombe en
    // plein milieu. Avant, la notification Telegram de cette commande ne
    // partait pas et la page « Suivi des colis » ne s'ouvrait plus.
    for (const nom of ["Amina" + "😀".repeat(15), "A".repeat(23) + "🎉 Hamdi", "أمينة" + "🌙".repeat(20)]) {
      const p = prenomPourSaluer(nom);
      expect(p.length, nom).toBeLessThanOrEqual(24);
      expect(() => encodeURIComponent(p), nom).not.toThrow();
    }
    expect(prenomPourSaluer("A".repeat(23) + "🎉")).toBe("A".repeat(23));
    // Un emoji entier, lui, reste.
    expect(prenomPourSaluer("Amina🌙 Hamdi")).toBe("Amina🌙");
  });
});
