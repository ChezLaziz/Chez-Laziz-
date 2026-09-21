import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMetaPurchaseEvent } from "./metaConversionsApi";

const base = { orderId: 99, phone: "23691039", subtotalMillimes: 42760, contentIds: ["1"] };
let envois: Record<string, unknown>[] = [];
beforeEach(() => {
  envois = [];
  process.env.META_PIXEL_ID = "1124213306627576";
  process.env.META_CONVERSIONS_API_TOKEN = "jeton";
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init: { body: string }) => {
    envois.push((JSON.parse(init.body).data as Record<string, unknown>[])[0]);
    return new Response('{"events_received":1}', { status: 200 });
  }));
});
afterEach(() => { delete process.env.META_PIXEL_ID; delete process.env.META_CONVERSIONS_API_TOKEN; vi.unstubAllGlobals(); });

describe("event_time réellement envoyé à Meta", () => {
  it("porte l'heure de la commande livrée le lendemain", async () => {
    const commande = new Date(Date.now() - 26 * 3600 * 1000);
    await sendMetaPurchaseEvent({ ...base, orderedAt: commande });
    expect(envois[0].event_time).toBe(Math.floor(commande.getTime() / 1000));
  });

  it("reste DANS la fenêtre de sept jours pour une livraison à dix jours", async () => {
    const vieille = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    await sendMetaPurchaseEvent({ ...base, orderedAt: vieille });
    const age = Math.floor(Date.now() / 1000) - (envois[0].event_time as number);
    // Meta rejette la requête ENTIÈRE au-delà de 7 jours.
    expect(age).toBeLessThan(7 * 24 * 3600);
    expect(age).toBeLessThanOrEqual(2);
  });

  it("est toujours un entier en SECONDES, jamais en millisecondes", async () => {
    await sendMetaPurchaseEvent({ ...base, orderedAt: new Date() });
    const t = envois[0].event_time as number;
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeLessThan(1e11); // des millisecondes dépasseraient largement
  });
});
