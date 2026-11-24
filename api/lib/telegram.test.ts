import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildNewOrderTelegramMessage,
  chatId,
  setChatIdOverride,
  cancelReasonPrompt,
  cancelReasonKeyboard,
  couperPourTelegram,
  decidedOrderMessage,
  editMessage,
  isTelegramConfigured,
  newOrderKeyboard,
  sansBoutonsLiens,
  sendMessage,
} from "./telegram";

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

describe("couperPourTelegram", () => {
  it("laisse passer un message normal", () => {
    expect(couperPourTelegram("salut")).toBe("salut");
  });

  it("coupe au-delà de 4096 — au-delà, Telegram n'affiche RIEN du tout", () => {
    const coupe = couperPourTelegram("x".repeat(5000));
    expect(coupe.length).toBe(4096);
    expect(coupe.endsWith("\n…")).toBe(true);
  });

  it("protège le cas réel : une commande déjà à la limite + la question « علاش »", () => {
    const enorme = buildNewOrderTelegramMessage({
      ...commande,
      items: JSON.stringify(
        Array.from({ length: 300 }, () => ({
          name: "Produit au nom très long pour remplir le message",
          weightKg: 1,
          qty: 1,
          unitPriceMillimes: 10000,
        })),
      ),
    });
    expect(enorme.length).toBeLessThanOrEqual(4096);
    expect(cancelReasonPrompt(enorme).length).toBeGreaterThan(4096);
    expect(couperPourTelegram(cancelReasonPrompt(enorme)).length).toBe(4096);
  });
});

describe("decidedOrderMessage", () => {
  it("écrit la raison quand elle existe", () => {
    expect(decidedOrderMessage("base", "annulee", "Slim", "trop_cher")).toContain("الثمن غالي");
  });

  it("n'invente rien quand la raison est absente ou inconnue", () => {
    expect(decidedOrderMessage("base", "annulee", "Slim", null)).toBe("base\n\n❌ <b>ملغاة</b> — Slim");
    expect(decidedOrderMessage("base", "annulee", "Slim", "bidon")).not.toContain("·");
  });

  it("sans nom quand la décision ne vient pas d'un bouton", () => {
    expect(decidedOrderMessage("base", "confirmee")).toBe("base\n\n✅ <b>مؤكّدة</b>");
  });
});

describe("chatId — migration d'un groupe vers un supergroupe", () => {
  beforeEach(() => {
    setChatIdOverride(null);
    process.env.TELEGRAM_CHAT_ID = "-5472483644";
  });

  it("utilise l'identifiant de l'environnement tant que rien n'a migré", () => {
    expect(chatId()).toBe("-5472483644");
  });

  it("bascule sur le nouvel identifiant après migration", () => {
    setChatIdOverride("-1002345678901");
    expect(chatId()).toBe("-1002345678901");
  });

  it("rend une chaîne vide plutôt que « undefined » si rien n'est configuré", () => {
    delete process.env.TELEGRAM_CHAT_ID;
    expect(chatId()).toBe("");
  });
});

describe("les claviers d'une commande — joindre le client autrement qu'en appelant", () => {
  const boutons = (k: { inline_keyboard: unknown[][] }) =>
    k.inline_keyboard.flat() as { text: string; callback_data?: string; url?: string }[];

  it("sans la commande, le clavier d'origine : ✅ puis ❌, rien d'autre", () => {
    expect(newOrderKeyboard(42)).toEqual({
      inline_keyboard: [
        [{ text: "✅ تأكيد الطلبية", callback_data: "o:ok:42" }],
        [{ text: "❌ إلغاء", callback_data: "o:no:42" }],
      ],
    });
  });

  it("avec la commande, un bouton WhatsApp ENTRE les deux décisions", () => {
    const b = boutons(newOrderKeyboard(42, commande));
    expect(b.map((x) => x.text)).toEqual(["✅ تأكيد الطلبية", "💬 واتساب للحريف", "❌ إلغاء"]);
    expect(b[1]!.url).toMatch(/^https:\/\/wa\.me\/21655123456\?text=/);
    // Un bouton ouvre un lien OU rappelle le serveur, jamais les deux :
    // Telegram refuserait le clavier entier.
    expect(b[1]).not.toHaveProperty("callback_data");
    expect(b[0]).not.toHaveProperty("url");
  });

  it("le message préparé porte le numéro de commande et le montant à payer", () => {
    const url = boutons(newOrderKeyboard(42, commande))[1]!.url!;
    const texte = decodeURIComponent(url.split("?text=")[1]!);
    expect(texte).toContain("رقم 42");
    expect(texte).toContain("156,8 د.ت");
  });

  it("au moment d'annuler, WhatsApp est proposé AVANT les raisons, et « رجوع » reste en dernier", () => {
    const b = boutons(cancelReasonKeyboard(42, commande));
    expect(b[0]!.text).toBe("💬 جرّب واتساب قبل ما تلغي");
    expect(b[0]!.url).toMatch(/^https:\/\/wa\.me\/21655123456\?text=/);
    expect(b.at(-1)).toEqual({ text: "↩️ رجوع", callback_data: "o:back:42" });
    expect(b.filter((x) => x.callback_data?.startsWith("o:r:"))).toHaveLength(4);
  });

  it("un numéro inexploitable : pas de bouton WhatsApp, et les décisions restent là", () => {
    const sansNumero = { ...commande, phone: "12345" };
    expect(newOrderKeyboard(42, sansNumero)).toEqual(newOrderKeyboard(42));
    expect(cancelReasonKeyboard(42, sansNumero)).toEqual(cancelReasonKeyboard(42));
  });

  it("chaque callback_data reste sous les 64 octets de Telegram", () => {
    for (const k of [newOrderKeyboard(123456789, commande), cancelReasonKeyboard(123456789, commande)]) {
      for (const x of boutons(k)) {
        if (x.callback_data) expect(Buffer.byteLength(x.callback_data)).toBeLessThanOrEqual(64);
      }
    }
  });
});


