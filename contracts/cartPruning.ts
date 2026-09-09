/** Une ligne de panier réduite à ce qui décide de sa survie. */
export type PrunableLine =
  | { kind: "product"; productId: number }
  | { kind: "pack"; packId: string }
  | { kind: "custom"; productIds: number[] };

/** Cette ligne peut-elle encore être chiffrée avec ce catalogue ?
 *
 * Un panier vit des jours dans le navigateur du client. Entre-temps un
 * produit peut être supprimé ou masqué depuis l'admin. La ligne devient
 * alors introuvable : elle disparaît du récapitulatif MAIS reste comptée
 * dans le panier — le client voit « 1 article », un total de frais de port
 * seuls, et une commande vide. Impasse totale.
 *
 * Les packs prêts survivent toujours : leur prix est fixe (contracts/packs.ts)
 * et ne dépend pas du catalogue.
 *
 * ATTENTION À L'APPELANT : avec un ensemble vide, RIEN n'est résoluble. Ne
 * jamais appeler cette fonction tant que le catalogue n'a pas réellement été
 * chargé — sinon une panne réseau viderait le panier d'un vrai client. */
export function lineIsResolvable(
  line: PrunableLine,
  availableProductIds: ReadonlySet<number>,
): boolean {
  if (line.kind === "pack") return true;
  if (line.kind === "product") return availableProductIds.has(line.productId);
  return line.productIds.every((id) => availableProductIds.has(id));
}

/** Les lignes que ce catalogue ne sait plus chiffrer. */
export function unresolvableLines<T extends PrunableLine>(
  lines: readonly T[],
  availableProductIds: Iterable<number>,
): T[] {
  const ids = new Set(availableProductIds);
  return lines.filter((l) => !lineIsResolvable(l, ids));
}
