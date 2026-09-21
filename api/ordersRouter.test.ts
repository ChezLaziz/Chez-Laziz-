import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { ORDER_ERROR } from "@contracts/orderErrors";

const listAvailableProducts = vi.fn();
const createOrder = vi.fn();
const assertAdmin = vi.fn();
const updateOrderStatus = vi.fn();
const getOrderById = vi.fn();
const updatePaymentStatus = vi.fn();
const markMetaPurchaseReported = vi.fn(async () => true);
const unmarkMetaPurchaseReported = vi.fn(async () => undefined);
const setCancelReason = vi.fn(async () => undefined);
// VRAI par défaut : la valeur de retour décide désormais si la réservation
// « signalé à Meta » est gardée ou rendue. Un mock qui renvoie undefined
// ferait démarquer toutes les commandes des tests, en silence.
const sendMetaPurchaseEvent = vi.fn(async () => true);
const sendMetaLeadEvent = vi.fn(async () => true);

vi.mock("./queries/products", () => ({ listAvailableProducts }));
vi.mock("./queries/orders", () => ({
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder: vi.fn(),
  listOrders: vi.fn(),
  getOrderById,
  markMetaPurchaseReported,
  unmarkMetaPurchaseReported,
  setCancelReason,
}));
vi.mock("./queries/admin", () => ({ assertAdmin }));
vi.mock("./lib/email", () => ({ notifyAdminNewOrder: vi.fn(async () => undefined) }));
// La logique de décision (shouldReportMetaPurchase) reste réelle — seul
// l'appel réseau sortant est remplacé, pour tester le câblage bout en bout.
vi.mock("./lib/metaConversionsApi", async () => {
  const actual = await vi.importActual<typeof import("./lib/metaConversionsApi")>(
    "./lib/metaConversionsApi",
  );
  return { ...actual, sendMetaPurchaseEvent, sendMetaLeadEvent };
});

const { ordersRouter } = await import("./ordersRouter");
const { FIXED_PACKS } = await import("@contracts/packs");

const CATALOG = [
  { id: 1, name: "Makroudh aux Dattes", priceMillimes: 8000, available: true },
  { id: 2, name: "Makroudh Blanc à la Pistache", priceMillimes: 40000, available: true },
  { id: 5, name: "Makroudh Blanc au Fraise", priceMillimes: 22000, available: true },
  { id: 6, name: "Makroudh aux Amandes", priceMillimes: 17000, available: true },
];

/** Le catalogue complet : tout ce que les packs prêts contiennent.
 *
 * Un pack n'est vendable que si TOUT son contenu est disponible (voir
 * packIsAvailable) : les tests de packs partent donc d'un catalogue qui les
 * couvre, sans quoi ils testeraient le refus au lieu de la facturation. */
const CATALOG_COMPLET = [
  ...CATALOG,
  ...[...new Set(FIXED_PACKS.flatMap((p) => p.contents))]
    .filter((n) => !CATALOG.some((c) => c.name === n))
    .map((name, i) => ({ id: 100 + i, name, priceMillimes: 20000, available: true })),
];

const ctx = { req: new Request("http://localhost"), resHeaders: new Headers() };
const caller = ordersRouter.createCaller(ctx);

