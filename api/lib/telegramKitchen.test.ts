import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_DONE,
  buildKitchenBoard,
  markKitchenSection,
  type KitchenBoard,
  type KitchenDone,
  type KitchenOrder,
} from "@contracts/kitchenBoard";

const currentKitchenBoard = vi.fn<() => Promise<KitchenBoard>>();
const markKitchenDone = vi.fn<(kind: string, day: string, stamp: string) => Promise<"ok" | "perime">>();
const undoKitchenDone = vi.fn<() => Promise<boolean>>();
const readKitchenBoardMessageId = vi.fn<() => Promise<number | null>>();
const writeKitchenBoardMessageId = vi.fn(async () => undefined);

const sendMessage = vi.fn();
const editMessage = vi.fn();
const deleteMessage = vi.fn(async () => true);
const pinMessage = vi.fn(async () => undefined);
const unpinMessage = vi.fn(async () => undefined);

vi.mock("../queries/kitchen", () => ({
  currentKitchenBoard,
  markKitchenDone,
  undoKitchenDone,
  readKitchenBoardMessageId,
  writeKitchenBoardMessageId,
}));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, sendMessage, editMessage, deleteMessage, pinMessage, unpinMessage };
});

const { DELAI_LOT_MS, VIEUX_TABLEAU, applyKitchenDone, applyKitchenUndo, refreshKitchenBoard, refreshKitchenBoardSoon } =
  await import("./telegramKitchen");

/** Trois commandes en préparation : deux confirmées le 24, une le 23. */
const COMMANDES: KitchenOrder[] = [
  { id: 480, items: [{ productId: 7, name: "Vanille", weightKg: 1.5, qty: 1 }], confirmedAt: new Date("2026-11-23T10:00:00+01:00") },
  { id: 482, items: [{ productId: 5, name: "Fraise", weightKg: 1, qty: 2 }], confirmedAt: new Date("2026-11-24T09:00:00+01:00") },
  { id: 483, items: [{ productId: 5, name: "Fraise", weightKg: 1, qty: 1 }], confirmedAt: new Date("2026-11-24T11:00:00+01:00") },
];
/** Mardi 24 novembre, midi à Tunis : le 24 est « aujourd'hui », le 23 « hier ». */
const NOW = new Date("2026-11-24T12:00:00+01:00");
const tableau = (done: KitchenDone = EMPTY_DONE, commandes = COMMANDES) =>
  buildKitchenBoard(commandes, done, { p5: "لعزيز بالفرولة" }, NOW);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-100123";
  currentKitchenBoard.mockImplementation(async () => tableau());
  markKitchenDone.mockResolvedValue("ok");
  undoKitchenDone.mockResolvedValue(true);
  readKitchenBoardMessageId.mockResolvedValue(null);
  sendMessage.mockResolvedValue({ message_id: 99 });
  editMessage.mockResolvedValue(true);
  deleteMessage.mockResolvedValue(true);
});

