import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { rateLimit } from "./lib/rateLimit";

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
