import { describe, expect, it } from "vitest";
import {
  SUIVI_DAILY_BATCH,
  SUIVI_MAX_DAYS,
  SUIVI_MIN_DAYS,
  buildSuiviList,
  modifierRegistre,
  parseContacted,
  suiviMessage,
  suiviWhatsAppUrl,
  tunisDayKey,
  type RegistreStore,
  type SuiviOrder,
} from "./suiviLivraison";

const NOW = new Date("2026-11-24T10:00:00Z");
const ilYA = (jours: number) => new Date(NOW.getTime() - jours * 24 * 3600 * 1000);

let nextId = 1;
function commande(over: Partial<SuiviOrder> = {}): SuiviOrder {
  return {
    id: nextId++,
    phone: "20 123 456",
    customerName: "Amina Hamdi",
    governorate: "Tunis",
    status: "terminee",
    subtotalMillimes: 45000,
    itemNames: ["Makroudh Laziz – Fruits Secs"],
    createdAt: ilYA(6),
    deliveredAt: ilYA(4),
    ...over,
  };
}

const tel = (n: number) => `2${String(n).padStart(7, "0")}`;

describe("suiviMessage", () => {
  it("salue par le prénom et demande des nouvelles du colis", () => {
    const texte = suiviMessage("Amina");
    expect(texte).toContain("عسلامة Amina");
    expect(texte).toContain("وصلتك طلبيتك بخير؟");
  });

  it("sans prénom, salue quand même", () => {
    expect(suiviMessage("").startsWith("عسلامة 👋")).toBe(true);
  });

  // La promesse de la page de confidentialité, mise sous clé : le numéro
  // sert à la commande, pas à vendre. Un lien ou une offre ajoutés ici
  // feraient de ce message une publicité — voir l'en-tête du module.
  it("ne vend rien : ni lien, ni prix, ni offre", () => {
    const texte = suiviMessage("Amina");
    expect(texte).not.toMatch(/https?:|chezlaziz\.com|wa\.me/i);
    expect(texte).not.toMatch(/\d/);
    expect(texte).not.toMatch(/تخفيض|عرض|برومو|اطلب|promo|offre|commande/i);
  });
});

describe("suiviWhatsAppUrl", () => {
  it("ouvre le numéro complet, message encodé en entier", () => {
    const url = suiviWhatsAppUrl("+216 20 123 456", "Amina Hamdi")!;
    expect(url).toMatch(/^https:\/\/wa\.me\/21620123456\?text=/);
    expect(decodeURIComponent(url.split("?text=")[1]!)).toBe(suiviMessage("Amina"));
    expect(url.length).toBeLessThan(2000);
  });

  it("ne salue pas par un titre ou une particule", () => {
    const url = suiviWhatsAppUrl("20123456", "Mme Hamdi")!;
    expect(decodeURIComponent(url.split("?text=")[1]!)).toBe(suiviMessage(""));
  });

  it("se fabrique quel que soit le nom tapé dans le formulaire", () => {
    // Un nom d'un seul tenant coupé au milieu d'un emoji faisait lever
    // encodeURIComponent : la liste entière tombait avec ce lien.
    expect(() => suiviWhatsAppUrl("20123456", "Amina" + "😀".repeat(15))).not.toThrow();
    expect(suiviWhatsAppUrl("20123456", "Amina" + "😀".repeat(15))).toMatch(/^https:\/\/wa\.me\/21620123456\?text=/);
  });

  it("pas de lien pour un numéro inexploitable", () => {
    expect(suiviWhatsAppUrl("123", "Amina")).toBeNull();
    expect(suiviWhatsAppUrl("", "Amina")).toBeNull();
  });
});

describe("tunisDayKey", () => {
  it("bascule à minuit heure de Tunis, pas à minuit UTC", () => {
    expect(tunisDayKey(new Date("2026-11-24T22:59:00Z"))).toBe("2026-11-24");
    expect(tunisDayKey(new Date("2026-11-24T23:00:00Z"))).toBe("2026-11-25");
  });
});

