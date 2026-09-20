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
/** Les deux `<link rel=preload as=image>` de l'accueil.
 *
 * index.html est servi TEL QUEL pour toutes les routes : la photo d'accueil
 * (100 ko en version mobile, 250 ko en version large) était donc réclamée en
 * priorité HAUTE sur /commande — la page que la publicité paie — alors
 * qu'elle n'y est jamais affichée. Elle volait la bande passante au code
 * dont dépend l'affichage des produits, sur des téléphones où chaque
 * centaine de kilo-octets se voit. On ne la précharge plus que là où elle
 * s'affiche vraiment. */
const PRELOAD_HERO = /\s*<link rel="preload" as="image"[^>]*>/g;

/** L'adresse que ce HTML déclare être — écrite en dur sur l'accueil.
 *
 * index.html est servi tel quel pour toutes les routes, y compris /commande.
 * Le robot d'aperçu de WhatsApp et de Facebook n'exécute PAS le JavaScript :
 * il lit ce HTML brut. Quand le patron colle le lien de sa page de commande
 * dans un groupe, l'aperçu annonçait donc l'accueil, et og:url renvoyait
 * carrément Facebook vers l'accueil — le clic n'arrivait jamais sur la page
 * qui vend. On réécrit les deux adresses pour la page réellement servie ;
 * useSEO les corrige déjà côté navigateur, mais trop tard pour un robot. */
const OG_URL = /(<meta property="og:url" content=")[^"]*(")/;
const CANONICAL = /(<link rel="canonical" href=")[^"]*(")/;

const ORDER_CHUNK = /^OrderPage-.*\.js$/;

function estAccueil(pathname: string): boolean {
  return pathname === "/" || pathname === "/ar" || pathname === "/ar/";
}

function estCommande(pathname: string): boolean {
  return pathname === "/commande" || pathname === "/ar/commande";
}

/** Le fichier de code de la page de commande, tel que Vite l'a nommé.
 *
 * Jamais d'exception : un build dont les noms changent ne doit pas empêcher
 * le serveur de démarrer — on se contente alors de ne rien précharger. */
export function chunkCommande(distPath: string): string | null {
  try {
    const f = fs.readdirSync(path.resolve(distPath, "assets")).find((n) => ORDER_CHUNK.test(n));
    return f ? `/assets/${f}` : null;
  } catch {
    return null;
  }
}

export function spaFallback(indexHtml: string, chunkOrderPage?: string | null) {
  const sansHero = indexHtml.replace(PRELOAD_HERO, "");
  // DÉRIVÉ DE sansHero, jamais de indexHtml : /commande ne doit pas
  // retrouver le préchargement de la photo d'accueil qu'on vient d'ôter.
  //
  // Le navigateur ne découvre le code de la page de commande qu'après avoir
  // téléchargé ET exécuté le bundle principal (le découpage est un import()
  // dans src/App.tsx) : un aller-retour de plus avant le premier prix, sur
  // la seule page que la publicité paie. `crossorigin` est obligatoire —
  // l'entrée en porte un, et sans lui le navigateur télécharge deux fois.
  const commande = (chunkOrderPage
    ? sansHero.replace("</head>", `<link rel="modulepreload" crossorigin href="${chunkOrderPage}"></head>`)
    : sansHero
  )
    .replace(OG_URL, "$1https://chezlaziz.com/commande$2")
    .replace(CANONICAL, "$1https://chezlaziz.com/commande$2");

  return (c: Context) => {
    const pathname = new URL(c.req.url).pathname;
    const html = estAccueil(pathname) ? indexHtml : estCommande(pathname) ? commande : sansHero;
    // Sans directive explicite, certains navigateurs/proxys peuvent mettre en
    // cache ce HTML et continuer à référencer d'anciens bundles hashés après
    // un déploiement — on force donc une revalidation systématique.
    c.header("Cache-Control", "no-cache");
    if (isKnownPublicPath(pathname)) return c.html(html, 200);

    const accept = c.req.header("accept") ?? "";
    if (accept.includes("application/json") && !accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    return c.html(html, 404);
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
  app.notFound(spaFallback(indexHtml, chunkCommande(distPath)));
}
