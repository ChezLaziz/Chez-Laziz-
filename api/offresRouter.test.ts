import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const assertAdmin = vi.fn();
const getOffresList = vi.fn(async () => ({ aContacter: [] }));
const marquerContactOffres = vi.fn(async () => true);
const retirerDesOffres = vi.fn<(id: string) => Promise<"retire" | "absent" | "echec">>(async () => "retire");
const enregistrerMessageOffres = vi.fn(async (t: string) => t.trim());

vi.mock("./queries/admin", () => ({ assertAdmin }));
vi.mock("./queries/offres", () => ({
  getOffresList,
  marquerContactOffres,
  retirerDesOffres,
  enregistrerMessageOffres,
}));

const { offresRouter } = await import("./offresRouter");
const caller = offresRouter.createCaller({ req: new Request("http://localhost"), resHeaders: new Headers() });

beforeEach(() => {
  vi.clearAllMocks();
  assertAdmin.mockResolvedValue(undefined);
});

describe("offres — réservé à l'administration", () => {
  it("ne montre ni ne modifie rien sans un jeton d'administration valide", async () => {
    assertAdmin.mockRejectedValue(new TRPCError({ code: "UNAUTHORIZED" }));
    await expect(caller.list({ token: "faux" })).rejects.toThrow();
    await expect(caller.contact({ token: "faux", customerId: "20123456", contacted: true })).rejects.toThrow();
    await expect(caller.retirer({ token: "faux", phone: "20123456" })).rejects.toThrow();
    await expect(caller.enregistrerMessage({ token: "faux", texte: "Offre" })).rejects.toThrow();
    expect(getOffresList).not.toHaveBeenCalled();
    expect(marquerContactOffres).not.toHaveBeenCalled();
    expect(retirerDesOffres).not.toHaveBeenCalled();
    expect(enregistrerMessageOffres).not.toHaveBeenCalled();
  });

  it("n'offre aucun moyen d'ajouter quelqu'un à la liste", () => {
    // On n'entre dans la liste qu'en cochant la case du formulaire de
    // commande. Le jour où une procédure « ajouter » apparaît ici, ce test
    // oblige à relire contracts/offres.ts avant.
    expect(Object.keys(offresRouter._def.procedures).sort()).toEqual([
      "contact",
      "enregistrerMessage",
      "list",
      "retirer",
    ]);
  });
});

describe("offres — les gestes", () => {
  it("n'accepte comme identifiant que les huit chiffres d'un numéro", async () => {
    for (const customerId of ["", "2012345", "201234567", "+2162012", "abcdefgh"]) {
      await expect(caller.contact({ token: "t", customerId, contacted: true })).rejects.toThrow();
    }
    expect(marquerContactOffres).not.toHaveBeenCalled();
  });

  // STOP arrive par WhatsApp, d'un numéro, souvent dans l'heure qui suit le
  // message : la cliente n'est alors plus dans la liste du jour. Le retrait
  // prend donc le numéro tel qu'on le lit dans la conversation.
  it("retire par numéro, quel que soit le format dans lequel il est collé", async () => {
    for (const phone of ["20123456", "20 123 456", "+216 20 123 456", "0021620123456", "216-20-123-456"]) {
      await expect(caller.retirer({ token: "t", phone })).resolves.toEqual({ retire: true });
    }
    expect(retirerDesOffres.mock.calls.map((c) => c[0])).toEqual(Array(5).fill("20123456"));
  });

  it("refuse un numéro illisible au lieu de retirer n'importe qui", async () => {
    for (const phone of ["2012345", "abc", "+33 6 12 34 56 78", "201234567"]) {
      await expect(caller.retirer({ token: "t", phone })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(retirerDesOffres).not.toHaveBeenCalled();
  });

  it("dit quand le numéro n'était pas dans la liste : rien n'a été retiré", async () => {
    retirerDesOffres.mockResolvedValueOnce("absent");
    await expect(caller.retirer({ token: "t", phone: "20123456" })).resolves.toEqual({ retire: false });
  });

  it("note un contact, et l'annule", async () => {
    await caller.contact({ token: "t", customerId: "20123456", contacted: true });
    await caller.contact({ token: "t", customerId: "20123456", contacted: false });
    expect(marquerContactOffres.mock.calls).toEqual([
      ["20123456", true],
      ["20123456", false],
    ]);
  });

  it("dit qu'un retrait n'a PAS été enregistré, au lieu de laisser croire qu'il l'est", async () => {
    retirerDesOffres.mockResolvedValueOnce("echec");
    await expect(caller.retirer({ token: "t", phone: "20123456" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller.retirer({ token: "t", phone: "20123456" })).resolves.toEqual({ retire: true });
  });

  it("dit qu'un contact n'a pas été noté", async () => {
    marquerContactOffres.mockResolvedValueOnce(false);
    await expect(caller.contact({ token: "t", customerId: "20123456", contacted: true })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rend le message tel qu'il a été enregistré", async () => {
    await expect(caller.enregistrerMessage({ token: "t", texte: "  Offre de la semaine.  " })).resolves.toEqual({
      message: "Offre de la semaine.",
    });
  });
});