describe("buildSuiviList — qui est dans la liste", () => {
  it("une cliente livrée il y a quatre jours y est, avec ce qu'il faut pour lui écrire", () => {
    const liste = buildSuiviList([commande({ id: 480 })], {}, NOW);
    expect(liste.today).toHaveLength(1);
    const c = liste.today[0]!;
    expect(c).toMatchObject({
      id: "20123456",
      customerName: "Amina Hamdi",
      governorate: "Tunis",
      orderId: 480,
      daysSince: 4,
      items: "Makroudh Laziz – Fruits Secs",
      subtotalMillimes: 45000,
    });
    expect(c.whatsappUrl).toContain("wa.me/21620123456");
  });

  it("ne rend pas le numéro en clair en dehors du lien", () => {
    const c = buildSuiviList([commande()], {}, NOW).today[0]!;
    expect(Object.keys(c)).not.toContain("phone");
  });

  it("pas avant deux jours : la boîte n'est peut-être pas ouverte", () => {
    expect(buildSuiviList([commande({ deliveredAt: ilYA(SUIVI_MIN_DAYS - 0.1) })], {}, NOW).today).toHaveLength(0);
    expect(buildSuiviList([commande({ deliveredAt: ilYA(SUIVI_MIN_DAYS) })], {}, NOW).today).toHaveLength(1);
  });

  it("plus après dix jours : ce ne serait plus une question, mais un prétexte", () => {
    expect(buildSuiviList([commande({ deliveredAt: ilYA(SUIVI_MAX_DAYS + 0.9) })], {}, NOW).today).toHaveLength(1);
    expect(buildSuiviList([commande({ deliveredAt: ilYA(SUIVI_MAX_DAYS + 1) })], {}, NOW).today).toHaveLength(0);
  });

  it("jamais une commande qui n'est pas livrée", () => {
    for (const status of ["nouvelle", "en_preparation", "prete", "annulee"]) {
      const liste = buildSuiviList([commande({ status, deliveredAt: null })], {}, NOW);
      expect(liste.today, status).toHaveLength(0);
    }
  });

  it("une commande « terminée » sans date de livraison connue reste dehors plutôt que datée au hasard", () => {
    expect(buildSuiviList([commande({ deliveredAt: null })], {}, NOW).today).toHaveLength(0);
  });

  it("pas celle qui a une autre commande en route : on lui parle déjà", () => {
    const liste = buildSuiviList(
      [commande(), commande({ status: "en_preparation", deliveredAt: null, createdAt: ilYA(0.2) })],
      {},
      NOW,
    );
    expect(liste.today).toHaveLength(0);
  });

  it("une annulation à côté n'empêche pas de prendre des nouvelles du colis livré", () => {
    const liste = buildSuiviList(
      [commande(), commande({ status: "annulee", deliveredAt: null, createdAt: ilYA(1) })],
      {},
      NOW,
    );
    expect(liste.today).toHaveLength(1);
  });

  it("une cliente = un numéro, quelle que soit la graphie ; on parle de sa DERNIÈRE livraison", () => {
    const liste = buildSuiviList(
      [
        commande({ id: 1, phone: "20123456", deliveredAt: ilYA(9), itemNames: ["Ancien"] }),
        commande({ id: 2, phone: "+216 20 123 456", deliveredAt: ilYA(3), itemNames: ["Récent", "Autre", "Encore"] }),
      ],
      {},
      NOW,
    );
    expect(liste.today).toHaveLength(1);
    expect(liste.today[0]).toMatchObject({ orderId: 2, daysSince: 3, items: "Récent + 2 autres" });
  });

  it("ignore un numéro inexploitable au lieu de faire tomber la liste", () => {
    const liste = buildSuiviList([commande({ phone: "abc" }), commande({ phone: tel(7) })], {}, NOW);
    expect(liste.today).toHaveLength(1);
  });
});

