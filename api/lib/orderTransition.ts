// Le passage d'une commande d'un état à l'autre — et tout ce qu'il déclenche.
//
// Un seul endroit, parce qu'une confirmation vient désormais de DEUX endroits :
// le tableau de bord et le bouton ✅ dans Telegram. Dupliquer ce qui suit,
// c'est garantir qu'un jour l'un des deux oubliera Meta ou la cuisine.

import type { OrderItem } from "../queries/orders";
import { markMetaPurchaseReported, updateOrderStatus } from "../queries/orders";
import { sendMetaPurchaseEvent, shouldReportMetaPurchase } from "./metaConversionsApi";
import { metaContentId } from "@contracts/metaContentId";
import { refreshKitchenBoard } from "./telegramKitchen";

export type OrderStatus = "nouvelle" | "en_preparation" | "prete" | "terminee" | "annulee";

/** Les références Meta d'une commande, identiques à celles que le Pixel du
 * navigateur a envoyées à l'ajout au panier — voir contracts/metaContentId.ts
 * pour ce que coûtait leur divergence. */
export function metaContentIds(items: OrderItem[]): string[] {
  return items.map((i) => {
    // Les champs d'OrderItem sont optionnels : les toutes premières commandes
    // n'avaient pas de `kind`. Une ligne qu'on ne sait pas nommer rend une
    // chaîne vide plutôt qu'une référence inventée — Meta ignorera la ligne,
    // ce qui vaut mieux que de lui apprendre un produit qui n'existe pas.
    if (i.kind === "pack") return i.packId ? metaContentId({ kind: "pack", packId: i.packId }) : "";
    if (i.kind === "custom") {
      const ids = (i.contents ?? [])
        .map((c) => c.productId)
        .filter((id): id is number => typeof id === "number");
      return ids.length > 0 ? metaContentId({ kind: "custom", productIds: ids }) : "";
    }
    return typeof i.productId === "number"
      ? metaContentId({ kind: "product", productId: i.productId })
      : "";
  });
}

/** Signale l'achat à Meta si (et seulement si) cette commande vient de
 * franchir le seuil de confirmation réelle — voir shouldReportMetaPurchase.
 * Ne lève jamais ; appelée après une mise à jour de statut/paiement. */
export async function maybeReportMetaPurchase(order: {
  id: number;
  phone: string;
  totalMillimes: number;
  items: string;
  paymentMethod: "cod" | "d17";
  status: "nouvelle" | "en_preparation" | "prete" | "terminee" | "annulee";
  metaPurchaseReportedAt: Date | null;
  customerName?: string;
  city?: string;
  governorate?: string;
  metaFbc?: string | null;
  metaFbp?: string | null;
  metaClientIp?: string | null;
  metaClientUserAgent?: string | null;
}): Promise<void> {
  if (!shouldReportMetaPurchase(order)) return;
  await markMetaPurchaseReported(order.id);
  let items: OrderItem[] = [];
  try {
    items = JSON.parse(order.items);
  } catch {
    // ignore — contentIds vides plutôt que de bloquer l'envoi
  }
  void sendMetaPurchaseEvent({
    signals: {
      fbc: order.metaFbc,
      fbp: order.metaFbp,
      clientIp: order.metaClientIp,
      clientUserAgent: order.metaClientUserAgent,
    },
    orderId: order.id,
    phone: order.phone,
    totalMillimes: order.totalMillimes,
    // Une ligne sans référence rendait une chaîne VIDE, qui partait telle
    // quelle dans content_ids : Meta la signalait comme référence invalide
    // sur chaque commande contenant une vieille ligne sans `kind`.
    contentIds: metaContentIds(items).filter(Boolean),
    quantities: items.filter((i) => metaContentIds([i])[0]).map((i) => i.qty),
    customerName: order.customerName,
    city: order.city,
    governorate: order.governorate,
  });
}

/** Une commande qui compte pour la cuisine : confirmée par un humain et pas
 * annulée. Exactement le même seuil que celui qui déclenche Meta — c'est le
 * même fait réel : quelqu'un a appelé le client et la commande est vraie. */
function compteEnCuisine(status: OrderStatus): boolean {
  return status !== "nouvelle" && status !== "annulee";
}

/** Change le statut d'une commande et en tire toutes les conséquences :
 * l'achat signalé à Meta, et le tableau du matbakh remis à jour — mais
 * seulement si le poids à préparer a réellement changé. Passer de
 * « en préparation » à « prête » ne recuit rien et ne doit pas sonner. */
export async function transitionOrderStatus(id: number, status: OrderStatus, avant: OrderStatus) {
  const order = await updateOrderStatus(id, status);
  if (!order) return null;
  await maybeReportMetaPurchase(order);
  if (compteEnCuisine(avant) !== compteEnCuisine(status)) void refreshKitchenBoard(true);
  return order;
}
