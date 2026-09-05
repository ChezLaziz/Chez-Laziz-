import type { Context, Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { isKnownPublicPath } from "@contracts/routes";

type App = Hono<{ Bindings: HttpBindings }>;

/**
 * Réponse pour toute URL qui n'est ni un fichier statique ni une route API.
 *
 * - Page connue (/, /commande, /journal/…) : toujours l'application React en
 *   200, quel que soit le client — navigateur, curl, robot d'aperçu de lien
 *   WhatsApp/Facebook, moniteur de disponibilité. Décider selon l'en-tête
 *   Accept ici casserait le site pour tout client qui n'envoie pas
 *   « text/html » explicitement.
 * - URL inconnue : vrai statut 404 (Google ne l'indexe pas). Le HTML est
 *   renvoyé pour que la page 404 s'affiche côté client ; seuls les clients
 *   qui demandent explicitement du JSON (scripts, outils) reçoivent une
 *   petite réponse JSON.
 */
export function spaFallback(indexHtml: string) {
  return (c: Context) => {
    const pathname = new URL(c.req.url).pathname;
    // Sans directive explicite, certains navigateurs/proxys peuvent mettre en
    // cache ce HTML et continuer à référencer d'anciens bundles hashés après
    // un déploiement — on force donc une revalidation systématique.
    c.header("Cache-Control", "no-cache");
    if (isKnownPublicPath(pathname)) return c.html(indexHtml, 200);

    const accept = c.req.header("accept") ?? "";
    if (accept.includes("application/json") && !accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    return c.html(indexHtml, 404);
  };
}

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  // Lu une seule fois au démarrage (le fichier ne change pas en production).
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  app.use(
    "*",
    serveStatic({
      root: "./dist/public",
      onFound: (filePath, c) => {
        // Bundles produits par Vite : nom de fichier hashé sur le contenu,
        // donc jamais réutilisé pour un contenu différent — cache long terme
        // sûr. Le reste (favicon, manifest, images statiques...) garde une
        // durée courte pour ne pas geler une mise à jour de plusieurs jours.
        c.header(
          "Cache-Control",
          filePath.includes("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
        );
      },
    }),
  );
  app.notFound(spaFallback(indexHtml));
}
