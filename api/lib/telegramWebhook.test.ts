import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrderById = vi.fn();
const transitionOrderStatus = vi.fn();
const applyKitchenAck = vi.fn(async () => "✅ تسجّل");
const applyKitchenUndo = vi.fn(async () => "↩️ رجّعناه");
const answerCallback = vi.fn(async () => undefined);
const editMessage = vi.fn<(messageId: number, text: string, keyboard?: unknown) => Promise<boolean>>();

const setCancelReason = vi.fn(async () => undefined);
vi.mock("../queries/orders", () => ({ getOrderById, setCancelReason }));
vi.mock("./orderTransition", () => ({ transitionOrderStatus }));
vi.mock("./telegramKitchen", () => ({ applyKitchenAck, applyKitchenUndo }));
vi.mock("./telegram", async () => {
  const actual = await vi.importActual<typeof import("./telegram")>("./telegram");
  return { ...actual, answerCallback, editMessage };
});

const { handleTelegramUpdate } = await import("./telegramWebhook");

const CHAT = "-1001234567890";

const commande = (status: string, cancelReason: string | null = null) => ({
  id: 42,
  status,
  cancelReason,
  customerName: "Nada",
  phone: "52865521",
  governorate: "Bizerte",
  city: "Jarzouna",
  address: "Cité el 3omel",
  postalCode: null,
  items: "[]",
  subtotalMillimes: 42000,
  deliveryFeeMillimes: 8000,
  totalMillimes: 50000,
  paymentStatus: "pending",
  note: null,
});

