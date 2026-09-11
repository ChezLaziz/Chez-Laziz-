/** Le pluriel arabe, qui n'a rien d'un « s » ajouté à la fin.
 *
 * L'arabe compte en quatre temps : un, deux, un petit nombre (3 à 10), puis
 * beaucoup (11 et au-delà, avec l'accusatif singulier). Écrire « 5 عنصر »
 * comme on écrirait « 5 article » sonne faux à toute personne qui lit
 * l'arabe — et c'est justement la moitié des clients visés par la
 * publicité. La barre de commande l'affichait pendant tout le tunnel. */
export type ArabicForms = {
  /** 1 — عنصر */
  un: string;
  /** 2 — عنصران (duel) */
  deux: string;
  /** 3 à 10 — عناصر (pluriel de petit nombre) */
  peu: string;
  /** 11 et plus — عنصرًا (accusatif singulier) */
  beaucoup: string;
};

export function pluralAr(n: number, forms: ArabicForms): string {
  const abs = Math.abs(Math.trunc(n));
  // Zéro se compte comme un petit nombre : « 0 عناصر », jamais « 0 عنصرًا ».
  if (abs === 0) return forms.peu;
  if (abs === 1) return forms.un;
  if (abs === 2) return forms.deux;
  if (abs >= 3 && abs <= 10) return forms.peu;
  return forms.beaucoup;
}

const ARTICLES: ArabicForms = {
  un: "عنصر",
  deux: "عنصران",
  peu: "عناصر",
  beaucoup: "عنصرًا",
};

/** « 1 عنصر », « 2 عنصران », « 5 عناصر », « 12 عنصرًا ». */
export function itemsLabelAr(n: number): string {
  return `${n} ${pluralAr(n, ARTICLES)}`;
}
