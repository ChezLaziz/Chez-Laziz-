import { getFixedPack, packIsAvailable } from "./packs";

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
 * LE PRIX D'UN PACK NE DÉPEND PAS DU CATALOGUE, MAIS SA PRÉPARATION SI.
 * Un pack prêt survivait donc toujours ici — alors que le serveur, lui, le
 * REFUSE dès qu'un seul de ses makroudh manque (voir packIsAvailable et
 * api/ordersRouter.ts). Le client ajoutait un coffret lundi, un produit
 * était masqué mardi depuis l'admin, et il remplissait ses six champs pour
 * se faire refuser au dernier geste, au moment exact où il avait déjà
 * décidé d'acheter. On applique ici la règle du serveur, tant qu'on a de
 * quoi la vérifier.
 *
 * ATTENTION À L'APPELANT : avec un ensemble vide, RIEN n'est résoluble. Ne
 * jamais appeler cette fonction tant que le catalogue n'a pas réellement été
 * chargé — sinon une panne réseau viderait le panier d'un vrai client. Même
 * prudence pour les noms : sans eux, on ne juge pas un pack, on le garde. */
export function lineIsResolvable(
  line: PrunableLine,
  availableProductIds: ReadonlySet<number>,
  availableProductNames?: ReadonlySet<string>,
): boolean {
  if (line.kind === "pack") {
    if (!availableProductNames) return true;
    const pack = getFixedPack(line.packId);
    // Pack retiré du code depuis que ce panier a été composé : introuvable,
    // donc impossible à chiffrer.
    if (!pack) return false;
    return packIsAvailable(pack, availableProductNames);
  }
  if (line.kind === "product") return availableProductIds.has(line.productId);
  return line.productIds.every((id) => availableProductIds.has(id));
}

/** Les lignes que ce catalogue ne sait plus chiffrer. */
export function unresolvableLines<T extends PrunableLine>(
  lines: readonly T[],
  availableProductIds: Iterable<number>,
  availableProductNames?: Iterable<string>,
): T[] {
  const ids = new Set(availableProductIds);
  const names = availableProductNames ? new Set(availableProductNames) : undefined;
  return lines.filter((l) => !lineIsResolvable(l, ids, names));
}
