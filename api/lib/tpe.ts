/** Client Team Parcel Express — phase de RECONNAISSANCE, lecture seule.
 *
 * Leur API n'est pas documentée publiquement, mais le jeton dont nous
 * disposons a été délivré par TPE pour le compte Chez Laziz : l'usage est
 * autorisé. Ce qui manque n'est pas la permission, c'est la CONNAISSANCE de
 * la forme des requêtes. Ce module sert à l'acquérir, et rien d'autre.
 *
 * TROIS RÈGLES, toutes vérifiables dans le code ci-dessous :
 *
 *   1. AUCUNE ÉCRITURE. Uniquement des GET. Ce module ne peut pas créer,
 *      modifier ni supprimer un colis, même par erreur : la méthode est
 *      codée en dur.
 *   2. LE JETON NE SORT JAMAIS. Il n'apparaît ni dans un retour de fonction,
 *      ni dans un journal, ni dans un message d'erreur. Seul son état
 *      (présent / absent) est observable.
 *   3. RIEN N'EST INVENTÉ. Les chemins essayés viennent du paquet
 *      JavaScript de leur propre interface. Un chemin qui répond 404 est
 *      rapporté comme tel, jamais contourné par une supposition.
 *
 * Le conteneur de développement n'a pas d'accès réseau sortant : ces appels
 * ne peuvent aboutir que depuis le serveur déployé. */

const BASE = "https://api.teamparcelexpress.com";

/** Au-delà, on considère que le service ne répond pas : une requête admin ne
 * doit pas laisser l'interface bloquée une minute. */
const TIMEOUT_MS = 12_000;

/** Réponse tronquée à cette taille. Une liste de délégations complète peut
 * peser lourd ; on n'en garde qu'un échantillon pour l'inspection. */
const MAX_SAMPLE = 4_000;

export function tpeTokenPresent(): boolean {
  return (process.env.TPE_API_TOKEN ?? "").trim().length > 0;
}

export type ProbeResult = {
  path: string;
  /** Code HTTP, ou null si la requête n'a même pas abouti. */
  status: number | null;
  ok: boolean;
  /** Ce que la réponse contient, décrit sans la recopier entièrement. */
  shape: string;
  /** Début de la réponse, pour comprendre la structure. Tronqué. */
  sample: string;
  error?: string;
};

/** Décrit une valeur JSON sans en révéler le volume : type, taille, et pour
 * une liste d'objets, les noms de champs du premier élément. Ce sont ces
 * noms qui nous manquent pour construire une requête de création. */
function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "liste vide";
    const first = value[0];
    if (first && typeof first === "object") {
      return `liste de ${value.length} objets — champs : ${Object.keys(first).join(", ")}`;
    }
    return `liste de ${value.length} ${typeof first}`;
  }
  if (typeof value === "object") {
    return `objet — champs : ${Object.keys(value as object).join(", ")}`;
  }
  return typeof value;
}

/** UN SEUL GET, jamais autre chose.
 *
 * La méthode n'est pas un paramètre : elle est écrite en dur. Aucun appel
 * de ce module ne peut donc créer ou modifier quoi que ce soit chez le
 * transporteur, quelle que soit la façon dont il est appelé plus tard. */
type RawResponse = { status: number | null; ok: boolean; text: string; error?: string };

