import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { rateLimit } from "./lib/rateLimit";
import { assertAdmin } from "./queries/admin";
import { estLargeurServie, getResizedImage, getUploadedImage, uploadProductImage } from "./lib/r2";
import { getFullExport } from "./queries/backup";
import { listOrders, type OrderItem } from "./queries/orders";
import { toCsv, csvResponse } from "./lib/csv";
import { formatDinars } from "@contracts/shop";
import { cancelReasonAr } from "@contracts/cancelReasons";
import { telegramWebhookSecret } from "./lib/telegram";
import { setupTelegram } from "./lib/telegramSetup";
import { handleTelegramUpdate } from "./lib/telegramWebhook";
import { ensureKitchenBaseline } from "./lib/telegramKitchen";
import { startReminderScheduler } from "./lib/telegramReminders";
import { startBackupScheduler } from "./lib/backupSchedule";
import { startR2HealthScheduler } from "./lib/r2Health";
import { warmProductThumbnails } from "./lib/thumbnailWarmup";
import { runSelfCheck } from "./lib/selfCheck";

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

// En-têtes de sécurité HTTP de base (clickjacking, MIME-sniffing, HSTS...).
// Pas de Content-Security-Policy ici volontairement : le site charge Google
// Fonts, Meta Pixel et Google Analytics depuis plusieurs domaines externes,
// et une CSP mal calibrée casserait ce tracking silencieusement (aucune
// erreur visible, juste des événements manquants) — à faire séparément,
// avec un audit complet de tous les domaines externes utilisés.
// crossOriginResourcePolicy/crossOriginOpenerPolicy désactivés : ce site
// est justement fait pour être partagé/intégré ailleurs (aperçu og:image
// sur Facebook/Instagram, images produits), l'inverse de ce que ces
// en-têtes protègent par défaut.
app.use(
  "*",
  secureHeaders({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    referrerPolicy: "strict-origin-when-cross-origin",
  }),
);

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
    const folder = folderRaw === "gallery" || folderRaw === "site" ? folderRaw : "products";
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

// Sert les photos uploadées (lecture publique, comme les images statiques).
app.get("/api/uploads/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/uploads\//, "");
  if (!/^(products|gallery|site)\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(key)) {
    return c.json({ error: "Not Found" }, 404);
  }
  // ?w=<largeur> : la même photo, à la taille où elle sera réellement
  // affichée. Sans ce paramètre, l'originale — les anciens liens continuent
  // de fonctionner exactement comme avant.
  const demandee = Number(c.req.query("w"));
  let result: Awaited<ReturnType<typeof getUploadedImage>>;
  try {
    result =
      Number.isInteger(demandee) && estLargeurServie(demandee)
        ? await getResizedImage(key, demandee)
        : await getUploadedImage(key);
  } catch (err) {
    // Stockage injoignable ou mal configuré : une indisponibilité, pas une
    // erreur de programme — et surtout rien qu'un cache doit retenir.
    console.error(`[r2] photo indisponible (${key}) :`, err instanceof Error ? err.message : err);
    c.header("Cache-Control", "no-store");
    return c.json({ error: "Photo temporairement indisponible" }, 503);
  }
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
const FORMAT_DATE_TUNIS = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Africa/Tunis",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const FORMAT_HEURE_TUNIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Tunis",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
/** « 2026-09-11 » à l'heure de Tunis (fr-CA donne l'ordre année-mois-jour). */
export function dateTunis(d: Date): string {
  return FORMAT_DATE_TUNIS.format(d);
}
/** « 23:30 » à l'heure de Tunis. */
export function heureTunis(d: Date): string {
  return FORMAT_HEURE_TUNIS.format(d).replace("24:", "00:");
}

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

// Export des commandes en CSV — ouvrable directement dans Excel, contrairement
// au dump JSON ci-dessus qui est une sauvegarde technique (prix en millimes,
// lignes de commande en JSON brut). Une ligne par commande, montants en dinars.
app.get("/api/admin/export/orders.csv", async (c) => {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  try {
    await assertAdmin(token);
  } catch {
    return c.json({ error: "Non autorisé" }, 401);
  }

  const orders = await listOrders();
  const rows = orders.map((o) => {
    let items: OrderItem[] = [];
    try {
      items = JSON.parse(o.items) as OrderItem[];
    } catch {
      items = [];
    }
    const detail = items
      .map((it) => `${it.qty} x ${it.name}`)
      .join(" | ");
    return [
      o.id,
      // Heure de Tunis, pas UTC : une commande de 23 h 30 n'est pas « hier ».
      dateTunis(o.createdAt),
      heureTunis(o.createdAt),
      o.customerName,
      o.phone,
      o.governorate,
      o.city,
      o.address,
      detail,
      formatDinars(o.subtotalMillimes),
      formatDinars(o.deliveryFeeMillimes),
      formatDinars(o.totalMillimes),
      o.paymentMethod === "d17" ? "D17" : "Espèces",
      o.paymentStatus,
      o.status,
      // Vide pour toute annulation d'avant ce champ, et pour les commandes
      // non annulées. Jamais « autre » : une absence de mesure ne doit pas se
      // lire comme une mesure.
      cancelReasonAr(o.cancelReason) ?? "",
      o.note ?? "",
    ];
  });

  const csv = toCsv(
    [
      "N° commande",
      "Date",
      "Heure",
      "Client",
      "Téléphone",
      "Gouvernorat",
      "Ville",
      "Adresse",
      "Articles",
      "Sous-total (DT)",
      "Livraison (DT)",
      "Total (DT)",
      "Paiement",
      "État du paiement",
      "Statut",
      "Raison d'annulation",
      "Note",
    ],
    rows,
  );
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`chez-laziz-commandes-${date}.csv`, csv);
});

