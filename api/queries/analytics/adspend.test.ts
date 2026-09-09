import { describe, it, expect } from "vitest";
import {
  computeAdPerformance,
  isValidMonth,
  monthBounds,
  monthKey,
  type AdOrder,
  type SpendEntry,
} from "./adspend";

const NOW = new Date(2026, 8, 9, 12, 0, 0); // 9 septembre 2026, heure locale

/** Commande valide au 15 du mois donné. */
function order(month: string, over: Partial<AdOrder> = {}): AdOrder {
  const [y, m] = month.split("-").map(Number);
  return {
    status: "terminee",
    paymentStatus: "paid",
    subtotalMillimes: 10000,
    acquisitionSource: null,
    createdAt: new Date(y!, m! - 1, 15, 10, 0, 0),
    ...over,
  };
}

const spend = (source: string, month: string, amountMillimes: number): SpendEntry => ({
  source,
  month,
  amountMillimes,
});

describe("monthKey / monthBounds", () => {
  it("range une commande sur son mois local, pas sur son mois UTC", () => {
    // Le 1ᵉʳ à 00:30 à Tunis est le 31 du mois précédent en UTC : découper
    // en UTC rattacherait la commande au mois d'avant, et le total du mois
    // ne correspondrait pas à ce que l'admin voit dans sa liste.
    const previous = process.env.TZ;
    process.env.TZ = "Africa/Tunis";
    try {
      const d = new Date(2026, 8, 1, 0, 30);
      expect(d.toISOString().slice(0, 7)).toBe("2026-08"); // ce que ferait toISOString
      expect(monthKey(d)).toBe("2026-09"); // ce que fait monthKey
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it("borne le mois du 1ᵉʳ inclus au 1ᵉʳ suivant exclu", () => {
    const { start, end } = monthBounds("2026-09");
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(1);
  });

  it("passe correctement à l'année suivante", () => {
    expect(monthBounds("2026-12").end.getFullYear()).toBe(2027);
    expect(monthBounds("2026-12").end.getMonth()).toBe(0);
  });

  it("rejette un mois mal formé", () => {
    expect(isValidMonth("2026-09")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-9")).toBe(false);
    expect(isValidMonth("septembre")).toBe(false);
  });
});

describe("computeAdPerformance — sans dépense saisie", () => {
  it("affiche le mois en cours même vide, pour donner où saisir", () => {
    const rows = computeAdPerformance([], [], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.month).toBe("2026-09");
    expect(rows[0]!.spendMillimes).toBe(0);
    expect(rows[0]!.roas).toBeNull();
    expect(rows[0]!.cpaMillimes).toBeNull();
  });

  it("ne calcule ni CPA ni ROAS tant qu'aucun montant n'est saisi", () => {
    // Des ventes attribuées sans dépense connue ne donnent pas un ROAS
    // infini : elles ne donnent aucun ROAS.
    const rows = computeAdPerformance(
      [order("2026-09", { acquisitionSource: "instagram", subtotalMillimes: 50000 })],
      [],
      NOW,
    );
    expect(rows[0]!.roas).toBeNull();
    expect(rows[0]!.bySource[0]!.verdict).toBe("organic");
    expect(rows[0]!.bySource[0]!.roas).toBeNull();
    expect(rows[0]!.bySource[0]!.revenueMillimes).toBe(50000);
  });
});

describe("computeAdPerformance — mesure réelle", () => {
  it("calcule CPA et ROAS à partir de la dépense saisie", () => {
    const rows = computeAdPerformance(
      [
        order("2026-09", { acquisitionSource: "instagram", subtotalMillimes: 60000 }),
        order("2026-09", { acquisitionSource: "instagram", subtotalMillimes: 40000 }),
      ],
      [spend("instagram", "2026-09", 20000)],
      NOW,
    );
    const ig = rows[0]!.bySource.find((s) => s.source === "instagram")!;
    expect(ig.verdict).toBe("measured");
    expect(ig.cpaMillimes).toBe(10000); // 20 000 ÷ 2 commandes
    expect(ig.roas).toBeCloseTo(5); // 100 000 ÷ 20 000
    expect(rows[0]!.cpaMillimes).toBe(10000);
    expect(rows[0]!.roas).toBeCloseTo(5);
  });

  it("n'inclut PAS le CA d'une source gratuite dans le ROAS de la dépense", () => {
    // Sinon les ventes organiques de TikTok feraient passer une publicité
    // Facebook ratée pour rentable.
    const rows = computeAdPerformance(
      [
        order("2026-09", { acquisitionSource: "facebook", subtotalMillimes: 10000 }),
        order("2026-09", { acquisitionSource: "tiktok", subtotalMillimes: 90000 }),
      ],
      [spend("facebook", "2026-09", 20000)],
      NOW,
    );
    expect(rows[0]!.paidRevenueMillimes).toBe(10000);
    expect(rows[0]!.roas).toBeCloseTo(0.5);
    expect(rows[0]!.bySource.find((s) => s.source === "tiktok")!.verdict).toBe("organic");
  });

  it("additionne les dépenses de plusieurs plateformes sur le mois", () => {
    const rows = computeAdPerformance(
      [
        order("2026-09", { acquisitionSource: "instagram", subtotalMillimes: 30000 }),
        order("2026-09", { acquisitionSource: "tiktok", subtotalMillimes: 30000 }),
      ],
      [spend("instagram", "2026-09", 10000), spend("tiktok", "2026-09", 20000)],
      NOW,
    );
    expect(rows[0]!.spendMillimes).toBe(30000);
    expect(rows[0]!.paidOrders).toBe(2);
    expect(rows[0]!.roas).toBeCloseTo(2);
  });
});

describe("computeAdPerformance — l'absence de mesure n'est pas un échec", () => {
  it("laisse le ROAS à null quand AUCUNE commande du mois n'a d'origine", () => {
    // La dépense a peut-être très bien marché : rien ne permet de le dire.
    // Afficher 0 ferait couper un budget sur une mesure manquante.
    const rows = computeAdPerformance(
      [order("2026-09"), order("2026-09")],
      [spend("instagram", "2026-09", 50000)],
      NOW,
    );
    const ig = rows[0]!.bySource[0]!;
    expect(ig.verdict).toBe("no_attribution");
    expect(ig.roas).toBeNull();
    expect(ig.cpaMillimes).toBeNull();
    expect(rows[0]!.roas).toBeNull();
    expect(rows[0]!.orderCoverage).toBe(0);
  });

  it("distingue « rien mesuré » de « mesuré, et ça n'a rien donné »", () => {
    // Ici le mois a bien des origines connues, mais aucune ne vient de
    // Facebook : le zéro est une vraie mesure, pas une absence.
    const rows = computeAdPerformance(
      [order("2026-09", { acquisitionSource: "instagram", subtotalMillimes: 40000 })],
      [spend("facebook", "2026-09", 30000)],
      NOW,
    );
    const fb = rows[0]!.bySource.find((s) => s.source === "facebook")!;
    expect(fb.verdict).toBe("no_orders_from_source");
    expect(fb.roas).toBe(0);
    expect(fb.cpaMillimes).toBeNull(); // 0 commande : pas de coût par commande
  });

  it("expose la couverture du mois, qui fait du ROAS un plancher", () => {
    const rows = computeAdPerformance(
      [
        order("2026-09", { acquisitionSource: "instagram", subtotalMillimes: 40000 }),
        order("2026-09"),
        order("2026-09"),
        order("2026-09"),
      ],
      [spend("instagram", "2026-09", 20000)],
      NOW,
    );
    expect(rows[0]!.orderCoverage).toBeCloseTo(0.25);
    expect(rows[0]!.totalOrders).toBe(4);
    expect(rows[0]!.attributedOrders).toBe(1);
    expect(rows[0]!.roas).toBeCloseTo(2); // plancher : 3 commandes restent sans origine
  });
});

describe("computeAdPerformance — plusieurs mois", () => {
  it("classe du mois le plus récent au plus ancien", () => {
    const rows = computeAdPerformance(
      [],
      [spend("instagram", "2026-07", 1000), spend("instagram", "2026-08", 1000)],
      NOW,
    );
    expect(rows.map((r) => r.month)).toEqual(["2026-09", "2026-08", "2026-07"]);
  });

  it("garde un mois où des ventes sont attribuées mais aucune dépense saisie", () => {
    // Sinon l'oubli de saisie fait disparaître le mois, et personne ne voit
    // qu'il manque un montant.
    const rows = computeAdPerformance(
      [order("2026-07", { acquisitionSource: "tiktok", subtotalMillimes: 25000 })],
      [],
      NOW,
    );
    const juillet = rows.find((r) => r.month === "2026-07")!;
    expect(juillet.spendMillimes).toBe(0);
    expect(juillet.bySource[0]!.verdict).toBe("organic");
  });

  it("n'affiche pas un mois sans dépense ni aucune origine connue", () => {
    const rows = computeAdPerformance([order("2026-06")], [], NOW);
    expect(rows.map((r) => r.month)).toEqual(["2026-09"]);
  });

  it("ne mélange pas les commandes d'un mois avec la dépense d'un autre", () => {
    const rows = computeAdPerformance(
      [order("2026-08", { acquisitionSource: "instagram", subtotalMillimes: 90000 })],
      [spend("instagram", "2026-09", 30000)],
      NOW,
    );
    const sept = rows.find((r) => r.month === "2026-09")!;
    const aout = rows.find((r) => r.month === "2026-08")!;
    expect(sept.paidRevenueMillimes).toBe(0);
    expect(sept.bySource[0]!.verdict).toBe("no_attribution");
    expect(aout.spendMillimes).toBe(0);
    expect(aout.bySource[0]!.revenueMillimes).toBe(90000);
  });

  it("ignore une ligne de dépense au mois invalide au lieu de planter", () => {
    const rows = computeAdPerformance([], [spend("instagram", "pas-un-mois", 5000)], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.spendMillimes).toBe(0);
  });

  it("additionne deux lignes de dépense identiques au lieu d'en perdre une", () => {
    const rows = computeAdPerformance(
      [],
      [spend("instagram", "2026-09", 5000), spend("instagram", "2026-09", 7000)],
      NOW,
    );
    expect(rows[0]!.spendMillimes).toBe(12000);
  });
});

describe("computeAdPerformance — cohérence avec le reste du tableau de bord", () => {
  it("compte le CA hors frais de livraison, comme partout ailleurs", () => {
    const rows = computeAdPerformance(
      [
        order("2026-09", {
          acquisitionSource: "instagram",
          subtotalMillimes: 40000,
        }),
      ],
      [spend("instagram", "2026-09", 10000)],
      NOW,
    );
    // 40 000 et non 48 000 : les 8 DT de livraison ne sont pas du CA.
    expect(rows[0]!.paidRevenueMillimes).toBe(40000);
    expect(rows[0]!.roas).toBeCloseTo(4);
  });
});