const appui = (data: string, chatId: string | number = CHAT) => ({
  callback_query: {
    id: "cb1",
    data,
    from: { first_name: "Slim" },
    message: { message_id: 77, chat: { id: chatId } },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "123:abc";
  process.env.TELEGRAM_CHAT_ID = CHAT;
  editMessage.mockResolvedValue(true);
});

describe("handleTelegramUpdate", () => {
  it("ne fait rien tant que Telegram n'est pas configuré", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await handleTelegramUpdate(appui("o:ok:42"));
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    expect(answerCallback).not.toHaveBeenCalled();
  });

  it("REFUSE un bouton venu d'une autre conversation — c'est quelqu'un d'autre", async () => {
    await handleTelegramUpdate(appui("o:ok:42", "-1009999999999"));
    expect(getOrderById).not.toHaveBeenCalled();
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    expect(answerCallback).toHaveBeenCalledWith("cb1");
  });

  it("accepte un identifiant de groupe reçu en nombre plutôt qu'en texte", async () => {
    getOrderById.mockResolvedValue(commande("nouvelle"));
    transitionOrderStatus.mockResolvedValue(commande("en_preparation"));
    await handleTelegramUpdate(appui("o:ok:42", Number(CHAT)));
    expect(transitionOrderStatus).toHaveBeenCalledWith(42, "en_preparation", "nouvelle");
  });

  it("✅ fait avancer la commande exactement comme le tableau de bord", async () => {
    getOrderById.mockResolvedValue(commande("nouvelle"));
    transitionOrderStatus.mockResolvedValue(commande("en_preparation"));
    await handleTelegramUpdate(appui("o:ok:42"));
    expect(transitionOrderStatus).toHaveBeenCalledWith(42, "en_preparation", "nouvelle");
    expect(editMessage).toHaveBeenCalledWith(77, expect.stringContaining("مؤكّدة"));
    expect(editMessage.mock.calls[0][1]).toContain("Slim");
    expect(answerCallback).toHaveBeenCalledWith("cb1", "✅ تأكّدت");
  });

  it("❌ N'ANNULE RIEN : il demande d'abord pourquoi", async () => {
    getOrderById.mockResolvedValue(commande("nouvelle"));
    await handleTelegramUpdate(appui("o:no:42"));
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    expect(setCancelReason).not.toHaveBeenCalled();
    expect(editMessage.mock.calls[0][1]).toContain("علاش تلغات");
    expect(JSON.stringify(editMessage.mock.calls[0][2])).toContain("o:r:sans_reponse:42");
  });

  it("la raison choisie annule ET s'enregistre, dans le même geste", async () => {
    getOrderById.mockResolvedValue(commande("nouvelle"));
    transitionOrderStatus.mockResolvedValue(commande("annulee", "trop_cher"));
    await handleTelegramUpdate(appui("o:r:trop_cher:42"));
    expect(setCancelReason).toHaveBeenCalledWith(42, "trop_cher");
    expect(transitionOrderStatus).toHaveBeenCalledWith(42, "annulee", "nouvelle");
    const texte = editMessage.mock.calls[0][1];
    expect(texte).toContain("ملغاة");
    expect(texte).toContain("الثمن غالي");
  });

  it("une raison inventée n'annule RIEN — pas d'annulation muette", async () => {
    getOrderById.mockResolvedValue(commande("nouvelle"));
    await handleTelegramUpdate(appui("o:r:n_importe_quoi:42"));
    expect(setCancelReason).not.toHaveBeenCalled();
    expect(transitionOrderStatus).not.toHaveBeenCalled();
  });

  it("« رجوع » remet les deux boutons : le ❌ par erreur n'a rien coûté", async () => {
    getOrderById.mockResolvedValue(commande("nouvelle"));
    await handleTelegramUpdate(appui("o:back:42"));
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    const clavier = JSON.stringify(editMessage.mock.calls[0][2]);
    expect(clavier).toContain("o:ok:42");
    expect(clavier).toContain("o:no:42");
  });

  it("réaffiche la raison enregistrée sur une commande déjà annulée", async () => {
    getOrderById.mockResolvedValue(commande("annulee", "sans_reponse"));
    await handleTelegramUpdate(appui("o:ok:42"));
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    expect(editMessage.mock.calls[0][1]).toContain("ما جابش تليفون");
  });

  it("un deuxième appui ne rejoue RIEN — sinon le poids partirait deux fois en cuisine", async () => {
    getOrderById.mockResolvedValue(commande("en_preparation"));
    await handleTelegramUpdate(appui("o:ok:42"));
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    expect(editMessage).toHaveBeenCalled();
    expect(answerCallback).toHaveBeenCalledWith("cb1", "تعمّلت قبل");
  });

  it("le dit sans rien casser quand la commande n'existe plus", async () => {
    getOrderById.mockResolvedValue(undefined);
    await handleTelegramUpdate(appui("o:ok:42"));
    expect(transitionOrderStatus).not.toHaveBeenCalled();
    expect(answerCallback).toHaveBeenCalledWith("cb1", "الطلبية ما ثماش");
  });

  it("« تم » acquitte le type demandé", async () => {
    await handleTelegramUpdate(appui("k:p5"));
    expect(applyKitchenAck).toHaveBeenCalledWith("p5");
  });

  it("« رجوع » défait, et n'est pas confondu avec un type", async () => {
    await handleTelegramUpdate(appui("k:undo"));
    expect(applyKitchenUndo).toHaveBeenCalled();
    expect(applyKitchenAck).not.toHaveBeenCalled();
  });

  it("répond quand même sur une donnée inconnue — sinon le bouton tourne sans fin", async () => {
    await handleTelegramUpdate(appui("n'importe quoi"));
    expect(answerCallback).toHaveBeenCalledWith("cb1", undefined);
  });

  it("répond même quand le traitement échoue", async () => {
    getOrderById.mockRejectedValue(new Error("base injoignable"));
    await handleTelegramUpdate(appui("o:ok:42"));
    expect(answerCallback).toHaveBeenCalledWith("cb1", "فمّا مشكل، عاود");
  });

  it("ignore une mise à jour qui n'est pas un appui sur un bouton", async () => {
    await handleTelegramUpdate({ message: { text: "salut" } });
    expect(answerCallback).not.toHaveBeenCalled();
  });
});
