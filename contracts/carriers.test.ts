import { describe, it, expect } from "vitest";
import {
  amountToCollectMillimes,
  buildCsv,
  carrierPhone,
  EXPORT_COLUMNS,
  exportRow,
  fullAddress,
  hasCompleteWeight,
  isCarrierKey,
  packageContents,
  totalWeightKg,
  type ShippableOrder,
} from "./carriers";

function order(over: Partial<ShippableOrder> = {}): ShippableOrder {
  return {
    id: 21,
    customerName: "Nawel TLILI",
    phone: "21144513",
    governorate: "Gafsa",
    city: "Gafsa",
    address: "Cité Ennour, rue 12",
    postalCode: "2100",
    items: [{ name: "Makroudh aux dattes", weightKg: 1, qty: 1 }],
    subtotalMillimes: 39000,
    deliveryFeeMillimes: 8000,
    totalMillimes: 47000,
    paymentMethod: "cod",
    paymentStatus: "pending",
    note: null,
    ...over,
  };
}

describe("carrierPhone", () => {
  it("garde les 8 chiffres nationaux quelle que soit la saisie", () => {
    expect(carrierPhone("21144513")).toBe("21144513");
    expect(carrierPhone("+216 21 144 513")).toBe("21144513");
    expect(carrierPhone("0021621144513")).toBe("21144513");
    expect(carrierPhone("21 144 513")).toBe("21144513");
  });

  it("refuse un numéro trop court au lieu d'en fabriquer un", () => {
    expect(carrierPhone("1234")).toBeNull();
    expect(carrierPhone("")).toBeNull();
  });
});

describe("amountToCollectMillimes", () => {
  it("fait encaisser le total sur une commande en espèces", () => {
    expect(amountToCollectMillimes(order())).toBe(47000);
  });

  it("N'ENCAISSE RIEN sur une commande D17 déjà approuvée", () => {
    // Le piège le plus coûteux du module : envoyer 47 DT au transporteur
    // pour une commande déjà payée ferait payer le client deux fois.
    const o = order({ paymentMethod: "d17", paymentStatus: "approved" });
    expect(amountToCollectMillimes(o)).toBe(0);
  });

  it("n'encaisse rien non plus sur une commande déjà encaissée", () => {
    expect(amountToCollectMillimes(order({ paymentStatus: "paid" }))).toBe(0);
  });

  it("encaisse bien une D17 non encore vérifiée : l'argent n'est pas confirmé", () => {
    const o = order({ paymentMethod: "d17", paymentStatus: "pending_verification" });
    expect(amountToCollectMillimes(o)).toBe(47000);
  });
});

describe("poids", () => {
  it("additionne poids et quantités", () => {
    const items = [
      { name: "A", weightKg: 1.5, qty: 2 },
      { name: "B", weightKg: 0.5, qty: 1 },
    ];
    expect(totalWeightKg(items)).toBeCloseTo(3.5);
    expect(hasCompleteWeight(items)).toBe(true);
  });

  it("compte une ligne sans poids pour zéro, et le signale", () => {
    // Un poids absent est sous-estimé et visible, jamais deviné.
    const items = [
      { name: "A", weightKg: 1, qty: 1 },
      { name: "Pack sans poids", qty: 1 },
    ];
    expect(totalWeightKg(items)).toBe(1);
    expect(hasCompleteWeight(items)).toBe(false);
  });

  it("ne dit pas « poids complet » sur une commande sans article", () => {
    expect(hasCompleteWeight([])).toBe(false);
  });
});

describe("adresse et contenu", () => {
  it("assemble l'adresse sans virgule vide", () => {
    expect(fullAddress(order())).toBe("Cité Ennour, rue 12, Gafsa, 2100, Gafsa");
  });

  it("saute un code postal absent au lieu de laisser un trou", () => {
    expect(fullAddress(order({ postalCode: null }))).toBe("Cité Ennour, rue 12, Gafsa, Gafsa");
  });

  it("décrit le colis en une ligne lisible", () => {
    const s = packageContents([
      { name: "Makroudh", weightKg: 1, qty: 2 },
      { name: "Pack", qty: 1 },
    ]);
    expect(s).toBe("2× Makroudh (1 kg) + 1× Pack");
  });
});

