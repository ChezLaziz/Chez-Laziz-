import { describe, it, expect } from "vitest";
import { whatsAppOrderMessage, whatsAppOrderUrl } from "./whatsappOrder";

const PANIER = [
  { label: "1 kg Makroudh Laziz aux Dattes", contents: [], totalMillimes: 8000 },
  { label: "0,5 kg Makroudh Blanc à la Pistache", contents: [], totalMillimes: 20000 },
];
const TOTAUX = { subtotalMillimes: 28000, deliveryMillimes: 8000, totalMillimes: 36000 };

describe("whatsAppOrderMessage", () => {
  it("écrit la commande à la place du client", () => {
    // Le point de tout l'exercice : il n'a rien à retaper.
    const m = whatsAppOrderMessage(PANIER, TOTAUX, "fr");
    expect(m).toContain("1 kg Makroudh Laziz aux Dattes — 8 DT");
    expect(m).toContain("0,5 kg Makroudh Blanc à la Pistache — 20 DT");
    expect(m).toContain("Livraison : 8 DT");
    expect(m).toContain("Total : 36 DT");
  });

  it("écrit en arabe quand la page est en arabe", () => {
    const m = whatsAppOrderMessage(PANIER, TOTAUX, "ar");
    expect(m).toContain("نحب نطلب");
    expect(m).toContain("36 د.ت");
    expect(m).not.toMatch(/Total|Livraison/);
  });

  it("détaille le contenu d'un pack", () => {
    const m = whatsAppOrderMessage(
      [{ label: "Pack Découverte", contents: ["Dattes — 500 g", "Pistache — 500 g"], totalMillimes: 45000 }],
      TOTAUX,
      "fr",
    );
    expect(m).toContain("Dattes — 500 g · Pistache — 500 g");
  });

  it("finit par une question — un message qui en pose une obtient une réponse", () => {
    expect(whatsAppOrderMessage(PANIER, TOTAUX, "fr").trimEnd()).toMatch(/\?$/);
    // « ؟ » (U+061F), le point d'interrogation arabe — pas le latin.
    expect(whatsAppOrderMessage(PANIER, TOTAUX, "ar").trimEnd()).toMatch(/\u061F$/);
  });

  it("reste utile avec un panier vide", () => {
    // Le bouton existe aussi en haut de page, avant tout ajout.
    expect(whatsAppOrderMessage([], TOTAUX, "ar")).toContain("نستفسر");
    expect(whatsAppOrderMessage([], TOTAUX, "fr")).toContain("informations");
  });

  it("écrit les prix en dinars, jamais en millimes", () => {
    // 8000 millimes affichés tels quels réclameraient huit mille dinars.
    const m = whatsAppOrderMessage(PANIER, TOTAUX, "fr");
    expect(m).not.toContain("8000");
    expect(m).not.toContain("36000");
  });

  it("gère un prix à décimales", () => {
    const m = whatsAppOrderMessage(
      [{ label: "0,5 kg", contents: [], totalMillimes: 12500 }],
      TOTAUX,
      "fr",
    );
    expect(m).toContain("12,5 DT");
  });
});

describe("whatsAppOrderUrl", () => {
  it("encode le message, sauts de ligne compris", () => {
    const url = whatsAppOrderUrl("21623691039", "Ligne 1\nLigne 2");
    expect(url.startsWith("https://wa.me/21623691039?text=")).toBe(true);
    // Sans encodage, le saut de ligne couperait le message.
    expect(url).toContain("%0A");
    expect(url).not.toContain("\n");
  });

  it("survit aux caractères arabes", () => {
    const url = whatsAppOrderUrl("21623691039", "المجموع : 36 د.ت");
    expect(decodeURIComponent(url.split("?text=")[1]!)).toBe("المجموع : 36 د.ت");
  });
});