// 1 Mo suffit largement pour ce type de requêtes (commandes, messages,
// gestion produits) ; empêche les payloads abusifs sur des endpoints publics.
app.use(bodyLimit({ maxSize: 1 * 1024 * 1024 }));

// Deux réserves distinctes sur l'API tRPC.
//
// LECTURES — largement ouvertes. Elles ne coûtent qu'une requête SQL et
// c'est par elles que passe un client qui achète : visite, catalogue, liste
// des délégations. Les serrer, c'est fermer la boutique. En Tunisie, les
// abonnés 4G d'un même opérateur sortent par un petit nombre d'adresses
// publiques ; un jour de publicité, des dizaines de vrais clients partagent
// la même IP. L'ancienne limite unique de 60/min les aurait bloqués — et,
// pire, la réponse 429 n'est pas au format tRPC : le client lisait un
// message d'erreur en anglais au lieu de sa commande (corrigé aussi dans
// src/providers/trpc.tsx).
//
// ÉCRITURES — serrées, car c'est là qu'est l'abus : commandes bidon,
// messages de contact en masse, force brute sur admin.login. Trente par
// minute laissent largement passer un client qui hésite et recommence.
// Le nom de la procédure suit le point : « orders.setStatus »,
// « admin.addUser ». L'ancienne forme exigeait le mot ENTIER (\bset\b) et
// laissait passer setStatus, updatePages, syncDelegations… dans le panier
// des lectures. « stats.track » reste volontairement une lecture : une
// page vue par visite, et les réseaux mobiles tunisiens partagent une
// adresse entre des centaines de clients.
const TRPC_WRITE =
  /\.(create|send|login|update|delete|save|sync|approve|set|add|remove|change|link|unlink|mark|request|reset)/i;

/** Un « % » mal formé dans l'URL ferait lever decodeURIComponent — et
 * répondre 500 à une simple faute de frappe. Le chemin brut suffit alors. */
function cheminDecode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
app.use("/api/trpc/*", rateLimit({ windowMs: 60 * 1000, max: 600, bucket: "trpc-read" }));
app.use(
  "/api/trpc/*",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    bucket: "trpc-write",
    appliesTo: (c) =>
      c.req.method === "POST" && TRPC_WRITE.test(cheminDecode(c.req.path)),
  }),
);

// Les appuis sur les boutons du groupe Telegram (confirmer une commande,
// déclarer une fournée cuite). Telegram appelle cette adresse en POST.
//
// Elle est publique — Telegram n'a pas de compte admin — donc c'est l'en-tête
// secrète qui fait foi : une valeur dérivée du jeton du bot, que Telegram
// nous renvoie et que personne d'autre ne peut produire (voir
// telegramWebhookSecret). Sans elle, n'importe qui pourrait confirmer des
// commandes à notre place.
//
// Toujours 200 après ce contrôle : une erreur ferait réessayer Telegram en
// boucle, puis couper le webhook.
app.post("/api/telegram/webhook", async (c) => {
  if (c.req.header("x-telegram-bot-api-secret-token") !== telegramWebhookSecret()) {
    return c.json({ error: "Non autorisé" }, 401);
  }
  const update: unknown = await c.req.json().catch(() => null);
  await handleTelegramUpdate(update);
  return c.json({ ok: true });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    // Le client envoie ses lectures en POST (methodOverride, voir
    // src/providers/trpc.tsx) pour ne pas mettre le jeton dans l'URL :
    // sans cette option, le serveur refuse tout POST vers une lecture.
    allowMethodOverride: true,
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
    // Déclaré à chaque démarrage, et idempotent côté Telegram : poser les
    // deux variables d'environnement suffit, il n'y a rien à faire à la main.
    void setupTelegram();
    // Avant la première commande, jamais après : voir ensureKitchenBaseline.
    void ensureKitchenBaseline();
    startReminderScheduler();
    // Indépendant de Telegram : une base non sauvegardée est un risque même
    // sans notification (voir api/lib/backupSchedule.ts).
    startBackupScheduler();
    startR2HealthScheduler();
    // Quelques secondes après le démarrage, une fois le trafic repris : les
    // photos du catalogue entrent en mémoire (voir thumbnailWarmup.ts).
    setTimeout(() => void warmProductThumbnails(), 5_000).unref();
    // Le serveur se teste lui-même comme le ferait un navigateur (voir
    // selfCheck.ts) : une lecture qui ne répond pas 200 alerte sur Telegram.
    setTimeout(() => void runSelfCheck(port), 8_000).unref();
  });
}
