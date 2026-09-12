import { describe, expect, it } from "vitest";
import {
  contientDuNouveau,
  estHeureOuvrable,
  formatAgeAr,
  formatStalledDigest,
  tunisHour,
} from "./stalledOrders";

const cmd = (id: number, h: number, millimes = 25000) => ({
  id,
  customerName: `Client ${id}`,
  phone: "29173419",
  totalMillimes: millimes,
  ageHours: h,
});

describe("formatAgeAr", () => {
  it("suit les quatre temps de l'arabe — « 5 ساعة » sonnerait faux", () => {
    expect(formatAgeAr(1)).toBe("من ساعة");
    expect(formatAgeAr(2)).toBe("من ساعتين");
    expect(formatAgeAr(5)).toBe("من 5 ساعات");
    expect(formatAgeAr(14)).toBe("من 14 ساعة");
  });

  it("passe en jours au-delà de 24 heures", () => {
    expect(formatAgeAr(31)).toBe("من يوم");
    expect(formatAgeAr(50)).toBe("من يومين");
    expect(formatAgeAr(96)).toBe("من 4 أيام");
  });

  it("ne descend jamais sous « من ساعة »", () => {
    expect(formatAgeAr(0)).toBe("من ساعة");
    expect(formatAgeAr(-5)).toBe("من ساعة");
  });
});

describe("formatStalledDigest", () => {
  it("N'ÉCRIT RIEN quand tout est à jour — un rappel permanent ne se lit plus", () => {
    expect(formatStalledDigest([], [])).toBeNull();
  });

  it("met le montant en attente en tête : c'est lui qui fait décrocher", () => {
    const texte = formatStalledDigest([cmd(37, 9, 25000), cmd(39, 6, 53000)], []);
    expect(texte).toContain("2 طلبيات يستنّاو تليفون — 78 د.ت");
  });

  it("porte le numéro de chaque client — il faut pouvoir appeler d'un doigt", () => {
    const texte = formatStalledDigest([cmd(37, 9)], []);
    expect(texte).toContain("<b>#37</b> Client 37 — 29173419");
    expect(texte).toContain("من 9 ساعات");
  });

  it("sépare « personne n'a appelé » de « le carton n'est pas parti »", () => {
    const texte = formatStalledDigest([cmd(37, 9)], [{ id: 27, customerName: "Farouk", ageHours: 31 }]);
    expect(texte).toContain("تستنّى تليفون");
    expect(texte).toContain("ما تسلّمتش لشركة التوصيل");
    expect(texte).toContain("<b>#27</b> Farouk — من يوم");
  });

  it("n'affiche que le second bloc quand il n'y a rien à confirmer", () => {
    const texte = formatStalledDigest([], [{ id: 27, customerName: "Farouk", ageHours: 31 }]);
    expect(texte).not.toContain("تليفون");
    expect(texte?.startsWith("📦")).toBe(true);
  });

  it("compte le reste au lieu de faire défiler l'écran", () => {
    const texte = formatStalledDigest(
      Array.from({ length: 13 }, (_, i) => cmd(i + 1, 3)),
      [],
    );
    expect(texte).toContain("… و 3 أخرى");
    expect((texte ?? "").match(/🔸/g)).toHaveLength(10);
  });

  it("échappe le HTML d'un nom de client", () => {
    const texte = formatStalledDigest([{ ...cmd(1, 3), customerName: "A <b>" }], []);
    expect(texte).toContain("A &lt;b&gt;");
  });

  it("écrit correctement au singulier", () => {
    expect(formatStalledDigest([cmd(37, 3)], [])).toContain("1 طلبية تستنّى تليفون");
  });
});

describe("tunisHour", () => {
  it("lit l'heure de Tunis, pas celle du serveur", () => {
    // 2026-09-11T23:04Z = 00:04 à Tunis (UTC+1) — c'est l'heure réelle de la
    // commande #42, et c'est le cas qui casse un décalage codé en dur.
    expect(tunisHour(new Date("2026-09-11T23:04:28Z"))).toBe(0);
    expect(tunisHour(new Date("2026-09-11T07:30:00Z"))).toBe(8);
    expect(tunisHour(new Date("2026-01-15T07:30:00Z"))).toBe(8);
  });
});

describe("estHeureOuvrable", () => {
  it("se tait la nuit : une commande ne réveille personne", () => {
    expect(estHeureOuvrable(0)).toBe(false);
    expect(estHeureOuvrable(7)).toBe(false);
    expect(estHeureOuvrable(8)).toBe(true);
    expect(estHeureOuvrable(20)).toBe(true);
    expect(estHeureOuvrable(21)).toBe(false);
  });
});

describe("contientDuNouveau", () => {
  it("ne sonne QUE si une commande rejoint la liste", () => {
    expect(contientDuNouveau([37, 39], [37, 39])).toBe(false);
    expect(contientDuNouveau([37], [37, 39])).toBe(false);
    expect(contientDuNouveau([37, 39, 40], [37, 39])).toBe(true);
    expect(contientDuNouveau([37], [])).toBe(true);
  });
});
