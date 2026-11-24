import { describe, expect, it } from "vitest";
import {
  EMPTY_DONE,
  KITCHEN_DAY_SECTIONS,
  accumulateKitchen,
  buildKitchenBoard,
  formatKgAr,
  formatKitchenBoard,
  formatKitchenDayAr,
  kitchenKey,
  kitchenKeyboard,
  markKitchenSection,
  parseKitchenCallback,
  parseKitchenDone,
  pruneKitchenDone,
  undoKitchen,
  type KitchenItem,
  type KitchenOrder,
} from "./kitchenBoard";

const cmd = (...items: Parameters<typeof accumulateKitchen>[0][number]["items"]) => ({ items });

describe("accumulateKitchen", () => {
  it("cumule le même produit sur plusieurs commandes — c'est toute la raison d'être du tableau", () => {
    const totaux = accumulateKitchen([
      cmd({ productId: 5, name: "Fraise", weightKg: 0.5, qty: 1 }),
      cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 2 }),
    ]);
    expect(totaux[kitchenKey(5, "Fraise")].kg).toBe(2.5);
  });

  it("multiplie par la quantité", () => {
    const totaux = accumulateKitchen([cmd({ productId: 5, name: "Fraise", weightKg: 0.5, qty: 3 })]);
    expect(totaux.p5.kg).toBe(1.5);
  });

  it("compte un pack par son CONTENU, jamais deux fois", () => {
    const totaux = accumulateKitchen([
      cmd({
        productId: undefined,
        name: "Custom Pack 2 kg",
        weightKg: 2,
        qty: 1,
        contents: [
          { productId: 5, name: "Fraise", weightKg: 1 },
          { productId: 7, name: "Vanille", weightKg: 1 },
        ],
      }),
    ]);
    expect(Object.keys(totaux).sort()).toEqual(["p5", "p7"]);
    expect(totaux.p5.kg).toBe(1);
    expect(totaux.p7.kg).toBe(1);
  });

  it("multiplie le contenu d'un pack commandé en plusieurs exemplaires", () => {
    const totaux = accumulateKitchen([
      cmd({
        name: "Pack Découverte",
        weightKg: 1,
        qty: 3,
        contents: [{ productId: 5, name: "Fraise", weightKg: 0.5 }],
      }),
    ]);
    expect(totaux.p5.kg).toBe(1.5);
  });

  it("regroupe un produit sans identifiant par son nom normalisé", () => {
    const totaux = accumulateKitchen([
      cmd({ name: "Makroudh  Jwayed", weightKg: 1, qty: 1 }),
      cmd({ name: "makroudh jwayed", weightKg: 1, qty: 1 }),
    ]);
    expect(Object.keys(totaux)).toHaveLength(1);
    expect(Object.values(totaux)[0].kg).toBe(2);
  });

  it("ne laisse pas traîner les flottants : 0,5 × 3 vaut 1,5 exactement", () => {
    const totaux = accumulateKitchen([
      cmd({ productId: 1, name: "A", weightKg: 0.5, qty: 1 }),
      cmd({ productId: 1, name: "A", weightKg: 0.5, qty: 1 }),
      cmd({ productId: 1, name: "A", weightKg: 0.5, qty: 1 }),
    ]);
    expect(totaux.p1.kg).toBe(1.5);
  });

  it("ignore une ligne à poids ou quantité inutilisable au lieu de fausser le total", () => {
    const totaux = accumulateKitchen([
      cmd(
        { productId: 1, name: "A", weightKg: 1, qty: 1 },
        { productId: 2, name: "B", weightKg: 0, qty: 4 },
        { productId: 3, name: "C", weightKg: 1, qty: Number.NaN },
      ),
    ]);
    expect(Object.keys(totaux)).toEqual(["p1"]);
  });
});

describe("formatKgAr", () => {
  it("écrit des poids qu'un cuisinier lit d'un coup d'œil", () => {
    expect(formatKgAr(3)).toBe("3 كغ");
    expect(formatKgAr(5.5)).toBe("5,5 كغ");
    expect(formatKgAr(0.25)).toBe("250 غ");
  });
});

// ---- Le tableau, jour par jour -------------------------------------------

