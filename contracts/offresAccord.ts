/** La case « offres sur WhatsApp » du formulaire de commande : son texte, et
 * rien d'autre.
 *
 * Ce fichier est le seul morceau des offres que charge la page de commande.
 * Il n'importe rien, exprès : tout le reste (la liste, le registre, le
 * message) vit dans contracts/offres.ts et ne sert qu'à l'administration. */

export type OffresLang = "fr" | "ar";

/** Le texte de la case, mot pour mot. C'est LUI que la personne accepte :
 * le changer, c'est changer ce à quoi elle a dit oui. Toute retouche doit
 * donc augmenter OFFRES_ACCORD_VERSION, pour qu'on sache toujours quelle
 * phrase chacun a lue. */
export const OFFRES_ACCORD_VERSION = 1;
export const OFFRES_ACCORD_TEXTE: Record<OffresLang, string> = {
  fr: "Je veux recevoir les nouveautés et les offres de Chez Laziz sur WhatsApp. Facultatif, et j'arrête quand je veux.",
  ar: "أرغب في استلام جديد وعروض «عند لعزيز» على واتساب. اختياري، وأوقفه متى شئت.",
};

/** Trois semaines entre deux offres à la même personne. La page de
 * confidentialité l'annonce : c'est une promesse, pas un réglage. */
export const OFFRES_ECART_JOURS = 21;
