import { describe, it, expect } from "vitest";
import {
  normaliseKey,
  governorateKey,
  aliasKey,
  matchDelegation,
  resolvedDelegationId,
  delegationsForGovernorate,
  type DelegationRef,
} from "./delegations";
import { TUNISIA_GOVERNORATES } from "./shop";

/** Toutes les délégations citées ici sont RÉELLES : elles viennent de la
 * table renvoyée par Team Parcel Express le 9 septembre 2026 (293 lignes,
 * 24 gouvernorats), et les villes testées sont celles réellement saisies
 * dans nos commandes. Rien n'est inventé pour faire passer un test. */
const D = (externalId: string, name: string, governorate: string): DelegationRef => ({
  externalId,
  name,
  governorate,
});

const TPE = [
  D("281", "Ariana", "Ariana"),
  D("5", "Ariana Ville", "Ariana"),
  D("17", "Ettadhamen", "Ariana"),
  D("134", "Ben Arous", "Ben Arous"),
  D("12", "El Mourouj", "Ben Arous"),
  D("136", "Ezzahra", "Ben Arous"),
  D("256", "Gafsa Nord", "Gafsa"),
  D("8", "Gafsa Sud", "Gafsa"),
  D("30", "Ghardimaou", "Jendouba"),
  D("47", "Kasserine Nord", "Kasserine"),
  D("202", "Kasserine Sud", "Kasserine"),
  D("145", "Le Kef Est", "Kef"),
  D("313", "Le Kef Ouest", "Kef"),
  D("59", "Mannouba", "Manouba"),
  D("127", "Beni Khalled", "Nabeul"),
  D("116", "Beni Khiar", "Nabeul"),
  D("1", "Sfax Ville", "Sfax"),
  D("2", "Sfax Ouest", "Sfax"),
  D("165", "Kalaa Essghira", "Sousse"),
  D("323", "Khzema sousse", "Sousse"),
  D("147", "Sousse Ville", "Sousse"),
  D("27", "Bardo", "Tunis"),
  D("83", "El Menzah", "Tunis"),
  D("294", "Centre ville tunis", "Tunis"),
  D("95", "Ezzouhour", "Tunis"),
  D("209", "Ezzouhour", "Kasserine"),
];

const match = (governorate: string, city: string, aliases?: Map<string, string>) =>
  matchDelegation({ governorate, city }, TPE, aliases);

describe("normaliseKey — le bruit qu'elle efface", () => {
  it("ignore la casse et les accents", () => {
    expect(normaliseKey("Sfax ville")).toBe(normaliseKey("Sfax Ville"));
    expect(normaliseKey("Béja")).toBe(normaliseKey("Beja"));
  });

  it("ignore l'article, arabe transcrit comme français", () => {
    expect(normaliseKey("Le Bardo")).toBe(normaliseKey("Bardo"));
    expect(normaliseKey("Kalaa Essghira")).toBe(normaliseKey("Kalaa Sghira"));
    expect(normaliseKey("Ezzahra")).toBe(normaliseKey("Zahra"));
  });

  it("ignore le numéro de cité, qui ne désigne pas une délégation", () => {
    // Le transporteur ne connaît qu'« El Menzah » ; les numéros sont des
    // quartiers à l'intérieur.
    expect(normaliseKey("El Menzah 4")).toBe(normaliseKey("El Menzah"));
    expect(normaliseKey("mourouj 1")).toBe(normaliseKey("El Mourouj"));
  });

  it("ignore une consonne doublée par la transcription", () => {
    expect(normaliseKey("Mannouba")).toBe(normaliseKey("Manouba"));
  });

  it("ignore la ponctuation", () => {
    expect(normaliseKey("L'Aouina")).toBe(normaliseKey("Aouina"));
    expect(normaliseKey("Sidi-Bouzid")).toBe(normaliseKey("Sidi Bouzid"));
  });

  it("NE confond PAS Est et Ouest — le garde-fou qui compte", () => {
    // « Est » commence par « es » : sans longueur minimale de racine, il
    // serait raboté en « t » et Le Kef Est deviendrait Le Kef Ouest.
    expect(normaliseKey("Le Kef Est")).not.toBe(normaliseKey("Le Kef Ouest"));
    expect(normaliseKey("Gafsa Nord")).not.toBe(normaliseKey("Gafsa Sud"));
  });

  it("rend vide un texte non latin, plutôt que de le translittérer", () => {
    expect(normaliseKey("بني خلاد")).toBe("");
    expect(normaliseKey("   ")).toBe("");
  });

  it("aligne nos gouvernorats sur les leurs", () => {
    expect(governorateKey("Le Kef")).toBe(governorateKey("Kef"));
    expect(governorateKey("La Manouba")).toBe(governorateKey("Manouba"));
    expect(governorateKey("Kébili")).toBe(governorateKey("Kebili"));
  });
});

