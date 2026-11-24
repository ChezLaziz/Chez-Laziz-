import { beforeEach, describe, expect, it, vi } from "vitest";

const recordPageView = vi.fn<(path: string) => Promise<void>>(async () => undefined);
const noterArrivee = vi.fn<(arrivee: { pub?: string; meta?: boolean }) => void>();

vi.mock("./queries/stats", () => ({ recordPageView, getStatsSummary: vi.fn() }));
vi.mock("./queries/arrivees", () => ({ noterArrivee }));
vi.mock("./queries/admin", () => ({ assertAdmin: vi.fn() }));

const { statsRouter } = await import("./statsRouter");

const TELEPHONE =
  "Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/487.0.0.52.75;]";

function appelant(userAgent?: string) {
  return statsRouter.createCaller({
    req: new Request("http://localhost", userAgent ? { headers: { "user-agent": userAgent } } : undefined),
    resHeaders: new Headers(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("stats.track — la page vue", () => {
  it("s'enregistre comme avant quand le navigateur n'envoie que le chemin", async () => {
    // Un onglet resté ouvert sur l'ancienne version du site envoie encore ceci.
    await expect(appelant(TELEPHONE).track({ path: "/commande" })).resolves.toEqual({ ok: true });
    expect(recordPageView).toHaveBeenCalledWith("/commande");
    expect(noterArrivee).not.toHaveBeenCalled();
  });
});

describe("stats.track — l'arrivée d'une session", () => {
  it("compte l'arrivée d'une cliente venue d'une publicité étiquetée", async () => {
    await appelant(TELEPHONE).track({ path: "/ar/commande", arrivee: { pub: "120249779868510674", meta: true } });
    expect(noterArrivee).toHaveBeenCalledTimes(1);
    expect(noterArrivee).toHaveBeenCalledWith({ pub: "120249779868510674", meta: true });
    expect(recordPageView).toHaveBeenCalledWith("/ar/commande");
  });

  it("compte une arrivée de Meta sans étiquette", async () => {
    await appelant(TELEPHONE).track({ path: "/commande", arrivee: { meta: true } });
    expect(noterArrivee).toHaveBeenCalledWith({ meta: true });
  });

  it("ne compte pas un robot qui ouvre le lien de la publicité — mais garde sa page vue", async () => {
    for (const robot of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
      "node",
    ]) {
      await appelant(robot).track({ path: "/ar/commande", arrivee: { pub: "120249779868510674", meta: true } });
    }
    // Sans aucun nom de navigateur non plus.
    await appelant().track({ path: "/ar/commande", arrivee: { pub: "120249779868510674", meta: true } });
    expect(noterArrivee).not.toHaveBeenCalled();
    // Le compteur de pages vues, lui, ne change pas de règle avec cette version.
    expect(recordPageView).toHaveBeenCalledTimes(4);
  });

  it("ne garde de l'arrivée que l'étiquette et l'origine, rien d'autre de ce qu'on lui envoie", async () => {
    await appelant(TELEPHONE).track({
      path: "/commande",
      arrivee: { pub: "pub-1", meta: false, ...({ fbclid: "IwAR0secret", telephone: "20123456" } as object) },
    });
    expect(noterArrivee).toHaveBeenCalledWith({ pub: "pub-1", meta: false });
  });

  it("refuse une étiquette plus longue que ce que le site lui-même sait produire", async () => {
    await expect(
      appelant(TELEPHONE).track({ path: "/commande", arrivee: { pub: "x".repeat(121) } }),
    ).rejects.toThrow();
    expect(noterArrivee).not.toHaveBeenCalled();
  });
});
