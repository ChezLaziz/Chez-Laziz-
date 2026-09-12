import { describe, expect, it } from "vitest";
import {
  EMPTY_ACK,
  accumulateKitchen,
  ackKitchen,
  baselineFromConfirmed,
  formatKgAr,
  formatKitchenBoard,
  kitchenKey,
  kitchenKeyboard,
  kitchenPending,
  undoKitchen,
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

describe("kitchenPending", () => {
  const confirmed = accumulateKitchen([
    cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 3 }),
    cmd({ productId: 7, name: "Vanille", weightKg: 0.5, qty: 1 }),
  ]);

  it("affiche le plus lourd d'abord — la grosse fournée se fait en premier", () => {
    expect(kitchenPending(confirmed, EMPTY_ACK).map((l) => l.key)).toEqual(["p5", "p7"]);
  });

  it("cache un type entièrement cuit", () => {
    const apres = ackKitchen(EMPTY_ACK, confirmed, "p5");
    expect(kitchenPending(confirmed, apres).map((l) => l.key)).toEqual(["p7"]);
  });

  it("« تم » n'efface PAS une commande arrivée pendant la fournée", () => {
    const apres = ackKitchen(EMPTY_ACK, confirmed, "p5");
    const plusTard = accumulateKitchen([
      cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 3 }),
      cmd({ productId: 7, name: "Vanille", weightKg: 0.5, qty: 1 }),
      cmd({ productId: 5, name: "Fraise", weightKg: 0.5, qty: 1 }),
    ]);
    expect(kitchenPending(plusTard, apres).find((l) => l.key === "p5")?.kg).toBe(0.5);
  });

  it("une annulation après « تم » ramène à zéro, jamais à un poids négatif", () => {
    const apres = ackKitchen(EMPTY_ACK, confirmed, "p5");
    const annulee = accumulateKitchen([cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 1 })]);
    expect(kitchenPending(annulee, apres)).toEqual([]);
  });

  it("préfère le nom actuel du catalogue au nom enregistré à la commande", () => {
    const lignes = kitchenPending(confirmed, EMPTY_ACK, { p5: "لعزيز بالفرولة" });
    expect(lignes[0].label).toBe("لعزيز بالفرولة");
    expect(lignes[1].label).toBe("Vanille");
  });
});

describe("undoKitchen", () => {
  const confirmed = accumulateKitchen([cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 3 })]);

  it("rend le poids quand le cuisinier s'est trompé de bouton", () => {
    const apres = ackKitchen(EMPTY_ACK, confirmed, "p5");
    expect(kitchenPending(confirmed, apres)).toEqual([]);
    expect(kitchenPending(confirmed, undoKitchen(apres))[0].kg).toBe(3);
  });

  it("ne recule que d'un pas, même si on appuie deux fois", () => {
    const un = ackKitchen(EMPTY_ACK, confirmed, "p5");
    const deux = ackKitchen(un, accumulateKitchen([cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 5 })]), "p5");
    const defait = undoKitchen(undoKitchen(deux));
    expect(defait.kg.p5).toBe(3);
  });

  it("ne fait rien quand il n'y a rien à défaire", () => {
    expect(undoKitchen(EMPTY_ACK)).toEqual(EMPTY_ACK);
  });
});

describe("formatKgAr", () => {
  it("écrit des poids qu'un cuisinier lit d'un coup d'œil", () => {
    expect(formatKgAr(3)).toBe("3 كغ");
    expect(formatKgAr(5.5)).toBe("5,5 كغ");
    expect(formatKgAr(0.25)).toBe("250 غ");
  });
});

describe("formatKitchenBoard", () => {
  const lignes = [
    { key: "p5", label: "لعزيز بالفرولة", kg: 3 },
    { key: "p7", label: "لعزيز بالفانيلا", kg: 1.5 },
  ];

  it("porte le poids de CHAQUE type, et rien d'un client", () => {
    const texte = formatKitchenBoard(lignes);
    expect(texte).toContain("لعزيز بالفرولة — <b>3 كغ</b>");
    expect(texte).toContain("لعزيز بالفانيلا — <b>1,5 كغ</b>");
  });

  it("n'additionne JAMAIS des recettes différentes en un total général", () => {
    const texte = formatKitchenBoard(lignes);
    expect(texte).not.toContain("المجموع");
    expect(texte).not.toContain("4,5");
  });

  it("le dit clairement quand il n'y a rien à préparer", () => {
    expect(formatKitchenBoard([])).toContain("ما فماش شي يستنى");
  });

  it("échappe le HTML d'un nom de produit", () => {
    expect(formatKitchenBoard([{ key: "p1", label: "A <b>", kg: 1 }])).toContain("A &lt;b&gt;");
  });
});

describe("kitchenKeyboard", () => {
  it("un bouton par ligne, et la clé courte tient dans les 64 octets de Telegram", () => {
    const clavier = kitchenKeyboard([{ key: "p5", label: "لعزيز بالفرولة", kg: 3 }], false);
    expect(clavier.inline_keyboard).toHaveLength(1);
    expect(clavier.inline_keyboard[0]).toHaveLength(1);
    expect(clavier.inline_keyboard[0][0].callback_data).toBe("k:p5");
    for (const row of clavier.inline_keyboard)
      for (const b of row)
        expect(new TextEncoder().encode(b.callback_data).length).toBeLessThanOrEqual(64);
  });

  it("n'offre « رجوع » que quand il y a une erreur à défaire", () => {
    expect(kitchenKeyboard([], false).inline_keyboard).toHaveLength(0);
    expect(kitchenKeyboard([], true).inline_keyboard[0][0].callback_data).toBe("k:undo");
  });
});

describe("baselineFromConfirmed", () => {
  const confirmed = accumulateKitchen([
    cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 3 }),
    cmd({ productId: 7, name: "Vanille", weightKg: 0.5, qty: 1 }),
  ]);

  it("fait disparaître tout l'historique du tableau — sinon il serait inutilisable au premier affichage", () => {
    expect(kitchenPending(confirmed, baselineFromConfirmed(confirmed))).toEqual([]);
  });

  it("ne fige pas l'avenir : ce qui arrive APRÈS reste à préparer", () => {
    const depart = baselineFromConfirmed(confirmed);
    const plusTard = accumulateKitchen([
      cmd({ productId: 5, name: "Fraise", weightKg: 1, qty: 3 }),
      cmd({ productId: 7, name: "Vanille", weightKg: 0.5, qty: 1 }),
      cmd({ productId: 5, name: "Fraise", weightKg: 2, qty: 1 }),
    ]);
    expect(kitchenPending(plusTard, depart)).toEqual([{ key: "p5", label: "Fraise", kg: 2 }]);
  });

  it("ne laisse rien à défaire au départ", () => {
    expect(baselineFromConfirmed(confirmed).last).toBeUndefined();
    expect(undoKitchen(baselineFromConfirmed(confirmed))).toEqual(baselineFromConfirmed(confirmed));
  });
});