describe("buildSuiviList — jamais deux fois, et pas plus que le plafond", () => {
  it("une cliente contactée sort de la liste, et y reste dehors", () => {
    const orders = [commande()];
    const hier = new Date(NOW.getTime() - 24 * 3600 * 1000).toISOString();
    const liste = buildSuiviList(orders, { "20123456": hier }, NOW);
    expect(liste.today).toHaveLength(0);
    expect(liste.contactedToday).toHaveLength(0);
    expect(liste.contactedTotal).toBe(1);
  });

  it("contactée aujourd'hui : elle passe en bas, pour pouvoir annuler", () => {
    const quand = new Date(NOW.getTime() - 60_000).toISOString();
    const liste = buildSuiviList([commande()], { "20123456": quand }, NOW);
    expect(liste.today).toHaveLength(0);
    expect(liste.contactedToday).toHaveLength(1);
    expect(liste.contactedToday[0]).toMatchObject({ id: "20123456", contactedAt: quand });
  });

  it("la plus ancienne livraison d'abord : elle sortira de la fenêtre la première", () => {
    const liste = buildSuiviList(
      [
        commande({ phone: tel(1), deliveredAt: ilYA(3) }),
        commande({ phone: tel(2), deliveredAt: ilYA(9) }),
        commande({ phone: tel(3), deliveredAt: ilYA(5) }),
      ],
      {},
      NOW,
    );
    expect(liste.today.map((c) => c.daysSince)).toEqual([9, 5, 3]);
  });

  it("au plus le plafond du jour, le reste attend", () => {
    const orders = Array.from({ length: SUIVI_DAILY_BATCH + 7 }, (_, i) => commande({ phone: tel(i + 1) }));
    const liste = buildSuiviList(orders, {}, NOW);
    expect(liste.today).toHaveLength(SUIVI_DAILY_BATCH);
    expect(liste.waiting).toBe(7);
    expect(liste.dailyBatch).toBe(SUIVI_DAILY_BATCH);
  });

  it("les messages déjà partis aujourd'hui comptent dans le plafond", () => {
    const orders = Array.from({ length: SUIVI_DAILY_BATCH + 7 }, (_, i) => commande({ phone: tel(i + 1) }));
    const quand = new Date(NOW.getTime() - 60_000).toISOString();
    const contacted = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [tel(i + 1), quand]));
    const liste = buildSuiviList(orders, contacted, NOW);
    expect(liste.contactedToday).toHaveLength(10);
    expect(liste.today).toHaveLength(SUIVI_DAILY_BATCH - 10);
    expect(liste.waiting).toBe(7);
  });

  it("le plafond compte aussi un message dont la commande a disparu", () => {
    const orders = Array.from({ length: SUIVI_DAILY_BATCH }, (_, i) => commande({ phone: tel(i + 1) }));
    const quand = new Date(NOW.getTime() - 60_000).toISOString();
    const liste = buildSuiviList(orders, { "99999999": quand }, NOW);
    expect(liste.contactedToday).toHaveLength(0);
    expect(liste.today).toHaveLength(SUIVI_DAILY_BATCH - 1);
  });

  it("le plafond d'hier ne pèse pas sur aujourd'hui", () => {
    const orders = Array.from({ length: SUIVI_DAILY_BATCH + 5 }, (_, i) => commande({ phone: tel(i + 1) }));
    const hier = new Date(NOW.getTime() - 26 * 3600 * 1000).toISOString();
    const contacted = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [tel(i + 1), hier]));
    const liste = buildSuiviList(orders, contacted, NOW);
    expect(liste.today).toHaveLength(SUIVI_DAILY_BATCH);
    expect(liste.contactedToday).toHaveLength(0);
  });
});

