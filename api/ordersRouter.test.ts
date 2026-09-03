import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const listAvailableProducts = vi.fn();
const createOrder = vi.fn();
const paymentProofExists = vi.fn();
const assertAdmin = vi.fn();
const updateOrderStatus = vi.fn();
const updatePaymentStatus = vi.fn();
const markMetaPurchaseReported = vi.fn(async () => undefined);
const sendMetaPurchaseEvent = vi.fn(async () => undefined);

vi.mock("./queries/products", () => ({ listAvailableProducts }));
vi.mock("./queries/orders", () => ({
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder: vi.fn(),
  listOrders: vi.fn(),
  markMetaPurchaseReported,
}));
vi.mock("./lib/r2", () => ({ paymentProofExists }));
vi.mock("./queries/admin", () => ({ assertAdmin }));
vi.mock("./lib/email", () => ({ notifyAdminNewOrder: vi.fn(async () => undefined) }));
// La logique de décision (shouldReportMetaPurchase) reste réelle — seul
// l'appel réseau sortant est remplacé, pour tester le câblage bout en bout.
vi.mock("./lib/metaConversionsApi", async () => {
  const actual = await vi.importActual<typeof import("./lib/metaConversionsApi")>(
    "./lib/metaConversionsApi",
  );
  return { ...actual, sendMetaPurchaseEvent };
});

const { ordersRouter } = await import("./ordersRouter");

const CATALOG = [
  { id: 1, name: "Makroudh aux Dattes", priceMillimes: 8000, available: true },
  { id: 2, name: "Makroudh Blanc à la Pistache", priceMillimes: 40000, available: true },
  { id: 5, name: "Makroudh Blanc au Fraise", priceMillimes: 22000, available: true },
  { id: 6, name: "Makroudh aux Amandes", priceMillimes: 17000, available: true },
];

const ctx = { req: new Request("http://localhost"), resHeaders: new Headers() };
const caller = ordersRouter.createCaller(ctx);

const baseInput = {
  customerName: "Amine",
  phone: "23691039",
  governorate: "Kairouan" as const,
  city: "Kairouan",
  address: "M3MG+VJP, avenue de la République",
  items: [{ productId: 1, weightKg: 1 as const, qty: 2 }],
  paymentMethod: "cod" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  listAvailableProducts.mockResolvedValue(CATALOG);
  createOrder.mockImplementation(async (data: unknown) => ({ id: 42, ...(data as object) }));
});

describe("orders.create — server-side price recalculation", () => {
  it("computes unit price from the 1kg base price × selected weight, never from the client", async () => {
    await caller.create({
      ...baseInput,
      items: [{ productId: 2, weightKg: 1.5, qty: 1 }],
    });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ productId: 2, weightKg: 1.5, unitPriceMillimes: 60000 }),
        ],
        subtotalMillimes: 60000,
        deliveryFeeMillimes: 8000,
        totalMillimes: 68000,
      }),
    );
  });

  it("ignores any extra client-supplied pricing fields", async () => {
    await caller.create({
      ...baseInput,
      // Champs en trop simulant un client malveillant (pas dans le schéma zod
      // ordersRouter.create, ignorés silencieusement puis jamais utilisés
      // côté serveur — voir l'assertion ci-dessous).
      ...({ totalMillimes: 1 } as object),
      items: [{ productId: 1, weightKg: 1, qty: 2, ...({ unitPriceMillimes: 1 } as object) }],
    });
    // 2 × 8.000 (prix catalogue réel, pas 1 envoyé par le client) + 8.000 livraison
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ subtotalMillimes: 16000, totalMillimes: 24000 }),
    );
  });

  it("rejects an order for a product that isn't in the available catalog", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ productId: 999, weightKg: 1, qty: 1 }] }),
    ).rejects.toThrow(TRPCError);
  });

  it("rejects a weight that isn't one of the five allowed values", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 0.75 as 1, qty: 1 }] }),
    ).rejects.toThrow();
  });

  it("rejects a payment method other than cod/d17", async () => {
    await expect(
      // @ts-expect-error — méthode de paiement volontairement invalide pour le test
      caller.create({ ...baseInput, paymentMethod: "stripe" }),
    ).rejects.toThrow();
  });

  it("rejects an order missing the required delivery address fields", async () => {
    await expect(
      // @ts-expect-error — governorate manquant
      caller.create({ ...baseInput, governorate: undefined }),
    ).rejects.toThrow();
  });
});

