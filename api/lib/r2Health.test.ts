import { beforeEach, describe, expect, it, vi } from "vitest";

const canListBucket = vi.fn<() => Promise<boolean>>();
const readSetting = vi.fn<(key: string) => Promise<string | null>>();
const writeSetting = vi.fn<(key: string, value: string) => Promise<void>>();
const sendMessage = vi.fn();

vi.mock("./r2", () => ({ canListBucket }));
vi.mock("../queries/settingsStore", () => ({ readSetting, writeSetting }));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, sendMessage };
});

const { checkR2Health } = await import("./r2Health");

const MAINTENANT = new Date("2026-09-12T10:00:00Z");

function reglages(initial: Record<string, string> = {}) {
  const store = { ...initial };
  readSetting.mockImplementation(async (k) => store[k] ?? null);
  writeSetting.mockImplementation(async (k, v) => {
    store[k] = v;
  });
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-100123";
  sendMessage.mockResolvedValue({ message_id: 1 });
  reglages();
});

describe("checkR2Health", () => {
  it("se tait quand tout va bien", async () => {
    canListBucket.mockResolvedValue(true);
    await checkR2Health(MAINTENANT);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("ALERTE dès que le stockage refuse — la panne de la nuit dernière a duré des heures sans un mot", async () => {
    const store = reglages();
    canListBucket.mockResolvedValue(false);
    await checkR2Health(MAINTENANT);
    const texte = sendMessage.mock.calls[0][0] as string;
    expect(texte).toContain("صور الموقع ما تتحمّلش");
    // Elle doit DIRE quoi faire, pas seulement qu'il y a un problème.
    expect(texte).toContain("Manage R2 API Tokens");
    expect(texte).toContain("R2_ACCESS_KEY_ID");
    // Et rassurer sur ce qui n'est PAS touché.
    expect(texte).toContain("الطلبيات والموقع يخدمو عادي");
    expect(store.r2_health_state).toBe("ko");
  });

  it("ne répète pas l'alerte toutes les heures — elle finirait coupée", async () => {
    reglages({ r2_health_state: "ko", r2_health_alert_at: "2026-09-12T09:30:00.000Z" });
    canListBucket.mockResolvedValue(false);
    await checkR2Health(MAINTENANT);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("réalerte une fois le délai écoulé", async () => {
    reglages({ r2_health_state: "ko", r2_health_alert_at: "2026-09-12T05:00:00.000Z" });
    canListBucket.mockResolvedValue(false);
    await checkR2Health(MAINTENANT);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("annonce le retour à la normale — sinon on ne sait pas quand relancer une publicité", async () => {
    const store = reglages({ r2_health_state: "ko" });
    canListBucket.mockResolvedValue(true);
    await checkR2Health(MAINTENANT);
    expect(sendMessage.mock.calls[0][0]).toContain("رجعت تخدم");
    expect(store.r2_health_state).toBe("ok");
  });

  it("ne dit le retour QU'UNE fois", async () => {
    const store = reglages({ r2_health_state: "ko" });
    canListBucket.mockResolvedValue(true);
    await checkR2Health(MAINTENANT);
    sendMessage.mockClear();
    await checkR2Health(MAINTENANT);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(store.r2_health_state).toBe("ok");
  });

  it("le retour n'est PAS retenu par le délai des alertes d'échec", async () => {
    reglages({ r2_health_state: "ko", r2_health_alert_at: MAINTENANT.toISOString() });
    canListBucket.mockResolvedValue(true);
    await checkR2Health(MAINTENANT);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("le témoin ne devient jamais lui-même une panne", async () => {
    canListBucket.mockRejectedValue(new Error("réseau coupé"));
    await expect(checkR2Health(MAINTENANT)).resolves.toBeUndefined();
  });
});
