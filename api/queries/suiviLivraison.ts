// Le suivi après livraison — lecture des commandes et registre des clientes
// à qui on a déjà écrit. Toute la décision (qui, quand, combien par jour, et
// surtout ce que le message a le droit de dire) vit dans
// contracts/suiviLivraison.ts, pure et testée ; ici il n'y a que la base.

import { gte } from "drizzle-orm";
import { getDb } from "./connection";
import { orders } from "@db/schema";
import { readSetting, swapSetting } from "./settingsStore";
import {
  SUIVI_MAX_DAYS,
  buildSuiviList,
  modifierRegistre,
  parseContacted,
  type RegistreStore,
  type SuiviList,
  type SuiviOrder,
} from "@contracts/suiviLivraison";

/** Une seule clé dans `settings` : identifiant client → date du message.
 * Pas de table, donc pas de migration. Le registre grossit d'une trentaine
 * d'octets par cliente contactée : à mille clientes il pèse trente
 * kilo-octets. Le jour où il en compte dix mille, ce sera une table. */
export const CLE = "suivi_contactees";

const registre: RegistreStore = {
  read: () => readSetting(CLE),
  swap: (avant, apres) => swapSetting(CLE, avant, apres),
};

/** On ne relit pas toute l'histoire de la boutique à chaque ouverture de la
 * page : la fenêtre de suivi fait dix jours, et une commande livrée il y a
 * dix jours a été passée bien moins de six semaines plus tôt. */
const FENETRE_LECTURE_JOURS = SUIVI_MAX_DAYS + 35;

function nomsDesArticles(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((i) => (i && typeof (i as { name?: unknown }).name === "string" ? (i as { name: string }).name : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function getSuiviList(now: Date = new Date()): Promise<SuiviList> {
  const depuis = new Date(now.getTime() - FENETRE_LECTURE_JOURS * 24 * 60 * 60 * 1000);
  const [rows, brut] = await Promise.all([
    getDb()
      .select({
        id: orders.id,
        phone: orders.phone,
        customerName: orders.customerName,
        governorate: orders.governorate,
        status: orders.status,
        subtotalMillimes: orders.subtotalMillimes,
        items: orders.items,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        metaPurchaseReportedAt: orders.metaPurchaseReportedAt,
      })
      .from(orders)
      .where(gte(orders.createdAt, depuis)),
    readSetting(CLE),
  ]);
  const commandes: SuiviOrder[] = rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    customerName: r.customerName,
    governorate: r.governorate,
    status: r.status,
    subtotalMillimes: r.subtotalMillimes,
    itemNames: nomsDesArticles(r.items),
    createdAt: new Date(r.createdAt),
    // QUAND LE COLIS EST ARRIVÉ. Aucune colonne ne le dit en toutes lettres.
    // La meilleure trace est l'horodatage de l'achat signalé à Meta : il est
    // posé une seule fois, à l'instant où la commande passe à « terminée »
    // (voir shouldReportMetaPurchase), et plus rien ne le déplace ensuite.
    // `updatedAt`, lui, bouge à chaque retouche — un encaissement noté une
    // semaine plus tard le rajeunirait d'autant — et ne sert que de repli,
    // pour une commande dont l'envoi à Meta a échoué.
    deliveredAt:
      r.status === "terminee" ? new Date(r.metaPurchaseReportedAt ?? r.updatedAt) : null,
  }));
  return buildSuiviList(commandes, parseContacted(brut), now);
}

/** Note (ou efface) qu'on a écrit à une cliente. Rend faux si la marque n'a
 * pas pu être posée — voir modifierRegistre. */
export async function markSuivi(
  customerId: string,
  contacted: boolean,
  now: Date = new Date(),
): Promise<boolean> {
  return modifierRegistre(registre, (r) => {
    if (contacted) r[customerId] = now.toISOString();
    else delete r[customerId];
  });
}
