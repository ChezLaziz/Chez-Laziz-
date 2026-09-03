import { describe, it, expect, vi, beforeEach } from "vitest";

const setFooterContent = vi.fn(async () => undefined);
const assertAdmin = vi.fn(async () => undefined);

vi.mock("./queries/content", () => ({
  getFooterContent: vi.fn(),
  setFooterContent,
  getPagesContent: vi.fn(),
  setPagesContent: vi.fn(),
}));
vi.mock("./queries/admin", () => ({ assertAdmin }));

const { contentRouter } = await import("./contentRouter");

const ctx = { req: new Request("http://localhost"), resHeaders: new Headers() };
const caller = contentRouter.createCaller(ctx);

const base = {
  token: "admin-token",
  tagline: "Pâtisserie artisanale",
  instagram: "https://www.instagram.com/chezlaziz",
  facebook: "https://www.facebook.com/chezlaziz",
  tiktok: "https://www.tiktok.com/@chezlaziz",
  copyright: "© Chez Laziz",
};

beforeEach(() => vi.clearAllMocks());

describe("content.updateFooter — photo du bandeau", () => {
  it("accepte une image passée par notre upload (dossier site/)", async () => {
    await caller.updateFooter({ ...base, bannerImage: "/api/uploads/site/1725000000000-a1b2c3.jpg" });
    expect(setFooterContent).toHaveBeenCalledWith(
      expect.objectContaining({ bannerImage: "/api/uploads/site/1725000000000-a1b2c3.jpg" }),
    );
  });

  it("accepte une valeur vide (retour à l'illustration de Kairouan)", async () => {
    await caller.updateFooter({ ...base, bannerImage: "" });
    expect(setFooterContent).toHaveBeenCalledWith(expect.objectContaining({ bannerImage: "" }));
  });

  it("refuse une URL externe arbitraire", async () => {
    await expect(
      caller.updateFooter({ ...base, bannerImage: "https://evil.example/x.jpg" }),
    ).rejects.toThrow();
    expect(setFooterContent).not.toHaveBeenCalled();
  });

  it("refuse une clé d'un autre dossier (ex. preuve de paiement D17)", async () => {
    await expect(
      caller.updateFooter({ ...base, bannerImage: "/api/uploads/payment-proof/secret.jpg" }),
    ).rejects.toThrow();
    expect(setFooterContent).not.toHaveBeenCalled();
  });

  it("exige un token admin valide", async () => {
    assertAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    await expect(caller.updateFooter({ ...base, bannerImage: "" })).rejects.toThrow();
    expect(setFooterContent).not.toHaveBeenCalled();
  });
});
