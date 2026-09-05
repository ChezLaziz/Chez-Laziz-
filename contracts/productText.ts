// Texte affiché d'un produit selon la langue, avec repli sur le français.
//
// Le catalogue est saisi en français depuis l'admin ; la traduction arabe
// est facultative, champ par champ. Un produit ajouté sans traduction doit
// rester lisible sur /ar plutôt que d'afficher un vide — d'où le repli
// systématique, ici et nulle part ailleurs, pour que tous les affichages
// (accueil, collection, commande, panier) se comportent identiquement.

export type TranslatableProduct = {
  name: string;
  description?: string | null;
  nameAr?: string | null;
  descriptionAr?: string | null;
};

export type TextLang = "fr" | "ar";

function pick(ar: string | null | undefined, fr: string): string {
  const trimmed = ar?.trim();
  return trimmed ? trimmed : fr;
}

export function productName(product: TranslatableProduct, lang: TextLang): string {
  return lang === "ar" ? pick(product.nameAr, product.name) : product.name;
}

export function productDescription(
  product: TranslatableProduct,
  lang: TextLang,
): string | null {
  const fr = product.description ?? null;
  if (lang !== "ar") return fr;
  const ar = product.descriptionAr?.trim();
  return ar ? ar : fr;
}