async function rawGet(path: string): Promise<RawResponse> {
  const token = (process.env.TPE_API_TOKEN ?? "").trim();
  if (!token) return { status: null, ok: false, text: "", error: "jeton absent" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        // En-tête « Token », pas « Bearer » : c'est la convention Django
        // REST Framework, celle qu'utilise leur propre interface.
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return { status: res.status, ok: res.ok, text: await res.text() };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Le message d'erreur réseau ne contient jamais l'en-tête envoyé, donc
    // jamais le jeton.
    return { status: null, ok: false, text: "", error: message.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

/** Résumé inspectable d'une réponse : décrit sa forme et n'en garde qu'un
 * échantillon. Sert au diagnostic, JAMAIS à extraire des données — un
 * échantillon tronqué perdrait la moitié des délégations. */
function summarise(path: string, r: RawResponse): ProbeResult {
  if (r.error) {
    return { path, status: r.status, ok: false, shape: "—", sample: "", error: r.error };
  }
  try {
    const parsed: unknown = JSON.parse(r.text);
    return {
      path,
      status: r.status,
      ok: r.ok,
      shape: describe(parsed),
      sample: JSON.stringify(parsed).slice(0, MAX_SAMPLE),
    };
  } catch {
    // Une page HTML au lieu de JSON signale presque toujours un mauvais
    // chemin ou une redirection vers une page de connexion.
    return {
      path,
      status: r.status,
      ok: r.ok,
      shape: "réponse non-JSON",
      sample: r.text.slice(0, MAX_SAMPLE),
    };
  }
}

/** Chemins relevés dans le paquet JavaScript de app.teamparcelexpress.com.
 *
 * Uniquement ceux qui LISENT. Les chemins d'écriture existent dans leur
 * interface (`/api/orders/create/`, `bulk-create`, `delete`…) et sont
 * volontairement absents d'ici : cette phase n'écrit pas. */
const READ_PATHS = [
  "/api/v1/users/me/",
  "/api/governorates/list/",
  "/api/delegations/",
  "/api/orders/list/",
] as const;

/** Interroge chaque chemin de lecture et rapporte ce qu'il répond.
 *
 * Objectif : savoir lesquels existent, et surtout quels champs porte une
 * délégation — l'identifiant qui manque pour pouvoir créer un colis. */
export async function tpeProbe(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  for (const path of READ_PATHS) {
    results.push(summarise(path, await rawGet(path)));
  }
  return results;
}

export type Delegation = { externalId: string; name: string; governorate: string; raw: string };

/** Extrait les délégations d'une réponse dont on ne connaît pas encore la
 * forme exacte.
 *
 * Écrit pour être tolérant, PAS pour deviner : chaque champ est cherché sous
 * plusieurs noms plausibles et, s'il reste introuvable, la ligne est ignorée
 * plutôt que remplie au hasard. La réponse brute est conservée entière dans
 * `raw`, pour qu'aucune information ne soit perdue par une lecture trop
 * étroite. */
export function extractDelegations(payload: unknown): Delegation[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)
      ? ((payload as { results: unknown[] }).results)
      : [];

  const out: Delegation[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const id = o.id ?? o.pk ?? o.delegation_id;
    const name = o.name ?? o.label ?? o.delegation ?? o.designation;
    if (id === undefined || id === null || typeof name !== "string") continue;

    const gov = o.governorate ?? o.gouvernorat ?? o.governorate_name ?? o.state;
    out.push({
      externalId: String(id),
      name: name.trim(),
      governorate:
        typeof gov === "string"
          ? gov.trim()
          : gov && typeof gov === "object" && typeof (gov as { name?: unknown }).name === "string"
            ? ((gov as { name: string }).name).trim()
            : "",
      raw: JSON.stringify(o).slice(0, 2000),
    });
  }
  return out;
}

/** Récupère la table des délégations, si le chemin répond. */
export async function tpeFetchDelegations(): Promise<{
  probe: ProbeResult;
  delegations: Delegation[];
}> {
  const path = "/api/delegations/";
  const raw = await rawGet(path);
  const probe = summarise(path, raw);
  if (!raw.ok) return { probe, delegations: [] };
  try {
    // La réponse ENTIÈRE, pas l'échantillon : le résumé est tronqué à
    // quelques milliers de caractères et la Tunisie compte des centaines de
    // délégations.
    return { probe, delegations: extractDelegations(JSON.parse(raw.text) as unknown) };
  } catch {
    return { probe, delegations: [] };
  }
}