describe("orders.create — D17 payment proof is mandatory", () => {
  it("rejects a D17 order with no proof key at all", async () => {
    await expect(
      caller.create({ ...baseInput, paymentMethod: "d17" }),
    ).rejects.toMatchObject({ message: expect.stringContaining("obligatoire") });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("rejects a D17 order whose proof key doesn't actually exist in storage", async () => {
    paymentProofExists.mockResolvedValue(false);
    await expect(
      caller.create({
        ...baseInput,
        paymentMethod: "d17",
        paymentProofKey: "payment-proof/fake-key-a-client-made-up.jpg",
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("obligatoire") });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("accepts a D17 order once a real, existing proof key is supplied", async () => {
    paymentProofExists.mockResolvedValue(true);
    await caller.create({
      ...baseInput,
      paymentMethod: "d17",
      paymentProofKey: "payment-proof/real-key.jpg",
    });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: "d17",
        paymentStatus: "pending_verification",
        paymentProofKey: "payment-proof/real-key.jpg",
      }),
    );
  });

  it("never marks a D17 order as approved just because a proof was submitted", async () => {
    paymentProofExists.mockResolvedValue(true);
    await caller.create({ ...baseInput, paymentMethod: "d17", paymentProofKey: "payment-proof/real-key.jpg" });
    const [order] = createOrder.mock.calls.at(-1)!;
    expect(order.paymentStatus).not.toBe("approved");
  });

  it("a COD order needs no proof and is immediately payable on delivery", async () => {
    await caller.create(baseInput);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "cod", paymentStatus: "pending", paymentProofKey: undefined }),
    );
  });
});

describe("orders.create — quantity edge cases", () => {
  it("rejects quantity 0", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 0 }] }),
    ).rejects.toThrow();
  });

  it("rejects a negative quantity", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: -3 }] }),
    ).rejects.toThrow();
  });

  it("rejects an absurd quantity", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 100000 }] }),
    ).rejects.toThrow();
  });

  it("rejects a non-integer quantity", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 1.5 }] }),
    ).rejects.toThrow();
  });

  it("rejects an empty cart", async () => {
    await expect(caller.create({ ...baseInput, items: [] })).rejects.toThrow();
  });

  it("handles multiple lines and weights with exact integer arithmetic", async () => {
    await caller.create({
      ...baseInput,
      items: [
        { productId: 1, weightKg: 0.5, qty: 3 }, // 3 × 4.000
        { productId: 2, weightKg: 2.5, qty: 1 }, // 1 × 100.000
      ],
    });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ subtotalMillimes: 112000, totalMillimes: 120000 }),
    );
  });
});

describe("orders.create — idempotency", () => {
  it("forwards the client idempotency key to the order", async () => {
    await caller.create({ ...baseInput, idempotencyKey: "11111111-2222-3333-4444-555555555555" });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "11111111-2222-3333-4444-555555555555" }),
    );
  });

  it("rejects a key that is too short to be meaningful", async () => {
    await expect(caller.create({ ...baseInput, idempotencyKey: "abc" })).rejects.toThrow();
  });
});

describe("admin-only order procedures reject unauthenticated access", () => {
  it("orders.list requires a valid admin token", async () => {
    assertAdmin.mockRejectedValue(new TRPCError({ code: "UNAUTHORIZED" }));
    await expect(caller.list({ token: "" })).rejects.toThrow(TRPCError);
  });

  it("orders.setPaymentStatus requires a valid admin token", async () => {
    assertAdmin.mockRejectedValue(new TRPCError({ code: "UNAUTHORIZED" }));
    await expect(
      caller.setPaymentStatus({ token: "not-a-real-token", id: 1, paymentStatus: "approved" }),
    ).rejects.toThrow(TRPCError);
  });
});

