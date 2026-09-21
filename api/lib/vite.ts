import type { Context, Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { isKnownPublicPath } from "@contracts/routes";
import {
  ORDER_PREVIEW_AR,
  ORDER_PREVIEW_FR,
  previewUrl,
  socialPreviewFor,
  type SocialPreview,
} from "@contracts/socialPreview";

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

/** Ce que le HTML brut déclare être — écrit en dur pour l'accueil français.
 *
 * Les robots d'aperçu de WhatsApp et de Facebook n'exécutent PAS le
 * JavaScript : ils lisent ce HTML, identique pour toutes les routes. Le lien
 * de la page de commande collé dans un groupe s'annonçait donc comme
 * l'accueil, et og:url y renvoyait carrément le clic. useSEO corrige tout
 * cela côté navigateur — trop tard pour un robot. Voir
 * contracts/socialPreview.ts, qui tient les mêmes chaînes pour les deux côtés.
 *
 * PAR ROUTE, et pas une seule fois pour les deux : les publicités pointent
 * vers /ar/commande, qui annonçait l'adresse de la page FRANÇAISE. */
const OG_URL = /(<meta property="og:url" content=")[^"]*(")/;
const CANONICAL = /(<link rel="canonical" href=")[^"]*(")/;
const OG_TITLE = /(<meta property="og:title" content=")[^"]*(")/;
const OG_DESCRIPTION = /(<meta property="og:description" content=")[^"]*(")/;
const OG_LOCALE = /(<meta property="og:locale" content=")[^"]*(")/;
const TWITTER_TITLE = /(<meta name="twitter:title" content=")[^"]*(")/;
const TWITTER_DESCRIPTION = /(<meta name="twitter:description" content=")[^"]*(")/;
const META_DESCRIPTION = /(<meta name="description" content=")[^"]*(")/;
const TITRE = /(<title>)[^<]*(<\/title>)/;

/** Une valeur qui part dans un attribut HTML. Les textes viennent de nous,
 * pas d'un client — mais une apostrophe typographique ou une esperluette
 * mal échappée casserait la balise en silence, et un aperçu cassé ne se
 * remarque que quand un client se plaint. */
function echapperHtml(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appliquerApercu(html: string, apercu: SocialPreview): string {
  const url = echapperHtml(previewUrl(apercu));
  const titre = echapperHtml(apercu.title);
  const description = echapperHtml(apercu.description);
  return html
    .replace(OG_URL, `$1${url}$2`)
    .replace(CANONICAL, `$1${url}$2`)
    .replace(OG_TITLE, `$1${titre}$2`)
    .replace(TWITTER_TITLE, `$1${titre}$2`)
    .replace(OG_DESCRIPTION, `$1${description}$2`)
    .replace(TWITTER_DESCRIPTION, `$1${description}$2`)
    .replace(META_DESCRIPTION, `$1${description}$2`)
    .replace(OG_LOCALE, `$1${apercu.locale}$2`)
    .replace(TITRE, `$1${echapperHtml(apercu.title)}$2`);
}

const ORDER_CHUNK = /^OrderPage-.*\.js$/;

function estAccueil(pathname: string): boolean {
  return pathname === "/" || pathname === "/ar" || pathname === "/ar/";
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
  // DÉRIVÉ DE sansHero, jamais de indexHtml : les pages de commande ne
  // doivent pas retrouver le préchargement de la photo d'accueil.
  //
  // Le navigateur ne découvre le code de la page de commande qu'après avoir
  // téléchargé ET exécuté le bundle principal (le découpage est un import()
  // dans src/App.tsx) : un aller-retour de plus avant le premier prix, sur
  // la seule page que la publicité paie. `crossorigin` est obligatoire —
  // l'entrée en porte un, et sans lui le navigateur télécharge deux fois.
  const avecChunk = chunkOrderPage
    ? sansHero.replace("</head>", `<link rel="modulepreload" crossorigin href="${chunkOrderPage}"></head>`)
    : sansHero;
  // Une variante PAR page d'aperçu, calculée une fois au démarrage.
  const apercus = new Map<string, string>();
  for (const apercu of [ORDER_PREVIEW_FR, ORDER_PREVIEW_AR]) {
    apercus.set(apercu.path, appliquerApercu(avecChunk, apercu));
  }

  return (c: Context) => {
    const pathname = new URL(c.req.url).pathname;
    const apercu = socialPreviewFor(pathname);
    const html = estAccueil(pathname)
      ? indexHtml
      : (apercu && apercus.get(apercu.path)) ?? sansHero;
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
