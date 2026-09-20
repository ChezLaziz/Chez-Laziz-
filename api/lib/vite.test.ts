import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { chunkCommande, spaFallback } from "./vite";

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

// Le HTML réel de production, avec ce qui compte ici : la balise de fin
// d'en-tête, l'adresse déclarée, et le préchargement de la photo d'accueil.
const HTML_PROD = [
  "<!doctype html><html><head>",
  '<link rel="canonical" href="https://chezlaziz.com/" />',
  '<meta property="og:url" content="https://chezlaziz.com/" />',
  '<link rel="preload" as="image" href="/images/hero-mobile.webp" />',
  "</head><body><div id=\"root\"></div></body></html>",
].join("");

function servir(html: string, chunk: string | null) {
  const a = new Hono();
  a.notFound(spaFallback(html, chunk));
  return a;
}

describe("SPA fallback — la page que la publicité paie", () => {
  it("précharge le code de la page de commande, et seulement là", async () => {
    const app = servir(HTML_PROD, "/assets/OrderPage-abc123.js");
    const commande = await (await app.request("/commande")).text();
    expect(commande).toContain(
      '<link rel="modulepreload" crossorigin href="/assets/OrderPage-abc123.js">',
    );
    // L'accueil et les autres pages n'en ont aucun besoin : ce serait
    // télécharger du code pour une page que la visiteuse n'ouvrira pas.
    expect(await (await app.request("/")).text()).not.toContain("modulepreload");
    expect(await (await app.request("/livraison")).text()).not.toContain("modulepreload");
  });

  it("ne réintroduit JAMAIS la photo d'accueil sur /commande", async () => {
    const app = servir(HTML_PROD, "/assets/OrderPage-abc123.js");
    const commande = await (await app.request("/commande")).text();
    expect(commande).not.toContain('rel="preload" as="image"');
    // …mais l'accueil, lui, la garde : c'est sa grande photo.
    expect(await (await app.request("/")).text()).toContain('rel="preload" as="image"');
  });

  it("annonce la bonne adresse aux robots d'aperçu WhatsApp/Facebook", async () => {
    const app = servir(HTML_PROD, null);
    for (const chemin of ["/commande", "/ar/commande"]) {
      const html = await (await app.request(chemin)).text();
      expect(html, chemin).toContain('<meta property="og:url" content="https://chezlaziz.com/commande" />');
      expect(html, chemin).toContain('<link rel="canonical" href="https://chezlaziz.com/commande" />');
    }
    // Ailleurs, rien ne change : useSEO corrige côté navigateur.
    expect(await (await app.request("/")).text()).toContain('content="https://chezlaziz.com/"');
  });

  it("sert quand même la page si le nom du fichier de code est introuvable", async () => {
    const app = servir(HTML_PROD, null);
    const res = await app.request("/commande");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('id="root"');
  });

  it("chunkCommande ne lève pas sur un dossier qui n'existe pas", () => {
    expect(chunkCommande("/dossier/qui/nexiste/pas")).toBeNull();
  });
});
