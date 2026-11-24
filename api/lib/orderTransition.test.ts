import { beforeEach, describe, expect, it, vi } from "vitest";

const updateOrderStatus = vi.fn();
const markMetaPurchaseReported = vi.fn(async () => false);
const unmarkMetaPurchaseReported = vi.fn(async () => undefined);
const refreshKitchenBoard = vi.fn(async () => undefined);
const refreshKitchenBoardSoon = vi.fn(() => undefined);
const sendMetaPurchaseEvent = vi.fn(async () => true);
const shouldReportMetaPurchase = vi.fn(() => false);

vi.mock("../queries/orders", () => ({ updateOrderStatus, markMetaPurchaseReported, unmarkMetaPurchaseReported }));
vi.mock("./telegramKitchen", () => ({ refreshKitchenBoard, refreshKitchenBoardSoon }));
vi.mock("./metaConversionsApi", () => ({ sendMetaPurchaseEvent, shouldReportMetaPurchase }));

const { enCuisine, transitionOrderStatus } = await import("./orderTransition");

type Statut = Parameters<typeof transitionOrderStatus>[1];

const commande = (status: Statut) => ({
  id: 42,
  phone: "20123456",
  subtotalMillimes: 25000,
  items: "[]",
  paymentMethod: "cod" as const,
  status,
  metaPurchaseReportedAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  updateOrderStatus.mockImplementation(async (_id: number, status: Statut) => commande(status));
});

describe("enCuisine", () => {
  it("« en préparation » et rien d'autre : une commande livrée n'a plus rien à faire cuire", () => {
    expect(enCuisine("en_preparation")).toBe(true);
    for (const s of ["nouvelle", "prete", "terminee", "annulee"] as const) expect(enCuisine(s), s).toBe(false);
  });
});

describe("transitionOrderStatus — ce que le tableau du matbakh entend", () => {
  it("une commande confirmée ENTRE en cuisine : le tableau sonne, tout de suite", async () => {
    await transitionOrderStatus(42, "en_preparation", "nouvelle");
    expect(refreshKitchenBoard).toHaveBeenCalledTimes(1);
    expect(refreshKitchenBoard).toHaveBeenCalledWith(true);
    expect(refreshKitchenBoardSoon).not.toHaveBeenCalled();
  });

  // CE QUI MANQUAIT. Une commande livrée restait au tableau jusqu'à ce que
  // quelqu'un appuie sur « تم » — et personne n'appuyait : 856,5 kg affichés
  // pour 1,5 kg réellement à préparer. Elle en sort maintenant d'elle-même.
  it.each([["terminee"], ["prete"], ["annulee"], ["nouvelle"]] as const)(
    "« en préparation » → « %s » : elle SORT du tableau — sans bruit, et sans se presser",
    async (apres) => {
      await transitionOrderStatus(42, apres, "en_preparation");
      expect(refreshKitchenBoardSoon).toHaveBeenCalledTimes(1);
      // Jamais le rafraîchissement qui sonne : il y a MOINS à faire.
      expect(refreshKitchenBoard).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["nouvelle", "annulee"],
    ["nouvelle", "terminee"],
    ["prete", "terminee"],
    ["terminee", "annulee"],
  ] as const)("« %s » → « %s » : la cuisine n'est pas concernée, le tableau ne bouge pas", async (avant, apres) => {
    await transitionOrderStatus(42, apres, avant);
    expect(refreshKitchenBoard).not.toHaveBeenCalled();
    expect(refreshKitchenBoardSoon).not.toHaveBeenCalled();
  });

  it("une commande rouverte (« terminée » → « en préparation ») revient au tableau, et sonne", async () => {
    await transitionOrderStatus(42, "en_preparation", "terminee");
    expect(refreshKitchenBoard).toHaveBeenCalledWith(true);
  });

  it("quelqu'un d'autre a tranché entre-temps : rien n'a été écrit, le tableau ne bouge pas", async () => {
    updateOrderStatus.mockResolvedValue(null);
    expect(await transitionOrderStatus(42, "terminee", "en_preparation")).toBeNull();
    expect(refreshKitchenBoard).not.toHaveBeenCalled();
    expect(refreshKitchenBoardSoon).not.toHaveBeenCalled();
  });
});
