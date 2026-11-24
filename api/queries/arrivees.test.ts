import { describe, expect, it } from "vitest";
import { creerCompteurArrivees, joursALire, resumerArrivees, type ArriveesStore } from "./arrivees";
import {
  CLE_ARRIVEES_DEBUT,
  ajouterArrivee,
  cleArrivees,
  jourVide,
  parseJourArrivees,
  type Arrivee,
  type JourArrivees,
} from "@contracts/arrivees";

const PUB_A = "120249779868510674";
const PUB_B = "120250115103040674";
const LUNDI = new Date("2026-11-23T10:00:00");
const MARDI = new Date("2026-11-24T10:00:00");

/** Une table `settings` en mémoire, avec la même garde que swapSetting. */
function fausseBase() {
  const lignes = new Map<string, string>();
  const etat = { ecritures: 0, panne: false, perdreLesSwaps: 0 };
  const store: ArriveesStore = {
    read: async (key) => {
      if (etat.panne) throw new Error("base injoignable");
      return lignes.get(key) ?? null;
    },
    readMany: async (keys) => {
      if (etat.panne) throw new Error("base injoignable");
      const out = new Map<string, string>();
      for (const k of keys) {
        const v = lignes.get(k);
        if (v !== undefined) out.set(k, v);
      }
      return out;
    },
    swap: async (key, avant, apres) => {
      if (etat.panne) throw new Error("base injoignable");
      if (etat.perdreLesSwaps > 0) {
        etat.perdreLesSwaps--;
        return false;
      }
      if ((lignes.get(key) ?? null) !== avant) return false;
      lignes.set(key, apres);
      etat.ecritures++;
      return true;
    },
  };
  return { lignes, etat, store };
}

/** Un minuteur qu'on déclenche à la main. */
function minuteurs() {
  const poses: { fn: () => void; ms: number }[] = [];
  return {
    poses,
    planifier: (fn: () => void, ms: number) => {
      poses.push({ fn, ms });
    },
  };
}

function monter() {
  const base = fausseBase();
  const m = minuteurs();
  const erreurs: string[] = [];
  const compteur = creerCompteurArrivees(base.store, {
    delaiMs: 1000,
    planifier: m.planifier,
    journal: (message) => erreurs.push(message),
  });
  return { ...base, ...m, erreurs, compteur };
}

const jourDe = (lignes: Map<string, string>, jour: string) => parseJourArrivees(lignes.get(cleArrivees(jour)));

describe("compteur d'arrivées — compter sans écrire à chaque fois", () => {
  it("n'écrit rien au moment de l'arrivée, et pose un seul minuteur", () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A, meta: true }, LUNDI);
    t.compteur.noter({ pub: PUB_A, meta: true }, LUNDI);
    t.compteur.noter({ meta: true }, LUNDI);
    expect(t.etat.ecritures).toBe(0);
    expect(t.poses).toHaveLength(1);
    expect(t.poses[0]!.ms).toBe(1000);
  });

  it("écrit tout le paquet en une fois, rangé par jour", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ pub: PUB_B }, MARDI);
    t.compteur.noter({ meta: true }, MARDI);
    await t.compteur.vider();
    expect(Object.fromEntries(jourDe(t.lignes, "2026-11-23").parPub)).toEqual({ [PUB_A]: 2 });
    const mardi = jourDe(t.lignes, "2026-11-24");
    expect(Object.fromEntries(mardi.parPub)).toEqual({ [PUB_B]: 1 });
    expect(mardi.sans).toBe(1);
    expect(mardi.metaSans).toBe(1);
  });

  it("ajoute à ce qui est déjà en base au lieu de le remplacer", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    await t.compteur.vider();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ pub: PUB_B }, LUNDI);
    await t.compteur.vider();
    expect(Object.fromEntries(jourDe(t.lignes, "2026-11-23").parPub)).toEqual({ [PUB_A]: 2, [PUB_B]: 1 });
  });

  it("ne compte pas deux fois un paquet déjà écrit", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    await t.compteur.vider();
    await t.compteur.vider();
    await t.compteur.vider();
    expect(jourDe(t.lignes, "2026-11-23").parPub.get(PUB_A)).toBe(1);
    expect(t.etat.ecritures).toBe(2); // le début, puis le jour — rien d'autre
  });

  it("repose un minuteur pour ce qui arrive après une écriture", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.poses.shift()!.fn(); // le minuteur sonne
    await t.compteur.vider(); // attend la fin de l'écriture en cours
    expect(t.poses).toHaveLength(0);
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    expect(t.poses).toHaveLength(1);
  });
});

