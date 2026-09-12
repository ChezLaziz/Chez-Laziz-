import { describe, expect, it } from "vitest";
import { flavourName } from "./flavourName";

describe("flavourName — le catalogue réel de la boutique", () => {
  it("garde ce qui distingue, coupe ce qui se répète (français)", () => {
    const attendu: [string, string][] = [
      ["Makroudh Laziz aux Dattes", "Dattes"],
      ["Makroudh Jwayed", "Jwayed"],
      ["Makroudh au Blé", "Blé"],
      ["Makroudh Chamia", "Chamia"],
      ["Makroudh Zgougou", "Zgougou"],
      ["Makroudh aux Amandes", "Amandes"],
      ["Makroudh Blanc à la Vanille", "Vanille"],
      ["Makroudh Café Laziz", "Café"],
      ["Makroudh Blanc aux Figues", "Figues"],
      ["Makroudh Blanc au Fraise", "Fraise"],
      ["Makroudh aux Noisettes", "Noisettes"],
      ["Makroudh Blanc à l'Ananas", "l'Ananas"],
      ["Makroudh Blanc à la Pistache", "Pistache"],
      ["Samsa Laziz", "Samsa"],
      ["Makroudh Laziz – Fruits Secs", "Fruits Secs"],
      ["Makroudh Blanc Laziz", "Blanc"],
    ];
    for (const [long, court] of attendu) expect(flavourName(long)).toBe(court);
  });

  it("fait pareil en arabe, préposition collée comprise", () => {
    const attendu: [string, string][] = [
      ["مقروض لعزيز بالتمر", "التمر"],
      ["مقروض جوايد", "جوايد"],
      ["مقروض لعزيز بالفواكه الجافة", "الفواكه الجافة"],
      ["مقروض أبيض بالفستق", "الفستق"],
      ["مقروض أبيض بالفراولة", "الفراولة"],
      ["مقروض أبيض بالفانيليا", "الفانيليا"],
      ["مقروض أبيض بالتين", "التين"],
      ["مقروض أبيض بالأناناس", "الأناناس"],
      ["مقروض لعزيز بالقهوة", "القهوة"],
      ["مقروض بالبندق", "البندق"],
      ["سمسة لعزيز", "سمسة"],
      ["مقروض لعزيز الأبيض", "الأبيض"],
      ["مقروض القمح", "القمح"],
      ["مقروض زڤوڤو", "زڤوڤو"],
      ["مقروض شامية", "شامية"],
      ["مقروض باللوز", "اللوز"],
    ];
    for (const [long, court] of attendu) expect(flavourName(long)).toBe(court);
  });

  it("ne rend JAMAIS un bouton vide — un nom entièrement « bruit » reste entier", () => {
    expect(flavourName("Makroudh")).toBe("Makroudh");
    expect(flavourName("Laziz")).toBe("Laziz");
    expect(flavourName("مقروض")).toBe("مقروض");
    expect(flavourName("")).toBe("");
    expect(flavourName("   ")).toBe("   ");
  });

  it("tolère les espaces multiples d'une saisie admin", () => {
    expect(flavourName("  Makroudh   aux   Amandes  ")).toBe("Amandes");
  });
});
