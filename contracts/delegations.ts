/** Relier une ville écrite à la main à la délégation d'un transporteur.
 *
 * LE PROBLÈME, en une phrase : nos commandes portent une ville saisie
 * librement par le client (« mourouj 1 », « Le Bardo », « بني خلاد »), alors
 * que Team Parcel Express n'accepte qu'un IDENTIFIANT de délégation. Sans
 * correspondance, aucun colis ne peut être déposé chez eux.
 *
 * LA RÈGLE QUI GOUVERNE TOUT CE MODULE : un identifiant faux est pire que
 * pas d'identifiant. Un colis parti avec la mauvaise délégation arrive dans
 * une autre ville, et RIEN ne le signale — ni au client, ni à nous. Ce
 * module ne devine donc jamais. Il ne rapproche que ce qui est certain, et
 * renvoie tout le reste à une décision humaine, prise une seule fois puis
 * mémorisée.
 *
 * COMMENT LA CERTITUDE EST OBTENUE. On ne compare pas les noms tels quels :
 * les deux côtés écrivent la même ville de façons différentes (accents,
 * majuscules, article arabe transcrit « El / Es / Ez », numéro de cité,
 * consonne doublée). La normalisation ci-dessous efface ce bruit — et elle
 * l'efface DES DEUX CÔTÉS, ce qui la rend sûre même quand elle rabote trop :
 * si elle transforme « Enfidha » en « fidha », elle le fait aussi bien pour
 * la commande que pour la délégation, et le rapprochement tient toujours.
 *
 * Le seul vrai danger d'une normalisation large est la COLLISION : deux
 * délégations différentes réduites au même texte. C'est pourquoi un
 * rapprochement n'est accepté que s'il est UNIQUE dans le gouvernorat. Dès
 * qu'il y a deux candidats, c'est un humain qui tranche. */

export type DelegationRef = {
  /** L'identifiant CHEZ LE TRANSPORTEUR. C'est lui, et lui seul, qui part. */
  externalId: string;
  name: string;
  governorate: string;
};

/** Article défini arabe transcrit en lettres latines, sous ses formes
 * assimilées aux « lettres solaires » (Ez-Zahra, Et-Tadhamen, En-Nasr…),
 * plus les articles français qu'on trouve sur les mêmes adresses.
 *
 * Rangés du plus long au plus court : « ech » doit être essayé avant « e ». */
const ARTICLES = ["ech", "esh", "les", "el", "es", "ed", "en", "er", "et", "ez", "le", "la"];

/** Longueur minimale de ce qui reste après avoir retiré un article.
 *
 * Sans ce garde-fou, « est » (Le Kef **Est**) perdrait son « es » et se
 * réduirait à « t » — deux délégations distinctes deviendraient identiques. */
const MIN_STEM = 3;

function stripArticle(token: string): string {
  for (const a of ARTICLES) {
    if (token.startsWith(a) && token.length - a.length >= MIN_STEM) {
      return token.slice(a.length);
    }
  }
  return token;
}

/** Réduit un nom de lieu au texte qui permet de le comparer.
 *
 * Chaque étape supprime une forme de bruit constatée dans les données
 * réelles, et rien d'autre :
 *
 *   accents      « Béja » et « Beja » sont la même ville ;
 *   ponctuation  « L'Aouina », « Sidi-Bouzid » ;
 *   chiffres     « Mourouj 1 », « El Menzah 4 » — un numéro de cité, pas
 *                une délégation : le transporteur n'en connaît qu'une ;
 *   article      « Le Bardo » = « Bardo », « Kalaa Essghira » = « Kalaa
 *                Sghira » ;
 *   doublons     « Mannouba » = « Manouba » ;
 *   lettre seule « L'Aouina » = « Aouina ».
 *
 * Un texte qui n'est pas en alphabet latin (arabe) ressort vide : ce module
 * ne translittère pas. Une ville écrite en arabe est renvoyée à l'humain,
 * qui la reliera une fois pour toutes. */
