// L'état du tableau du matbakh : ce qui est confirmé, ce qui est déjà cuit.
//
// Le poids à préparer n'est jamais stocké — il se recalcule à chaque fois
// depuis les commandes confirmées (voir contracts/kitchenBoard.ts). Seul
// l'acquittement du cuisinier est persisté, parce que lui seul ne se déduit
// de rien.

import { getDb } from "./connection";
import { orders, products } from "@db/schema";
import { notInArray } from "drizzle-orm";
import { readSetting, writeSetting } from "./settingsStore";
import {
  EMPTY_ACK,
  accumulateKitchen,
  baselineFromConfirmed,
  kitchenKey,
  kitchenPending,
  type ConfirmedTotals,
  type KitchenAck,
  type KitchenItem,
  type KitchenLine,
} from "@contracts/kitchenBoard";

/** Clés dans la table `settings` — volontairement pas de nouvelle table :
 * deux valeurs, dont une de quelques centaines d'octets. */
const CLE_ACK = "kitchen_ack";
const CLE_MESSAGE = "kitchen_board_message_id";

/** Une commande « nouvelle » n'est pas encore confirmée par téléphone, une
 * « annulee » ne sera jamais cuite. Tout le reste est du travail réel. */
const NON_CONFIRMES = ["nouvelle", "annulee"] as const;

function parseItems(json: string): KitchenItem[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as KitchenItem[]) : [];
  } catch {
    return [];
  }
}

/** Poids cumulé par type sur TOUTES les commandes confirmées de l'histoire
 * de la boutique. Volontairement sans borne de date : l'acquittement du
 * cuisinier est lui aussi cumulé, et une borne ferait réapparaître d'un coup
 * des kilos cuits depuis longtemps. */
export async function getConfirmedKitchenTotals(): Promise<ConfirmedTotals> {
  const rows = await getDb()
    .select({ items: orders.items })
    .from(orders)
    .where(notInArray(orders.status, [...NON_CONFIRMES]));
  return accumulateKitchen(rows.map((r) => ({ items: parseItems(r.items) })));
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

/** L'acquittement enregistré, ou null s'il n'y en a jamais eu — la nuance
 * compte : « jamais acquitté » ne veut PAS dire « tout est à cuire », il
 * existe des années de commandes livrées avant que ce tableau n'existe (voir
 * chargerAck dans telegramKitchen.ts).
 *
 * Un acquittement illisible, lui, repart de zéro : réafficher du travail déjà
 * fait est visible et corrigible, en cacher ne l'est pas. */
export async function readKitchenAck(): Promise<KitchenAck | null> {
  const brut = await readSetting(CLE_ACK);
  if (brut === null) return null;
  if (brut === "") return EMPTY_ACK;
  try {
    const parsed = JSON.parse(brut) as Partial<KitchenAck>;
    return {
      kg: parsed.kg && typeof parsed.kg === "object" ? parsed.kg : {},
      prev: parsed.prev && typeof parsed.prev === "object" ? parsed.prev : {},
      last: typeof parsed.last === "string" ? parsed.last : undefined,
    };
  } catch {
    console.error("[kitchen] acquittement illisible — remis à zéro");
    return EMPTY_ACK;
  }
}

export async function writeKitchenAck(ack: KitchenAck): Promise<void> {
  await writeSetting(CLE_ACK, JSON.stringify(ack));
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

/** L'acquittement du cuisinier, en posant son POINT DE DÉPART au premier
 * appel : tout ce qui est déjà confirmé à cet instant est réputé cuit.
 *
 * Sans ça, le premier affichage montrerait chaque commande livrée depuis
 * l'ouverture de la boutique — des dizaines de kilos vendus il y a des mois. */
export async function loadKitchenAck(confirmed: ConfirmedTotals): Promise<KitchenAck> {
  const stocke = await readKitchenAck();
  if (stocke) return stocke;
  const initial = baselineFromConfirmed(confirmed);
  await writeKitchenAck(initial);
  return initial;
}

/** Ce qui reste à préparer, prêt à afficher — dans Telegram comme sur l'écran
 * de l'atelier. Une seule source, pour que les deux ne puissent pas diverger. */
export async function currentKitchenLines(): Promise<{
  lines: KitchenLine[];
  canUndo: boolean;
}> {
  const [confirmed, labels] = await Promise.all([
    getConfirmedKitchenTotals(),
    getKitchenLabels(),
  ]);
  const ack = await loadKitchenAck(confirmed);
  return { lines: kitchenPending(confirmed, ack, labels), canUndo: Boolean(ack.last) };
}