const FRAISE: KitchenItem = { productId: 5, name: "Fraise", weightKg: 1, qty: 1 };
const VANILLE: KitchenItem = { productId: 7, name: "Vanille", weightKg: 0.5, qty: 1 };

/** « Maintenant » pour tous ces tests : mardi 24 novembre 2026, midi à Tunis.
 * Hier est donc le lundi 23 ; tout ce qui est plus ancien est « vieilli ». */
const NOW = new Date("2026-11-24T12:00:00+01:00");
const tableauDe = (
  orders: KitchenOrder[],
  done: Parameters<typeof buildKitchenBoard>[1] = EMPTY_DONE,
  labels: Record<string, string> = {},
) => buildKitchenBoard(orders, done, labels, NOW);

/** Une commande en préparation, confirmée tel jour à telle heure (Tunis). */
function commande(id: number, jour: string, heure: string, ...items: KitchenItem[]): KitchenOrder {
  // Tunis est à UTC+1, sans heure d'été.
  return { id, items: items.length ? items : [FRAISE], confirmedAt: new Date(`${jour}T${heure}:00+01:00`) };
}

describe("buildKitchenBoard — ce qui reste, rangé par jour de confirmation", () => {
  it("rien en préparation : un tableau vide, sans section", () => {
    const t = tableauDe([]);
    expect(t.sections).toEqual([]);
    expect(t.lines).toEqual([]);
    expect(t.canUndo).toBe(false);
  });

  it("cumule par type à l'intérieur d'un jour, du plus lourd au plus léger", () => {
    const t = tableauDe([
      commande(10, "2026-11-24", "09:00", FRAISE, VANILLE),
      commande(11, "2026-11-24", "15:00", { ...FRAISE, qty: 2 }),
    ]);
    expect(t.sections).toHaveLength(1);
    expect(t.sections[0]).toMatchObject({ kind: "day", day: "2026-11-24", orderIds: [10, 11] });
    expect(t.sections[0]!.lines).toEqual([
      { key: "p5", label: "Fraise", kg: 3 },
      { key: "p7", label: "Vanille", kg: 0.5 },
    ]);
  });

  // LA DEMANDE : « pas tout depuis le premier jour, jour par jour ».
  it("un jour par section, le plus récent en haut", () => {
    const t = tableauDe([
      commande(10, "2026-11-23", "10:00"),
      commande(11, "2026-11-24", "10:00"),
    ]);
    expect(t.sections.map((s) => [s.kind, s.day])).toEqual([
      ["day", "2026-11-24"],
      ["day", "2026-11-23"],
    ]);
  });

  it("au-delà de deux jours, le reste est regroupé sous « avant »", () => {
    expect(KITCHEN_DAY_SECTIONS).toBe(2);
    const t = tableauDe([
      commande(7, "2026-11-18", "10:00", VANILLE),
      commande(8, "2026-11-20", "10:00"),
      commande(10, "2026-11-23", "10:00"),
      commande(11, "2026-11-24", "10:00"),
    ]);
    expect(t.sections.map((s) => [s.kind, s.day, s.orderIds])).toEqual([
      ["day", "2026-11-24", [11]],
      ["day", "2026-11-23", [10]],
      // « Avant le 23 » : la borne est le plus ancien jour affiché en clair.
      ["before", "2026-11-23", [7, 8]],
    ]);
    expect(t.sections[2]!.lines).toEqual([
      { key: "p5", label: "Fraise", kg: 1 },
      { key: "p7", label: "Vanille", kg: 0.5 },
    ]);
  });

  it("le jour est celui de TUNIS : une confirmation à 00 h 30 appartient au jour qui commence", () => {
    // 23 h 30 UTC le 23 = 00 h 30 à Tunis le 24.
    const t = tableauDe([{ id: 1, items: [FRAISE], confirmedAt: new Date("2026-11-23T23:30:00Z") }]);
    expect(t.sections[0]!.day).toBe("2026-11-24");
  });

  it("`lines` additionne tous les jours : c'est ce que montre l'écran de l'atelier", () => {
    const t = tableauDe([
      commande(10, "2026-11-23", "10:00", FRAISE),
      commande(11, "2026-11-24", "10:00", FRAISE, VANILLE),
    ]);
    expect(t.lines).toEqual([
      { key: "p5", label: "Fraise", kg: 2 },
      { key: "p7", label: "Vanille", kg: 0.5 },
    ]);
  });

  it("affiche le nom actuel du catalogue plutôt que celui figé à la commande", () => {
    const t = tableauDe([commande(1, "2026-11-24", "10:00")], EMPTY_DONE, { p5: "لعزيز بالفرولة" });
    expect(t.sections[0]!.lines[0]!.label).toBe("لعزيز بالفرولة");
    expect(t.lines[0]!.label).toBe("لعزيز بالفرولة");
  });

  it("une commande sans rien à cuire n'ouvre pas une section vide", () => {
    const t = tableauDe([{ id: 1, items: [], confirmedAt: new Date("2026-11-24T10:00:00+01:00") }]);
    expect(t.sections).toEqual([]);
  });

  // CE QUI AVAIT CASSÉ : 856,5 kg affichés pour 1,5 kg réellement à préparer.
  // Le tableau lisait toutes les commandes confirmées de l'histoire et
  // attendait un appui pour les retirer. Ici la sortie tient à la LISTE
  // qu'on lui donne : une commande livrée n'y est plus, donc elle n'est plus
  // au tableau — sans que personne ait touché à quoi que ce soit.
  it("une commande qui n'est plus en préparation disparaît d'elle-même, sans aucun « تم »", () => {
    const hier = commande(10, "2026-11-23", "10:00", { ...FRAISE, qty: 4 });
    const aujourdhui = commande(11, "2026-11-24", "10:00", VANILLE);
    expect(tableauDe([hier, aujourdhui]).lines).toEqual([
      { key: "p5", label: "Fraise", kg: 4 },
      { key: "p7", label: "Vanille", kg: 0.5 },
    ]);
    // La n°10 est marquée livrée dans l'administration : elle sort de la liste.
    expect(tableauDe([aujourdhui]).lines).toEqual([{ key: "p7", label: "Vanille", kg: 0.5 }]);
  });
});