describe("refreshKitchenBoard", () => {
  it("ne touche à rien tant que Telegram n'est pas configuré", async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    await refreshKitchenBoard(true);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("du poids en plus : le tableau redescend en bas et SONNE", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await refreshKitchenBoard(true);
    expect(deleteMessage).toHaveBeenCalledWith(55);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(editMessage).not.toHaveBeenCalled();
    expect(writeKitchenBoardMessageId).toHaveBeenCalledWith(99);
    expect(pinMessage).toHaveBeenCalledWith(99);
  });

  // Telegram ne laisse pas supprimer un message de plus de 48 heures. Après
  // deux jours sans commande confirmée, l'ancien tableau restait donc en haut
  // du groupe, épinglé, avec ses vieux chiffres — à côté du nouveau.
  it("l'ancien tableau est trop vieux pour être supprimé : il perd ses chiffres, ses boutons et son épingle", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    deleteMessage.mockResolvedValue(false);
    await refreshKitchenBoard(true);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(editMessage.mock.calls[0]).toEqual([55, VIEUX_TABLEAU]);
    expect(unpinMessage).toHaveBeenCalledWith(55);
    // Et le nouveau tableau part quand même, épinglé à sa place.
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(pinMessage).toHaveBeenCalledWith(99);
  });

  it("l'envoi échoue après une suppression réussie : il n'y a plus de tableau, et on le sait", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    sendMessage.mockResolvedValue(null);
    await refreshKitchenBoard(true);
    expect(writeKitchenBoardMessageId).toHaveBeenCalledWith(null);
    expect(pinMessage).not.toHaveBeenCalled();
  });

  // Telegram saturé : ni la suppression ni l'envoi ne passent. L'ancien
  // message est toujours là — oublier son identifiant le laisserait orphelin
  // dans le groupe, avec des boutons qui marchent encore.
  it("ni suppression ni envoi : l'identifiant de l'ancien tableau est GARDÉ, le prochain passage le réécrira", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    deleteMessage.mockResolvedValue(false);
    sendMessage.mockResolvedValue(null);
    await refreshKitchenBoard(true);
    expect(writeKitchenBoardMessageId).not.toHaveBeenCalled();
  });

  it("un ancien tableau supprimé normalement n'est ni réécrit ni désépinglé", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await refreshKitchenBoard(true);
    expect(editMessage).not.toHaveBeenCalled();
    expect(unpinMessage).not.toHaveBeenCalled();
  });

  it("du poids en moins ou un appui : modifié sur place, sans bruit", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await refreshKitchenBoard(false);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(editMessage.mock.calls[0]![0]).toBe(55);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it("refait un tableau si l'ancien a été supprimé à la main", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    editMessage.mockResolvedValue(false);
    await refreshKitchenBoard(false);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("ne sonne pas pour annoncer qu'il n'y a rien à faire", async () => {
    currentKitchenBoard.mockResolvedValue(tableau(EMPTY_DONE, []));
    await refreshKitchenBoard(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(editMessage).not.toHaveBeenCalled();
  });

  it("porte les poids par type, rangés par jour, avec le nom arabe du catalogue — jamais un client", async () => {
    await refreshKitchenBoard(true);
    const texte = sendMessage.mock.calls[0]![0] as string;
    expect(texte).toContain("📅 <b>الثلاثاء 24/11</b> · طلبيتين");
    expect(texte).toContain("لعزيز بالفرولة — <b>3 كغ</b>");
    expect(texte).toContain("📅 <b>الإثنين 23/11</b> · طلبية واحدة");
    expect(texte).toContain("Vanille — <b>1,5 كغ</b>");
    // Pas de total général : 4,5 kg ne se cuit pas.
    expect(texte).not.toContain("4,5");
  });

  it("un bouton « تم » par jour, et « رجوع » seulement s'il y a une erreur à défaire", async () => {
    await refreshKitchenBoard(true);
    const sans = JSON.stringify(sendMessage.mock.calls[0]![1]);
    expect(sans).toContain("k:d:2026-11-24:");
    expect(sans).toContain("k:d:2026-11-23:");
    expect(sans).not.toContain("k:undo");

    sendMessage.mockClear();
    const t = tableau();
    const marque = markKitchenSection(EMPTY_DONE, t, "day", "2026-11-23", t.sections[1]!.stamp).done;
    currentKitchenBoard.mockResolvedValue(tableau(marque));
    await refreshKitchenBoard(true);
    const avec = JSON.stringify(sendMessage.mock.calls[0]![1]);
    expect(avec).toContain("k:undo");
    expect(avec).not.toContain("k:d:2026-11-23:");
  });

  it("une panne de base ne remonte jamais — la commande ne doit pas échouer pour un tableau", async () => {
    currentKitchenBoard.mockRejectedValue(new Error("base injoignable"));
    await expect(refreshKitchenBoard(true)).resolves.toBeUndefined();
  });

  // La boutique marque ses livraisons par lots : vingt commandes passées à
  // « terminée » en une minute, et chacune fait bouger le tableau.
  it("vingt changements en rafale ne font pas vingt écritures dans Telegram", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await Promise.all(Array.from({ length: 20 }, () => refreshKitchenBoard(false)));
    expect(editMessage.mock.calls.length).toBeLessThanOrEqual(2);
    expect(editMessage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("le DERNIER état est toujours écrit : une demande arrivée pendant une écriture en relance une", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    let etat = tableau();
    currentKitchenBoard.mockImplementation(async () => etat);
    const premier = refreshKitchenBoard(false);
    // Pendant que le premier lit, la n°480 est marquée livrée…
    await Promise.resolve();
    etat = tableau(EMPTY_DONE, COMMANDES.slice(1));
    const second = refreshKitchenBoard(false);
    await Promise.all([premier, second]);
    const dernierTexte = editMessage.mock.calls.at(-1)![1] as string;
    expect(dernierTexte).not.toContain("الإثنين 23/11");
  });

  it("dans une rafale, une seule demande avec du poids en plus suffit à faire sonner", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    // Le premier part tout de suite ; les suivants se regroupent derrière lui.
    const lot = [refreshKitchenBoard(false), refreshKitchenBoard(false), refreshKitchenBoard(true), refreshKitchenBoard(false)];
    await Promise.all(lot);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

// La boutique ferme ses commandes par lots : une vingtaine de « Terminée »
// cliquées à la suite. Corriger le message à chaque clic, c'était vingt
// modifications du même message en une minute.
describe("refreshKitchenBoardSoon — du poids en moins, rien ne presse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    readKitchenBoardMessageId.mockResolvedValue(55);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rien n'est écrit tout de suite", async () => {
    refreshKitchenBoardSoon();
    await vi.advanceTimersByTimeAsync(DELAI_LOT_MS - 1);
    expect(editMessage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(editMessage).toHaveBeenCalledTimes(1);
  });

  it("vingt commandes fermées en quelques secondes : UNE seule correction, sans bruit", async () => {
    for (let i = 0; i < 20; i++) {
      refreshKitchenBoardSoon();
      await vi.advanceTimersByTimeAsync(150);
    }
    await vi.advanceTimersByTimeAsync(DELAI_LOT_MS);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it("un lot qui dure reste corrigé au fil de l'eau, jamais plus d'une fois par délai", async () => {
    // Un clic toutes les trois secondes pendant une minute.
    for (let i = 0; i < 20; i++) {
      refreshKitchenBoardSoon();
      await vi.advanceTimersByTimeAsync(3000);
    }
    await vi.advanceTimersByTimeAsync(DELAI_LOT_MS);
    expect(editMessage.mock.calls.length).toBeLessThanOrEqual(Math.ceil(60_000 / DELAI_LOT_MS) + 1);
    expect(editMessage.mock.calls.length).toBeGreaterThan(1);
  });

  it("une commande confirmée entre-temps sonne tout de suite, et la correction en attente n'a plus lieu d'être", async () => {
    refreshKitchenBoardSoon();
    await refreshKitchenBoard(true);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DELAI_LOT_MS * 2);
    expect(editMessage).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("le dernier état est celui qui est écrit, pas celui du premier clic", async () => {
    let etat = tableau();
    currentKitchenBoard.mockImplementation(async () => etat);
    refreshKitchenBoardSoon();
    // Pendant le délai, la n°480 (du 23) est fermée à son tour.
    etat = tableau(EMPTY_DONE, COMMANDES.slice(1));
    refreshKitchenBoardSoon();
    await vi.advanceTimersByTimeAsync(DELAI_LOT_MS);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(String(editMessage.mock.calls[0]![1])).not.toContain("الإثنين 23/11");
  });
});

// Au démarrage du serveur (voir api/boot.ts) : refreshKitchenBoard(false).
describe("au démarrage — le tableau épinglé est remis d'accord avec les commandes", () => {
  it("corrigé sur place, sans sonner", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await refreshKitchenBoard(false);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("rien n'est envoyé quand il n'y a ni tableau ni travail", async () => {
    currentKitchenBoard.mockResolvedValue(tableau(EMPTY_DONE, []));
    await refreshKitchenBoard(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(editMessage).not.toHaveBeenCalled();
  });

  it("une panne de base ne fait pas tomber le démarrage du serveur", async () => {
    currentKitchenBoard.mockRejectedValue(new Error("base injoignable"));
    await expect(refreshKitchenBoard(false)).resolves.toBeUndefined();
  });
});

describe("applyKitchenDone", () => {
  it("marque le jour demandé, avec l'empreinte que portait le bouton, puis corrige le tableau sans bruit", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    const reponse = await applyKitchenDone("k:d:2026-11-24:0a1b2c3d", 55);
    expect(markKitchenDone).toHaveBeenCalledWith("day", "2026-11-24", "0a1b2c3d");
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(reponse).toBe("✅ تسجّل");
  });

  it("« قبل … » marque tout ce qui est plus ancien", async () => {
    await applyKitchenDone("k:b:2026-11-23:0a1b2c3d", 55);
    expect(markKitchenDone).toHaveBeenCalledWith("before", "2026-11-23", "0a1b2c3d");
  });

  // Une commande confirmée entre l'affichage et l'appui : rien n'est marqué,
  // le tableau est réaffiché, et on le dit à celle qui a appuyé.
  it("le tableau a changé depuis l'affichage : rien n'est marqué, et on demande de revoir", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    markKitchenDone.mockResolvedValue("perime");
    const reponse = await applyKitchenDone("k:d:2026-11-24:0a1b2c3d", 55);
    expect(reponse).toBe("الجدول تبدّل، عاود شوف واضغط");
    expect(editMessage).toHaveBeenCalledTimes(1);
  });

  // Les tableaux d'avant ce changement : un bouton par parfum (« k:p5 »).
  it("un bouton d'un vieux tableau ne marque rien, et le vieux tableau perd ses boutons", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    const reponse = await applyKitchenDone("k:p5", 31);
    expect(markKitchenDone).not.toHaveBeenCalled();
    expect(reponse).toBe("الجدول تبدّل، شوف الجديد");
    // Le vieux message (31) est réécrit sans clavier ; le tableau en cours (55) est remis à jour.
    const reecrits = editMessage.mock.calls.map((c) => c[0]);
    expect(reecrits).toContain(31);
    expect(reecrits).toContain(55);
    expect(editMessage.mock.calls.find((c) => c[0] === 31)).toEqual([31, VIEUX_TABLEAU]);
    expect(unpinMessage).toHaveBeenCalledWith(31);
  });

  it("un vieux bouton sur le tableau EN COURS : on le réaffiche, on ne l'efface pas", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await applyKitchenDone("k:p5", 55);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(editMessage.mock.calls[0]![0]).toBe(55);
    expect(String(editMessage.mock.calls[0]![1])).toContain("المطبخ");
  });
});

describe("applyKitchenUndo", () => {
  it("défait le dernier « تم » et corrige le tableau", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    expect(await applyKitchenUndo()).toBe("↩️ رجّعناه");
    expect(undoKitchenDone).toHaveBeenCalledTimes(1);
    expect(editMessage).toHaveBeenCalledTimes(1);
  });

  it("ne touche à rien quand il n'y a rien à défaire", async () => {
    undoKitchenDone.mockResolvedValue(false);
    expect(await applyKitchenUndo()).toBe("ما فماش شي نرجّعوه");
    expect(editMessage).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
