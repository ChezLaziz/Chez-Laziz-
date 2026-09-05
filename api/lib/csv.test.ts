import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Kairouan")).toBe("Kairouan");
    expect(csvCell(42)).toBe("42");
  });

  it("quotes cells containing the separator, quotes or newlines", () => {
    expect(csvCell("Sousse;Monastir")).toBe('"Sousse;Monastir"');
    expect(csvCell('Il a dit "oui"')).toBe('"Il a dit ""oui"""');
    expect(csvCell("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("neutralises formula injection", () => {
    // Une note client commençant par = serait exécutée comme formule par
    // Excel/LibreOffice à l'ouverture du fichier.
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+33600000000")).toBe("'+33600000000");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("renders empty cells for null and undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("keeps Arabic text intact", () => {
    expect(csvCell("مقروض جوايد")).toBe("مقروض جوايد");
  });
});

describe("toCsv", () => {
  it("starts with a UTF-8 BOM so Excel reads accents and Arabic", () => {
    expect(toCsv(["a"], [])).toMatch(/^\ufeff/);
  });

  it("joins with semicolons and CRLF", () => {
    const csv = toCsv(["N°", "Client"], [[1, "Amine"]]);
    expect(csv).toBe("\ufeffN°;Client\r\n1;Amine\r\n");
  });

  it("keeps decimal commas from splitting columns", () => {
    // Les prix en dinars s'écrivent "69,9" : avec une virgule comme
    // séparateur, la colonne serait coupée en deux.
    const csv = toCsv(["Total"], [["69,9"]]);
    expect(csv.trim().split("\r\n")[1]).toBe("69,9");
  });
});
