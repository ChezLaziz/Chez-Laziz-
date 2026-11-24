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

// `ar` est ce que l'équipe choisit, sur Telegram comme dans le carnet de
// commandes. `fr` est le même mot pour le tableau de bord, qui est en
// français — court, parce qu'il partage sa ligne avec un nombre.
export const CANCEL_REASONS = [
  { code: "sans_reponse", ar: "ما جابش تليفون", fr: "Ne répond pas" },
  { code: "change_avis", ar: "بدّل رايو", fr: "A changé d'avis" },
  { code: "trop_cher", ar: "الثمن غالي", fr: "Trop cher" },
  { code: "faux_numero", ar: "نمرة غالطة", fr: "Faux numéro" },
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

/** Le même libellé en français, pour le tableau de bord. */
export function cancelReasonFr(code: string | null | undefined): string | null {
  return CANCEL_REASONS.find((r) => r.code === code)?.fr ?? null;
}
