import { describe, expect, it } from "vitest";
import { orderConfirmMessage, orderConfirmWhatsAppUrl } from "./orderConfirmWhatsApp";

const commande = { id: 484, customerName: "Amina Hamdi", phone: "23 691 039", totalMillimes: 45400 };

describe("orderConfirmMessage — ce que le client lit", () => {
  it("porte le prénom, le numéro de commande et le montant À PAYER (livraison comprise)", () => {
    const texte = orderConfirmMessage(commande);
    expect(texte).toContain("عسلامة Amina");
    expect(texte).toContain("رقم 484");
    expect(texte).toContain("45,4 د.ت");
    expect(texte).toContain("الدفع عند التوصيل");
  });

  it("demande une réponse d'un seul mot", () => {
    expect(orderConfirmMessage(commande)).toContain("«نعم»");
  });

  it("garde un prénom écrit en arabe tel quel", () => {
    expect(orderConfirmMessage({ ...commande, customerName: "علاء عثماني" })).toContain("عسلامة علاء");
  });

  it("salue sans nom quand le champ n'en contient pas", () => {
    const texte = orderConfirmMessage({ ...commande, customerName: "  12345 " });
    expect(texte.startsWith("عسلامة 👋")).toBe(true);
  });

  it("reste court : il doit tenir dans un lien", () => {
    expect(orderConfirmMessage(commande).length).toBeLessThan(220);
  });
});

describe("orderConfirmWhatsAppUrl — vers le client, jamais vers un inconnu", () => {
  it("se fabrique quel que soit le nom tapé : sans lui, la commande ne sonne pas sur Telegram", () => {
    // Le clavier de la notification appelle cette fonction. Un nom d'un seul
    // tenant coupé au milieu d'un emoji faisait lever encodeURIComponent, et
    // la notification de CETTE commande ne partait pas.
    const piege = { ...commande, customerName: "Amina" + "😀".repeat(15) };
    expect(() => orderConfirmWhatsAppUrl(piege)).not.toThrow();
    expect(orderConfirmWhatsAppUrl(piege)).toMatch(/^https:\/\/wa\.me\/21623691039\?text=/);
  });

  it("ouvre le numéro tunisien complet, quel que soit le format saisi", () => {
    for (const phone of ["23691039", "23 691 039", "+216 23 691 039", "0021623691039"]) {
      expect(orderConfirmWhatsAppUrl({ ...commande, phone })).toMatch(/^https:\/\/wa\.me\/21623691039\?text=/);
    }
  });

  it("un numéro local qui commence par 216 garde ses huit chiffres", () => {
    expect(orderConfirmWhatsAppUrl({ ...commande, phone: "21 612 345" })).toMatch(
      /^https:\/\/wa\.me\/21621612345\?text=/,
    );
  });

  it("encode le message entier — retours à la ligne et arabe compris", () => {
    const url = orderConfirmWhatsAppUrl(commande)!;
    const texte = decodeURIComponent(url.split("?text=")[1]!);
    expect(texte).toBe(orderConfirmMessage(commande));
    expect(url).not.toContain(" ");
    expect(url).not.toContain("\n");
  });

  it("reste sous la limite d'une URL de bouton", () => {
    expect(orderConfirmWhatsAppUrl(commande)!.length).toBeLessThan(2000);
  });

  it("rend null sur un numéro inexploitable : pas de bouton plutôt qu'un mauvais destinataire", () => {
    expect(orderConfirmWhatsAppUrl({ ...commande, phone: "12345" })).toBeNull();
    expect(orderConfirmWhatsAppUrl({ ...commande, phone: "+33 6 12 34 56 78" })).toBeNull();
    expect(orderConfirmWhatsAppUrl({ ...commande, phone: "" })).toBeNull();
  });
});