export function normaliseKey(raw: string): string {
  const folded = raw
    .normalize("NFD")
    // Marques diacritiques : é → e, è → e.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Tout ce qui n'est ni lettre latine ni chiffre devient une séparation.
    .replace(/[^a-z0-9]+/g, " ")
    // Les chiffres ne distinguent jamais deux délégations, seulement des
    // cités à l'intérieur d'une même délégation.
    .replace(/[0-9]+/g, " ")
    .trim();

  if (folded === "") return "";

  return folded
    .split(/\s+/)
    // Un article isolé (« le », « el ») ne porte aucune information — pas
    // plus que le « l' » élidé de « L'Aouina », réduit à une seule lettre
    // par le retrait de la ponctuation.
    .filter((t) => t.length > 1 && !ARTICLES.includes(t))
    .map((t) => stripArticle(t))
    // Consonne doublée par la transcription : mannouba → manouba.
    .map((t) => t.replace(/(.)\1+/g, "$1"))
    .filter((t) => t !== "")
    .join(" ");
}

/** Même normalisation pour un gouvernorat.
 *
 * Séparée par intention : nos formulaires écrivent « Le Kef » et « La
 * Manouba » là où le transporteur écrit « Kef » et « Manouba ». */
export function governorateKey(raw: string): string {
  return normaliseKey(raw);
}

/** Identité d'une ville pour la mémoire des décisions humaines.
 *
 * `normaliseKey` renvoie du vide sur un texte non latin — utile pour dire
 * « je ne sais pas lire ceci », désastreux comme clé : « بني خلاد » et
 * « بن عروس » auraient la MÊME clé et la décision prise pour l'une
 * s'appliquerait à l'autre, envoyant un colis à 60 km de sa destination.
 *
 * D'où ce repli : quand il n'y a rien à normaliser, on garde le texte tel
 * qu'il a été écrit, à la casse et aux espaces près. */
export function cityKey(city: string): string {
  const normalised = normaliseKey(city);
  if (normalised !== "") return normalised;
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Clé d'une correspondance décidée par un humain. Le gouvernorat en fait
 * partie : « Ariana » n'a pas le même sens à Tunis et à Sfax. */
export function aliasKey(governorate: string, city: string): string {
  return `${governorateKey(governorate)}|${cityKey(city)}`;
}

export type MatchStatus =
  /** Un humain a relié cette ville : décision enregistrée, plus jamais reposée. */
  | "alias"
  /** Un seul nom correspond dans le gouvernorat. Utilisable tel quel. */
  | "exact"
  /** Des délégations RESSEMBLENT à la ville, sans qu'aucune soit certaine :
   *  « Gafsa » chez eux, c'est Gafsa Nord ou Gafsa Sud. Trancher au hasard,
   *  c'est une chance sur deux d'envoyer le colis dans la mauvaise moitié de
   *  la ville. */
  | "ambiguous"
  /** Le nom existe, mais dans un AUTRE gouvernorat. Presque toujours une
   *  erreur de saisie côté commande — à confirmer, jamais à supposer. */
  | "elsewhere"
  /** Ville écrite hors alphabet latin : rien à comparer. Ce module ne
   *  translittère pas, il demande. */
  | "unreadable"
  /** Rien ne ressemble à cette ville. Les candidats montrés ne sont alors
   *  que le contenu du gouvernorat, pour donner de quoi choisir. */
  | "unknown";

/** Les états où l'identifiant est établi. Tout le reste attend un humain. */
export function isResolved(status: MatchStatus): boolean {
  return status === "alias" || status === "exact";
}

export type DelegationMatch = {
  status: MatchStatus;
  /** Renseignée UNIQUEMENT pour « alias » et « exact ». Dans tous les autres
   *  cas elle vaut null : c'est ce qui empêche un envoi au hasard. */
  delegation: DelegationRef | null;
  /** Propositions classées, pour la personne qui tranchera. */
  candidates: DelegationRef[];
};

/** Nombre de propositions montrées. Au-delà, la liste cesse d'aider. */
const MAX_CANDIDATES = 8;

/** Classe les délégations d'un gouvernorat par ressemblance avec la ville.
 *
 * Mesure volontairement simple : nombre de mots partagés, puis préfixe
 * commun. Elle sert à ÉCLAIRER un choix humain, jamais à le prendre — c'est
 * pourquoi elle n'a pas besoin d'être fine, seulement d'être stable. */
function rank(cityKey: string, pool: DelegationRef[]): DelegationRef[] {
  const words = new Set(cityKey.split(" ").filter(Boolean));
  return pool
    .map((d) => {
      const key = normaliseKey(d.name);
      const shared = key.split(" ").filter((w) => words.has(w)).length;
      const touches = shared > 0 || key.startsWith(cityKey) || cityKey.startsWith(key);
      return { d, key, score: shared * 10 + (key.startsWith(cityKey) ? 5 : 0), touches };
    })
    .filter((x) => x.touches)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, MAX_CANDIDATES)
    .map((x) => x.d);
}

