import { describe, it, expect } from "vitest";
import {
  PRESET_RANGES,
  lastDayOf,
  presetDays,
  resolveCustom,
  resolvePreset,
} from "./analytics";

const NOW = new Date("2026-09-20T15:30:00");
const DAY_MS = 24 * 60 * 60 * 1000;
const days = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / DAY_MS);

describe("presets", () => {
  it("couvre le nombre de jours annoncé par son nom", () => {
    for (const preset of PRESET_RANGES) {
      const { current } = resolvePreset(preset, NOW);
      expect(days(current.start, current.end)).toBe(presetDays(preset));
    }
  });

  it("« 15 jours » existe côté client ET côté serveur", () => {
    // Le raccourci du sélecteur de dates ne vaut que si le serveur sait
    // résoudre le même preset : sans cette entrée, l'admin demanderait
    // quinze jours et lirait les chiffres d'un autre intervalle.
    expect(PRESET_RANGES).toContain("15d");
    expect(presetDays("15d")).toBe(15);
    const { current, previous } = resolvePreset("15d", NOW);
    expect(days(current.start, current.end)).toBe(15);
    expect(days(previous.start, previous.end)).toBe(15);
    expect(previous.end.getTime()).toBe(current.start.getTime());
  });
});

describe("lastDayOf", () => {
  it("rend le dernier jour INCLUS, pas la borne exclusive", () => {
    // `end` est le lendemain à minuit : l'afficher tel quel annoncerait une
    // période qui va un jour trop loin.
    const { current } = resolvePreset("7d", NOW);
    const last = lastDayOf(current);
    expect(last.getFullYear()).toBe(2026);
    expect(last.getMonth()).toBe(8); // septembre
    expect(last.getDate()).toBe(20);
  });
});

describe("resolveCustom", () => {
  it("inclut les deux dates choisies", () => {
    const { current } = resolveCustom(new Date(2026, 8, 1), new Date(2026, 8, 10));
    expect(days(current.start, current.end)).toBe(10);
    expect(lastDayOf(current).getDate()).toBe(10);
  });

  it("compare à la même durée juste avant", () => {
    const { current, previous } = resolveCustom(new Date(2026, 8, 1), new Date(2026, 8, 10));
    expect(days(previous.start, previous.end)).toBe(10);
    expect(previous.end.getTime()).toBe(current.start.getTime());
    expect(previous.start.getDate()).toBe(22); // 22 août
  });

  it("accepte une période d'un seul jour", () => {
    const { current, previous } = resolveCustom(new Date(2026, 8, 5), new Date(2026, 8, 5));
    expect(days(current.start, current.end)).toBe(1);
    expect(days(previous.start, previous.end)).toBe(1);
  });

  it("ignore l'heure des dates reçues", () => {
    // Le navigateur envoie des instants datés à midi pour que le jour reste
    // le même quel que soit le décalage horaire : la période doit malgré
    // tout commencer à minuit et finir au minuit suivant.
    const { current } = resolveCustom(
      new Date(2026, 8, 1, 12, 0, 0),
      new Date(2026, 8, 3, 12, 0, 0),
    );
    expect(current.start.getHours()).toBe(0);
    expect(days(current.start, current.end)).toBe(3);
  });
});
