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
});