describe("orders.create — packs prêts (prix fixes)", () => {
  it("facture un pack au prix de vente fixe, avec son contenu et son poids", async () => {
    await caller.create({ ...baseInput, items: [{ kind: "pack", packId: "vip", qty: 1 }] });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            kind: "pack",
            packId: "vip",
            name: "Laziz VIP",
            weightKg: 2,
            unitPriceMillimes: 69900,
            contents: [
              { name: "Makroudh Laziz – Fruits Secs", weightKg: 0.5 },
              { name: "Makroudh Blanc à la Pistache", weightKg: 0.5 },
              { name: "Makroudh Blanc au Fraise", weightKg: 0.5 },
              { name: "Makroudh Zgougou", weightKg: 0.5 },
            ],
          }),
        ],
        subtotalMillimes: 69900,
        totalMillimes: 77900,
      }),
    );
  });

  it("Délice et Classique : 3 produits, 1,5 kg, 39,900 / 29,900 DT", async () => {
    await caller.create({
      ...baseInput,
      items: [
        { kind: "pack", packId: "delice", qty: 1 },
        { kind: "pack", packId: "classique", qty: 1 },
      ],
    });
    const [order] = createOrder.mock.calls.at(-1)!;
    expect(order.items[0]).toMatchObject({ name: "Laziz Délice", weightKg: 1.5, unitPriceMillimes: 39900 });
    expect(order.items[0].contents).toHaveLength(3);
    expect(order.items[1]).toMatchObject({ name: "Laziz Classique", weightKg: 1.5, unitPriceMillimes: 29900 });
    expect(order.items[1].contents).toHaveLength(3);
    expect(order.subtotalMillimes).toBe(69800);
  });

  it("ignore tout prix envoyé par le client pour un pack", async () => {
    await caller.create({
      ...baseInput,
      items: [{ kind: "pack", packId: "premium", qty: 2, ...({ unitPriceMillimes: 1 } as object) }],
    });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ subtotalMillimes: 99800, totalMillimes: 107800 }),
    );
  });

  it("refuse un pack qui n'existe pas", async () => {
    await expect(
      // @ts-expect-error — identifiant de pack volontairement invalide
      caller.create({ ...baseInput, items: [{ kind: "pack", packId: "gold", qty: 1 }] }),
    ).rejects.toThrow();
    expect(createOrder).not.toHaveBeenCalled();
  });
});

describe("orders.create — Custom Pack (calcul dynamique)", () => {
  it("4 produits différents × 500 g depuis le catalogue + 10,000 DT de packaging", async () => {
    await caller.create({ ...baseInput, items: [{ kind: "custom", productIds: [1, 2, 5, 6], qty: 1 }] });
    // 4.000 + 20.000 + 11.000 + 8.500 = 43.500 + 10.000 packaging
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            kind: "custom",
            name: "Custom Pack",
            weightKg: 2,
            unitPriceMillimes: 53500,
            packagingMillimes: 10000,
            contents: [
              { productId: 1, name: "Makroudh aux Dattes", weightKg: 0.5 },
              { productId: 2, name: "Makroudh Blanc à la Pistache", weightKg: 0.5 },
              { productId: 5, name: "Makroudh Blanc au Fraise", weightKg: 0.5 },
              { productId: 6, name: "Makroudh aux Amandes", weightKg: 0.5 },
            ],
          }),
        ],
        subtotalMillimes: 53500,
        totalMillimes: 61500,
      }),
    );
  });

  it("refuse un produit en double (4 produits DIFFÉRENTS)", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ kind: "custom", productIds: [1, 1, 2, 5], qty: 1 }] }),
    ).rejects.toThrow(/différents/);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("refuse un pack incomplet (3 produits) ou trop grand (5 produits)", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ kind: "custom", productIds: [1, 2, 5], qty: 1 }] }),
    ).rejects.toThrow();
    await expect(
      caller.create({ ...baseInput, items: [{ kind: "custom", productIds: [1, 2, 5, 6, 1], qty: 1 }] }),
    ).rejects.toThrow();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("refuse un produit absent du catalogue", async () => {
    await expect(
      caller.create({ ...baseInput, items: [{ kind: "custom", productIds: [1, 2, 5, 999], qty: 1 }] }),
    ).rejects.toThrow(/indisponible/);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("un ancien client sans champ « kind » reste une ligne produit au poids", async () => {
    await caller.create(baseInput);
    const [order] = createOrder.mock.calls.at(-1)!;
    expect(order.items[0]).toMatchObject({ kind: "product", productId: 1, weightKg: 1, unitPriceMillimes: 8000 });
  });

  it("n'envoie JAMAIS l'événement Meta « Achat » à la simple création — ni confirmée, ni payée", async () => {
    await caller.create(baseInput);
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
  });
});

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 42,
    phone: "23691039",
    totalMillimes: 24000,
    items: JSON.stringify([
      { kind: "product", productId: 1, name: "Makroudh aux Dattes", weightKg: 1, qty: 2, unitPriceMillimes: 8000 },
    ]),
    paymentMethod: "cod",
    paymentStatus: "pending",
    status: "nouvelle",
    metaPurchaseReportedAt: null,
    ...overrides,
  };
}

