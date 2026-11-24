import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUIVI_MAX_DAYS } from "./suiviLivraison";
import {
  OFFRES_ACCORD_TEXTE,
  OFFRES_ACCORD_VERSION,
  OFFRES_APRES_LIVRAISON_JOURS,
  OFFRES_CORPS_POIDS_MAX,
  OFFRES_ECART_JOURS,
  OFFRES_LIEN_MAX,
  OFFRES_MESSAGE_MAX,
  OFFRES_PLAFOND_JOUR,
  bornerMessage,
  buildOffresList,
  modifierOffres,
  nettoyerMessage,
  noterAccord,
  noterContact,
  offreMessage,
  offreWhatsAppUrl,
  parseOffres,
  placeDuMessage,
  retirerAccord,
  type OffresOrder,
  type OffresRegistre,
} from "./offres";

const NOW = new Date("2026-11-24T10:00:00Z");
const jours = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const vide = (): OffresRegistre => ({ accords: {}, retraits: {}, contacts: {} });

let prochainId = 1;
/** Une commande passée il y a quinze jours et livrée le lendemain, sauf
 * précision : assez ancienne pour que la personne soit joignable. */
function commande(phone: string, extra: Partial<OffresOrder> = {}): OffresOrder {
  const base = {
    id: prochainId++,
    phone,
    customerName: "Amina Ben Salah",
    governorate: "Tunis",
    status: "terminee",
    itemNames: ["Makroudh Laziz aux Dattes"],
    createdAt: jours(15),
    ...extra,
  };
  const livree = base.status === "terminee" ? new Date(base.createdAt.getTime() + 24 * 60 * 60 * 1000) : null;
  return { ...base, deliveredAt: extra.deliveredAt === undefined ? livree : extra.deliveredAt };
}

/** Des accords donnés sur la toute première commande : toute livraison à ce
 * numéro les confirme. Les tests qui portent sur CE point précisent la
 * commande avec accordSur. */
function avecAccord(...ids: string[]): OffresRegistre {
  const r = vide();
  for (const id of ids) noterAccord(r, id, { quand: jours(10), commande: 1, lang: "fr" });
  return r;
}

/** La case a été cochée sur cette commande-là. */
function accordSur(id: string, surLaCommande: OffresOrder): OffresRegistre {
  const r = vide();
  noterAccord(r, id, { quand: surLaCommande.createdAt, commande: surLaCommande.id, lang: "fr" });
  return r;
}

