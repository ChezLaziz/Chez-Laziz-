import { beforeEach, describe, expect, it, vi } from "vitest";

const listOrdersAwaitingCall = vi.fn();
const listOrdersAwaitingHandover = vi.fn(async () => [] as { id: number; customerName: string; ageHours: number }[]);
const readSetting = vi.fn();
const writeSetting = vi.fn(async () => undefined);
const sendMessage = vi.fn();
const editMessage = vi.fn<(messageId: number, text: string) => Promise<boolean>>();
const deleteMessage = vi.fn(async () => undefined);

vi.mock("../queries/reminders", () => ({ listOrdersAwaitingCall, listOrdersAwaitingHandover }));
vi.mock("../queries/settingsStore", () => ({ readSetting, writeSetting }));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, sendMessage, editMessage, deleteMessage };
});

const { runStalledCheck } = await import("./telegramReminders");

/** 11:00 à Tunis — en pleine journée de travail. */
const MIDI = new Date("2026-09-12T10:00:00Z");
/** 03:00 à Tunis. */
const NUIT = new Date("2026-09-12T02:00:00Z");

const cmd = (id: number, h = 5) => ({
  id,
  customerName: `Client ${id}`,
  phone: "29173419",
  totalMillimes: 25000,
  ageHours: h,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-100123";
  listOrdersAwaitingCall.mockResolvedValue([cmd(37), cmd(39)]);
  listOrdersAwaitingHandover.mockResolvedValue([]);
  readSetting.mockResolvedValue(null);
  sendMessage.mockResolvedValue({ message_id: 88 });
  editMessage.mockResolvedValue(true);
});

describe("runStalledCheck", () => {
  it("ne fait rien tant que Telegram n'est pas configuré", async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    await runStalledCheck(MIDI);
    expect(listOrdersAwaitingCall).not.toHaveBeenCalled();
  });

  it("SE TAIT la nuit — une commande ne réveille personne", async () => {
    await runStalledCheck(NUIT);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(listOrdersAwaitingCall).not.toHaveBeenCalled();
  });

  it("sonne quand une commande rejoint la liste", async () => {
    await runStalledCheck(MIDI);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toContain("#37");
    expect(writeSetting).toHaveBeenCalledWith("stalled_ids", "[37,39]");
    expect(writeSetting).toHaveBeenCalledWith("stalled_message_id", "88");
  });

  it("NE SONNE PAS pour les mêmes commandes : il corrige en silence", async () => {
    readSetting.mockImplementation(async (k: string) =>
      k === "stalled_ids" ? "[37,39]" : k === "stalled_message_id" ? "55" : null,
    );
    await runStalledCheck(MIDI);
    expect(editMessage).toHaveBeenCalledTimes(1);
    expect(editMessage.mock.calls[0][0]).toBe(55);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it("sonne dès qu'UNE seule commande s'ajoute aux anciennes", async () => {
    readSetting.mockImplementation(async (k: string) =>
      k === "stalled_ids" ? "[37]" : k === "stalled_message_id" ? "55" : null,
    );
    await runStalledCheck(MIDI);
    expect(deleteMessage).toHaveBeenCalledWith(55);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("EFFACE le rappel quand tout est à jour — « tout va bien » ne s'écrit pas", async () => {
    listOrdersAwaitingCall.mockResolvedValue([]);
    readSetting.mockImplementation(async (k: string) =>
      k === "stalled_message_id" ? "55" : k === "stalled_ids" ? "[37]" : null,
    );
    await runStalledCheck(MIDI);
    expect(deleteMessage).toHaveBeenCalledWith(55);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(writeSetting).toHaveBeenCalledWith("stalled_message_id", "");
    expect(writeSetting).toHaveBeenCalledWith("stalled_ids", "[]");
  });

  it("n'écrit rien du tout quand il n'y a ni retard ni rappel affiché", async () => {
    listOrdersAwaitingCall.mockResolvedValue([]);
    await runStalledCheck(MIDI);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it("refait un rappel si l'ancien a été supprimé à la main", async () => {
    readSetting.mockImplementation(async (k: string) =>
      k === "stalled_ids" ? "[37,39]" : k === "stalled_message_id" ? "55" : null,
    );
    editMessage.mockResolvedValue(false);
    await runStalledCheck(MIDI);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("signale aussi un carton confirmé que personne n'a remis au transporteur", async () => {
    listOrdersAwaitingCall.mockResolvedValue([]);
    listOrdersAwaitingHandover.mockResolvedValue([{ id: 27, customerName: "Farouk", ageHours: 31 }]);
    await runStalledCheck(MIDI);
    expect(sendMessage.mock.calls[0][0]).toContain("ما تسلّمتش لشركة التوصيل");
    expect(writeSetting).toHaveBeenCalledWith("stalled_ids", "[27]");
  });

  it("une panne de base ne remonte jamais — c'est une tâche de fond", async () => {
    listOrdersAwaitingCall.mockRejectedValue(new Error("base injoignable"));
    await expect(runStalledCheck(MIDI)).resolves.toBeUndefined();
  });

  it("un identifiant enregistré illisible ne bloque pas le rappel", async () => {
    readSetting.mockImplementation(async (k: string) =>
      k === "stalled_ids" ? "pas du JSON" : null,
    );
    await runStalledCheck(MIDI);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
