/** L'identifiant d'une ligne de commande, tel que Meta le voit.
 *
 * IL DOIT ÊTRE LE MÊME DES DEUX CÔTÉS. Le navigateur envoie AddToCart quand
 * le client ajoute au panier ; le serveur envoie Purchase quand la commande
 * est confirmée. Si les deux ne nomment pas le produit pareil, Meta croit
 * qu'il s'agit de deux articles distincts : le lien entre l'intérêt et
 * l'achat est rompu, le reciblage vise à côté et le catalogue publicitaire
 * se remplit de références fantômes.
 *
 * C'était le cas des packs sur mesure : le navigateur disait
 * « custom:12-3-7 », le serveur disait « custom ». Toutes les ventes de
 * packs sur mesure étaient donc rattachées à un article qui n'avait jamais
 * été ajouté à un panier.
 *
 * Les identifiants sont TRIÉS : deux clients qui choisissent les mêmes
 * quatre produits dans un ordre différent composent le même pack, et doivent
 * donc produire la même référence. */
export type MetaContentLine =
  | { kind: "product"; productId: number }
  | { kind: "pack"; packId: string }
  | { kind: "custom"; productIds: readonly number[] };

export function metaContentId(line: MetaContentLine): string {
  if (line.kind === "pack") return `pack:${line.packId}`;
  if (line.kind === "product") return String(line.productId);
  return `custom:${[...line.productIds].sort((a, b) => a - b).join("-")}`;
}
