import { describe, it, expect } from "vitest";
import { extractDelegations } from "./tpe";

/** La forme exacte de la réponse de Team Parcel Express n'est pas connue :
 * leur API n'est pas documentée. L'extraction est donc écrite pour tenir
 * debout devant plusieurs formes plausibles — et pour REFUSER une ligne
 * qu'elle ne comprend pas, plutôt que d'inventer un identifiant.
 *
 * Un identifiant de délégation faux est la pire issue possible : le colis
 * partirait vers une autre ville sans que rien ne le signale. */

describe("extractDelegations — formes de réponse", () => {
  it("lit une liste simple", () => {
    const d = extractDelegations([
      { id: 12, name: "Gafsa Sud", governorate: "Gafsa" },
      { id: 13, name: "Le Bardo", governorate: "Tunis" },
    ]);
    expect(d).toHaveLength(2);
    expect(d[0]).toMatchObject({ externalId: "12", name: "Gafsa Sud", governorate: "Gafsa" });
  });

  it("lit une réponse paginée Django (results)", () => {
    // Django REST Framework enveloppe très souvent les listes ainsi.
    const d = extractDelegations({
      count: 2,
      next: null,
      results: [{ id: 1, name: "Sfax Ville", governorate: "Sfax" }],
    });
    expect(d).toHaveLength(1);
    expect(d[0]!.name).toBe("Sfax Ville");
  });

  it("accepte un gouvernorat imbriqué comme objet", () => {
    const d = extractDelegations([{ id: 5, name: "Kalaa Sghira", governorate: { id: 3, name: "Sousse" } }]);
    expect(d[0]!.governorate).toBe("Sousse");
  });

  it("accepte les noms de champs alternatifs", () => {
    const d = extractDelegations([{ pk: 9, label: "Kairouan Nord", governorate_name: "Kairouan" }]);
    expect(d[0]).toMatchObject({ externalId: "9", name: "Kairouan Nord", governorate: "Kairouan" });
  });

  it("accepte un identifiant textuel", () => {
    const d = extractDelegations([{ id: "DEL-77", name: "Menzel Bourguiba" }]);
    expect(d[0]!.externalId).toBe("DEL-77");
  });
});

describe("extractDelegations — ce qu'elle refuse", () => {
  it("IGNORE une ligne sans identifiant plutôt que d'en fabriquer un", () => {
    // Un identifiant inventé enverrait le colis dans une autre ville.
    const d = extractDelegations([{ name: "Sans identifiant" }, { id: 4, name: "Valide" }]);
    expect(d).toHaveLength(1);
    expect(d[0]!.name).toBe("Valide");
  });

  it("ignore une ligne sans nom", () => {
    expect(extractDelegations([{ id: 4 }])).toEqual([]);
  });

  it("laisse le gouvernorat vide s'il est absent, sans le deviner", () => {
    const d = extractDelegations([{ id: 4, name: "Quelque part" }]);
    expect(d[0]!.governorate).toBe("");
  });

  it("ne plante pas sur une réponse inattendue", () => {
    expect(extractDelegations(null)).toEqual([]);
    expect(extractDelegations("erreur")).toEqual([]);
    expect(extractDelegations({ detail: "Invalid token." })).toEqual([]);
    expect(extractDelegations([null, 42, "x"])).toEqual([]);
  });

  it("conserve la ligne brute, pour ne rien perdre d'une forme mal comprise", () => {
    const d = extractDelegations([{ id: 4, name: "X", zone: "nord", cod_fee: 8 }]);
    expect(d[0]!.raw).toContain("cod_fee");
  });
});
