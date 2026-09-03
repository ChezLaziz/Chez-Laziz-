import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PUBLIC_ROUTES, isKnownPublicPath } from "./routes";

describe("isKnownPublicPath", () => {
  it("accepts every declared page", () => {
    expect(isKnownPublicPath("/")).toBe(true);
    expect(isKnownPublicPath("/commande")).toBe(true);
    expect(isKnownPublicPath("/collection/")).toBe(true); // trailing slash tolerated
    expect(isKnownPublicPath("/journal")).toBe(true);
    expect(isKnownPublicPath("/journal/comment-est-prepare-le-makroudh")).toBe(true);
  });

  it("rejects unknown pages so the server can answer 404", () => {
    expect(isKnownPublicPath("/nimporte-quoi")).toBe(false);
    expect(isKnownPublicPath("/commande/x")).toBe(false);
    expect(isKnownPublicPath("/journal/a/b")).toBe(false);
    expect(isKnownPublicPath("/admin/secret")).toBe(false);
  });

  it("stays in sync with the React router (src/App.tsx)", () => {
    // Chaque route déclarée dans App.tsx doit être reconnue ; une page
    // ajoutée côté React sans mise à jour de PUBLIC_ROUTES répondrait 404.
    const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf-8");
    const paths = [...app.matchAll(/<Route path="([^"*]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(10);
    for (const p of paths) {
      expect(isKnownPublicPath(p), `route ${p} manque dans PUBLIC_ROUTES`).toBe(true);
    }
    // et inversement, aucune route déclarée ici sans page réelle
    for (const r of PUBLIC_ROUTES) {
      const literal = r.endsWith("/*") ? r.slice(0, -2) : r;
      expect(paths, `${r} n'existe pas dans App.tsx`).toContain(literal);
    }
  });
});