describe("markKitchenSection — « تم » vaut pour un jour entier", () => {
  const orders = [
    commande(10, "2026-11-23", "10:00", FRAISE),
    commande(11, "2026-11-24", "09:00", VANILLE),
    commande(12, "2026-11-24", "16:00", FRAISE),
  ];

  it("les commandes du jour sortent du tableau, les autres restent", () => {
    const t = tableauDe(orders);
    const { done, ok } = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-24", t.sections[0]!.stamp);
    expect(ok).toBe(true);
    expect(done).toEqual({ done: [11, 12], last: [11, 12] });
    const apres = tableauDe(orders, done);
    expect(apres.sections.map((s) => s.day)).toEqual(["2026-11-23"]);
    expect(apres.canUndo).toBe(true);
  });

  it("« avant » sort tout ce qui est plus ancien d'un seul geste", () => {
    const tous = [commande(7, "2026-11-18", "10:00"), commande(8, "2026-11-20", "10:00"), ...orders];
    const t = tableauDe(tous);
    const avant = t.sections.find((s) => s.kind === "before")!;
    const { done, ok } = markKitchenSection(EMPTY_DONE, t, "before", avant.day, avant.stamp);
    expect(ok).toBe(true);
    expect(done.done).toEqual([7, 8]);
    expect(tableauDe(tous, done).sections.map((s) => s.kind)).toEqual(["day", "day"]);
  });

  // LA SEULE FAUTE INTERDITE : avaler une commande que personne n'a vue.
  it("une commande confirmée APRÈS l'affichage : l'appui ne marque rien, il faut revoir le tableau", () => {
    const affiche = tableauDe(orders);
    const boutonDuJour = affiche.sections[0]!.stamp;
    // Entre l'affichage et l'appui, la n°13 est confirmée.
    const maintenant = tableauDe([...orders, commande(13, "2026-11-24", "16:05", FRAISE)]);
    const { done, ok } = markKitchenSection(EMPTY_DONE, maintenant, "day", "2026-11-24", boutonDuJour);
    expect(ok).toBe(false);
    expect(done).toEqual(EMPTY_DONE);
  });

  it("un bouton pour un jour qui n'est plus au tableau ne marque rien", () => {
    const t = tableauDe(orders);
    expect(markKitchenSection(EMPTY_DONE, t, "day", "2026-11-01", "00000000").ok).toBe(false);
  });

  it("un deuxième « تم » s'ajoute au premier au lieu de l'écraser", () => {
    let t = tableauDe(orders);
    let etat = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-24", t.sections[0]!.stamp).done;
    t = tableauDe(orders, etat);
    etat = markKitchenSection(etat, t, "day", "2026-11-23", t.sections[0]!.stamp).done;
    expect(etat.done.sort()).toEqual([10, 11, 12]);
    expect(etat.last).toEqual([10]);
    expect(tableauDe(orders, etat).sections).toEqual([]);
  });
});

