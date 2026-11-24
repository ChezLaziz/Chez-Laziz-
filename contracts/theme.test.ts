import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHEMINS_CLAIRS, themeForPath } from "./theme";

describe("thème d'une page", () => {
  it("la boutique est sombre, sur toutes ses pages et dans les deux langues", () => {
    for (const chemin of ["/", "/ar", "/commande", "/ar/commande", "/collection", "/journal/prix-makroudh-tunisie", "/faq", "/nimporte-quoi"]) {
      expect(themeForPath(chemin)).toBe("sombre");
    }
  });

  it("l'administration et l'écran de l'atelier restent clairs", () => {
    for (const chemin of ["/admin", "/admin/", "/atelier", "/atelier/", "/Admin", "/ATELIER"]) {
      expect(themeForPath(chemin)).toBe("clair");
    }
  });

  it("une page dont le nom commence seulement comme « admin » n'est pas l'administration", () => {
    expect(themeForPath("/administration-des-ventes")).toBe("sombre");
    expect(themeForPath("/ateliers")).toBe("sombre");
    expect(themeForPath("/ar/admin")).toBe("sombre");
  });

  it("index.html applique exactement la même règle avant le chargement du site", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    // Le script en ligne contient la source de l'expression, telle quelle.
    expect(html).toContain(`${String(CHEMINS_CLAIRS)}.test(location.pathname)`);
    expect(html).toContain("setAttribute('data-theme', 'clair')");
  });

  it("le fond posé par index.html est celui des deux thèmes de index.css", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
    const hex = (triplet: string) =>
      "#" + triplet.trim().split(/\s+/).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    const sombre = /:root \{\s*--c-paper: ([\d ]+);/.exec(css)?.[1];
    const clair = /\[data-theme='clair'\] \{\s*--c-paper: ([\d ]+);/.exec(css)?.[1];
    expect(sombre).toBeDefined();
    expect(clair).toBeDefined();
    expect(html).toContain(`html { background: ${hex(sombre!)}; }`);
    expect(html).toContain(`html[data-theme='clair'] { background: ${hex(clair!)}; }`);
    expect(html).toContain(`<meta name="theme-color" content="${hex(sombre!)}" />`);
  });
});
