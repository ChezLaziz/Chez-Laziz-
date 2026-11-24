import { describe, expect, it } from "vitest";
import {
  ARRIVEES_ETIQUETTES_MAX,
  ARRIVEES_ETIQUETTE_LONGUEUR_MAX,
  VISITES_MIN_POUR_UN_TAUX,
  agentAutomatique,
  ajouterArrivee,
  cleArrivees,
  ecrireJourArrivees,
  fusionnerArrivees,
  jourEstVide,
  jourVide,
  parseJourArrivees,
  pourCentVisites,
  sommerArrivees,
  type Arrivee,
  type JourArrivees,
} from "./arrivees";

const PUB_A = "120249779868510674";
const PUB_B = "120250115103040674";

function jour(...arrivees: Arrivee[]): JourArrivees {
  const j = jourVide();
  for (const a of arrivees) ajouterArrivee(j, a);
  return j;
}

describe("arrivées — compter une arrivée", () => {
  it("range une arrivée étiquetée sous son étiquette, et seulement là", () => {
    const j = jour({ pub: PUB_A, meta: true }, { pub: PUB_A, meta: true }, { pub: PUB_B });
    expect(Object.fromEntries(j.parPub)).toEqual({ [PUB_A]: 2, [PUB_B]: 1 });
    expect(j.sans).toBe(0);
    expect(j.metaSans).toBe(0);
  });

  it("compte à part une arrivée de Meta qui n'a pas d'étiquette", () => {
    // Le cas du jour d'un lancement : la publicité tourne, le lien porte le
    // fbclid de Meta, mais aucune étiquette — ni la nôtre, ni celle que Meta
    // ajoute d'habitude de lui-même.
    const j = jour({ meta: true }, { meta: true }, {}, { meta: false });
    expect(j.sans).toBe(4);
    expect(j.metaSans).toBe(2);
    expect(j.parPub.size).toBe(0);
  });

  it("prend l'étiquette comme la commande la gardera : sans les espaces autour", () => {
    // La commande enregistre `utm_content` après trim() ; une visite rangée
    // sous « 1202… » avec une espace ne rejoindrait jamais sa ligne.
    const j = jour({ pub: `  ${PUB_A} ` }, { pub: PUB_A });
    expect(Object.fromEntries(j.parPub)).toEqual({ [PUB_A]: 2 });
  });

  it("traite une étiquette vide ou blanche comme une absence d'étiquette", () => {
    const j = jour({ pub: "" }, { pub: "   ", meta: true });
    expect(j.parPub.size).toBe(0);
    expect(j.sans).toBe(2);
    expect(j.metaSans).toBe(1);
  });

  it("ne range pas une étiquette démesurée, mais la compte quand même", () => {
    const longue = "x".repeat(ARRIVEES_ETIQUETTE_LONGUEUR_MAX + 1);
    const limite = "y".repeat(ARRIVEES_ETIQUETTE_LONGUEUR_MAX);
    const j = jour({ pub: longue }, { pub: limite });
    expect(j.parPub.has(longue)).toBe(false);
    expect(j.parPub.get(limite)).toBe(1);
    expect(j.nonRangees).toBe(1);
  });

  it("s'arrête à quarante étiquettes par jour sans perdre les suivantes du total", () => {
    const j = jourVide();
    for (let i = 0; i < ARRIVEES_ETIQUETTES_MAX + 5; i++) ajouterArrivee(j, { pub: `pub-${i}` });
    expect(j.parPub.size).toBe(ARRIVEES_ETIQUETTES_MAX);
    expect(j.nonRangees).toBe(5);
    // Une étiquette DÉJÀ rangée continue de compter une fois le plafond atteint.
    ajouterArrivee(j, { pub: "pub-0" });
    expect(j.parPub.get("pub-0")).toBe(2);
    expect(j.nonRangees).toBe(5);
  });

  it("accepte « __proto__ » comme une étiquette ordinaire", () => {
    // La clé vient d'une URL. Dans un objet, elle disparaîtrait sans bruit.
    const j = jour({ pub: "__proto__" }, { pub: "__proto__" }, { pub: "constructor" });
    expect(j.parPub.get("__proto__")).toBe(2);
    const relu = parseJourArrivees(ecrireJourArrivees(j));
    expect(relu.parPub.get("__proto__")).toBe(2);
    expect(relu.parPub.get("constructor")).toBe(1);
  });
});

