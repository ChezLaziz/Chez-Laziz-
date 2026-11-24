/** Les demi-caractères : la moitié d'un emoji (ou de tout caractère codé sur
 * deux unités), laissée par une coupe de longueur ou un collage abîmé.
 *
 * POURQUOI un fichier pour si peu. `encodeURIComponent` LÈVE sur eux
 * (« URI malformed »). Or tous les liens WhatsApp de la boutique passent
 * par lui, avec un texte venu d'un formulaire public — le nom de la
 * cliente — qu'on borne par un `slice`. Un nom d'un seul tenant, vingt-trois
 * unités puis un emoji, et le `slice` coupe l'emoji en deux :
 *
 *  — la notification Telegram de la commande ne partait pas (le bouton
 *    « واتساب للحريف » se fabrique avec ce lien) ;
 *  — la page « Suivi des colis » ne s'ouvrait plus pour personne, tant que
 *    cette commande restait dans sa fenêtre.
 *
 * Une cliente distraite, ou quelqu'un qui le fait exprès. On retire donc
 * les moitiés orphelines partout où un texte est coupé avant d'aller dans
 * un lien. */
export function sansDemiCaracteres(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const suivant = s.charCodeAt(i + 1);
      if (suivant >= 0xdc00 && suivant <= 0xdfff) {
        out += s.slice(i, i + 2);
        i++;
      }
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue;
    out += s[i];
  }
  return out;
}