/** Relie une commande à une délégation — ou refuse de le faire.
 *
 * `aliases` associe une clé `aliasKey(...)` à un identifiant de délégation :
 * ce sont les décisions déjà prises par un humain. Elles passent avant tout
 * le reste, y compris avant une correspondance exacte : si quelqu'un a
 * corrigé un rapprochement, cette correction gagne. */
export function matchDelegation(
  order: { governorate: string; city: string },
  delegations: DelegationRef[],
  aliases: ReadonlyMap<string, string> = new Map(),
): DelegationMatch {
  const govKey = governorateKey(order.governorate);
  const cityKey = normaliseKey(order.city);
  const inGov = delegations.filter((d) => governorateKey(d.governorate) === govKey);

  const decided = aliases.get(aliasKey(order.governorate, order.city));
  if (decided !== undefined) {
    const found = delegations.find((d) => d.externalId === decided);
    // Un alias qui pointe vers une délégation disparue ne vaut rien : on
    // repose la question plutôt que d'envoyer un identifiant mort.
    if (found) return { status: "alias", delegation: found, candidates: [found] };
  }

  // Ville illisible pour ce module (arabe, vide) : tout le gouvernorat est
  // proposé, et c'est un humain qui choisit.
  if (cityKey === "") {
    return { status: "unreadable", delegation: null, candidates: inGov.slice(0, MAX_CANDIDATES) };
  }

  const exact = inGov.filter((d) => normaliseKey(d.name) === cityKey);
  if (exact.length === 1) {
    return { status: "exact", delegation: exact[0]!, candidates: exact };
  }
  // Deux délégations du même gouvernorat portent le même nom réduit : c'est
  // exactement le cas où deviner enverrait le colis à côté.
  if (exact.length > 1) {
    return { status: "ambiguous", delegation: null, candidates: exact };
  }

  const elsewhere = delegations.filter((d) => normaliseKey(d.name) === cityKey);
  if (elsewhere.length > 0) {
    return {
      status: "elsewhere",
      delegation: null,
      candidates: elsewhere.slice(0, MAX_CANDIDATES),
    };
  }

  const near = rank(cityKey, inGov);
  if (near.length > 0) {
    return { status: "ambiguous", delegation: null, candidates: near };
  }
  return {
    status: "unknown",
    delegation: null,
    // Aucun mot en commun : on montre quand même le gouvernorat, pour que la
    // personne ait quelque chose à choisir.
    candidates: inGov.slice(0, MAX_CANDIDATES),
  };
}

/** L'identifiant à envoyer au transporteur, ou null s'il n'est pas certain.
 *
 * Point de passage unique : tout ce qui part chez un transporteur doit venir
 * d'ici, jamais d'un `candidates[0]`. */
export function resolvedDelegationId(m: DelegationMatch): string | null {
  return isResolved(m.status) ? (m.delegation?.externalId ?? null) : null;
}