describe("un bouton-lien refusé ne coûte jamais la notification", () => {
  type Corps = { reply_markup?: { inline_keyboard: Record<string, unknown>[][] } };
  const porteUnLien = (c: Corps) => JSON.stringify(c.reply_markup ?? {}).includes('"url"');

  /** Un faux Telegram : il note ce qu'on lui envoie, et répond ce que
   * `repondre` décide pour chaque envoi. */
  function fauxTelegram(repondre: (corps: Corps, n: number) => { ok: boolean; description?: string }) {
    const recus: Corps[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const corps = JSON.parse(init.body) as Corps;
        recus.push(corps);
        const r = repondre(corps, recus.length);
        return new Response(JSON.stringify(r.ok ? { ok: true, result: { message_id: 7 } } : r), {
          status: r.ok ? 200 : 400,
        });
      }),
    );
    return recus;
  }

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "-100123";
    setChatIdOverride(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it("sansBoutonsLiens retire le lien et garde les décisions, dans l'ordre", () => {
    expect(sansBoutonsLiens(newOrderKeyboard(42, commande))).toEqual(newOrderKeyboard(42));
    expect(sansBoutonsLiens(cancelReasonKeyboard(42, commande))).toEqual(cancelReasonKeyboard(42));
  });

  it("sansBoutonsLiens rend null quand il n'y a rien à retirer : pas de second envoi identique", () => {
    expect(sansBoutonsLiens(newOrderKeyboard(42))).toBeNull();
  });

  it("Telegram accepte le lien : un seul envoi, bouton compris", async () => {
    const recus = fauxTelegram(() => ({ ok: true }));
    expect(await sendMessage("طلبية", newOrderKeyboard(42, commande))).toEqual({ message_id: 7 });
    expect(recus).toHaveLength(1);
    expect(porteUnLien(recus[0]!)).toBe(true);
  });

  // LE CAS POUR LEQUEL LE FILET EXISTE. Telegram ne refuse pas un bouton,
  // il refuse le message entier : sans second essai, la commande ne sonnait
  // plus du tout.
  it("Telegram refuse le lien : la commande sonne quand même, sans le bouton WhatsApp", async () => {
    const recus = fauxTelegram((c) =>
      porteUnLien(c) ? { ok: false, description: "Bad Request: BUTTON_URL_INVALID" } : { ok: true },
    );
    expect(await sendMessage("طلبية", newOrderKeyboard(42, commande))).toEqual({ message_id: 7 });
    expect(recus).toHaveLength(2);
    expect(recus[1]!.reply_markup).toEqual(newOrderKeyboard(42));
  });

  it("un clavier sans lien refusé n'est pas renvoyé à l'identique", async () => {
    const recus = fauxTelegram(() => ({ ok: false, description: "Forbidden: bot was kicked" }));
    expect(await sendMessage("طلبية", newOrderKeyboard(42))).toBeNull();
    expect(recus).toHaveLength(1);
  });

  it("même refusé deux fois, on s'arrête : deux envois, pas de boucle", async () => {
    const recus = fauxTelegram(() => ({ ok: false, description: "Bad Request" }));
    expect(await sendMessage("طلبية", newOrderKeyboard(42, commande))).toBeNull();
    expect(recus).toHaveLength(2);
  });

  it("au moment d'annuler aussi : la question des raisons s'affiche, sans le bouton WhatsApp", async () => {
    const recus = fauxTelegram((c) =>
      porteUnLien(c) ? { ok: false, description: "Bad Request: BUTTON_URL_INVALID" } : { ok: true },
    );
    expect(await editMessage(7, "علاش تلغات ؟", cancelReasonKeyboard(42, commande))).toBe(true);
    expect(recus).toHaveLength(2);
    expect(recus[1]!.reply_markup).toEqual(cancelReasonKeyboard(42));
  });

  it("une modification acceptée du premier coup n'est envoyée qu'une fois", async () => {
    const recus = fauxTelegram(() => ({ ok: true }));
    expect(await editMessage(7, "طلبية", newOrderKeyboard(42, commande))).toBe(true);
    expect(recus).toHaveLength(1);
  });
});
