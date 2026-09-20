import { describe, expect, it } from "vitest";
import {
  LAST_ORDER_TTL_MS,
  parseLastOrder,
  serializeLastOrder,
  type LastOrder,
} from "./lastOrder";

const MAINTENANT = 1_700_000_000_000;
const commande: LastOrder = {
  id: 4242,
  totalMillimes: 30000,
  subtotalMillimes: 22000,
  address: "12 rue des Oliviers, La Marsa, Tunis",
  at: MAINTENANT - 60_000,
};

describe("parseLastOrder", () => {
  it("relit ce qu'on vient d'écrire", () => {
    expect(parseLastOrder(serializeLastOrder(commande), MAINTENANT)).toEqual(commande);
  });

  it("oublie au bout d'une heure : une vieille confirmation ferait croire à une commande qui n'existe pas", () => {
    const vieille = { ...commande, at: MAINTENANT - LAST_ORDER_TTL_MS - 1 };
    expect(parseLastOrder(serializeLastOrder(vieille), MAINTENANT)).toBeNull();
    // juste avant l'échéance, elle compte encore
    const limite = { ...commande, at: MAINTENANT - LAST_ORDER_TTL_MS + 1000 };
    expect(parseLastOrder(serializeLastOrder(limite), MAINTENANT)).not.toBeNull();
  });

  it("refuse une trace datée du futur (horloge déréglée)", () => {
    const futur = { ...commande, at: MAINTENANT + 60_000 };
    expect(parseLastOrder(serializeLastOrder(futur), MAINTENANT)).toBeNull();
  });

  it("refuse l'absence, le charabia et les objets à trous", () => {
    expect(parseLastOrder(null, MAINTENANT)).toBeNull();
    expect(parseLastOrder("", MAINTENANT)).toBeNull();
    expect(parseLastOrder("{pas du json", MAINTENANT)).toBeNull();
    expect(parseLastOrder("[]", MAINTENANT)).toBeNull();
    expect(parseLastOrder(JSON.stringify({ id: 1 }), MAINTENANT)).toBeNull();
    expect(parseLastOrder(JSON.stringify({ ...commande, id: 0 }), MAINTENANT)).toBeNull();
    expect(parseLastOrder(JSON.stringify({ ...commande, id: "4242" }), MAINTENANT)).toBeNull();
    expect(parseLastOrder(JSON.stringify({ ...commande, totalMillimes: null }), MAINTENANT)).toBeNull();
    // le sous-total est rangé, jamais déduit : sans lui, on ne réaffiche rien
    expect(parseLastOrder(JSON.stringify({ ...commande, subtotalMillimes: undefined }), MAINTENANT)).toBeNull();
  });

  it("tolère une adresse manquante — le numéro de commande est l'essentiel", () => {
    const sansAdresse = parseLastOrder(
      JSON.stringify({ id: 7, totalMillimes: 18000, subtotalMillimes: 10000, at: MAINTENANT }),
      MAINTENANT,
    );
    expect(sansAdresse).toEqual({
      id: 7,
      totalMillimes: 18000,
      subtotalMillimes: 10000,
      address: "",
      at: MAINTENANT,
    });
  });
});
