import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Le lien WhatsApp se fabrique avec ce que la cliente a tapé. Ici il LÈVE,
// quoi qu'on lui donne : c'est la prochaine cause, celle qu'on ne connaît
// pas encore. La dernière en date — un nom coupé au milieu d'un emoji —
// emportait le clavier, la notification, puis le serveur entier.
vi.mock("@contracts/orderConfirmWhatsApp", () => ({
  orderConfirmWhatsAppUrl: () => {
    throw new URIError("URI malformed");
  },
}));

const { cancelReasonKeyboard, newOrderKeyboard, notifyAdminNewOrderTelegram, setChatIdOverride } = await import(
  "./telegram"
);

const commande = {
  id: 42,
  customerName: "Amina Hamdi",
  phone: "+216 55 123 456",
  governorate: "Sousse",
  city: "Sousse",
  address: "12 rue des Oliviers",
  postalCode: "4000",
  items: JSON.stringify([{ kind: "product", name: "Makroudh dattes", weightKg: 1, qty: 1, unitPriceMillimes: 8000 }]),
  subtotalMillimes: 8000,
  deliveryFeeMillimes: 8000,
  totalMillimes: 16000,
  paymentStatus: "pending",
  note: null,
};

describe("le bouton WhatsApp est un plus, jamais une condition", () => {
  type Corps = { text?: string; reply_markup?: { inline_keyboard: { text: string; url?: string }[][] } };
  let recus: Corps[] = [];

  beforeEach(() => {
    recus = [];
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "-100123";
    setChatIdOverride(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        recus.push(JSON.parse(init.body) as Corps);
        return new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status: 200 });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it("le lien impossible ne coûte que le bouton : les deux décisions restent", () => {
    expect(newOrderKeyboard(42, commande)).toEqual(newOrderKeyboard(42));
    expect(cancelReasonKeyboard(42, commande)).toEqual(cancelReasonKeyboard(42));
    // Et c'est écrit dans le journal, avec le numéro de la commande.
    expect(vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes("#42"))).toBe(true);
  });

  it("la commande sonne quand même sur Telegram", async () => {
    await expect(notifyAdminNewOrderTelegram(commande)).resolves.toBeUndefined();
    expect(recus).toHaveLength(1);
    expect(recus[0]!.text).toContain("42");
    expect(recus[0]!.reply_markup!.inline_keyboard.flat().map((b) => b.text)).toEqual(["✅ تأكيد الطلبية", "❌ إلغاء"]);
  });

  it("ne rejette jamais : appelée sans être attendue, une promesse rejetée arrêtait le serveur", async () => {
    // Une commande que le message lui-même ne sait pas lire.
    const illisible = {
      ...commande,
      get items(): string {
        throw new Error("commande illisible");
      },
    };
    await expect(notifyAdminNewOrderTelegram(illisible)).resolves.toBeUndefined();
    expect(recus).toHaveLength(0);
    expect(vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes("NON notifiée"))).toBe(true);
  });
});