describe("undoKitchen — le bouton appuyé par erreur", () => {
  const orders = [commande(10, "2026-11-23", "10:00"), commande(11, "2026-11-24", "10:00")];

  it("défait le dernier « تم », et seulement lui", () => {
    let t = tableauDe(orders);
    let etat = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-23", t.sections[1]!.stamp).done;
    t = tableauDe(orders, etat);
    etat = markKitchenSection(etat, t, "day", "2026-11-24", t.sections[0]!.stamp).done;
    const retour = undoKitchen(etat);
    expect(retour).toEqual({ done: [10], last: [] });
    expect(tableauDe(orders, retour).sections.map((s) => s.day)).toEqual(["2026-11-24"]);
  });

  it("appuyer deux fois ne creuse pas plus loin", () => {
    const t = tableauDe(orders);
    const etat = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-24", t.sections[0]!.stamp).done;
    const une = undoKitchen(etat);
    expect(undoKitchen(une)).toEqual(une);
  });

  it("« رجوع » disparaît quand il n'y a plus rien à faire revenir", () => {
    const t = tableauDe(orders);
    const etat = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-24", t.sections[0]!.stamp).done;
    expect(tableauDe(orders, etat).canUndo).toBe(true);
    // La n°11 a été livrée depuis : la défaire ne ferait rien revenir.
    expect(tableauDe([orders[0]!], etat).canUndo).toBe(false);
  });
});

describe("pruneKitchenDone", () => {
  it("oublie les commandes qui ne sont plus en préparation", () => {
    expect(pruneKitchenDone({ done: [1, 2, 3], last: [2, 3] }, [2, 9])).toEqual({ done: [2], last: [2] });
  });

  it("une commande annulée puis reconfirmée réapparaît entière", () => {
    const o = commande(10, "2026-11-24", "10:00");
    const t = tableauDe([o]);
    const etat = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-24", t.sections[0]!.stamp).done;
    // Annulée : elle n'est plus active, le registre l'oublie…
    const apresAnnulation = pruneKitchenDone(etat, []);
    // …et reconfirmée, elle revient au tableau.
    expect(tableauDe([o], apresAnnulation).sections).toHaveLength(1);
  });
});

describe("parseKitchenDone", () => {
  it("lit un registre bien formé", () => {
    expect(parseKitchenDone('{"done":[4,5],"last":[5]}')).toEqual({ done: [4, 5], last: [5] });
  });

  it("vide, absent ou abîmé : rien de marqué — réafficher du travail fait se voit, en cacher non", () => {
    for (const brut of [null, undefined, "", "pas du json", "[]", "42", "null", '{"done":"x"}']) {
      expect(parseKitchenDone(brut), String(brut)).toEqual({ done: [], last: [] });
    }
  });

  it("écarte ce qui n'est pas un numéro de commande", () => {
    expect(parseKitchenDone('{"done":[4,"5",-1,2.5,null,7],"last":[7,"x"]}')).toEqual({ done: [4, 7], last: [7] });
  });

  // L'ancien registre (`kitchen_ack`) avait une autre forme. S'il était relu
  // par erreur, il ne doit rien marquer.
  it("l'ancien format (un cumul de kilos) ne marque aucune commande", () => {
    expect(parseKitchenDone('{"kg":{"p5":120},"prev":{},"last":"p5"}')).toEqual({ done: [], last: [] });
  });
});

