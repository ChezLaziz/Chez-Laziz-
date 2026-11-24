/** Le clic publicitaire, gardé jusqu'au consentement.
 *
 * `_fbc` est le lien déterministe entre une annonce et une commande : c'est
 * le fbclid que Meta ajoute à l'adresse d'arrivée, rangé dans un cookie de
 * première partie. Le Pixel le pose lui-même — mais SEULEMENT s'il se
 * charge pendant que le fbclid est encore dans l'adresse.
 *
 * Or ici le Pixel attend « Accepter ». La visiteuse arrive depuis l'annonce,
 * regarde, clique vers la commande — l'adresse change, le fbclid n'y est
 * plus — et n'accepte le bandeau qu'à ce moment-là, quand il la gêne. Le
 * Pixel se charge alors sur une adresse sans fbclid : il pose `_fbp`, jamais
 * `_fbc`. La commande part avec un consentement plein et SANS le clic qui
 * l'a causée.
 *
 * On garde donc le fbclid d'arrivée EN MÉMOIRE (une variable, pas un
 * stockage : rien n'est écrit, rien ne survit au rechargement), et on ne
 * s'en sert qu'à l'initialisation du Pixel — donc après « Accepter ». Si
 * elle refuse, la variable meurt avec l'onglet : le refus reste respecté à
 * la lettre.
 *
 * Format et règles : documentation Meta, « ClickID and the fbp and fbc
 * Parameters ». L'horodatage est celui où l'on a VU le fbclid pour la
 * première fois ; le fbclid lui-même est opaque et ne se modifie jamais. */

/** Un fbclid est une valeur base64url (lettres, chiffres, tiret, souligné),
 * parfois avec des points. Tout autre caractère veut dire qu'on ne sait pas
 * le recopier sans risque de l'altérer (encodage « % », « + » lu comme un
 * espace) : dans le doute on n'écrit rien, et le Pixel reste seul juge. */
const FBCLID_SUR = /^[A-Za-z0-9_.-]+$/;
const FBCLID_MAX = 900;

/** Le fbclid BRUT d'une chaîne de requête (« ?a=1&fbclid=… ») — lu sans
 * décodage, pour ne jamais le transformer en le lisant. */
export function rawClickIdFromSearch(search: string | null | undefined): string | null {
  if (!search) return null;
  const m = /(?:^|[?&])fbclid=([^&#]*)/.exec(search);
  const brut = m?.[1];
  if (!brut || brut.length > FBCLID_MAX || !FBCLID_SUR.test(brut)) return null;
  return brut;
}

/** « fb.1.<première vue, en millisecondes>.<fbclid> » — ou rien. */
export function fbcFromClickId(fbclid: string | null | undefined, firstSeenMs: number): string | null {
  if (!fbclid || fbclid.length > FBCLID_MAX || !FBCLID_SUR.test(fbclid)) return null;
  if (!Number.isFinite(firstSeenMs) || firstSeenMs <= 0) return null;
  return `fb.1.${Math.floor(firstSeenMs)}.${fbclid}`;
}

/** Le fbclid que porte une valeur `_fbc` : tout ce qui suit le TROISIÈME
 * point — un fbclid peut lui-même en contenir. */
export function clickIdOfFbc(fbc: string | null | undefined): string | null {
  if (!fbc) return null;
  const parts = fbc.split(".");
  if (parts.length < 4 || parts[0] !== "fb") return null;
  return parts.slice(3).join(".") || null;
}

/** La valeur à écrire dans `_fbc`, ou `null` s'il ne faut rien écrire.
 *
 * Règle de Meta : on écrit s'il n'y a pas de cookie, ou si le cookie porte
 * un AUTRE clic que celui qui vient d'amener la visite (le plus récent
 * gagne). Si le cookie porte déjà ce clic, on n'y touche pas : son
 * horodatage d'origine est le bon. */
export function fbcToWrite(args: {
  fbclid: string | null | undefined;
  firstSeenMs: number;
  existingFbc: string | null | undefined;
}): string | null {
  if (!args.fbclid) return null;
  if (clickIdOfFbc(args.existingFbc) === args.fbclid) return null;
  return fbcFromClickId(args.fbclid, args.firstSeenMs);
}