describe("arrivées — écrire et relire un jour", () => {
  it("relit exactement ce qui a été écrit", () => {
    const j = jour({ pub: PUB_A }, { pub: PUB_A }, { pub: "link_in_bio" }, { meta: true }, {});
    j.nonRangees = 3;
    const relu = parseJourArrivees(ecrireJourArrivees(j));
    expect(Object.fromEntries(relu.parPub)).toEqual({ [PUB_A]: 2, link_in_bio: 1 });
    expect(relu.sans).toBe(2);
    expect(relu.metaSans).toBe(1);
    expect(relu.nonRangees).toBe(3);
  });

  it("donne un jour vide pour une ligne absente ou abîmée, jamais une erreur", () => {
    for (const brut of [null, undefined, "", "pas du json", "[]", "42", "null", '"texte"']) {
      expect(jourEstVide(parseJourArrivees(brut))).toBe(true);
    }
  });

  it("ignore les compteurs qui n'en sont pas", () => {
    const relu = parseJourArrivees(
      JSON.stringify({ p: { a: 3.9, b: -2, c: "7", d: null, "": 5, e: 1 }, s: "12", m: 4, x: -1 }),
    );
    expect(Object.fromEntries(relu.parPub)).toEqual({ a: 3, e: 1 });
    expect(relu.sans).toBe(0);
    // « Venues de Meta » ne peut pas dépasser « sans étiquette ».
    expect(relu.metaSans).toBe(0);
    expect(relu.nonRangees).toBe(0);
  });

  it("borne « venues de Meta » à « sans étiquette »", () => {
    expect(parseJourArrivees(JSON.stringify({ p: {}, s: 5, m: 9, x: 0 })).metaSans).toBe(5);
  });

  it("range chaque jour sous sa propre clé", () => {
    expect(cleArrivees("2026-11-25")).toBe("pub_arrivees:2026-11-25");
    expect(cleArrivees("2026-11-25")).not.toBe(cleArrivees("2026-11-26"));
  });
});

describe("arrivées — additionner", () => {
  it("fusionne sans toucher aux deux jours d'origine", () => {
    const enBase = jour({ pub: PUB_A }, { meta: true });
    const enAttente = jour({ pub: PUB_A }, { pub: PUB_B }, {});
    const somme = fusionnerArrivees(enBase, enAttente);
    expect(Object.fromEntries(somme.parPub)).toEqual({ [PUB_A]: 2, [PUB_B]: 1 });
    expect(somme.sans).toBe(2);
    expect(somme.metaSans).toBe(1);
    expect(Object.fromEntries(enBase.parPub)).toEqual({ [PUB_A]: 1 });
    expect(enBase.sans).toBe(1);
    expect(enAttente.sans).toBe(1);
  });

  it("garde le plafond d'étiquettes à la fusion", () => {
    const plein = jourVide();
    for (let i = 0; i < ARRIVEES_ETIQUETTES_MAX; i++) ajouterArrivee(plein, { pub: `pub-${i}` });
    const somme = fusionnerArrivees(plein, jour({ pub: "nouvelle" }, { pub: "nouvelle" }, { pub: "pub-3" }));
    expect(somme.parPub.size).toBe(ARRIVEES_ETIQUETTES_MAX);
    expect(somme.parPub.has("nouvelle")).toBe(false);
    expect(somme.nonRangees).toBe(2);
    expect(somme.parPub.get("pub-3")).toBe(2);
  });

  it("additionne les jours d'une période, publicité par publicité", () => {
    const lundi = jour({ pub: PUB_A }, { pub: PUB_A }, { meta: true });
    const mardi = jour({ pub: PUB_A }, { pub: PUB_B }, {}, { meta: true });
    mardi.nonRangees = 2;
    const total = sommerArrivees([lundi, mardi]);
    expect(Object.fromEntries(total.parPub)).toEqual({ [PUB_A]: 3, [PUB_B]: 1 });
    expect(total.sans).toBe(3);
    expect(total.metaSans).toBe(2);
    expect(total.nonRangees).toBe(2);
    // Le total étiqueté compte aussi ce qui n'a pas pu être rangé.
    expect(total.etiquetees).toBe(6);
  });

  it("rend un total nul pour une période sans aucun jour", () => {
    const total = sommerArrivees([]);
    expect(total.parPub.size).toBe(0);
    expect(total.etiquetees + total.sans + total.metaSans + total.nonRangees).toBe(0);
  });
});