describe("formatKitchenDayAr", () => {
  it("écrit le jour de la semaine et la date : jamais « aujourd'hui », qui serait faux demain", () => {
    expect(formatKitchenDayAr("2026-11-24")).toBe("الثلاثاء 24/11");
    expect(formatKitchenDayAr("2026-11-22")).toBe("الأحد 22/11");
    expect(formatKitchenDayAr("2026-01-05")).toBe("الإثنين 5/1");
  });
});

describe("formatKitchenBoard", () => {
  const orders = [
    commande(469, "2026-11-18", "10:00", { productId: 2, name: "Jwayed", weightKg: 1.5, qty: 1 }),
    commande(480, "2026-11-23", "11:00", VANILLE),
    commande(481, "2026-11-23", "17:00", VANILLE),
    commande(482, "2026-11-24", "09:00", FRAISE),
    commande(483, "2026-11-24", "10:00", FRAISE),
    commande(484, "2026-11-24", "12:00", FRAISE, VANILLE),
  ];

  it("un bloc par jour, daté, avec le nombre de commandes — et pas de total général", () => {
    const texte = formatKitchenBoard(tableauDe(orders));
    expect(texte).toBe(
      [
        "🍳 <b>المطبخ — المطلوب توّا</b>",
        "",
        "📅 <b>الثلاثاء 24/11</b> · 3 طلبيات",
        "🔸 Fraise — <b>3 كغ</b>",
        "🔸 Vanille — <b>500 غ</b>",
        "",
        "📅 <b>الإثنين 23/11</b> · طلبيتين",
        "🔸 Vanille — <b>1 كغ</b>",
        "",
        "⏳ <b>قبل الإثنين 23/11</b> · طلبية واحدة (#469)",
        "🔸 Jwayed — <b>1,5 كغ</b>",
        "مازالت «En préparation» في الإدارة: كان خرجت، حطّوها «Terminée».",
      ].join("\n"),
    );
  });

  // CE QUE LE GROUPE VERRA LE JOUR DE LA MISE EN LIGNE : une seule commande
  // restée « en préparation » depuis six jours. Elle est seule, donc elle a
  // sa propre section datée — mais elle est vieille, et le tableau le dit.
  it("une commande restée seule depuis des jours est signalée, numéro compris", () => {
    const texte = formatKitchenBoard(tableauDe([orders[0]!]));
    expect(texte).toBe(
      [
        "🍳 <b>المطبخ — المطلوب توّا</b>",
        "",
        "⏳ <b>الأربعاء 18/11</b> · طلبية واحدة (#469)",
        "🔸 Jwayed — <b>1,5 كغ</b>",
        "مازالت «En préparation» في الإدارة: كان خرجت، حطّوها «Terminée».",
      ].join("\n"),
    );
  });

  it("aujourd'hui et hier ne sont jamais signalés : une commande d'hier part aujourd'hui, c'est le rythme", () => {
    const t = tableauDe(orders.slice(1));
    expect(t.sections.map((s) => [s.day, s.stale])).toEqual([
      ["2026-11-24", false],
      ["2026-11-23", false],
    ]);
    expect(formatKitchenBoard(t)).not.toContain("⏳");
  });

  it("le même tableau relu deux jours plus tard signale ce qui a vieilli entre-temps", () => {
    const plusTard = new Date("2026-11-26T08:00:00+01:00");
    const t = buildKitchenBoard(orders.slice(1), EMPTY_DONE, {}, plusTard);
    expect(t.sections.map((s) => [s.day, s.stale])).toEqual([
      ["2026-11-24", true],
      ["2026-11-23", true],
    ]);
  });

  it("une longue liste de numéros est coupée : le début suffit à les retrouver", () => {
    const vieilles = Array.from({ length: 15 }, (_, i) => commande(300 + i, "2026-11-10", "10:00"));
    const texte = formatKitchenBoard(tableauDe(vieilles));
    expect(texte).toContain("#300 #301");
    expect(texte).toContain("#311 …)");
    expect(texte).not.toContain("#312");
  });

  it("au-delà de dix commandes, l'arabe compte au singulier", () => {
    const beaucoup = Array.from({ length: 12 }, (_, i) => commande(500 + i, "2026-11-24", "10:00"));
    expect(formatKitchenBoard(tableauDe(beaucoup))).toContain("· 12 طلبية");
  });

  it("dit clairement quand il n'y a plus rien à préparer", () => {
    expect(formatKitchenBoard(tableauDe([]))).toContain("ما فماش شي يستنى");
  });

  it("échappe ce que Telegram interpréterait comme du HTML", () => {
    const o = commande(1, "2026-11-24", "10:00", { name: "A & <B>", weightKg: 1, qty: 1 });
    expect(formatKitchenBoard(tableauDe([o]))).toContain("A &amp; &lt;B&gt;");
  });

  it("ne porte aucune donnée client : la fonction ne reçoit que des poids, des types et des numéros", () => {
    const texte = formatKitchenBoard(tableauDe(orders));
    expect(texte).not.toMatch(/\d{8}/);
  });
});

