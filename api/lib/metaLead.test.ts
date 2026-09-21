import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMetaLeadEvent, sendMetaPurchaseEvent } from "./metaConversionsApi";

const commande = {
  orderId: 4242,
  phone: "23691039",
  subtotalMillimes: 42760,
  contentIds: ["1", "pack:vip"],
  quantities: [2, 1],
  customerName: "Amina Hamdi",
  city: "La Marsa",
  governorate: "Tunis",
};

let envois: { url: string; body: Record<string, unknown> }[] = [];
beforeEach(() => {
  envois = [];
  process.env.META_PIXEL_ID = "1124213306627576";
  process.env.META_CONVERSIONS_API_TOKEN = "jeton";
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) => {
    envois.push({ url, body: JSON.parse(init.body) });
    return new Response('{"events_received":1}', { status: 200 });
  }));
});
afterEach(() => {
  delete process.env.META_PIXEL_ID;
  delete process.env.META_CONVERSIONS_API_TOKEN;
  vi.unstubAllGlobals();
});

const evt = () => (envois.at(-1)!.body.data as Record<string, unknown>[])[0];

describe("Lead côté serveur", () => {
  it("porte le même event_id que le navigateur, pour que Meta n'en compte qu'un", async () => {
    expect(await sendMetaLeadEvent(commande)).toBe(true);
    expect(evt().event_name).toBe("Lead");
    // src/pages/OrderPage.tsx envoie `lead-order-${order.id}`
    expect(evt().event_id).toBe("lead-order-4242");
  });

  it("n'écrase pas Purchase : deux événements, deux identifiants distincts", async () => {
    await sendMetaLeadEvent(commande);
    const idLead = evt().event_id;
    await sendMetaPurchaseEvent(commande);
    expect(evt().event_name).toBe("Purchase");
    expect(evt().event_id).toBe("order-4242");
    expect(evt().event_id).not.toBe(idLead);
  });

  it("envoie la valeur hors livraison, en dinars", async () => {
    await sendMetaLeadEvent(commande);
    const custom = evt().custom_data as Record<string, unknown>;
    expect(custom.value).toBe(42.76);
    expect(custom.currency).toBe("TND");
    expect(custom.contents).toEqual([
      { id: "1", quantity: 2 },
      { id: "pack:vip", quantity: 1 },
    ]);
    expect(custom.num_items).toBe(3);
  });

  it("SANS consentement : ni nom, ni ville, ni gouvernorat — seulement le téléphone haché et le pays", async () => {
    await sendMetaLeadEvent(commande); // aucun fbc/fbp
    const user = evt().user_data as Record<string, unknown>;
    expect(user).toHaveProperty("ph");
    expect(user).toHaveProperty("country");
    expect(user).not.toHaveProperty("fn");
    expect(user).not.toHaveProperty("ln");
    expect(user).not.toHaveProperty("ct");
    expect(user).not.toHaveProperty("st");
  });

  it("AVEC consentement : le nom, la ville et le gouvernorat partent hachés", async () => {
    await sendMetaLeadEvent({ ...commande, signals: { fbp: "fb.1.1700000000.123" } });
    const user = evt().user_data as Record<string, unknown>;
    expect(user).toHaveProperty("fn");
    expect(user).toHaveProperty("ln");
    expect(user).toHaveProperty("ct");
    expect(user).toHaveProperty("st");
    expect(user.fbp).toBe("fb.1.1700000000.123");
  });

  it("ne lève jamais et rend faux quand Meta refuse", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad token", { status: 401 })));
    await expect(sendMetaLeadEvent(commande)).resolves.toBe(false);
  });
});
