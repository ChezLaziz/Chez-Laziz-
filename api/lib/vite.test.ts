import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { spaFallback } from "./vite";

const HTML = '<!doctype html><html><body><div id="root"></div></body></html>';

// Même câblage qu'en production : l'API répond avant, le reste tombe sur
// le fallback SPA (voir api/boot.ts + serveStaticFiles).
const app = new Hono();
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));
app.notFound(spaFallback(HTML));

const KNOWN = ["/", "/commande", "/collection/", "/livraison", "/faq", "/journal/comment-est-prepare-le-makroudh", "/admin"];

describe("SPA fallback (production) — pages connues", () => {
  it("sert une page connue en 200 même sans Accept: text/html (curl, robots d'aperçu WhatsApp/Facebook)", async () => {
    for (const p of KNOWN) {
      const res = await app.request(p, { headers: { accept: "*/*" } });
      expect(res.status, p).toBe(200);
      expect(res.headers.get("content-type"), p).toContain("text/html");
      expect(await res.text(), p).toContain('id="root"');
    }
  });

  it("sert une page connue en 200 sans aucun en-tête Accept", async () => {
    const res = await app.request("/commande");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('id="root"');
  });

  it("sert une page connue en 200 pour un navigateur", async () => {
    const res = await app.request("/journal", {
      headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    expect(res.status).toBe(200);
  });
});

describe("SPA fallback (production) — URL inconnues", () => {
  it("répond un vrai 404 avec le HTML de l'application (page 404 côté client)", async () => {
    const res = await app.request("/nimporte-quoi", { headers: { accept: "text/html" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain('id="root"');
  });

  it("répond 404 HTML aussi pour un client générique (Accept: */*)", async () => {
    const res = await app.request("/commande/x/y", { headers: { accept: "*/*" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("répond 404 JSON uniquement quand le client demande explicitement du JSON", async () => {
    const res = await app.request("/nimporte-quoi", { headers: { accept: "application/json" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Not Found" });
  });

  it("ne rattrape jamais un chemin /api/* inconnu en HTML", async () => {
    const res = await app.request("/api/does-not-exist", { headers: { accept: "text/html" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
