import type { Context, Next } from "hono";

/**
 * Limiteur simple en mémoire (par processus). Suffisant pour une seule
 * instance Railway. Si le trafic grandit ou qu'on passe en multi-instance,
 * remplacer par un compteur partagé (ex. Redis).
 */
const buckets = new Map<string, { count: number; windowStart: number }>();

function getClientIp(c: Context): string {
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return c.req.header("x-real-ip") || "unknown";
}

/** Limiteur par IP.
 *
 * `bucket` sépare les compteurs : une lecture et une écriture ne puisent
 * pas dans la même réserve. `appliesTo` permet de ne compter que certaines
 * requêtes (voir le limiteur d'écriture dans api/boot.ts).
 *
 * POURQUOI DEUX RÉSERVES. Un seul compteur à 60 requêtes/minute couvrait
 * TOUT /api/trpc. Or un client qui achète en consomme cinq (visite,
 * catalogue, deux fois la liste des délégations, création). Douze acheteurs
 * par minute derrière la même adresse suffisaient donc à bloquer les
 * suivants — et en Tunisie, les abonnés 4G d'un même opérateur partagent
 * un petit nombre d'adresses publiques. Un jour de publicité, ça se produit.
 * Les lectures sont donc largement ouvertes ; ce qui écrit reste serré,
 * puisque c'est là qu'est l'abus. */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  bucket?: string;
  appliesTo?: (c: Context) => boolean;
}) {
  return async (c: Context, next: Next) => {
    if (opts.appliesTo && !opts.appliesTo(c)) return next();
    const key = `${opts.bucket ?? "default"}|${getClientIp(c)}`;
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || now - entry.windowStart > opts.windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      return c.json({ error: "Trop de requêtes, réessayez plus tard." }, 429);
    }
    return next();
  };
}