describe("orders.setStatus — Meta « Achat » (cash on delivery)", () => {
  // Un test précédent ("admin-only order procedures...") laisse assertAdmin
  // en échec permanent (vi.clearAllMocks() ne réinitialise pas les valeurs
  // configurées via mockRejectedValue) — on la rétablit ici explicitement.
  beforeEach(() => {
    assertAdmin.mockResolvedValue(undefined);
  });

  it("signale l'achat dès que l'admin confirme (statut qui avance après « nouvelle »)", async () => {
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "en_preparation" }));
    await caller.setStatus({ token: "t", id: 42, status: "en_preparation" });
    expect(markMetaPurchaseReported).toHaveBeenCalledWith(42);
    expect(sendMetaPurchaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 42, phone: "23691039", totalMillimes: 24000, contentIds: ["1"] }),
    );
  });

  it("n'envoie rien si la commande est annulée directement", async () => {
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "annulee" }));
    await caller.setStatus({ token: "t", id: 42, status: "annulee" });
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
    expect(markMetaPurchaseReported).not.toHaveBeenCalled();
  });

  it("n'envoie jamais deux fois (déjà signalée précédemment)", async () => {
    updateOrderStatus.mockResolvedValue(
      makeOrder({ status: "terminee", metaPurchaseReportedAt: new Date() }),
    );
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
  });
});

describe("orders.setPaymentStatus — Meta « Achat » (D17)", () => {
  beforeEach(() => {
    assertAdmin.mockResolvedValue(undefined);
  });

  it("signale l'achat seulement une fois le paiement APPROUVÉ par l'admin", async () => {
    updatePaymentStatus.mockResolvedValue(
      makeOrder({ paymentMethod: "d17", paymentStatus: "approved" }),
    );
    await caller.setPaymentStatus({ token: "t", id: 42, paymentStatus: "approved" });
    expect(markMetaPurchaseReported).toHaveBeenCalledWith(42);
    expect(sendMetaPurchaseEvent).toHaveBeenCalledTimes(1);
  });

  it("n'envoie rien si la preuve D17 est rejetée", async () => {
    updatePaymentStatus.mockResolvedValue(
      makeOrder({ paymentMethod: "d17", paymentStatus: "rejected" }),
    );
    await caller.setPaymentStatus({ token: "t", id: 42, paymentStatus: "rejected" });
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
  });

  it("un D17 encore en attente de vérification ne déclenche rien même si le statut avance", async () => {
    updateOrderStatus.mockResolvedValue(
      makeOrder({ paymentMethod: "d17", paymentStatus: "pending_verification", status: "en_preparation" }),
    );
    await caller.setStatus({ token: "t", id: 42, status: "en_preparation" });
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
  });
});
