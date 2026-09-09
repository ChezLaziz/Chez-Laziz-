/** Le numéro tunisien tel que les gens l'écrivent VRAIMENT.
 *
 * Le formulaire n'acceptait qu'une seule graphie : huit chiffres, ou « 216 »
 * suivi de huit chiffres. Deux vrais clients étaient donc refusés :
 *
 *  - celui qui écrit « 00216 23 691 039 », la forme internationale imprimée
 *    sur les cartes de visite et recopiée depuis WhatsApp ;
 *  - celui dont le numéro local COMMENCE par 216 — « 21 612 345 » est un
 *    numéro tunisien parfaitement valide. L'ancienne règle lui coupait ses
 *    trois premiers chiffres et déclarait le reste trop court.
 *
 * Et c'était incohérent avec le reste du système : carrierPhone(), qui
 * prépare le numéro pour le transporteur, garde simplement les huit
 * derniers chiffres. Le formulaire refusait donc des numéros que la
 * livraison aurait traités sans broncher.
 *
 * On ne juge pas le préfixe (2, 4, 5, 9 pour le mobile, 7 pour le fixe) :
 * un opérateur peut en ouvrir un nouveau demain, et refuser un client pour
 * un chiffre coûte plus cher que d'accepter un numéro douteux — qu'un
 * humain rappellera de toute façon avant de préparer la commande. */
export function tunisianLocalPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // On ne retire l'indicatif QUE s'il reste ensuite un numéro complet :
  // sinon « 21612345 » perdrait ses trois premiers chiffres.
  if (digits.length === 11 && digits.startsWith("216")) digits = digits.slice(3);
  return digits.length === 8 ? digits : null;
}

export function isValidTunisianPhone(raw: string): boolean {
  return tunisianLocalPhone(raw) !== null;
}
