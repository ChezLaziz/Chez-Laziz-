import { describe, it, expect } from "vitest";
import {
  buildTpePayload,
  dinars,
  readTpeCreated,
  refusalToSend,
  TPE_RETURN_FEE_DINARS,
  type TpeDestination,
} from "./tpeShipment";
import type { ShippableOrder } from "./carriers";

/** La commande #21, telle qu'elle est réellement en base, et la requête que
 * l'interface de Team Parcel Express a réellement envoyée pour elle. Ces
 * tests comparent ce que NOUS produirions à ce qu'EUX ont produit. */
const NAWEL: ShippableOrder = {
  id: 21,
  customerName: "Nawel TLILI",
  phone: "21144513",
  governorate: "Gafsa",
  city: "Gafsa",
  address: "Sidi Ahmed Zarroug (prés du bureau de poste), 2112 Gafsa",
  postalCode: null,
  items: [
    { name: "Makroudh Jwayed", weightKg: 1, qty: 1 },
    { name: "Makroudh Laziz – Fruits Secs", weightKg: 0.5, qty: 1 },
    { name: "Makroudh au Blé", weightKg: 0.5, qty: 1 },
    { name: "Makroudh aux Amandes", weightKg: 0.5, qty: 1 },
    { name: "Makroudh Laziz aux Dattes", weightKg: 0.5, qty: 1 },
  ],
  subtotalMillimes: 39000,
  deliveryFeeMillimes: 8000,
  totalMillimes: 47000,
  paymentMethod: "cod",
  paymentStatus: "pending",
  note: null,
};

/** Gafsa = 6, Gafsa Sud = 8 — les identifiants de leur propre table. */
const GAFSA_SUD: TpeDestination = { governorateId: "6", delegationId: "8" };

const build = (o: Partial<ShippableOrder> = {}) =>
  buildTpePayload({ ...NAWEL, ...o }, GAFSA_SUD);

describe("dinars — les montants ne sont PAS en millimes", () => {
  it("convertit et écrit comme un humain", () => {
    // 47000 millimes envoyés tels quels réclameraient 47 000 dinars.
    expect(dinars(47000)).toBe("47");
    expect(dinars(47500)).toBe("47.500");
    expect(dinars(0)).toBe("0");
  });
});

describe("buildTpePayload — la commande #21 face à leur vraie requête", () => {
  it("reproduit la destination par identifiants", () => {
    const p = build();
    expect(p.governorate).toBe(6);
    expect(p.delegation).toBe(8);
  });

  it("reproduit l'adresse ligne pour ligne", () => {
    // Leur interface a envoyé « …2112 Gafsa, Gafsa, Gafsa ».
    expect(build().address).toBe(
      "Sidi Ahmed Zarroug (prés du bureau de poste), 2112 Gafsa, Gafsa, Gafsa",
    );
  });

  it("reproduit les montants", () => {
    const p = build();
    expect(p.price_ttc).toBe("47");
    expect(p.price_delivery).toBe(8);
    expect(p.price_return).toBe(TPE_RETURN_FEE_DINARS);
    expect(p.payment_method).toBe(0);
  });

  it("reproduit le téléphone à 8 chiffres", () => {
    expect(build({ phone: "+216 21 144 513" }).phone1).toBe("21144513");
  });

  it("garde le makroudh fragile et ouvrable", () => {
    const p = build();
    expect(p.is_fragile).toBe(true);
    expect(p.can_open_package).toBe(true);
  });

  it("détaille les articles au lieu d'une ligne fourre-tout", () => {
    const p = build();
    expect(p.products).toHaveLength(5);
    expect(p.products[0]).toEqual({ product: "Makroudh Jwayed", quantity: "1" });
  });

  it("porte notre référence, pour relier le colis à la commande", () => {
    expect(build().external_id).toBe("CL-21");
  });
});

describe("buildTpePayload — l'argent", () => {
  it("ENVOIE ZÉRO pour une commande D17 déjà approuvée", () => {
    // La règle la plus dangereuse du projet : sans elle, un client qui a
    // déjà payé par D17 paierait une deuxième fois au livreur.
    const p = build({ paymentMethod: "d17", paymentStatus: "approved" });
    expect(p.price_ttc).toBe("0");
  });

  it("fait quand même encaisser un D17 encore à vérifier", () => {
    // Non vérifié n'est pas payé.
    const p = build({ paymentMethod: "d17", paymentStatus: "pending_verification" });
    expect(p.price_ttc).toBe("47");
  });

  it("envoie le total pour un paiement en espèces", () => {
    expect(build({ paymentStatus: "pending" }).price_ttc).toBe("47");
  });
});

describe("buildTpePayload — le poids", () => {
  it("envoie le poids réel quand tous les articles en ont un", () => {
    expect(build().weight).toBe(3);
  });

  it("envoie null plutôt qu'un poids sous-estimé", () => {
    const p = build({ items: [{ name: "Coffret", qty: 1 }] });
    expect(p.weight).toBeNull();
  });
});

describe("refusalToSend — ce qu'on refuse d'envoyer", () => {
  it("laisse passer une commande complète", () => {
    expect(refusalToSend(NAWEL, GAFSA_SUD)).toBeNull();
  });

  it("REFUSE une commande déjà partie — jamais deux colis pour une commande", () => {
    expect(refusalToSend({ ...NAWEL, trackingNumber: "26487543" }, GAFSA_SUD)).toBe(
      "already_sent",
    );
  });

  it("refuse quand la ville n'est reliée à aucune délégation", () => {
    expect(refusalToSend(NAWEL, null)).toBe("no_delegation");
  });

  it("refuse une commande annulée", () => {
    expect(refusalToSend({ ...NAWEL, status: "annulee" }, GAFSA_SUD)).toBe("cancelled");
  });

  it("refuse un téléphone inexploitable et une adresse vide", () => {
    expect(refusalToSend({ ...NAWEL, phone: "123" }, GAFSA_SUD)).toBe("no_phone");
    expect(refusalToSend({ ...NAWEL, address: "  " }, GAFSA_SUD)).toBe("no_address");
  });

  it("voit le doublon AVANT tout le reste", () => {
    // Un colis déjà parti reste un doublon même si la commande a d'autres
    // défauts : c'est ce refus-là qui doit sortir.
    expect(
      refusalToSend({ ...NAWEL, trackingNumber: "26487543", phone: "1" }, null),
    ).toBe("already_sent");
  });
});

describe("readTpeCreated — leur réponse", () => {
  it("lit le numéro de colis réellement renvoyé", () => {
    const r = readTpeCreated({
      id: "26487543",
      status: 0,
      external_id: null,
      phone1: "21144513",
    });
    expect(r).toEqual({ trackingNumber: "26487543", externalId: null });
  });

  it("accepte un identifiant numérique", () => {
    expect(readTpeCreated({ id: 26487543 })?.trackingNumber).toBe("26487543");
  });

  it("remonte notre référence si le transporteur la conserve", () => {
    expect(readTpeCreated({ id: "1", external_id: "CL-21" })?.externalId).toBe("CL-21");
  });

  it("renvoie null plutôt qu'un faux numéro de suivi", () => {
    // Le colis existe peut-être ; inscrire un numéro inventé sur la commande
    // le rendrait introuvable.
    expect(readTpeCreated(null)).toBeNull();
    expect(readTpeCreated({ detail: "Invalid token." })).toBeNull();
    expect(readTpeCreated({ id: "" })).toBeNull();
  });
});
