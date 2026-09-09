import { describe, it, expect } from "vitest";
import { buildSocialOverview, buildTrend, STALE_AFTER_DAYS } from "./social";

const NOW = new Date("2026-09-09T12:00:00Z");
const at = (daysAgo: number) =>
  new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

const reading = (network: string, followers: number, daysAgo: number, messages = 0) => ({
  network,
  followers,
  messages,
  createdAt: at(daysAgo),
});

describe("buildSocialOverview", () => {
  it("renvoie tous les réseaux même sans aucun relevé", () => {
    const o = buildSocialOverview([], NOW);
    expect(o.networks).toHaveLength(4);
    expect(o.hasAnyData).toBe(false);
    expect(o.missingNetworks).toHaveLength(4);
    expect(o.totalFollowers).toBe(0);
  });

  it("ne présente pas un premier relevé comme une croissance", () => {
    // Un point de départ n'est pas « +1200 abonnés » : il n'y a rien avant.
    const o = buildSocialOverview([reading("instagram", 1200, 1)], NOW);
    const ig = o.networks.find((n) => n.network === "instagram")!;
    expect(ig.latest!.followers).toBe(1200);
    expect(ig.followersDelta).toBeNull();
    expect(o.netFollowersDelta).toBeNull();
  });

  it("calcule la variation entre les deux derniers relevés", () => {
    const o = buildSocialOverview(
      [reading("instagram", 1000, 10), reading("instagram", 1150, 2)],
      NOW,
    );
    const ig = o.networks.find((n) => n.network === "instagram")!;
    expect(ig.followersDelta).toBe(150);
    expect(ig.followersDeltaPercent).toBeCloseTo(15);
  });

  it("trie les relevés arrivés dans le désordre", () => {
    const o = buildSocialOverview(
      [reading("instagram", 1150, 2), reading("instagram", 1000, 10)],
      NOW,
    );
    expect(o.networks.find((n) => n.network === "instagram")!.followersDelta).toBe(150);
  });

  it("repère une baisse et la signale", () => {
    const o = buildSocialOverview(
      [reading("facebook", 800, 10), reading("facebook", 740, 1)],
      NOW,
    );
    const fb = o.networks.find((n) => n.network === "facebook")!;
    expect(fb.followersDelta).toBe(-60);
    expect(o.decliningNetworks).toContain("facebook");
  });

  it("retient la pire baisse de tout l'historique, pas seulement la dernière", () => {
    const o = buildSocialOverview(
      [
        reading("tiktok", 500, 30),
        reading("tiktok", 300, 20), // -200 : la pire
        reading("tiktok", 340, 10),
        reading("tiktok", 330, 1), // -10 : la plus récente
      ],
      NOW,
    );
    const tk = o.networks.find((n) => n.network === "tiktok")!;
    expect(tk.worstDrop).toBe(200);
    expect(tk.followersDelta).toBe(-10);
  });

  it("laisse worstDrop à zéro quand le compte n'a jamais reculé", () => {
    const o = buildSocialOverview(
      [reading("instagram", 100, 20), reading("instagram", 200, 1)],
      NOW,
    );
    expect(o.networks.find((n) => n.network === "instagram")!.worstDrop).toBe(0);
  });

  it("marque un relevé périmé", () => {
    const o = buildSocialOverview(
      [reading("google", 50, STALE_AFTER_DAYS + 5)],
      NOW,
    );
    const g = o.networks.find((n) => n.network === "google")!;
    expect(g.isStale).toBe(true);
    expect(g.daysSinceReading).toBe(STALE_AFTER_DAYS + 5);
    expect(o.staleNetworks).toContain("google");
  });

  it("additionne les abonnés de tous les réseaux relevés", () => {
    const o = buildSocialOverview(
      [reading("instagram", 1000, 1), reading("facebook", 500, 1)],
      NOW,
    );
    expect(o.totalFollowers).toBe(1500);
    expect(o.missingNetworks).toEqual(["tiktok", "google"]);
  });

  it("compense un gain et une perte dans le total net, d'où le détail par réseau", () => {
    const o = buildSocialOverview(
      [
        reading("instagram", 1000, 10),
        reading("instagram", 1100, 1), // +100
        reading("facebook", 500, 10),
        reading("facebook", 400, 1), // -100
      ],
      NOW,
    );
    expect(o.netFollowersDelta).toBe(0);
    expect(o.decliningNetworks).toEqual(["facebook"]);
  });

  it("ignore un réseau inconnu au lieu de planter", () => {
    const o = buildSocialOverview([reading("myspace", 9999, 1)], NOW);
    expect(o.hasAnyData).toBe(false);
    expect(o.totalFollowers).toBe(0);
  });

  it("évite une division par zéro sur un compte parti de zéro", () => {
    const o = buildSocialOverview(
      [reading("tiktok", 0, 10), reading("tiktok", 40, 1)],
      NOW,
    );
    const tk = o.networks.find((n) => n.network === "tiktok")!;
    expect(tk.followersDelta).toBe(40);
    expect(tk.followersDeltaPercent).toBeNull();
  });
});

describe("buildTrend", () => {
  it("fusionne les réseaux sur un axe temporel commun", () => {
    const o = buildSocialOverview(
      [reading("instagram", 1000, 5), reading("facebook", 500, 5), reading("instagram", 1100, 1)],
      NOW,
    );
    const trend = buildTrend(o);
    expect(trend).toHaveLength(2);
    expect(trend[0]!.instagram).toBe(1000);
    expect(trend[0]!.facebook).toBe(500);
    // Facebook n'a pas de relevé à cette date : absent, pas zéro — sinon la
    // ligne plongerait à zéro puis remonterait.
    expect(trend[1]!.instagram).toBe(1100);
    expect(trend[1]!.facebook).toBeUndefined();
  });

  it("renvoie une liste vide sans données", () => {
    expect(buildTrend(buildSocialOverview([], NOW))).toEqual([]);
  });
});