/** Une cliente venue d'une publicité : le Pixel a posé ses deux cookies. */
function callerAvecCookiesMeta() {
  return ordersRouter.createCaller({
    req: new Request("http://localhost", {
      headers: {
        cookie: "_fbp=fb.1.1726900000.1234567890; _fbc=fb.1.1726900000.IwAR_abc",
        "x-forwarded-for": "197.15.1.1, 10.0.0.1",
        "user-agent": "Mozilla/5.0 (iPhone)",
      },
    }),
    resHeaders: new Headers(),
  });
}

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

  it("ENREGISTRE les cookies publicitaires sur la commande — le lien entre l'annonce et la vente", async () => {
    // LE BOGUE QUI A COÛTÉ TRENTE JOURS D'ATTRIBUTION. Le routeur étalait
    // `...signals` dans createOrder, mais le contrat nomme ses champs
    // fbc/fbp et la table les nomme metaFbc/metaFbp. Les quatre valeurs
    // tombaient dans le vide à chaque commande, sans erreur : les colonnes
    // sont facultatives et un étalement ne déclenche pas le contrôle des
    // propriétés en trop. Zéro commande a jamais porté fbc, et Meta n'a
    // attribué AUCUN achat à une publicité en trente jours — alors qu'il
    // avait bien reçu soixante-deux achats côté serveur. Sans fbc, Meta
    // reçoit la vente mais ignore de quelle annonce elle vient.
    await callerAvecCookiesMeta().create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 1 }] });
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        metaFbc: "fb.1.1726900000.IwAR_abc",
        metaFbp: "fb.1.1726900000.1234567890",
        metaClientIp: "197.15.1.1",
        metaClientUserAgent: "Mozilla/5.0 (iPhone)",
      }),
    );
  });

  it("et les fait suivre jusqu'à « Lead » — sinon Meta ne sait pas quelle annonce a vendu", async () => {
    createOrder.mockImplementation(async (data: unknown) => ({ id: 42, ...(data as object) }));
    await callerAvecCookiesMeta().create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 1 }] });
    const envoye = (sendMetaLeadEvent.mock.calls as unknown as [Record<string, unknown>][]).at(-1)![0];
    expect(envoye.signals).toEqual(
      expect.objectContaining({
        fbc: "fb.1.1726900000.IwAR_abc",
        fbp: "fb.1.1726900000.1234567890",
      }),
    );
  });

  it("sans cookies — cliente qui a refusé — aucune de ces quatre colonnes n'est posée", async () => {
    await caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 1 }] });
    const ecrit = (createOrder.mock.calls as unknown as [Record<string, unknown>][]).at(-1)![0];
    for (const col of ["metaFbc", "metaFbp", "metaClientIp", "metaClientUserAgent"]) {
      expect(ecrit).not.toHaveProperty(col);
    }
  });

  it("dit « Lead » à Meta DEPUIS LE SERVEUR, avec le même identifiant que le navigateur", async () => {
    // Le Pixel ne se charge qu'après « Accepter » : sept visiteuses sur dix
    // n'acceptent jamais, et leur Lead de navigateur n'existe pas. Sans cet
    // envoi serveur, Meta ne verrait qu'une commande sur trois — sous le
    // seuil des 50 conversions hebdomadaires dont il a besoin pour
    // apprendre. Le même event_id que src/pages/OrderPage.tsx laisse Meta
    // reconnaître les deux envois comme un seul.
    await caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 2 }] });
    expect(sendMetaLeadEvent).toHaveBeenCalledTimes(1);
    const envoye = (sendMetaLeadEvent.mock.calls as unknown as [Record<string, unknown>][]).at(-1)![0];
    expect(envoye.orderId).toBe(42);
    // 2 × 8 DT de makroudh — PAS les 8 DT de livraison.
    expect(envoye.subtotalMillimes).toBe(16000);
    expect(envoye.contentIds).toEqual(["1"]);
    expect(envoye.quantities).toEqual([2]);
  });

  it("ne redit pas « Lead » quand la clé d'idempotence rejoue une commande déjà enregistrée", async () => {
    // Double appui, reprise réseau : la commande existe déjà, elle a déjà
    // sonné et déjà été dite à Meta. Un second Lead ferait croire à deux
    // demandes — exactement le défaut qu'on a corrigé sur Telegram.
    createOrder.mockResolvedValueOnce({ id: 42, rejouee: true as const });
    await caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 1 }] });
    expect(sendMetaLeadEvent).not.toHaveBeenCalled();
  });

  it("n'envoie JAMAIS « Purchase » à la création — personne n'a encore payé", async () => {
    await caller.create({ ...baseInput, items: [{ productId: 1, weightKg: 1, qty: 1 }] });
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
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

  it("refuse un moyen de paiement inconnu", async () => {
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

describe("orders.create — D17 a été retiré du site", () => {
  // Le verrou qui compte : un onglet resté ouvert sur l'ancienne version, un
  // script, ou n'importe quel appel direct peut encore demander « d17 ». La
  // commande doit être REFUSÉE, pas enregistrée dans un état de paiement que
  // plus personne ne sait traiter.
  it("refuse une commande qui demande encore D17", async () => {
    await expect(
      caller.create({ ...baseInput, paymentMethod: "d17" as unknown as "cod" }),
    ).rejects.toThrow();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("une commande sans moyen de paiement passe : il n'y en a plus qu'un", async () => {
    const sansPaiement = { ...baseInput };
    delete (sansPaiement as { paymentMethod?: unknown }).paymentMethod;
    await caller.create(sansPaiement);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "cod", paymentStatus: "pending" }),
    );
  });

  it("une commande en espèces reste à encaisser à la livraison", async () => {
    await caller.create(baseInput);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "cod", paymentStatus: "pending" }),
    );
  });

  it("aucune preuve de paiement n'est plus enregistrée", async () => {
    await caller.create(baseInput);
    const [order] = createOrder.mock.calls.at(-1)!;
    expect(order).not.toHaveProperty("paymentProofKey");
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
      caller.setPaymentStatus({ token: "not-a-real-token", id: 1, paymentStatus: "paid" }),
    ).rejects.toThrow(TRPCError);
  });
});