describe("arrivées — une personne ou un programme", () => {
  it("laisse passer les navigateurs des clientes, application Facebook comprise", () => {
    for (const ua of [
      "Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/487.0.0.52.75;]",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 350.0.0.31.90",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      // CUBOT est une marque de téléphones : « bot » dans le nom, une cliente au bout.
      "Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 7 Build/RP1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Linux; Android 12; CUBOT_P60) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
    ]) {
      expect(agentAutomatique(ua), ua).toBe(false);
    }
  });

  it("écarte les robots qui ouvrent les liens publicitaires", () => {
    for (const ua of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "AdsBot-Google (+http://www.google.com/adsbot.html)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
      "curl/8.5.0",
      "python-requests/2.32.3",
    ]) {
      expect(agentAutomatique(ua), ua).toBe(true);
    }
  });

  it("tient l'absence de nom pour un programme", () => {
    expect(agentAutomatique(null)).toBe(true);
    expect(agentAutomatique(undefined)).toBe(true);
    expect(agentAutomatique("   ")).toBe(true);
  });

  it("écarte ce qui ne s'annonce pas comme un navigateur, sans avoir à le connaître", () => {
    for (const ua of ["node", "okhttp/4.12.0", "Go-http-client/2.0", "Dalvik/2.1.0 (Linux; U; Android 13)", "undici"]) {
      expect(agentAutomatique(ua), ua).toBe(true);
    }
    // Opera Mini ne commence pas par « Mozilla/ » et reste un navigateur.
    expect(agentAutomatique("Opera/9.80 (Android; Opera Mini/7.5.33361/191.283; U; fr) Presto/2.12.423 Version/12.16")).toBe(false);
  });
});

describe("arrivées — commandes pour cent visites", () => {
  it("ne donne aucun taux sous cent visites", () => {
    // Une commande sur vingt visites afficherait « 5 » : c'est du hasard.
    expect(pourCentVisites(1, 20)).toBeNull();
    expect(pourCentVisites(0, 0)).toBeNull();
    expect(pourCentVisites(4, VISITES_MIN_POUR_UN_TAUX - 1)).toBeNull();
  });

  it("donne le taux dès cent visites, zéro compris", () => {
    expect(pourCentVisites(0, VISITES_MIN_POUR_UN_TAUX)).toBe(0);
    expect(pourCentVisites(13, 500)).toBeCloseTo(2.6);
    expect(pourCentVisites(3, 1000)).toBeCloseTo(0.3);
  });
});

describe("arrivées — un lien abîmé", () => {
  it("range sous la même étiquette la visite et la commande d'un lien abîmé", () => {
    const j = jourVide();
    ajouterArrivee(j, { pub: "\u0000120249779868510674 " });
    expect(Object.fromEntries(j.parPub)).toEqual({ "120249779868510674": 1 });
    // Une étiquette qui n'est QUE des caractères de contrôle n'en est pas une.
    ajouterArrivee(j, { pub: "\u0000\u0001", meta: true });
    expect(j.sans).toBe(1);
    expect(j.metaSans).toBe(1);
  });
});
