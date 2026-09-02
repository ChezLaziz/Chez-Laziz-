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

export function rateLimit(opts: { windowMs: number; max: number }) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const now = Date.now();
    const entry = buckets.get(ip);
    if (!entry || now - entry.windowStart > opts.windowMs) {
      buckets.set(ip, { count: 1, windowStart: now });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      return c.json({ error: "Trop de requêtes, réessayez plus tard." }, 429);
    }
    return next();
  };
}