describe("compteur d'arrivées — quand l'écriture rate", () => {
  it("recommence quand quelqu'un d'autre a écrit entre la lecture et l'écriture", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    await t.compteur.vider();
    t.etat.perdreLesSwaps = 2; // deux écritures perdues, la troisième passe
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    await t.compteur.vider();
    expect(jourDe(t.lignes, "2026-11-23").parPub.get(PUB_A)).toBe(2);
    expect(t.erreurs).toEqual([]);
  });

  it("garde le paquet en mémoire quand la base ne répond pas, et l'écrit plus tard", async () => {
    const t = monter();
    t.etat.panne = true;
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ meta: true }, LUNDI);
    await t.compteur.vider();
    expect(t.lignes.size).toBe(0);
    expect(t.erreurs).toHaveLength(1);

    // Une arrivée de plus pendant la panne : elle rejoint le paquet gardé.
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.etat.panne = false;
    await t.compteur.vider();
    const lundi = jourDe(t.lignes, "2026-11-23");
    expect(lundi.parPub.get(PUB_A)).toBe(2);
    expect(lundi.sans).toBe(1);
    expect(lundi.metaSans).toBe(1);
  });

  it("ne perd rien quand le compteur du jour change sans arrêt sous ses pieds", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    await t.compteur.vider();
    t.etat.perdreLesSwaps = 99;
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ pub: PUB_B }, LUNDI);
    await t.compteur.vider();
    expect(t.erreurs).toHaveLength(1);
    expect(jourDe(t.lignes, "2026-11-23").parPub.get(PUB_A)).toBe(1);
    t.etat.perdreLesSwaps = 0;
    await t.compteur.vider();
    expect(Object.fromEntries(jourDe(t.lignes, "2026-11-23").parPub)).toEqual({ [PUB_A]: 2, [PUB_B]: 1 });
  });

  it("réessaie de moins en moins souvent tant que la base ne répond pas", async () => {
    const t = monter();
    t.etat.panne = true;
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    const delais: number[] = [];
    for (let i = 0; i < 4; i++) {
      const pose = t.poses.shift()!;
      delais.push(pose.ms);
      pose.fn();
      await t.compteur.vider();
    }
    expect(delais).toEqual([1000, 2000, 4000, 8000]);
    // La base revient : le rythme normal aussi.
    t.etat.panne = false;
    t.poses.shift()!.fn();
    await t.compteur.vider();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    expect(t.poses[0]!.ms).toBe(1000);
  });

  it("ne lève jamais vers celui qui compte, même si tout est cassé", async () => {
    const t = monter();
    t.etat.panne = true;
    expect(() => t.compteur.noter({ pub: PUB_A }, LUNDI)).not.toThrow();
    await expect(t.compteur.vider()).resolves.toBeUndefined();
  });
});

describe("compteur d'arrivées — le début du comptage", () => {
  it("note l'instant de la toute première arrivée", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ pub: PUB_A }, MARDI);
    await t.compteur.vider();
    expect(t.lignes.get(CLE_ARRIVEES_DEBUT)).toBe(LUNDI.toISOString());
  });

  it("ne déplace pas un début déjà posé par un démarrage plus ancien", async () => {
    const t = monter();
    t.lignes.set(CLE_ARRIVEES_DEBUT, "2026-11-01T08:00:00.000Z");
    t.compteur.noter({ pub: PUB_A }, MARDI);
    await t.compteur.vider();
    expect(t.lignes.get(CLE_ARRIVEES_DEBUT)).toBe("2026-11-01T08:00:00.000Z");
    const lu = await t.compteur.lire(["2026-11-24"]);
    expect(lu.debut?.toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("dit « rien » tant que rien n'a jamais été compté", async () => {
    const t = monter();
    const lu = await t.compteur.lire(["2026-11-23", "2026-11-24"]);
    expect(lu.debut).toBeNull();
    expect(lu.jours.size).toBe(0);
  });

  it("ignore un début illisible plutôt que d'afficher une date fausse", async () => {
    const t = monter();
    t.lignes.set(CLE_ARRIVEES_DEBUT, "n'importe quoi");
    const lu = await t.compteur.lire(["2026-11-24"]);
    expect(lu.debut).toBeNull();
  });
});

describe("compteur d'arrivées — lire", () => {
  it("compte aussi ce qui attend encore en mémoire", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    await t.compteur.vider();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ meta: true }, LUNDI);
    // Pas de vider() : le tableau de bord est ouvert MAINTENANT.
    const lu = await t.compteur.lire(["2026-11-23"]);
    const lundi = lu.jours.get("2026-11-23")!;
    expect(lundi.parPub.get(PUB_A)).toBe(2);
    expect(lundi.metaSans).toBe(1);
    expect(lu.debut?.getTime()).toBe(LUNDI.getTime());
  });

  it("donne le début dès la première arrivée, avant même la première écriture", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, MARDI);
    const lu = await t.compteur.lire(["2026-11-24"]);
    expect(lu.debut?.getTime()).toBe(MARDI.getTime());
    expect(lu.jours.get("2026-11-24")!.parPub.get(PUB_A)).toBe(1);
  });

  it("ne rend que les jours demandés, et seulement ceux où il s'est passé quelque chose", async () => {
    const t = monter();
    t.compteur.noter({ pub: PUB_A }, LUNDI);
    t.compteur.noter({ pub: PUB_B }, MARDI);
    await t.compteur.vider();
    const lu = await t.compteur.lire(["2026-11-22", "2026-11-23"]);
    expect(Array.from(lu.jours.keys())).toEqual(["2026-11-23"]);
  });
});

