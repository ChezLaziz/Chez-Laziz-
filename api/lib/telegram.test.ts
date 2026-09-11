import { beforeEach, describe, expect, it } from "vitest";
import { buildNewOrderTelegramMessage, isTelegramConfigured } from "./telegram";

const commande = {
  id: 42,
  customerName: "Sami <Ben> Ali",
  phone: "+216 55 123 456",
  governorate: "Sousse",
  city: "Sousse",
  address: "12 rue des Oliviers",
  postalCode: "4000",
  items: JSON.stringify([
    { kind: "product", name: "Makroudh fruits secs", weightKg: 0.5, qty: 2, unitPriceMillimes: 29900 },
    {
      kind: "custom",
      name: "Custom Pack 2 kg",
      weightKg: 2,
      qty: 1,
      unitPriceMillimes: 89000,
      contents: [
        { name: "Makroudh dattes", weightKg: 1 },
        { name: "Chamia", weightKg: 1 },
      ],
    },
  ]),
  subtotalMillimes: 148800,
  deliveryFeeMillimes: 8000,
  totalMillimes: 156800,
  paymentStatus: "pending",
  note: null,
};

describe("isTelegramConfigured", () => {
  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it("exige les deux variables — un jeton sans destinataire n'envoie rien", () => {
    expect(isTelegramConfigured()).toBe(false);
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    expect(isTelegramConfigured()).toBe(false);
    process.env.TELEGRAM_CHAT_ID = "-1001234567890";
    expect(isTelegramConfigured()).toBe(true);
  });
});

describe("buildNewOrderTelegramMessage", () => {
  it("met le numéro et le montant sur la première ligne — c'est tout ce que l'aperçu affiche", () => {
    const premiere = buildNewOrderTelegramMessage(commande).split("\n")[0];
    expect(premiere).toContain("#42");
    expect(premiere).toContain("156,8 د.ت");
  });

  it("détaille le contenu d'un pack : « Custom Pack 2 kg » seul ne dit pas quoi préparer", () => {
    const msg = buildNewOrderTelegramMessage(commande);
    expect(msg).toContain("Custom Pack 2 kg");
    expect(msg).toContain("Makroudh dattes");
    expect(msg).toContain("Chamia");
  });

  it("porte le client, le téléphone et l'adresse complète", () => {
    const msg = buildNewOrderTelegramMessage(commande);
    expect(msg).toContain("+216 55 123 456");
    expect(msg).toContain("12 rue des Oliviers, Sousse 4000, Sousse");
  });

  it("échappe le HTML : un nom avec « < » casserait le message côté Telegram", () => {
    const msg = buildNewOrderTelegramMessage(commande);
    expect(msg).toContain("Sami &lt;Ben&gt; Ali");
    expect(msg).not.toContain("<Ben>");
  });

  it("n'affiche la note que si le client en a laissé une", () => {
    expect(buildNewOrderTelegramMessage(commande)).not.toContain("📝");
    expect(buildNewOrderTelegramMessage({ ...commande, note: "Livrer après 18h" })).toContain(
      "📝 « Livrer après 18h »",
    );
  });

  it("survit à des articles illisibles : la notification part quand même", () => {
    const msg = buildNewOrderTelegramMessage({ ...commande, items: "pas du JSON" });
    expect(msg).toContain("#42");
    expect(msg).toContain("156,8 د.ت");
  });

  it("reste sous la limite de 4096 caractères de Telegram", () => {
    const enorme = JSON.stringify(
      Array.from({ length: 300 }, (_, i) => ({
        name: `Produit numéro ${i} au nom volontairement très long`,
        weightKg: 1,
        qty: 1,
        unitPriceMillimes: 10000,
      })),
    );
    const msg = buildNewOrderTelegramMessage({ ...commande, items: enorme });
    expect(msg.length).toBeLessThanOrEqual(4096);
    expect(msg.split("\n")[0]).toContain("#42");
    expect(msg).toContain("https://chezlaziz.com/admin");
  });
});