describe("exportRow", () => {
  it("porte notre référence, pour rapprocher colis et commande", () => {
    expect(exportRow(order()).ref).toBe("CL-21");
  });

  it("exprime le montant en dinars, pas en millimes", () => {
    // 47 000 millimes = 47 DT. Envoyer « 47000 » ferait réclamer 47 000 DT.
    expect(exportRow(order()).price_ttc).toBe("47.000");
  });

  it("met le montant à zéro quand la commande est déjà payée", () => {
    const o = order({ paymentMethod: "d17", paymentStatus: "approved" });
    expect(exportRow(o).price_ttc).toBe("0.000");
  });

  it("normalise le téléphone", () => {
    expect(exportRow(order({ phone: "+216 21 144 513" })).phone1).toBe("21144513");
  });

  it("garde le numéro brut si trop court, plutôt que de vider la case", () => {
    // Une case vide ferait perdre le seul moyen de joindre le client ;
    // un numéro douteux visible se corrige à la main.
    expect(exportRow(order({ phone: "1234" })).phone1).toBe("1234");
  });
});

describe("buildCsv", () => {
  it("écrit l'en-tête puis une ligne par commande", () => {
    const csv = buildCsv([order(), order({ id: 22 })]);
    const lines = csv.replace(/^\uFEFF/, "").trim().split("\r\n");
    expect(lines[0]).toBe(EXPORT_COLUMNS.join(";"));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("CL-21");
    expect(lines[2]).toContain("CL-22");
  });

  it("protège une adresse contenant une virgule", () => {
    // Sans guillemets, « Cité Ennour, rue 12 » décale toutes les colonnes
    // suivantes et le colis part à la mauvaise adresse.
    const csv = buildCsv([order()]);
    expect(csv).toContain('"Cité Ennour, rue 12"');
  });

  it("protège un champ contenant un point-virgule ou un guillemet", () => {
    const csv = buildCsv([order({ note: 'Livrer avant 18h; sonner "fort"' })]);
    expect(csv).toContain('"Livrer avant 18h; sonner ""fort"""');
  });

  it("commence par un BOM UTF-8, sinon Excel casse les accents", () => {
    expect(buildCsv([order()]).charCodeAt(0)).toBe(0xfeff);
  });

  it("produit un fichier valide même sans aucune commande", () => {
    const csv = buildCsv([]);
    expect(csv.replace(/^\uFEFF/, "").trim()).toBe(EXPORT_COLUMNS.join(";"));
  });
});

describe("isCarrierKey", () => {
  it("n'accepte que les deux transporteurs réels", () => {
    expect(isCarrierKey("tpe")).toBe(true);
    expect(isCarrierKey("jetpack")).toBe(true);
    expect(isCarrierKey("firstdelivery")).toBe(false);
    expect(isCarrierKey("")).toBe(false);
  });
});

describe("colonne delegation", () => {
  const col = EXPORT_COLUMNS.indexOf("delegation");

  it("porte l'identifiant du transporteur quand il est établi", () => {
    const csv = buildCsv([order({ id: 30 })], () => "12");
    expect(csv.trim().split("\r\n")[1]!.split(";")[col]).toBe("12");
  });

  it("reste VIDE quand la ville n'est pas reliée — jamais approchée", () => {
    // Une case vide se voit au dépôt ; un mauvais numéro fait partir le colis
    // dans une autre ville sans que personne ne s'en aperçoive.
    const csv = buildCsv([order({ id: 30 })], () => null);
    expect(csv.trim().split("\r\n")[1]!.split(";")[col]).toBe("");
  });

  it("reste vide si aucune correspondance n'est fournie", () => {
    const csv = buildCsv([order({ id: 30 })]);
    expect(csv.trim().split("\r\n")[1]!.split(";")[col]).toBe("");
  });
});