describe("visites d'une période — ce que le tableau de bord en retient", () => {
  const jour = (...arrivees: Arrivee[]): JourArrivees => {
    const j = jourVide();
    for (const a of arrivees) ajouterArrivee(j, a);
    return j;
  };
  const minuit = (iso: string) => new Date(`${iso}T00:00:00`);
  /** Du 18 au 24 novembre inclus. */
  const SEMAINE = { start: minuit("2026-11-18"), end: minuit("2026-11-25") };
  const MAINTENANT = new Date("2026-11-24T15:00:00");

  it("ne sait rien tant que rien n'a jamais été compté", () => {
    expect(resumerArrivees({ debut: null, jours: new Map() }, SEMAINE, MAINTENANT)).toBeNull();
  });

  it("ne sait rien d'une période terminée avant le début du comptage", () => {
    const lues = { debut: new Date("2026-11-25T09:00:00"), jours: new Map() };
    expect(resumerArrivees(lues, SEMAINE, MAINTENANT)).toBeNull();
    // À la seconde près : la période finit le 25 à minuit, exclu.
    expect(resumerArrivees({ debut: minuit("2026-11-25"), jours: new Map() }, SEMAINE, MAINTENANT)).toBeNull();
  });

  it("additionne les jours de la période et seulement eux", () => {
    const lues = {
      debut: new Date("2026-11-10T09:00:00"),
      jours: new Map([
        ["2026-11-17", jour({ pub: PUB_A })], // la veille de la période
        ["2026-11-18", jour({ pub: PUB_A }, { pub: PUB_A })],
        ["2026-11-24", jour({ pub: PUB_B }, { meta: true }, {})],
      ]),
    };
    const r = resumerArrivees(lues, SEMAINE, MAINTENANT)!;
    expect(Object.fromEntries(r.parPub)).toEqual({ [PUB_A]: 2, [PUB_B]: 1 });
    expect(r.etiquetees).toBe(3);
    expect(r.sans).toBe(2);
    expect(r.metaSans).toBe(1);
    expect(r.partielle).toBe(false);
  });

  it("dit que la période n'est couverte qu'en partie quand le comptage a commencé en cours de route", () => {
    const lues = { debut: new Date("2026-11-22T14:00:00"), jours: new Map([["2026-11-23", jour({ pub: PUB_A })]]) };
    const r = resumerArrivees(lues, SEMAINE, MAINTENANT)!;
    expect(r.partielle).toBe(true);
    expect(r.debut.toISOString()).toBe(new Date("2026-11-22T14:00:00").toISOString());
  });

  it("regarde hier et aujourd'hui pour l'alerte, quelle que soit la période affichée", () => {
    const lues = {
      debut: new Date("2026-08-01T09:00:00"),
      jours: new Map([
        ["2026-09-02", jour({ meta: true }, { meta: true }, { meta: true })], // vieux : hors de l'alerte
        ["2026-11-23", jour({ pub: PUB_A }, { meta: true })],
        ["2026-11-24", jour({ pub: PUB_A }, { pub: PUB_B }, { meta: true }, { meta: true }, {})],
      ]),
    };
    // Tableau réglé sur la première semaine de septembre.
    const SEPTEMBRE = { start: minuit("2026-09-01"), end: minuit("2026-09-08") };
    const r = resumerArrivees(lues, SEPTEMBRE, MAINTENANT)!;
    expect(r.metaSans).toBe(3);
    expect(r.recentes).toEqual({ etiquetees: 3, metaSans: 3 });
    // Et sur la semaine en cours, les deux lectures coexistent.
    const s = resumerArrivees(lues, SEMAINE, MAINTENANT)!;
    expect(s.metaSans).toBe(3);
    expect(s.recentes).toEqual({ etiquetees: 3, metaSans: 3 });
  });

  it("demande au compteur les jours de la période, plus hier et aujourd'hui", () => {
    const SEPTEMBRE = { start: minuit("2026-09-01"), end: minuit("2026-09-03") };
    expect(joursALire(SEPTEMBRE, MAINTENANT)).toEqual(["2026-09-01", "2026-09-02", "2026-11-23", "2026-11-24"]);
    // Déjà dans la période : pas demandés deux fois.
    const cles = joursALire(SEMAINE, MAINTENANT);
    expect(cles).toHaveLength(7);
    expect(new Set(cles).size).toBe(7);
  });

  it("ne lit que les quatre cents jours les plus récents d'une période démesurée", () => {
    const TROIS_ANS = { start: minuit("2023-11-25"), end: minuit("2026-11-25") };
    const cles = joursALire(TROIS_ANS, MAINTENANT);
    expect(cles).toHaveLength(400);
    expect(cles.at(-1)).toBe("2026-11-24");
  });
});