describe("orders.create — packs prêts (prix fixes)", () => {
  beforeEach(() => listAvailableProducts.mockResolvedValue(CATALOG_COMPLET));

  it("refuse un pack dont l'un des produits n'est plus au catalogue", async () => {
    // Le vrai scénario : quelqu'un marque un makroudh indisponible depuis
    // l'administration, et le pack qui le contient reste en vente à son prix
    // plein. La commande partait, impossible à préparer.
    listAvailableProducts.mockResolvedValue(CATALOG);
    await expect(
      caller.create({ ...baseInput, items: [{ kind: "pack", packId: "vip", qty: 1 }] }),
    ).rejects.toMatchObject({ message: ORDER_ERROR.packIndisponible });
    expect(createOrder).not.toHaveBeenCalled();
  });

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
            // Chaque produit du pack porte son identifiant : la cuisine
            // range le makroudh du pack et le même makroudh au poids dans
            // un seul seau.
            contents: [
              "Makroudh Laziz – Fruits Secs",
              "Makroudh Blanc à la Pistache",
              "Makroudh Blanc au Fraise",
              "Makroudh Zgougou",
            ].map((name) => ({
              name,
              weightKg: 0.5,
              productId: CATALOG_COMPLET.find((p) => p.name === name)!.id,
            })),
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
    ).rejects.toThrow(ORDER_ERROR.customPackTaille);
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
    // 2 × 8 DT de makroudh + 8 DT de livraison : c'est le SOUS-total que
    // Meta doit recevoir, pas le total.
    subtotalMillimes: 16000,
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
    // setStatus relit la commande AVANT de la changer : c'est l'ancien statut
    // qui dit si le poids à préparer bouge (voir transitionOrderStatus).
    getOrderById.mockResolvedValue(makeOrder({ status: "nouvelle" }));
  });

  it("signale l'achat quand la commande est LIVRÉE (« terminée »)", async () => {
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "terminee" }));
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    expect(markMetaPurchaseReported).toHaveBeenCalledWith(42);
    expect(sendMetaPurchaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 42, phone: "23691039", contentIds: ["1"] }),
    );
  });

  it("envoie la valeur HORS livraison — les 8 DT du livreur ne sont pas du chiffre d'affaires", async () => {
    // Les compter gonflait le ROAS rapporté par Meta (24 au lieu de 16, soit
    // +50 % sur ce panier) et faussait l'enchère à la valeur. C'est aussi la
    // base qu'utilisent AddToCart, InitiateCheckout et Lead côté navigateur.
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "terminee" }));
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    const appels = sendMetaPurchaseEvent.mock.calls as unknown as [
      { subtotalMillimes: number },
    ][];
    const envoye = appels.at(-1)![0];
    expect(envoye.subtotalMillimes).toBe(16000);
    expect(envoye).not.toHaveProperty("totalMillimes");
  });

  it("n'envoie RIEN à la confirmation téléphonique — le colis peut encore être refusé", async () => {
    // C'est le piège du paiement à la livraison : 8 des 10 annulations du
    // mois dernier avaient déjà passé l'appel.
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "en_preparation" }));
    await caller.setStatus({ token: "t", id: 42, status: "en_preparation" });
    expect(sendMetaPurchaseEvent).not.toHaveBeenCalled();
    expect(markMetaPurchaseReported).not.toHaveBeenCalled();
  });

  it("transmet l'heure de la COMMANDE, pour que Meta la rapproche du clic", async () => {
    const commande = new Date(Date.now() - 26 * 3600 * 1000);
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "terminee", createdAt: commande }));
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    expect(sendMetaPurchaseEvent).toHaveBeenCalledWith(
      expect.objectContaining({ orderedAt: commande }),
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

  it("enregistre POURQUOI la commande meurt quand l'annulation vient du tableau de bord", async () => {
    // Le bouton ❌ de Telegram demandait déjà la raison ; le tableau de bord
    // annulait en silence. Une annulation sur deux partait donc sans raison,
    // et sur du paiement à la livraison l'annulation EST le coût principal.
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "annulee" }));
    await caller.setStatus({ token: "t", id: 42, status: "annulee", cancelReason: "trop_cher" });
    expect(setCancelReason).toHaveBeenCalledWith(42, "trop_cher");
  });

  it("n'écrit aucune raison si la transition n'a pas eu lieu", async () => {
    // Quelqu'un d'autre a tranché entre-temps : poser « الثمن غالي » sur une
    // commande qui vient de passer « prête » serait pire que rien.
    updateOrderStatus.mockResolvedValue(null);
    await caller.setStatus({ token: "t", id: 42, status: "annulee", cancelReason: "trop_cher" });
    expect(setCancelReason).not.toHaveBeenCalled();
  });

  it("n'écrit aucune raison sur un statut qui n'est pas une annulation", async () => {
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "terminee" }));
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    expect(setCancelReason).not.toHaveBeenCalled();
  });

  it("refuse une raison inventée", async () => {
    await expect(
      caller.setStatus({
        token: "t",
        id: 42,
        status: "annulee",
        ...({ cancelReason: "parce que" } as object),
      }),
    ).rejects.toThrow();
  });

  it("laisse annuler sans raison — mieux vaut une commande fermée qu'un admin bloqué", async () => {
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "annulee" }));
    await caller.setStatus({ token: "t", id: 42, status: "annulee" });
    expect(setCancelReason).not.toHaveBeenCalled();
  });

  it("garde la réservation quand Meta a bien reçu l'achat", async () => {
    sendMetaPurchaseEvent.mockResolvedValueOnce(true);
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "terminee" }));
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    await new Promise((r) => setTimeout(r, 0)); // l'envoi est lancé sans await
    expect(unmarkMetaPurchaseReported).not.toHaveBeenCalled();
  });

  it("REND la réservation si l'envoi échoue — sinon la vente devient invisible pour Meta à vie", async () => {
    // Jeton expiré, coupure réseau, Meta qui répond 500 : la commande existe,
    // le patron l'encaisse, et sans reprise l'algorithme n'apprend rien
    // d'elle. La prochaine avance de statut retentera ; Meta déduplique sur
    // event_id = order-42, donc la reprise ne peut pas compter deux fois.
    sendMetaPurchaseEvent.mockResolvedValueOnce(false);
    updateOrderStatus.mockResolvedValue(makeOrder({ status: "terminee" }));
    await caller.setStatus({ token: "t", id: 42, status: "terminee" });
    await new Promise((r) => setTimeout(r, 0));
    expect(unmarkMetaPurchaseReported).toHaveBeenCalledWith(42);
  });
});

