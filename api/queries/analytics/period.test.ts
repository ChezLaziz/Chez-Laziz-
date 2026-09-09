import { describe, it, expect } from "vitest";
import { dayKey, daysInPeriod, resolveCustom, resolvePreset } from "./period";

const NOW = new Date("2026-09-09T15:30:00");

describe("resolvePreset", () => {
  it("« today » couvre la journée entière en cours", () => {
    const { current } = resolvePreset("today", NOW);
    expect(dayKey(current.start)).toBe("2026-09-09");
    // Fin exclusive au lendemain : une commande de 23:59 reste comptée.
    expect(dayKey(current.end)).toBe("2026-09-10");
  });

  it("« 7d » couvre 7 jours, aujourd'hui inclus", () => {
    const { current } = resolvePreset("7d", NOW);
    expect(daysInPeriod(current)).toHaveLength(7);
    expect(dayKey(current.start)).toBe("2026-09-03");
  });

  it("compare à une période précédente de même durée et contiguë", () => {
    const { current, previous } = resolvePreset("7d", NOW);
    expect(daysInPeriod(previous)).toHaveLength(7);
    expect(previous.end.getTime()).toBe(current.start.getTime());
    expect(dayKey(previous.start)).toBe("2026-08-27");
  });

  it("30d et 90d gardent la même règle", () => {
    for (const preset of ["30d", "90d"] as const) {
      const { current, previous } = resolvePreset(preset, NOW);
      expect(daysInPeriod(current)).toHaveLength(daysInPeriod(previous).length);
      expect(previous.end.getTime()).toBe(current.start.getTime());
    }
  });
});

describe("resolveCustom", () => {
  it("inclut le jour de fin en entier", () => {
    const { current } = resolveCustom(new Date("2026-09-01"), new Date("2026-09-03"));
    expect(daysInPeriod(current)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("compare à la même durée juste avant", () => {
    const { current, previous } = resolveCustom(
      new Date("2026-09-01"),
      new Date("2026-09-03"),
    );
    expect(daysInPeriod(previous)).toEqual(["2026-08-29", "2026-08-30", "2026-08-31"]);
    expect(previous.end.getTime()).toBe(current.start.getTime());
  });
});

describe("dayKey", () => {
  it("découpe les jours en heure locale, pas en UTC", () => {
    // À Tunis (UTC+1), 00:30 locale est encore la veille en UTC : découper
    // en UTC rattachait cette commande au mauvais jour.
    expect(dayKey(new Date(2026, 8, 9, 0, 30))).toBe("2026-09-09");
    expect(dayKey(new Date(2026, 8, 9, 23, 30))).toBe("2026-09-09");
  });
});
