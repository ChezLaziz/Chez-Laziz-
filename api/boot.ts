import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { rateLimit } from "./lib/rateLimit";
import { assertAdmin } from "./queries/admin";
import { getUploadedImage, uploadProductImage, uploadPaymentProof } from "./lib/r2";
import { getFullExport } from "./queries/backup";

const app = new Hono<{ Bindings: HttpBindings }>();

// Railway termine le TLS puis transmet la requête en clair à ce service ;
// sans ce contrôle, une visite en http:// reste servie telle quelle au
// lieu d'être renvoyée vers https:// (d'où l'avertissement "Not secure"
// du navigateur, alors que le certificat lui-même est valide).
app.use("*", async (c, next) => {
  if (c.req.header("x-forwarded-proto") === "http") {
    const url = new URL(c.req.url);
    url.protocol = "https:";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

// admin.chezlaziz.com pointe vers ce même service (voir custom domains
// Railway) ; la racine du sous-domaine doit ouvrir directement le tableau
// de bord au lieu de la page d'accueil du site vitrine.
app.get("/", async (c, next) => {
  const host = c.req.header("host") ?? "";
  if (host.startsWith("admin.")) {
    return c.redirect("/admin", 302);
  }
  await next();
});

// Upload des photos produits vers R2 (Cloudflare) — limite propre à cette
// route (poids réel d'une photo prise au téléphone, souvent 10-20 Mo avant
// compression côté serveur), en dehors de la limite générale 1 Mo appliquée
// juste après au reste de l'API. onError personnalisé : la réponse HTML/texte
// par défaut de Hono sur dépassement fait planter le "res.json()" côté
// client (erreur incompréhensible affichée à l'admin) — on répond en JSON.
app.post(
  "/api/uploads",
  bodyLimit({
    maxSize: 20 * 1024 * 1024,
    onError: (c) => c.json({ error: "Image trop lourde (20 Mo maximum)." }, 413),
  }),
  async (c) => {
    const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
    try {
      await assertAdmin(token);
    } catch {
      return c.json({ error: "Non autorisé" }, 401);
    }
    const form = await c.req.formData();
    const file = form.get("file");
    const folderRaw = form.get("folder");
    const folder = folderRaw === "gallery" ? "gallery" : "products";
    if (!(file instanceof File)) {
      return c.json({ error: "Fichier manquant" }, 400);
    }
    try {
      const key = await uploadProductImage(file, folder);
      return c.json({ url: `/api/uploads/${key}` });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Erreur d'upload" }, 400);
    }
  },
);

// Upload de la capture d'écran de paiement D17 — endpoint public (le client
// n'est pas connecté) mais limité en débit et en taille, et le fichier n'est
// JAMAIS servi publiquement (voir /api/admin/payment-proof/:key ci-dessous
// et la route GET /api/uploads/* qui exclut explicitement ce préfixe).
app.post(
  "/api/uploads/payment-proof",
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  bodyLimit({
    maxSize: 8 * 1024 * 1024,
    onError: (c) => c.json({ error: "Image trop lourde (8 Mo maximum)." }, 413),
  }),
  async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "Fichier manquant" }, 400);
    }
    try {
      const key = await uploadPaymentProof(file);
      return c.json({ key });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Erreur d'upload" }, 400);
    }
  },
);

// Sert une preuve de paiement D17 à l'admin uniquement (jamais public — la
// capture peut contenir des informations bancaires/personnelles du client).
// URL : /api/admin/proofs/<clé retournée à l'upload, ex. "payment-proof/xxx.jpg">
app.get("/api/admin/proofs/*", async (c) => {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  try {
    await assertAdmin(token);
  } catch {
    return c.json({ error: "Non autorisé" }, 401);
  }
  const key = c.req.path.replace(/^\/api\/admin\/proofs\//, "");
  if (!/^payment-proof\/[a-zA-Z0-9_-]+\.jpg$/.test(key)) {
    return c.json({ error: "Not Found" }, 404);
  }
  const result = await getUploadedImage(key);
  if (!result) return c.json({ error: "Not Found" }, 404);
  return new Response(result.body, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, no-store",
    },
  });
});

// Sert les photos uploadées (lecture publique, comme les images statiques).
app.get("/api/uploads/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/uploads\//, "");
  if (!/^(products|gallery)\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(key)) {
    return c.json({ error: "Not Found" }, 404);
  }
  const result = await getUploadedImage(key);
  if (!result) return c.json({ error: "Not Found" }, 404);
  return new Response(result.body, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

// Export complet des données (bouton "Exporter" dans Paramètres) — protégé
// par le même token admin que le reste, servi en téléchargement direct.
app.get("/api/admin/export", async (c) => {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  try {
    await assertAdmin(token);
  } catch {
    return c.json({ error: "Non autorisé" }, 401);
  }
  const data = await getFullExport();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="chez-laziz-export-${date}.json"`,
    },
  });
});

// 1 Mo suffit largement pour ce type de requêtes (commandes, messages,
// gestion produits) ; empêche les payloads abusifs sur des endpoints publics.
app.use(bodyLimit({ maxSize: 1 * 1024 * 1024 }));

// Limite générale : 60 requêtes / minute / IP sur toute l'API tRPC
// (protège contact.send, orders.create, stats.track, admin.login, etc.
// contre le spam et les abus, en plus du verrou dédié sur admin.login).
app.use("/api/trpc/*", rateLimit({ windowMs: 60 * 1000, max: 60 }));

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
