import { beforeEach, describe, expect, it, vi } from "vitest";

const getFullExport = vi.fn();
const putObject = vi.fn<(key: string, body: Buffer, contentType: string) => Promise<void>>();
const objectSize = vi.fn<(key: string) => Promise<number | null>>();
const readSetting = vi.fn<(key: string) => Promise<string | null>>();
const writeSetting = vi.fn<(key: string, value: string) => Promise<void>>();
const sendMessage = vi.fn();

vi.mock("../queries/backup", () => ({ getFullExport }));
vi.mock("./r2", () => ({ putObject, objectSize }));
vi.mock("../queries/settingsStore", () => ({ readSetting, writeSetting }));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, sendMessage };
});

const { backupStatus, runBackupIfDue } = await import("./backupSchedule");

const MAINTENANT = new Date("2026-09-15T04:00:00Z");
const DONNEES = { exportedAt: "2026-09-15T04:00:00.000Z", orders: [{ id: 1 }] };
const TAILLE = Buffer.from(JSON.stringify(DONNEES, null, 2), "utf-8").byteLength;

/** Un magasin de réglages en mémoire : c'est la persistance qui décide si la
 * sauvegarde du jour a lieu, il faut donc la jouer pour de vrai. */
function reglages(initial: Record<string, string> = {}) {
  const store = { ...initial };
  readSetting.mockImplementation(async (k) => store[k] ?? null);
  writeSetting.mockImplementation(async (k: string, v: string) => {
    store[k] = v;
  });
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-100123";
  getFullExport.mockResolvedValue(DONNEES);
  putObject.mockResolvedValue(undefined);
  objectSize.mockResolvedValue(TAILLE);
  sendMessage.mockResolvedValue({ message_id: 1 });
  reglages();
});

describe("runBackupIfDue", () => {
  it("sauvegarde quand il n'y en a jamais eu", async () => {
    const store = reglages();
    await runBackupIfDue(MAINTENANT);
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(putObject.mock.calls[0][0]).toBe("backups/chez-laziz-2026-09-15.json");
    expect(store.backup_last_at).toBe(MAINTENANT.toISOString());
  });

  it("ne refait rien dans les vingt-quatre heures", async () => {
    reglages({ backup_last_at: "2026-09-15T01:00:00.000Z" });
    await runBackupIfDue(MAINTENANT);
    expect(getFullExport).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
  });

  it("repart dès que la dernière copie a plus d'un jour", async () => {
    reglages({ backup_last_at: "2026-09-13T04:00:00.000Z" });
    await runBackupIfDue(MAINTENANT);
    expect(putObject).toHaveBeenCalledTimes(1);
  });

  it("RELIT ce qu'elle a écrit, et refuse d'enregistrer une copie tronquée", async () => {
    const store = reglages();
    objectSize.mockResolvedValue(TAILLE - 10);
    await runBackupIfDue(MAINTENANT);
    // La date n'avance pas : demain, on réessaie.
    expect(store.backup_last_at).toBeUndefined();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toContain("النسخة الاحتياطية ما نجحتش");
  });

  it("traite un objet absent après écriture comme un échec", async () => {
    const store = reglages();
    objectSize.mockResolvedValue(null);
    await runBackupIfDue(MAINTENANT);
    expect(store.backup_last_at).toBeUndefined();
    expect(sendMessage).toHaveBeenCalled();
  });

  it("crie quand l'envoi lui-même échoue, sans jamais lever", async () => {
    putObject.mockRejectedValueOnce(new Error("Access Denied"));
    await expect(runBackupIfDue(MAINTENANT)).resolves.toBeUndefined();
    expect(sendMessage.mock.calls[0][0]).toContain("Access Denied");
  });

  it("n'alerte qu'une fois par jour — une alerte horaire finit coupée", async () => {
    reglages({ backup_alert_at: "2026-09-15T01:00:00.000Z" });
    objectSize.mockResolvedValue(null);
    await runBackupIfDue(MAINTENANT);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("réalerte une fois le délai passé", async () => {
    reglages({ backup_alert_at: "2026-09-13T01:00:00.000Z" });
    objectSize.mockResolvedValue(null);
    await runBackupIfDue(MAINTENANT);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("une base injoignable n'arrête pas le serveur", async () => {
    getFullExport.mockRejectedValue(new Error("base injoignable"));
    await expect(runBackupIfDue(MAINTENANT)).resolves.toBeUndefined();
  });

  it("écrase la copie du jour au lieu d'en empiler une deuxième", async () => {
    reglages({ backup_last_at: "2026-09-14T03:00:00.000Z" });
    await runBackupIfDue(MAINTENANT);
    await runBackupIfDue(new Date("2026-09-15T23:00:00Z"));
    expect(putObject).toHaveBeenCalledTimes(1);
  });
});

describe("backupStatus", () => {
  it("rend l'âge calculé côté SERVEUR — l'horloge d'une tablette ment", async () => {
    reglages({
      backup_last_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      backup_last_key: "backups/chez-laziz-2026-09-15.json",
    });
    const s = await backupStatus();
    expect(s.lastKey).toBe("backups/chez-laziz-2026-09-15.json");
    expect(s.ageHours).toBeGreaterThan(2.9);
    expect(s.ageHours).toBeLessThan(3.1);
  });

  it("dit « jamais » plutôt que zéro quand rien n'a encore été sauvegardé", async () => {
    expect(await backupStatus()).toEqual({ lastAt: null, lastKey: null, ageHours: null });
  });
});
