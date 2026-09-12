// La panne muette qu'on ne verrait jamais : un groupe ordinaire devient un
// supergroupe, son identifiant change, et toutes les notifications
// disparaissent sans une seule erreur à l'écran.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatId, sendMessage, setChatIdOverride, setMigrationHandler, tgCall } from "./telegram";

const NOUVEAU = -1002345678901;

function reponse(body: unknown) {
  return { ok: true, json: async () => body } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = "-5472483644";
  setChatIdOverride(null);
  setMigrationHandler(async () => undefined);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setChatIdOverride(null);
});

function corps(appel: number): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[appel][1].body as string) as Record<string, unknown>;
}

describe("tgCall face à migrate_to_chat_id", () => {
  it("refait l'appel sur le nouveau groupe et le retient", async () => {
    const persiste = vi.fn(async () => undefined);
    setMigrationHandler(persiste);
    fetchMock
      .mockResolvedValueOnce(
        reponse({
          ok: false,
          description: "Bad Request: group chat was upgraded to a supergroup chat",
          parameters: { migrate_to_chat_id: NOUVEAU },
        }),
      )
      .mockResolvedValueOnce(reponse({ ok: true, result: { message_id: 7 } }));

    const res = await sendMessage("طلبية جديدة");

    expect(res).toEqual({ message_id: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(corps(0).chat_id).toBe("-5472483644");
    expect(corps(1).chat_id).toBe(String(NOUVEAU));
    // Retenu en mémoire ET confié à la base : un redéploiement ne doit pas
    // renvoyer les notifications vers un groupe qui n'existe plus.
    expect(chatId()).toBe(String(NOUVEAU));
    expect(persiste).toHaveBeenCalledWith(String(NOUVEAU));
  });

  it("ne réessaie qu'UNE fois — pas de boucle si le nouveau groupe refuse aussi", async () => {
    fetchMock.mockResolvedValue(
      reponse({
        ok: false,
        description: "upgraded to a supergroup chat",
        parameters: { migrate_to_chat_id: NOUVEAU },
      }),
    );
    expect(await sendMessage("x")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("un refus ordinaire ne déplace rien", async () => {
    fetchMock.mockResolvedValue(reponse({ ok: false, description: "Forbidden: bot was kicked" }));
    expect(await tgCall("sendMessage", {})).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(chatId()).toBe("-5472483644");
  });

  it("« message is not modified » reste un succès, sans réessai", async () => {
    fetchMock.mockResolvedValue(
      reponse({ ok: false, description: "Bad Request: message is not modified" }),
    );
    expect(await tgCall("editMessageText", {})).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