describe("parseContacted", () => {
  it("lit un registre bien formé", () => {
    expect(parseContacted('{"20123456":"2026-11-24T09:00:00.000Z"}')).toEqual({
      "20123456": "2026-11-24T09:00:00.000Z",
    });
  });

  it("vide, absent ou abîmé : un registre vide, jamais une exception", () => {
    for (const brut of [null, undefined, "", "pas du json", "[]", "42", "null", '"texte"']) {
      expect(parseContacted(brut), String(brut)).toEqual({});
    }
  });

  it("écarte ce qui n'est pas un identifiant client ou pas une date", () => {
    expect(
      parseContacted(
        JSON.stringify({ "20123456": "2026-11-24T09:00:00.000Z", abc: "2026-11-24", "20000001": "hier", "20000002": 5 }),
      ),
    ).toEqual({ "20123456": "2026-11-24T09:00:00.000Z" });
  });
});

describe("modifierRegistre", () => {
  /** Un faux `settings` d'une seule clé, avec le même contrat que le vrai :
   * `swap` n'écrit que si la valeur n'a pas bougé depuis la lecture. */
  function faux(initial: string | null) {
    const etat = { valeur: initial, ecritures: 0 };
    const store: RegistreStore = {
      read: async () => etat.valeur,
      swap: async (avant, apres) => {
        if (etat.valeur !== avant) return false;
        etat.valeur = apres;
        etat.ecritures++;
        return true;
      },
    };
    return { etat, store };
  }

  it("crée le registre à la première marque", async () => {
    const { etat, store } = faux(null);
    expect(await modifierRegistre(store, (r) => void (r["20123456"] = "2026-11-24T09:00:00.000Z"))).toBe(true);
    expect(parseContacted(etat.valeur)).toEqual({ "20123456": "2026-11-24T09:00:00.000Z" });
  });

  it("ajoute sans effacer, et retire sans toucher au reste", async () => {
    const { etat, store } = faux('{"20000001":"2026-11-23T09:00:00.000Z"}');
    await modifierRegistre(store, (r) => void (r["20000002"] = "2026-11-24T09:00:00.000Z"));
    expect(Object.keys(parseContacted(etat.valeur)).sort()).toEqual(["20000001", "20000002"]);
    await modifierRegistre(store, (r) => void delete r["20000001"]);
    expect(Object.keys(parseContacted(etat.valeur))).toEqual(["20000002"]);
  });

  // Le cas pour lequel la fonction existe : deux boutons touchés dans la
  // même demi-seconde. Sans reprise, la seconde écriture repartait de
  // l'ancienne valeur et effaçait la première marque.
  it("deux marques en même temps : aucune n'est perdue", async () => {
    const { etat, store } = faux("{}");
    let premiereLecture = true;
    const concurrent: RegistreStore = {
      read: async () => {
        const lu = await store.read();
        if (premiereLecture) {
          premiereLecture = false;
          // Quelqu'un d'autre écrit entre NOTRE lecture et NOTRE écriture.
          etat.valeur = '{"20000001":"2026-11-24T09:00:00.000Z"}';
        }
        return lu;
      },
      swap: store.swap,
    };
    expect(await modifierRegistre(concurrent, (r) => void (r["20000002"] = "2026-11-24T09:00:01.000Z"))).toBe(true);
    expect(Object.keys(parseContacted(etat.valeur)).sort()).toEqual(["20000001", "20000002"]);
  });

  it("répare une valeur abîmée au lieu de rester bloquée dessus", async () => {
    const { etat, store } = faux("pas du json");
    expect(await modifierRegistre(store, (r) => void (r["20123456"] = "2026-11-24T09:00:00.000Z"))).toBe(true);
    expect(parseContacted(etat.valeur)).toEqual({ "20123456": "2026-11-24T09:00:00.000Z" });
  });

  it("dit faux quand l'écriture ne passe jamais, plutôt que de laisser croire que c'est noté", async () => {
    const store: RegistreStore = { read: async () => "{}", swap: async () => false };
    expect(await modifierRegistre(store, (r) => void (r["20123456"] = "x"), 3)).toBe(false);
  });
});