describe("matchDelegation — ce qu'elle accepte de relier seule", () => {
  it("relie une correspondance unique dans le gouvernorat", () => {
    const m = match("Jendouba", "Ghardimaou");
    expect(m.status).toBe("exact");
    expect(resolvedDelegationId(m)).toBe("30");
  });

  it.each([
    ["Ben Arous", "mourouj 1", "12"],
    ["La Manouba", "Manouba", "59"],
    ["Sfax", "Sfax ville", "1"],
    ["Sousse", "Kalaa Sghira", "165"],
    ["Tunis", "Le Bardo", "27"],
    ["Tunis", "El Menzah 4", "83"],
    ["Ariana", "Ariana", "281"],
  ])("relie « %s / %s » à la délégation %s", (gov, city, id) => {
    expect(resolvedDelegationId(match(gov, city))).toBe(id);
  });

  it("ne se laisse pas troubler par un homonyme dans un autre gouvernorat", () => {
    // Ezzouhour existe à Tunis (95) ET à Kasserine (209).
    expect(resolvedDelegationId(match("Tunis", "Ezzouhour"))).toBe("95");
    expect(resolvedDelegationId(match("Kasserine", "Ezzouhour"))).toBe("209");
  });
});

describe("matchDelegation — ce qu'elle REFUSE de deviner", () => {
  it("refuse quand deux délégations sont plausibles", () => {
    // Le client a écrit « Gafsa » ; le transporteur connaît Gafsa Nord et
    // Gafsa Sud. Choisir au hasard, c'est une chance sur deux d'envoyer le
    // colis dans la mauvaise moitié de la ville.
    const m = match("Gafsa", "Gafsa");
    expect(m.status).toBe("ambiguous");
    expect(resolvedDelegationId(m)).toBeNull();
    expect(m.candidates.map((c) => c.externalId)).toEqual(["256", "8"]);
  });

  it.each([
    ["Kasserine", "Kasserine"],
    ["Le Kef", "El Kef"],
    ["Tunis", "Tunis"],
    ["Sousse", "Sousse khezama est"],
  ])("laisse « %s / %s » à un humain", (gov, city) => {
    expect(resolvedDelegationId(match(gov, city))).toBeNull();
  });

  it("ne translittère pas l'arabe — elle propose et attend", () => {
    const m = match("Nabeul", "بني خلاد");
    expect(m.status).toBe("unreadable");
    expect(resolvedDelegationId(m)).toBeNull();
    // La bonne réponse est proposée, mais ce n'est pas ce module qui la
    // choisit.
    expect(m.candidates.map((c) => c.externalId)).toContain("127");
  });

  it("signale une ville trouvée dans un AUTRE gouvernorat au lieu de l'utiliser", () => {
    // Une commande porte « gouvernorat Ariana, ville Tunis » : l'un des deux
    // est faux, et rien ne dit lequel.
    const m = match("Sfax", "Bardo");
    expect(m.status).toBe("elsewhere");
    expect(resolvedDelegationId(m)).toBeNull();
    expect(m.candidates[0]!.externalId).toBe("27");
  });

  it("ne propose rien d'utilisable pour un gouvernorat inconnu", () => {
    const m = match("Gouvernorat inexistant", "Quelque part");
    expect(m.status).toBe("unknown");
    expect(m.candidates).toEqual([]);
    expect(resolvedDelegationId(m)).toBeNull();
  });
});