describe("kitchenKeyboard", () => {
  const orders = [
    commande(7, "2026-11-18", "10:00"),
    commande(10, "2026-11-23", "10:00"),
    commande(11, "2026-11-24", "10:00"),
  ];

  it("un bouton par section, un par ligne — vingt boutons par parfum, c'était trop", () => {
    const t = tableauDe(orders);
    const k = kitchenKeyboard(t);
    expect(k.inline_keyboard.map((r) => r.length)).toEqual([1, 1, 1]);
    expect(k.inline_keyboard.map((r) => r[0]!.text)).toEqual([
      "✅ تمّ: الثلاثاء 24/11",
      "✅ تمّ: الإثنين 23/11",
      "✅ تمّ: قبل الإثنين 23/11",
    ]);
    expect(k.inline_keyboard.map((r) => r[0]!.callback_data)).toEqual([
      `k:d:2026-11-24:${t.sections[0]!.stamp}`,
      `k:d:2026-11-23:${t.sections[1]!.stamp}`,
      `k:b:2026-11-23:${t.sections[2]!.stamp}`,
    ]);
  });

  it("« رجوع » n'apparaît que s'il y a quelque chose à défaire", () => {
    const t = tableauDe(orders);
    expect(kitchenKeyboard(t).inline_keyboard.flat().some((b) => b.callback_data === "k:undo")).toBe(false);
    const etat = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-24", t.sections[0]!.stamp).done;
    const apres = kitchenKeyboard(tableauDe(orders, etat));
    expect(apres.inline_keyboard.at(-1)).toEqual([{ text: "↩️ رجوع (غلطت)", callback_data: "k:undo" }]);
  });

  it("chaque callback_data reste sous les 64 octets de Telegram", () => {
    for (const row of kitchenKeyboard(tableauDe(orders)).inline_keyboard) {
      expect(Buffer.byteLength(row[0]!.callback_data)).toBeLessThanOrEqual(64);
    }
  });

  it("un tableau vide n'a aucun bouton", () => {
    expect(kitchenKeyboard(tableauDe([])).inline_keyboard).toEqual([]);
  });
});

describe("parseKitchenCallback", () => {
  it("relit ce que kitchenKeyboard a écrit", () => {
    const t = tableauDe([commande(7, "2026-11-18", "10:00"), commande(10, "2026-11-23", "10:00"), commande(11, "2026-11-24", "10:00")]);
    for (const [i, row] of kitchenKeyboard(t).inline_keyboard.entries()) {
      const s = t.sections[i]!;
      expect(parseKitchenCallback(row[0]!.callback_data)).toEqual({ kind: s.kind, day: s.day, stamp: s.stamp });
    }
  });

  // Les tableaux d'avant ce changement portaient un bouton par parfum.
  it("un bouton d'un ancien tableau (« k:p12 ») n'est pas deviné", () => {
    for (const vieux of ["k:p12", "k:n0a1b2c3d", "k:", "k:d:2026-11-24", "k:d:hier:abcdef12", "k:x:2026-11-24:abcdef12", "o:ok:5"]) {
      expect(parseKitchenCallback(vieux), vieux).toBeNull();
    }
  });
});
