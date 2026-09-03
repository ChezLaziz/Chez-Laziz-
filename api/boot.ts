import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { rateLimit } from "./lib/rateLimit";
import { assertAdmin } from "./queries/admin";
import { getUploadedImage, uploadProductImage } from "./lib/r2";

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
// route (poids réel d'une photo), en dehors de la limite générale 1 Mo
// appliquée juste après au reste de l'API.
app.post("/api/uploads", bodyLimit({ maxSize: 8 * 1024 * 1024 }), async (c) => {
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
