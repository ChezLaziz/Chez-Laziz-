/** Le prénom avec lequel on salue une cliente dans un message — ou rien.
 *
 * Le champ « nom » du formulaire est libre : on y lit « Amina Hamdi », mais
 * aussi « Mme Hamdi », « بن علي محمد » ou « عبد الله ». Prendre le premier
 * mot sans regarder donnait « عسلامة Mme 👋 » ou « عسلامة عبد 👋 » : un
 * message qui se voit écrit par une machine, envoyé au nom de la boutique.
 *
 * La règle est volontairement prudente : dès que le premier mot est un
 * titre ou une particule, on salue SANS nom. Un « عسلامة 👋 » tout court ne
 * choque personne ; un prénom faux, si. On ne cherche pas à deviner le bon
 * mot plus loin dans le champ — l'ordre nom/prénom n'est pas fiable. */

const TITRES_ET_PARTICULES = new Set([
  // Titres
  "m", "mr", "mme", "mlle", "madame", "monsieur", "mademoiselle", "dr", "docteur",
  "hadj", "haj", "hajj", "hajja", "hadja", "si", "sidi", "lalla",
  "السيد", "السيدة", "الآنسة", "سي", "سيدي", "للا", "الحاج", "الحاجة", "دكتور", "الدكتور", "الدكتورة",
  // Particules : le premier mot d'un nom de famille, ou la moitié d'un prénom composé
  "ben", "bin", "ibn", "bent", "bint", "bel", "bou", "abou", "abu", "abd", "abdel", "abdul", "el", "al", "ould",
  "بن", "ابن", "بنت", "بو", "أبو", "ابو", "عبد", "ال", "ولد",
]);

export function prenomPourSaluer(customerName: string): string {
  const mot = customerName.trim().split(/\s+/)[0] ?? "";
  if (!/\p{L}/u.test(mot)) return "";
  const cle = mot.toLowerCase().replace(/[.,:;]+$/, "");
  if (TITRES_ET_PARTICULES.has(cle)) return "";
  return mot.slice(0, 24);
}
