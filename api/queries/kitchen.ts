// L'état du tableau du matbakh : les commandes en préparation, et celles que
// la cuisine a déjà déclarées faites.
//
// Le poids à préparer n'est jamais stocké — il se relit à chaque fois dans
// les commandes « en préparation » (voir contracts/kitchenBoard.ts). Seul le
// « تم » de la cuisine est persisté, parce que lui seul ne se déduit de rien.

import { getDb } from "./connection";
import { orders, products } from "@db/schema";
import { eq } from "drizzle-orm";
import { readSetting, swapSetting, writeSetting } from "./settingsStore";
import {
  buildKitchenBoard,
  kitchenKey,
  markKitchenSection,
  parseKitchenDone,
  pruneKitchenDone,
  undoKitchen,
  type KitchenBoard,
  type KitchenItem,
  type KitchenOrder,
  type KitchenSection,
} from "@contracts/kitchenBoard";

/** Clés dans la table `settings` — volontairement pas de nouvelle table :
 * deux valeurs, de quelques dizaines d'octets chacune.
 *
 * L'ancienne clé `kitchen_ack` (un cumul de kilos « déjà cuits » depuis
 * toujours) n'est plus lue ni écrite. Elle reste en base, inerte : on ne
 * détruit pas ce qu'on peut laisser dormir. */
const CLE_DONE = "kitchen_done";
const CLE_MESSAGE = "kitchen_board_message_id";

/** Combien de fois on recommence quand quelqu'un d'autre a écrit entre notre
 * lecture et notre écriture — deux « تم » touchés dans la même seconde. */
const ESSAIS = 5;

export function parseKitchenItems(json: string): KitchenItem[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as KitchenItem[]) : [];
  } catch {
    return [];
  }
}

/** Les commandes « en préparation », et rien d'autre.
 *
 * C'est CETTE borne qui fait sortir une commande toute seule : marquée
 * prête, livrée ou annulée, elle n'est plus lue. L'ancienne lecture prenait
 * toutes les commandes confirmées de l'histoire de la boutique, livrées
 * comprises, et comptait sur un appui pour les retirer ; il n'est jamais
 * venu.
 *
 * `updatedAt` sert d'heure de confirmation : il est posé par le passage à
 * « en préparation » (voir updateOrderStatus) et rien ne le déplace tant
 * que la commande y reste, hors une retouche d'encaissement — rare avant
 * la livraison, et qui ne ferait que ranger la commande un jour plus tard.
 * Aucune colonne ne garde l'heure de confirmation en propre. */
export async function getKitchenOrders(): Promise<KitchenOrder[]> {
  const rows = await getDb()
    .select({ id: orders.id, items: orders.items, updatedAt: orders.updatedAt })
    .from(orders)
    .where(eq(orders.status, "en_preparation"));
  return rows.map((r) => ({
    id: r.id,
    items: parseKitchenItems(r.items),
    confirmedAt: new Date(r.updatedAt),
  }));
}

/** Le nom ACTUEL du catalogue, en arabe quand il existe : le cuisinier lit
 * le nom qu'il connaît, pas celui figé dans une commande de l'an dernier. */
export async function getKitchenLabels(): Promise<Record<string, string>> {
  const rows = await getDb()
    .select({ id: products.id, name: products.name, nameAr: products.nameAr })
    .from(products);
  const labels: Record<string, string> = {};
  for (const p of rows) labels[kitchenKey(p.id, p.name)] = p.nameAr?.trim() || p.name;
  return labels;
}

/** L'identifiant du tableau affiché dans le groupe, pour le remplacer au lieu
 * d'en empiler un nouveau à chaque fois. */
export async function readKitchenBoardMessageId(): Promise<number | null> {
  const brut = await readSetting(CLE_MESSAGE);
  // Le vide est écrit quand il n'y a plus de tableau affiché. Number("") vaut
  // 0, qui passerait pour un identifiant de message parfaitement valide — et
  // on modifierait alors un message qui n'existe pas.
  if (!brut) return null;
  const n = Number(brut);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function writeKitchenBoardMessageId(id: number | null): Promise<void> {
  await writeSetting(CLE_MESSAGE, id === null ? "" : String(id));
}

/** Ce qui reste à préparer, prêt à afficher — dans Telegram comme sur l'écran
 * de l'atelier. Une seule source, pour que les deux ne puissent pas diverger. */
export async function currentKitchenBoard(now: Date = new Date()): Promise<KitchenBoard> {
  const [commandes, labels, brut] = await Promise.all([
    getKitchenOrders(),
    getKitchenLabels(),
    readSetting(CLE_DONE),
  ]);
  return buildKitchenBoard(commandes, parseKitchenDone(brut), labels, now);
}

/** « تم » sur une section. `perime` : ce que montrait le bouton n'est plus
 * ce qu'il y a en cuisine — rien n'a été marqué (voir markKitchenSection).
 *
 * Lecture, calcul, écriture gardée, et reprise si quelqu'un est passé
 * entre-temps : un appui ne peut ni en effacer un autre, ni s'appliquer à
 * un état qu'il n'a pas lu. */
export async function markKitchenDone(
  kind: KitchenSection["kind"],
  day: string,
  stamp: string,
): Promise<"ok" | "perime"> {
  for (let i = 0; i < ESSAIS; i++) {
    const [commandes, brut] = await Promise.all([getKitchenOrders(), readSetting(CLE_DONE)]);
    const avant = parseKitchenDone(brut);
    const { done, ok } = markKitchenSection(avant, buildKitchenBoard(commandes, avant), kind, day, stamp);
    if (!ok) return "perime";
    const apres = pruneKitchenDone(done, commandes.map((c) => c.id));
    if (await swapSetting(CLE_DONE, brut, JSON.stringify(apres))) return "ok";
  }
  // Cinq écritures perdues d'affilée : on ne prétend pas avoir noté.
  return "perime";
}

/** Défait le dernier « تم ». Faux s'il n'y avait rien à défaire. */
export async function undoKitchenDone(): Promise<boolean> {
  for (let i = 0; i < ESSAIS; i++) {
    const brut = await readSetting(CLE_DONE);
    const avant = parseKitchenDone(brut);
    if (avant.last.length === 0) return false;
    if (await swapSetting(CLE_DONE, brut, JSON.stringify(undoKitchen(avant)))) return true;
  }
  return false;
}
