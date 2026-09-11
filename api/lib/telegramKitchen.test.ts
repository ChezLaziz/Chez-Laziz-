import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ACK } from "@contracts/kitchenBoard";

const getConfirmedKitchenTotals = vi.fn();
const getKitchenLabels = vi.fn(async () => ({}) as Record<string, string>);
const readKitchenAck = vi.fn();
const writeKitchenAck = vi.fn(async () => undefined);
const readKitchenBoardMessageId = vi.fn();
const writeKitchenBoardMessageId = vi.fn(async () => undefined);

const sendMessage = vi.fn();
const editMessage = vi.fn();
const deleteMessage = vi.fn(async () => undefined);

vi.mock("../queries/kitchen", () => ({
  getConfirmedKitchenTotals,
  getKitchenLabels,
  readKitchenAck,
  writeKitchenAck,
  readKitchenBoardMessageId,
  writeKitchenBoardMessageId,
}));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, sendMessage, editMessage, deleteMessage };
});

const { applyKitchenAck, applyKitchenUndo, ensureKitchenBaseline, refreshKitchenBoard } =
  await import("./telegramKitchen");

const CONFIRME = { p5: { kg: 3, name: "Fraise" }, p7: { kg: 1.5, name: "Vanille" } };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-100123";
  getConfirmedKitchenTotals.mockResolvedValue(CONFIRME);
  getKitchenLabels.mockResolvedValue({ p5: "لعزيز بالفرولة" });
  readKitchenAck.mockResolvedValue(EMPTY_ACK);
  readKitchenBoardMessageId.mockResolvedValue(null);
  sendMessage.mockResolvedValue({ message_id: 99 });
  editMessage.mockResolvedValue(true);
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
  });

  it("un appui sur un bouton : modifié sur place, sans bruit", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await refreshKitchenBoard(false);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(editMessage.mock.calls[0][0]).toBe(55);
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
    getConfirmedKitchenTotals.mockResolvedValue({});
    await refreshKitchenBoard(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(editMessage).not.toHaveBeenCalled();
  });

  it("porte les poids et le nom arabe du catalogue, jamais un client", async () => {
    await refreshKitchenBoard(true);
    const texte = sendMessage.mock.calls[0][0] as string;
    expect(texte).toContain("لعزيز بالفرولة");
    expect(texte).toContain("3 كغ");
    expect(texte).toContain("4,5 كغ");
  });

  it("n'offre « رجوع » que lorsqu'il y a une erreur à défaire", async () => {
    await refreshKitchenBoard(true);
    const sans = JSON.stringify(sendMessage.mock.calls[0][1]);
    expect(sans).not.toContain("k:undo");

    vi.clearAllMocks();
    sendMessage.mockResolvedValue({ message_id: 99 });
    readKitchenAck.mockResolvedValue({ kg: {}, prev: {}, last: "p5" });
    await refreshKitchenBoard(true);
    expect(JSON.stringify(sendMessage.mock.calls[0][1])).toContain("k:undo");
  });

  it("PREMIER tableau : l'historique déjà livré ne réapparaît pas comme à cuire", async () => {
    readKitchenAck.mockResolvedValue(null);
    await refreshKitchenBoard(true);
    expect(writeKitchenAck).toHaveBeenCalledWith({ kg: { p5: 3, p7: 1.5 }, prev: {} });
    expect(sendMessage.mock.calls[0][0]).toContain("ما فماش شي يستنى");
  });

  it("une panne de base ne remonte jamais — la commande ne doit pas échouer pour un tableau", async () => {
    getConfirmedKitchenTotals.mockRejectedValue(new Error("base injoignable"));
    await expect(refreshKitchenBoard(true)).resolves.toBeUndefined();
  });
});

describe("ensureKitchenBaseline", () => {
  it("pose le point de départ AVANT la première commande, sinon elle serait avalée", async () => {
    readKitchenAck.mockResolvedValue(null);
    await ensureKitchenBaseline();
    expect(writeKitchenAck).toHaveBeenCalledWith({ kg: { p5: 3, p7: 1.5 }, prev: {} });
    // Le point de départ ne parle pas dans le groupe.
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("ne réécrit rien quand il est déjà posé", async () => {
    await ensureKitchenBaseline();
    expect(writeKitchenAck).not.toHaveBeenCalled();
  });

  it("ne remonte pas une panne de base au démarrage du serveur", async () => {
    readKitchenAck.mockRejectedValue(new Error("base injoignable"));
    await expect(ensureKitchenBaseline()).resolves.toBeUndefined();
  });
});

describe("applyKitchenAck", () => {
  it("enregistre le CUMUL confirmé, pas une soustraction", async () => {
    readKitchenBoardMessageId.mockResolvedValue(55);
    await applyKitchenAck("p5");
    expect(writeKitchenAck).toHaveBeenCalledWith({
      kg: { p5: 3 },
      prev: { p5: 0 },
      last: "p5",
    });
    expect(editMessage).toHaveBeenCalled();
  });
});

describe("applyKitchenUndo", () => {
  it("ne défait rien quand le tableau n'a jamais été initialisé", async () => {
    readKitchenAck.mockResolvedValue(null);
    await applyKitchenUndo();
    expect(writeKitchenAck).not.toHaveBeenCalled();
  });

  it("rend le poids du dernier « تم »", async () => {
    readKitchenAck.mockResolvedValue({ kg: { p5: 3 }, prev: { p5: 0 }, last: "p5" });
    readKitchenBoardMessageId.mockResolvedValue(55);
    await applyKitchenUndo();
    expect(writeKitchenAck).toHaveBeenCalledWith({ kg: { p5: 0 }, prev: { p5: 0 } });
  });

  it("n'écrit rien quand il n'y a rien à défaire", async () => {
    await applyKitchenUndo();
    expect(writeKitchenAck).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
