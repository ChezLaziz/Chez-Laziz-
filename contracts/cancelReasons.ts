// Pourquoi une commande meurt.
//
// Sur du paiement à la livraison, l'annulation EST le coût principal : le
// colis est préparé, parfois expédié, et rien n'est encaissé. Pourtant la
// boutique n'en savait rien — les commandes annulées ne portaient aucune
// raison, donc aucune décision publicitaire ne pouvait s'y appuyer.
//
// Quatre choix, pas douze : une liste qu'on lit d'un coup d'œil sur un
// téléphone est une liste qu'on remplit vraiment. « autre » n'existe pas
// volontairement — il attire tout et n'apprend rien.

export const CANCEL_REASONS = [
  { code: "sans_reponse", ar: "ما جابش تليفون" },
  { code: "change_avis", ar: "بدّل رايو" },
  { code: "trop_cher", ar: "الثمن غالي" },
  { code: "faux_numero", ar: "نمرة غالطة" },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]["code"];

export function isCancelReason(value: unknown): value is CancelReason {
  return CANCEL_REASONS.some((r) => r.code === value);
}

/** Le libellé arabe d'une raison. Une raison absente n'est PAS « autre » :
 * c'est une annulation d'avant ce champ, et on le dit. */
export function cancelReasonAr(code: string | null | undefined): string | null {
  return CANCEL_REASONS.find((r) => r.code === code)?.ar ?? null;
}
