import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMetaLeadEvent, sendMetaPurchaseEvent } from "./metaConversionsApi";

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
afterEach(() => { delete process.env.META_PIXEL_ID; delete process.env.META_CONVERSIONS_API_TOKEN; vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("event_time réellement envoyé à Meta", () => {
  it("date l'achat de l'instant où il part — la livraison — et pas d'une commande d'avant-hier", async () => {
    // Meta mesure le retard entre l'heure portée et l'heure de réception :
    // un achat daté de la commande arrivait avec un à trois jours de retard.
    const livraison = new Date("2026-11-25T14:30:00Z");
    vi.useFakeTimers({ now: livraison });
    await sendMetaPurchaseEvent(base);
    expect(envois[0].event_name).toBe("Purchase");
    expect(envois[0].event_time).toBe(Math.floor(livraison.getTime() / 1000));
  });

  it("ne se laisse plus antidater : une heure de commande glissée dans l'appel est ignorée", async () => {
    const livraison = new Date("2026-11-25T14:30:00Z");
    vi.useFakeTimers({ now: livraison });
    const avantHier = new Date("2026-11-23T09:00:00Z");
    await sendMetaPurchaseEvent({ ...base, ...({ orderedAt: avantHier } as object) });
    expect(envois[0].event_time).toBe(Math.floor(livraison.getTime() / 1000));
  });

  it("date la commande elle-même (Lead) de l'instant de la commande", async () => {
    const commande = new Date("2026-11-25T10:05:00Z");
    vi.useFakeTimers({ now: commande });
    await sendMetaLeadEvent(base);
    expect(envois[0].event_name).toBe("Lead");
    expect(envois[0].event_time).toBe(Math.floor(commande.getTime() / 1000));
  });

  it("est toujours un entier en SECONDES, jamais en millisecondes", async () => {
    await sendMetaPurchaseEvent(base);
    const t = envois[0].event_time as number;
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeLessThan(1e11); // des millisecondes dépasseraient largement
    // Et jamais dans le futur, que Meta refuserait.
    expect(t).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });
});