describe("matchDelegation — la décision humaine", () => {
  it("mémorise un choix et ne repose plus la question", () => {
    const aliases = new Map([[aliasKey("Nabeul", "بني خلاد"), "127"]]);
    const m = match("Nabeul", "بني خلاد", aliases);
    expect(m.status).toBe("alias");
    expect(resolvedDelegationId(m)).toBe("127");
  });

  it("applique le choix à toutes les écritures équivalentes de la ville", () => {
    // Relier « Gafsa » une fois suffit : « GAFSA » et « gafsa » sont la même
    // saisie une fois le bruit retiré.
    const aliases = new Map([[aliasKey("Gafsa", "Gafsa"), "8"]]);
    expect(resolvedDelegationId(match("Gafsa", "GAFSA ", aliases))).toBe("8");
  });

  it("une correction humaine l'emporte sur la correspondance automatique", () => {
    const aliases = new Map([[aliasKey("Sfax", "Sfax ville"), "2"]]);
    expect(resolvedDelegationId(match("Sfax", "Sfax ville", aliases))).toBe("2");
  });

  it("repose la question si le choix mémorisé pointe vers une délégation disparue", () => {
    // Mieux vaut redemander que d'envoyer un identifiant qui n'existe plus.
    const aliases = new Map([[aliasKey("Gafsa", "Gafsa"), "99999"]]);
    const m = match("Gafsa", "Gafsa", aliases);
    expect(m.status).toBe("ambiguous");
    expect(resolvedDelegationId(m)).toBeNull();
  });
});

describe("cityKey — la mémoire ne doit pas confondre deux villes", () => {
  it("distingue deux villes écrites en arabe", () => {
    // Elles se normalisent toutes deux en texte vide : sans repli, relier
    // l'une relierait l'autre au même endroit.
    expect(normaliseKey("بني خلاد")).toBe(normaliseKey("بن عروس"));
    expect(aliasKey("Nabeul", "بني خلاد")).not.toBe(aliasKey("Nabeul", "بن عروس"));
  });

  it("ne relie pas la mauvaise ville quand un choix arabe est mémorisé", () => {
    const aliases = new Map([[aliasKey("Nabeul", "بني خلاد"), "127"]]);
    expect(resolvedDelegationId(match("Nabeul", "بني خلاد", aliases))).toBe("127");
    expect(resolvedDelegationId(match("Nabeul", "بن عروس", aliases))).toBeNull();
  });
});

describe("delegationsForGovernorate — le sélecteur du site", () => {
  /** Les 24 noms de gouvernorat tels que Team Parcel Express les écrit. */
  const TPE_GOVERNORATES = [
    "Ariana", "Ben Arous", "Bizerte", "Béja", "Gabès", "Gafsa", "Jendouba", "Kairouan",
    "Kasserine", "Kef", "Kébili", "Mahdia", "Manouba", "Monastir", "Médenine", "Nabeul",
    "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
  ];

  it("retrouve chacun de NOS 24 gouvernorats chez eux, malgré « Le », « La » et les accents", () => {
    // Un gouvernorat qui ne se retrouve pas donne un sélecteur vide, et le
    // client de ce gouvernorat-là ne peut plus commander.
    const theirs = new Set(TPE_GOVERNORATES.map(governorateKey));
    const missing = TUNISIA_GOVERNORATES.filter((g) => !theirs.has(governorateKey(g)));
    expect(missing).toEqual([]);
  });

  it("ne confond pas deux gouvernorats entre eux", () => {
    const keys = TUNISIA_GOVERNORATES.map(governorateKey);
    expect(new Set(keys).size).toBe(TUNISIA_GOVERNORATES.length);
  });

  it("filtre par gouvernorat et trie par nom", () => {
    const list = delegationsForGovernorate(TPE, "Gafsa");
    expect(list.map((d) => d.name)).toEqual(["Gafsa Nord", "Gafsa Sud"]);
  });

  it("relie « Le Kef » et « La Manouba » à « Kef » et « Manouba »", () => {
    expect(delegationsForGovernorate(TPE, "Le Kef").map((d) => d.externalId)).toEqual(["145", "313"]);
    expect(delegationsForGovernorate(TPE, "La Manouba").map((d) => d.externalId)).toEqual(["59"]);
  });

  it("rend une liste vide pour un gouvernorat inconnu ou vide", () => {
    expect(delegationsForGovernorate(TPE, "")).toEqual([]);
    expect(delegationsForGovernorate(TPE, "Atlantide")).toEqual([]);
  });
});