describe("le texte de la case", () => {
  it("dit dans les deux langues que c'est sur WhatsApp, facultatif, et qu'on peut arrêter", () => {
    expect(OFFRES_ACCORD_TEXTE.fr).toMatch(/WhatsApp/);
    expect(OFFRES_ACCORD_TEXTE.fr).toMatch(/Facultatif/);
    expect(OFFRES_ACCORD_TEXTE.fr).toMatch(/arrête/);
    expect(OFFRES_ACCORD_TEXTE.ar).toMatch(/واتساب/);
    expect(OFFRES_ACCORD_TEXTE.ar).toMatch(/اختياري/);
    expect(OFFRES_ACCORD_TEXTE.ar).toMatch(/أوقفه/);
  });

  it("annonce des offres : c'est bien à de la publicité que la personne dit oui", () => {
    expect(OFFRES_ACCORD_TEXTE.fr).toMatch(/offres/);
    expect(OFFRES_ACCORD_TEXTE.ar).toMatch(/عروض/);
  });

  it("vit dans un fichier qui n'importe rien : la page de commande ne charge que deux phrases", () => {
    const source = readFileSync(new URL("./offresAccord.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\bfrom\s+["']/);
  });
});

describe("le registre", () => {
  it("se lit sans lever, quoi qu'il contienne", () => {
    for (const brut of [null, undefined, "", "pas du json", "[]", "42", '{"accords":[1,2]}', '{"accords":{"x":{}}}']) {
      expect(parseOffres(brut)).toEqual(vide());
    }
  });

  it("écarte les entrées abîmées et garde les autres", () => {
    const r = parseOffres(
      JSON.stringify({
        accords: {
          "20123456": { depuis: "2026-11-01T10:00:00.000Z", commande: 12, lang: "ar", version: 1 },
          "abc": { depuis: "2026-11-01T10:00:00.000Z", commande: 1, lang: "fr", version: 1 },
          "20999999": { depuis: "hier", commande: 1, lang: "fr", version: 1 },
        },
        retraits: { "20111111": "2026-11-02T10:00:00.000Z", "x": "2026-11-02T10:00:00.000Z" },
        contacts: { "20123456": "pas une date" },
      }),
    );
    expect(Object.keys(r.accords)).toEqual(["20123456"]);
    expect(r.accords["20123456"]).toEqual({ depuis: "2026-11-01T10:00:00.000Z", commande: 12, lang: "ar", version: 1 });
    expect(r.retraits).toEqual({ "20111111": "2026-11-02T10:00:00.000Z" });
    expect(r.contacts).toEqual({});
  });

  it("garde le PREMIER accord : recocher la case ne le rajeunit pas", () => {
    const r = vide();
    noterAccord(r, "20123456", { quand: jours(30), commande: 5, lang: "ar" });
    noterAccord(r, "20123456", { quand: jours(1), commande: 9, lang: "fr" });
    expect(r.accords["20123456"]).toEqual({
      depuis: jours(30).toISOString(),
      commande: 5,
      lang: "ar",
      version: OFFRES_ACCORD_VERSION,
    });
  });

  it("n'accepte pas un identifiant qui n'est pas un numéro à huit chiffres", () => {
    const r = vide();
    noterAccord(r, "216201234", { quand: NOW, commande: 1, lang: "fr" });
    noterAccord(r, "", { quand: NOW, commande: 1, lang: "fr" });
    expect(r.accords).toEqual({});
  });

  it("STOP : l'accord et le dernier contact disparaissent, la date du retrait reste", () => {
    const r = avecAccord("20123456");
    noterContact(r, "20123456", jours(2));
    expect(retirerAccord(r, "20123456", NOW)).toBe(true);
    expect(r.accords).toEqual({});
    expect(r.contacts).toEqual({});
    expect(r.retraits).toEqual({ "20123456": NOW.toISOString() });
    // Une seconde demande ne trouve plus personne à retirer.
    expect(retirerAccord(r, "20123456", NOW)).toBe(false);
  });

  it("une personne retirée qui recoche la case revient, avec un accord neuf", () => {
    const r = avecAccord("20123456");
    retirerAccord(r, "20123456", jours(5));
    noterAccord(r, "20123456", { quand: jours(1), commande: 44, lang: "fr" });
    expect(r.retraits).toEqual({});
    expect(r.accords["20123456"]?.depuis).toBe(jours(1).toISOString());
    expect(r.accords["20123456"]?.commande).toBe(44);
  });

  it("ne note pas de contact pour quelqu'un qui n'est pas dans la liste", () => {
    const r = vide();
    noterContact(r, "20123456", NOW);
    expect(r.contacts).toEqual({});
  });
});

describe("modifier le registre sans perdre une marque", () => {
  function faux(initial: string | null, echecs = 0) {
    let valeur = initial;
    let reste = echecs;
    let ecritures = 0;
    return {
      store: {
        read: async () => valeur,
        swap: async (avant: string | null, apres: string) => {
          if (reste > 0) {
            // Quelqu'un d'autre vient d'écrire : la valeur lue est périmée.
            reste--;
            const autre = parseOffres(valeur);
            noterAccord(autre, `2000000${reste}`, { quand: NOW, commande: 99, lang: "fr" });
            valeur = JSON.stringify(autre);
            return false;
          }
          if (avant !== valeur) return false;
          valeur = apres;
          ecritures++;
          return true;
        },
      },
      lire: () => parseOffres(valeur),
      ecritures: () => ecritures,
    };
  }

  it("écrit du premier coup quand personne d'autre n'écrit", async () => {
    const f = faux(null);
    expect(await modifierOffres(f.store, (r) => noterAccord(r, "20123456", { quand: NOW, commande: 1, lang: "fr" }))).toBe(true);
    expect(Object.keys(f.lire().accords)).toEqual(["20123456"]);
    expect(f.ecritures()).toBe(1);
  });

  it("recommence après une écriture concurrente, et garde les DEUX accords", async () => {
    const f = faux(null, 2);
    expect(await modifierOffres(f.store, (r) => noterAccord(r, "20123456", { quand: NOW, commande: 1, lang: "fr" }))).toBe(true);
    expect(Object.keys(f.lire().accords).sort()).toEqual(["20000000", "20000001", "20123456"]);
  });

  it("rend faux, sans rien prétendre, quand il perd toutes ses tentatives", async () => {
    const f = faux(null, 50);
    expect(await modifierOffres(f.store, (r) => noterAccord(r, "20123456", { quand: NOW, commande: 1, lang: "fr" }), 3)).toBe(false);
    expect(f.lire().accords["20123456"]).toBeUndefined();
  });
});

describe("le message", () => {
  it("n'existe pas tant que la boutique n'a rien rédigé", () => {
    expect(offreMessage("", "Amina")).toBe("");
    expect(offreMessage("   \n ", "Amina")).toBe("");
    expect(offreWhatsAppUrl("20 123 456", "Amina", "  ")).toBeNull();
  });

  it("en français : un bonjour au prénom, le texte, et la porte de sortie", () => {
    expect(offreMessage("Le makroudh à la pistache est de retour.", "Amina")).toBe(
      "Bonjour Amina 👋 c'est Chez Laziz.\nLe makroudh à la pistache est de retour.\n\nPour ne plus recevoir nos offres, répondez STOP.",
    );
  });

  it("en arabe dès que le texte est écrit en arabe, sans verbe à la deuxième personne", () => {
    const m = offreMessage("المقروض بالفستق رجع.", "أمينة");
    expect(m).toBe("عسلامة أمينة 👋 معاك Chez Laziz.\nالمقروض بالفستق رجع.\n\nباش توقف العروض، كلمة STOP تكفي.");
  });

  it("choisit la langue de la majorité des lettres, pas du premier mot étranger", () => {
    // Un message en arabe qui cite la marque en lettres latines reste en arabe…
    expect(offreMessage("جديد Chez Laziz: المقروض الأبيض بالفستق رجع هالجمعة.", "")).toMatch(/^عسلامة/);
    // …et un message en français qui glisse un mot en arabe reste en français.
    expect(offreMessage("Le makroudh blanc (المقروض) est de retour cette semaine.", "")).toMatch(/^Bonjour/);
    // Sans une seule lettre (un prix, un emoji) : le français, par défaut.
    expect(offreMessage("40 DT 🎉", "")).toMatch(/^Bonjour/);
  });

  it("salue sans nom quand le prénom n'est pas sûr", () => {
    expect(offreMessage("Nouveauté.", "")).toMatch(/^Bonjour 👋 c'est Chez Laziz\./);
  });

  it("porte TOUJOURS la ligne STOP, même si le texte en contient déjà une ou tente de s'en passer", () => {
    for (const texte of ["Offre.", "عرض.", "Offre.\n\n\n\n\nFin", "x".repeat(2000)]) {
      expect(offreMessage(texte, "Amina")).toMatch(/STOP/);
    }
  });

  it("est borné : un message WhatsApp, pas une lettre", () => {
    expect(nettoyerMessage("x".repeat(2000))).toHaveLength(OFFRES_MESSAGE_MAX);
    expect(nettoyerMessage("a\r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
    expect(nettoyerMessage("a\rb")).toBe("a\nb");
  });

  it("ne coupe jamais un emoji en deux : le lien se fabrique quand même", () => {
    // La limite tombe au milieu du 🎉 : encodeURIComponent lève sur la
    // moitié qui reste, et toute la liste tomberait avec lui.
    const texte = "x".repeat(OFFRES_MESSAGE_MAX - 1) + "🎉 fin";
    const propre = nettoyerMessage(texte);
    expect(propre).toBe("x".repeat(OFFRES_MESSAGE_MAX - 1));
    expect(() => offreWhatsAppUrl("20123456", "Amina", texte)).not.toThrow();
    // Un demi-caractère collé tel quel, au milieu ou au bout.
    expect(nettoyerMessage("a\uD83Cb\uDF89c\uD83C")).toBe("abc");
    expect(nettoyerMessage("ok 🎉")).toBe("ok 🎉");
    expect(() => offreWhatsAppUrl("20123456", "Amina", "a\uD83Cb")).not.toThrow();
  });

  it("nettoyer deux fois ne change plus rien : la page compare le brouillon au message enregistré", () => {
    for (const texte of [
      "  Offre.  ",
      "a\r\n\r\n\r\n\r\nb",
      "a\n\n\uD83C\nb",
      "x".repeat(OFFRES_MESSAGE_MAX - 1) + "🎉",
      "x".repeat(OFFRES_MESSAGE_MAX - 1) + "\n\nsuite",
      "عرض 🎉\n\n\nجديد",
    ]) {
      const une = nettoyerMessage(texte);
      expect(nettoyerMessage(une)).toBe(une);
    }
  });

  // Au-delà de 2 000 caractères environ, des téléphones coupent le lien —
  // par la fin. La fin, c'est la ligne STOP.
  it("le lien reste sous sa limite et garde sa ligne STOP, quoi qu'on rédige et à qui qu'on écrive", () => {
    const textes = [
      "ا".repeat(2000), // que des lettres arabes : six caractères de lien chacune
      "المقروض الأبيض بالفستق رجع هالجمعة. 40 د.ت الكيلو. ".repeat(40),
      "€".repeat(2000), // neuf caractères de lien pour un seul signe
      "🎉".repeat(1000),
      "é".repeat(2000),
      "x".repeat(2000),
      "عرض\n\n".repeat(300),
      "Offre 🎉 عرض € ".repeat(200),
    ];
    // Le prénom le plus lourd possible : vingt-quatre signes à neuf caractères.
    const noms = ["Amina Ben Salah", "أمينة", "ⴰ".repeat(40), "A".repeat(80), "Amina" + "😀".repeat(15), ""];
    for (const texte of textes) {
      for (const nom of noms) {
        const url = offreWhatsAppUrl("20123456", nom, texte)!;
        expect(url.length, `${texte.slice(0, 8)}… / ${nom.slice(0, 8)}`).toBeLessThanOrEqual(OFFRES_LIEN_MAX);
        const message = decodeURIComponent(url.split("text=")[1]!);
        expect(message.endsWith("STOP تكفي.") || message.endsWith("répondez STOP.")).toBe(true);
      }
    }
  });

  it("un message en arabe est plein bien avant le compteur de caractères, un message en français jamais", () => {
    const arabe = bornerMessage("المقروض الأبيض بالفستق رجع هالجمعة. ".repeat(40));
    expect(arabe.length).toBeLessThan(OFFRES_MESSAGE_MAX);
    expect(arabe.length).toBeGreaterThan(200); // …mais il reste de quoi écrire une offre
    expect(encodeURIComponent(arabe).length).toBeLessThanOrEqual(OFFRES_CORPS_POIDS_MAX);
    expect(bornerMessage("Le makroudh à la pistache est de retour. ".repeat(40))).toHaveLength(OFFRES_MESSAGE_MAX);
  });

  it("borner ne retouche que la longueur : l'espace qu'on vient de taper reste", () => {
    expect(bornerMessage("Offre du jour ")).toBe("Offre du jour ");
    expect(bornerMessage("a\n\n\n\nb\n")).toBe("a\n\n\n\nb\n");
    expect(bornerMessage("")).toBe("");
    // Ce qui est borné ne bouge plus.
    for (const texte of ["ا".repeat(2000), "🎉".repeat(1000), "x".repeat(2000)]) {
      const une = bornerMessage(texte);
      expect(bornerMessage(une)).toBe(une);
      expect(() => encodeURIComponent(une)).not.toThrow();
    }
  });

  it("la jauge dit la vérité dans les deux écritures", () => {
    expect(placeDuMessage("")).toBe(0);
    expect(placeDuMessage("x".repeat(250))).toBeCloseTo(0.5, 5);
    // 100 lettres arabes : un cinquième du compteur, mais déjà 43 % du lien.
    expect(placeDuMessage("ا".repeat(100))).toBeCloseTo(600 / OFFRES_CORPS_POIDS_MAX, 5);
    expect(placeDuMessage("ا".repeat(100))).toBeGreaterThan(100 / OFFRES_MESSAGE_MAX);
    // Pleine dès que la zone de saisie n'accepte plus rien.
    expect(placeDuMessage(bornerMessage("x".repeat(2000)))).toBe(1);
    expect(placeDuMessage(bornerMessage("ا".repeat(2000)))).toBeGreaterThan(0.99);
    expect(placeDuMessage("ا".repeat(5000))).toBe(1);
  });

  it("le lien ouvre la conversation du bon numéro, message déjà écrit", () => {
    const url = offreWhatsAppUrl("+216 20 123 456", "Amina Ben Salah", "Nouveauté.");
    expect(url).toMatch(/^https:\/\/wa\.me\/21620123456\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1]!)).toBe(offreMessage("Nouveauté.", "Amina"));
    expect(offreWhatsAppUrl("123", "Amina", "Nouveauté.")).toBeNull();
  });
});

describe("la liste", () => {
  it("ne contient QUE des personnes qui ont coché la case", () => {
    const orders = [
      commande("20123456"),
      commande("22222222", { customerName: "Sonia" }),
      commande("22222222", { customerName: "Sonia" }),
      commande("22222222", { customerName: "Sonia" }),
    ];
    const liste = buildOffresList(orders, avecAccord("20123456"), "Nouveauté.", NOW);
    expect(liste.aContacter.map((c) => c.id)).toEqual(["20123456"]);
    expect(liste.total).toBe(1);
    expect(JSON.stringify(liste)).not.toMatch(/Sonia|22222222/);
  });

  it("est vide, sans erreur, quand personne n'a encore coché", () => {
    const liste = buildOffresList([commande("20123456")], vide(), "Nouveauté.", NOW);
    expect(liste.aContacter).toEqual([]);
    expect(liste.total).toBe(0);
  });

  it("ne propose aucun lien tant que le message n'est pas rédigé", () => {
    const liste = buildOffresList([commande("20123456")], avecAccord("20123456"), "", NOW);
    expect(liste.aContacter).toHaveLength(1);
    expect(liste.aContacter[0]!.whatsappUrl).toBeNull();
    expect(liste.message).toBe("");
  });

  it("résume la personne : ses commandes non annulées, sa dernière commande reçue", () => {
    const orders = [
      commande("20123456", { createdAt: jours(60), itemNames: ["Makroudh Jwayed"] }),
      commande("20123456", { createdAt: jours(40), status: "annulee" }),
      commande("20123456", { createdAt: jours(20), itemNames: ["Makroudh Chamia", "Youyou", "Zouza"], governorate: "Sousse" }),
    ];
    const [c] = buildOffresList(orders, avecAccord("20123456"), "Nouveauté.", NOW).aContacter;
    expect(c!.commandes).toBe(2);
    expect(c!.derniereCommande).toBe(jours(20).toISOString());
    expect(c!.derniersArticles).toBe("Makroudh Chamia + 2 autres");
    expect(c!.governorate).toBe("Sousse");
  });

  it("ne propose pas un numéro qu'aucune livraison n'a confirmé", () => {
    // Un chiffre tapé de travers, une commande pour rire : la case est
    // cochée, la commande est annulée, et l'accord dort sous le numéro
    // d'un inconnu. Il ne doit jamais recevoir de publicité.
    const liste = buildOffresList(
      [commande("20123456", { status: "annulee" }), commande("20123456", { status: "annulee", createdAt: jours(40) })],
      avecAccord("20123456"),
      "Nouveauté.",
      NOW,
    );
    expect(liste.aContacter).toEqual([]);
    expect(liste.sansLivraison).toBe(1);
    expect(liste.total).toBe(1);
  });

  it("la propose une fois livrée la commande de la case, ou une commande passée après", () => {
    // Elle coche, change d'avis, recommande une semaine plus tard et reçoit
    // son colis : c'est bien elle, et son accord n'a pas été repris.
    const annulee = commande("20123456", { status: "annulee", createdAt: jours(40) });
    const livree = commande("20123456", { createdAt: jours(30) });
    const liste = buildOffresList([annulee, livree], accordSur("20123456", annulee), "Nouveauté.", NOW);
    expect(liste.aContacter.map((c) => c.id)).toEqual(["20123456"]);
    expect(liste.sansLivraison).toBe(0);
    // Et, plus simplement : la commande de la case elle-même est livrée.
    const seule = commande("20222222", { createdAt: jours(30) });
    expect(buildOffresList([seule], accordSur("20222222", seule), "Nouveauté.", NOW).aContacter).toHaveLength(1);
  });

  it("ses livraisons d'AVANT la case ne prouvent rien sur qui l'a cochée", () => {
    // Une vraie cliente, livrée il y a deux mois, qui n'a rien demandé. Puis
    // une commande à son numéro — un chiffre de travers chez quelqu'un
    // d'autre, une mauvaise blague — avec la case cochée, et annulée.
    const ancienne = commande("20123456", { createdAt: jours(60) });
    const farce = commande("20123456", { status: "annulee", createdAt: jours(20), customerName: "Farceur Anonyme" });
    const r = accordSur("20123456", farce);
    const liste = buildOffresList([ancienne, farce], r, "Nouveauté.", NOW);
    expect(liste.aContacter).toEqual([]);
    expect(liste.sansLivraison).toBe(1);
    // Le jour où une commande passée APRÈS est livrée à ce numéro, la
    // personne qui répond est bien celle qui commande.
    const suivante = commande("20123456", { createdAt: jours(15) });
    expect(buildOffresList([ancienne, farce, suivante], r, "Nouveauté.", NOW).aContacter).toHaveLength(1);
  });

  it("salue avec le nom de la commande reçue, pas celui d'une commande annulée plus récente", () => {
    const orders = [
      commande("20123456", { customerName: "Amina Ben Salah", createdAt: jours(30) }),
      commande("20123456", { customerName: "Farceur Anonyme", status: "annulee", createdAt: jours(12) }),
    ];
    const [c] = buildOffresList(orders, avecAccord("20123456"), "Nouveauté.", NOW).aContacter;
    expect(c!.customerName).toBe("Amina Ben Salah");
    expect(decodeURIComponent(c!.whatsappUrl!)).toMatch(/Bonjour Amina/);
    expect(JSON.stringify(c)).not.toMatch(/Farceur/);
  });

  it("n'écrit pas dans les dix jours qui suivent une livraison : c'est le temps du « bien arrivé ? »", () => {
    const r = avecAccord("20123456", "20222222");
    const orders = [
      commande("20123456", { createdAt: jours(12), deliveredAt: jours(OFFRES_APRES_LIVRAISON_JOURS - 1) }),
      commande("20222222", { createdAt: jours(12), deliveredAt: jours(OFFRES_APRES_LIVRAISON_JOURS) }),
    ];
    const liste = buildOffresList(orders, r, "Nouveauté.", NOW);
    expect(liste.aContacter.map((c) => c.id)).toEqual(["20222222"]);
    expect(liste.livreesRecemment).toBe(1);
    // Les deux messages de la boutique ne se croisent jamais.
    expect(OFFRES_APRES_LIVRAISON_JOURS).toBeGreaterThanOrEqual(SUIVI_MAX_DAYS);
  });

  it("compte la livraison la plus récente, même sur une commande plus ancienne", () => {
    // Commandée il y a un mois, livrée avant-hier : c'est avant-hier qui compte.
    const orders = [
      commande("20123456", { createdAt: jours(40) }),
      commande("20123456", { createdAt: jours(30), deliveredAt: jours(2) }),
    ];
    const liste = buildOffresList(orders, avecAccord("20123456"), "Nouveauté.", NOW);
    expect(liste.aContacter).toEqual([]);
    expect(liste.livreesRecemment).toBe(1);
    // Même quand cette livraison tardive est celle d'une commande d'avant la
    // case : elle ne confirme pas le numéro, mais le colis vient d'arriver.
    const tardive = commande("20222222", { createdAt: jours(50), deliveredAt: jours(2) });
    const cochee = commande("20222222", { createdAt: jours(30) });
    const l2 = buildOffresList([tardive, cochee], accordSur("20222222", cochee), "Nouveauté.", NOW);
    expect(l2.aContacter).toEqual([]);
    expect(l2.livreesRecemment).toBe(1);
  });

  it("retombe sur la date de la commande quand la date de livraison manque", () => {
    const orders = [commande("20123456", { createdAt: jours(11), deliveredAt: null })];
    expect(buildOffresList(orders, avecAccord("20123456"), "Nouveauté.", NOW).aContacter).toHaveLength(1);
    const recente = [commande("20222222", { createdAt: jours(3), deliveredAt: null })];
    expect(buildOffresList(recente, avecAccord("20222222"), "Nouveauté.", NOW).livreesRecemment).toBe(1);
  });

  it("chaque personne inscrite est comptée une fois, et une seule", () => {
    const ids = ["20000001", "20000002", "20000003", "20000004", "20000005", "20000006", "20000007"];
    const r = avecAccord(...ids);
    noterContact(r, "20000002", new Date(NOW.getTime() - 60 * 60 * 1000)); // aujourd'hui
    noterContact(r, "20000003", jours(5)); // au repos
    const orders = [
      commande("20000001"), // prête
      commande("20000002"),
      commande("20000003"),
      commande("20000004", { status: "prete", createdAt: jours(1) }), // en cours
      commande("20000005", { status: "annulee" }), // jamais livrée
      commande("20000006", { createdAt: jours(4) }), // livrée il y a 3 jours
      // 20000007 : plus aucune commande
    ];
    const l = buildOffresList(orders, r, "Nouveauté.", NOW);
    expect(l.aContacter.map((c) => c.id)).toEqual(["20000001"]);
    expect(l.contacteesAujourdhui.map((c) => c.id)).toEqual(["20000002"]);
    expect([l.auRepos, l.commandeEnCours, l.sansLivraison, l.livreesRecemment]).toEqual([1, 1, 1, 1]);
    const comptees =
      l.aContacter.length + l.enAttente + l.contacteesAujourdhui.length + l.auRepos + l.commandeEnCours + l.sansLivraison + l.livreesRecemment;
    // Une seule manque à l'appel : celle dont il ne reste aucune commande.
    expect(comptees).toBe(l.total - 1);
  });

  it("laisse tranquille une personne contactée il y a moins de trois semaines", () => {
    const r = avecAccord("20123456", "20222222");
    noterContact(r, "20123456", jours(OFFRES_ECART_JOURS - 1));
    noterContact(r, "20222222", jours(OFFRES_ECART_JOURS + 1));
    const liste = buildOffresList([commande("20123456"), commande("20222222")], r, "Nouveauté.", NOW);
    expect(liste.aContacter.map((c) => c.id)).toEqual(["20222222"]);
    expect(liste.auRepos).toBe(1);
  });

  it("n'écrit pas à quelqu'un dont une commande est en cours", () => {
    const orders = [commande("20123456"), commande("20123456", { status: "en_preparation", createdAt: jours(1) })];
    const liste = buildOffresList(orders, avecAccord("20123456"), "Nouveauté.", NOW);
    expect(liste.aContacter).toEqual([]);
    expect(liste.commandeEnCours).toBe(1);
  });

  it("montre à part celles contactées aujourd'hui, pour annuler une erreur de doigt", () => {
    const r = avecAccord("20123456", "20222222");
    noterContact(r, "20123456", new Date(NOW.getTime() - 60 * 60 * 1000));
    const liste = buildOffresList([commande("20123456"), commande("20222222")], r, "Nouveauté.", NOW);
    expect(liste.contacteesAujourdhui.map((c) => c.id)).toEqual(["20123456"]);
    expect(liste.aContacter.map((c) => c.id)).toEqual(["20222222"]);
  });

  it("propose d'abord celles à qui on n'a jamais écrit, puis le message le plus ancien", () => {
    const r = avecAccord("20000001", "20000002", "20000003");
    noterContact(r, "20000001", jours(30));
    noterContact(r, "20000003", jours(60));
    const orders = [commande("20000001"), commande("20000002"), commande("20000003")];
    expect(buildOffresList(orders, r, "Nouveauté.", NOW).aContacter.map((c) => c.id)).toEqual([
      "20000002",
      "20000003",
      "20000001",
    ]);
  });

  it("ne dépasse jamais le plafond du jour, messages déjà envoyés compris", () => {
    const ids = Array.from({ length: OFFRES_PLAFOND_JOUR + 10 }, (_, i) => `2${String(i).padStart(7, "0")}`);
    const r = avecAccord(...ids);
    for (const id of ids.slice(0, 5)) noterContact(r, id, new Date(NOW.getTime() - 30 * 60 * 1000));
    const liste = buildOffresList(ids.map((id) => commande(id)), r, "Nouveauté.", NOW);
    expect(liste.contacteesAujourdhui).toHaveLength(5);
    expect(liste.aContacter).toHaveLength(OFFRES_PLAFOND_JOUR - 5);
    expect(liste.enAttente).toBe(10);
  });

  it("ne propose pas une personne dont il ne reste aucune commande, mais garde son accord au registre", () => {
    const liste = buildOffresList([], avecAccord("20123456"), "Nouveauté.", NOW);
    expect(liste.aContacter).toEqual([]);
    expect(liste.total).toBe(1);
  });

  it("une personne retirée ne revient pas, quel que soit le nombre de ses commandes", () => {
    const r = avecAccord("20123456");
    retirerAccord(r, "20123456", jours(1));
    const liste = buildOffresList([commande("20123456"), commande("20123456")], r, "Nouveauté.", NOW);
    expect(liste.aContacter).toEqual([]);
    expect(liste.total).toBe(0);
    expect(liste.retraits).toBe(1);
  });
});
