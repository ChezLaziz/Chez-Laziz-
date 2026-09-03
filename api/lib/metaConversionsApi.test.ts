import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isMetaConversionsApiConfigured,
  normalizeTunisianPhone,
  sendMetaPurchaseEvent,
  sha256,
} from "./metaConversionsApi";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.META_PIXEL_ID;
  delete process.env.META_CONVERSIONS_API_TOKEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("normalizeTunisianPhone", () => {
  it("ajoute l'indicatif +216 quand il est absent", () => {
    expect(normalizeTunisianPhone("23691039")).toBe("+21623691039");
  });

  it("retire le 0 initial avant d'ajouter l'indicatif", () => {
    expect(normalizeTunisianPhone("023691039")).toBe("+21623691039");
  });

  it("conserve l'indicatif déjà présent, avec ou sans + ou espaces", () => {
    expect(normalizeTunisianPhone("+216 23 691 039")).toBe("+21623691039");
    expect(normalizeTunisianPhone("216-23-691-039")).toBe("+21623691039");
  });
});

describe("sha256", () => {
  it("est déterministe et sensible à la casse/à l'espacement de l'entrée exacte", () => {
    expect(sha256("+21623691039")).toBe(sha256("+21623691039"));
    expect(sha256("+21623691039")).not.toBe(sha256("+21623691038"));
  });

  it("produit un hash hex de 64 caractères (SHA-256)", () => {
    expect(sha256("test")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("isMetaConversionsApiConfigured", () => {
  it("faux si aucune variable n'est définie", () => {
    expect(isMetaConversionsApiConfigured()).toBe(false);
  });

  it("faux si une seule des deux variables est définie", () => {
    process.env.META_PIXEL_ID = "123";
    expect(isMetaConversionsApiConfigured()).toBe(false);
  });

  it("vrai si les deux variables sont définies", () => {
    process.env.META_PIXEL_ID = "123";
    process.env.META_CONVERSIONS_API_TOKEN = "token";
    expect(isMetaConversionsApiConfigured()).toBe(true);
  });
});

describe("sendMetaPurchaseEvent", () => {
  it("ne fait aucun appel réseau si non configuré", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendMetaPurchaseEvent({
      orderId: 1,
      phone: "23691039",
      totalMillimes: 69900,
      contentIds: ["pack:vip"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie le téléphone haché (jamais en clair) avec l'event_id order-<id>", async () => {
    process.env.META_PIXEL_ID = "999";
    process.env.META_CONVERSIONS_API_TOKEN = "secret-token";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMetaPurchaseEvent({
      orderId: 42,
      phone: "23691039",
      totalMillimes: 69900,
      contentIds: ["pack:vip"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("graph.facebook.com");
    expect(url).toContain("/999/events");
    expect(url).toContain("access_token=secret-token");
    const body = JSON.parse(init.body as string);
    expect(body.data[0].event_id).toBe("order-42");
    expect(body.data[0].event_name).toBe("Purchase");
    expect(body.data[0].custom_data.value).toBe(69.9);
    expect(body.data[0].user_data.ph[0]).toBe(sha256("+21623691039"));
    expect(JSON.stringify(body)).not.toContain("23691039");
  });

  it("n'échoue jamais si l'appel réseau échoue (journalise seulement)", async () => {
    process.env.META_PIXEL_ID = "999";
    process.env.META_CONVERSIONS_API_TOKEN = "secret-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    await expect(
      sendMetaPurchaseEvent({ orderId: 7, phone: "23691039", totalMillimes: 1000, contentIds: [] }),
    ).resolves.toBeUndefined();
  });

  it("n'échoue jamais si Meta répond une erreur HTTP", async () => {
    process.env.META_PIXEL_ID = "999";
    process.env.META_CONVERSIONS_API_TOKEN = "secret-token";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad token", { status: 401 })));
    await expect(
      sendMetaPurchaseEvent({ orderId: 8, phone: "23691039", totalMillimes: 1000, contentIds: [] }),
    ).resolves.toBeUndefined();
  });
});
