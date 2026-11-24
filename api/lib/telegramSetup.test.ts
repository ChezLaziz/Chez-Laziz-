import { beforeEach, describe, expect, it, vi } from "vitest";

const reglages = new Map<string, string>();
const readSetting = vi.fn(async (k: string) => reglages.get(k) ?? null);
const writeSetting = vi.fn(async (k: string, v: string) => void reglages.set(k, v));
const sendMessage = vi.fn();
const registerTelegramWebhook = vi.fn(async () => undefined);

vi.mock("../queries/settingsStore", () => ({ readSetting, writeSetting }));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, sendMessage, registerTelegramWebhook };
});

const { setupTelegram } = await import("./telegramSetup");

const BONJOUR = "telegram_bonjour_envoye";
const NOTE = "telegram_matbakh_jour_par_jour_annonce";
const textes = () => sendMessage.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.clearAllMocks();
  reglages.clear();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-100123";
  sendMessage.mockResolvedValue({ message_id: 1 });
});

describe("setupTelegram — le mot d'explication du matbakh", () => {
  it("un groupe qui existait déjà reçoit l'explication UNE fois, et le tableau doit suivre", async () => {
    reglages.set(BONJOUR, "1");
    expect(await setupTelegram()).toBe(true);
    expect(textes()).toHaveLength(1);
    expect(textes()[0]).toContain("جدول المطبخ تبدّل");
    expect(textes()[0]).toContain("نهار بنهار");
    expect(reglages.get(NOTE)).toBe("1");
  });

  it("au redémarrage suivant : plus rien, le groupe n'est pas dérangé à chaque déploiement", async () => {
    reglages.set(BONJOUR, "1");
    reglages.set(NOTE, "1");
    expect(await setupTelegram()).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("un groupe tout neuf reçoit le message d'installation, pas l'explication d'un changement qu'il n'a pas connu", async () => {
    expect(await setupTelegram()).toBe(false);
    expect(textes()).toHaveLength(1);
    expect(textes()[0]).toContain("القروب يخدم");
    // Le message d'installation dit déjà la règle du jour.
    expect(textes()[0]).toContain("نهار بنهار");
    expect(reglages.get(BONJOUR)).toBe("1");
    expect(reglages.get(NOTE)).toBe("1");
  });

  it("l'explication n'est pas partie : le drapeau n'est pas posé, elle repartira au prochain démarrage", async () => {
    reglages.set(BONJOUR, "1");
    sendMessage.mockResolvedValue(null);
    expect(await setupTelegram()).toBe(false);
    expect(reglages.has(NOTE)).toBe(false);
  });

  it("Telegram non configuré : rien n'est envoyé, rien n'est écrit", async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    expect(await setupTelegram()).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(writeSetting).not.toHaveBeenCalled();
  });

  it("une panne ne remonte jamais au démarrage du serveur", async () => {
    readSetting.mockRejectedValueOnce(new Error("base injoignable"));
    await expect(setupTelegram()).resolves.toBe(false);
  });
});
