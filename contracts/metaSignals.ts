/** Les signaux qui permettent à Meta de RECONNAÎTRE l'acheteur.
 *
 * L'événement « Purchase » ne partait qu'avec un numéro de téléphone haché.
 * C'est le signal le plus faible qui soit en Tunisie : beaucoup de comptes
 * Facebook n'ont aucun numéro rattaché, ou un numéro écrit autrement. Une
 * vente réelle n'était donc pas reconnue comme venant de la publicité.
 *
 * Conséquence directe, et c'est de l'argent : l'algorithme de Meta apprend
 * sur les conversions qu'on lui rapporte. S'il n'en voit qu'une fraction,
 * il optimise mal, montre l'annonce aux mauvaises personnes, et le budget
 * part en fumée sans que personne ne comprenne pourquoi.
 *
 * Les deux signaux forts sont posés par le Pixel lui-même, en cookies de
 * PREMIÈRE partie sur notre domaine :
 *   _fbc — dérivé du fbclid du clic publicitaire. Déterministe : c'est LE
 *          lien entre l'annonce et la vente.
 *   _fbp — identifiant de navigateur posé par le Pixel.
 * Ils arrivent donc tout seuls dans l'en-tête Cookie de la commande.
 *
 * LE CONSENTEMENT EST RESPECTÉ SANS CONDITION SUPPLÉMENTAIRE. Ces cookies
 * n'existent que si le Pixel s'est chargé, et le Pixel ne se charge qu'après
 * « Accepter ». Pas de cookie ⇒ pas de Pixel ⇒ pas de consentement ⇒ on
 * n'envoie NI l'adresse IP NI l'agent utilisateur. Un visiteur qui a refusé
 * ne transmet rien de plus qu'avant. */
export type MetaUserSignals = {
  fbc?: string;
  fbp?: string;
  clientIp?: string;
  clientUserAgent?: string;
};

const MAX_FBC = 255;
const MAX_FBP = 100;
const MAX_UA = 400;
const MAX_IP = 45; // une IPv6 en toutes lettres

/** Lit un cookie dans un en-tête `Cookie` brut. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    return value === "" ? undefined : value;
  }
  return undefined;
}

/** L'adresse du client derrière le proxy Railway.
 *
 * `x-forwarded-for` est une liste : le premier élément est le client, les
 * suivants sont les relais. Elle peut être forgée par l'appelant — pour de
 * la mesure publicitaire c'est sans conséquence, et Meta la traite comme un
 * indice parmi d'autres. */
export function clientIpFromHeaders(
  xForwardedFor: string | null | undefined,
  xRealIp: string | null | undefined,
): string | undefined {
  const first = xForwardedFor?.split(",")[0]?.trim();
  const ip = first || xRealIp?.trim();
  if (!ip || ip.length > MAX_IP) return undefined;
  return ip;
}

/** Ce qu'on garde d'une requête de commande, ou rien.
 *
 * Rend `null` en l'absence des deux cookies du Pixel : sans eux il n'y a ni
 * consentement ni signal fort, et l'IP seule n'apporterait qu'une donnée
 * personnelle de plus sans améliorer la reconnaissance. */
export function metaUserSignals(headers: {
  cookie?: string | null;
  xForwardedFor?: string | null;
  xRealIp?: string | null;
  userAgent?: string | null;
}): MetaUserSignals | null {
  const fbc = readCookie(headers.cookie, "_fbc")?.slice(0, MAX_FBC);
  const fbp = readCookie(headers.cookie, "_fbp")?.slice(0, MAX_FBP);
  if (!fbc && !fbp) return null;
  const signals: MetaUserSignals = {};
  if (fbc) signals.fbc = fbc;
  if (fbp) signals.fbp = fbp;
  const ip = clientIpFromHeaders(headers.xForwardedFor, headers.xRealIp);
  if (ip) signals.clientIp = ip;
  const ua = headers.userAgent?.trim().slice(0, MAX_UA);
  if (ua) signals.clientUserAgent = ua;
  return signals;
}
