// Les offres sur WhatsApp — le registre des accords et la lecture des
// commandes. Toutes les règles (qui est dans la liste, à quel rythme, et ce
// que le message contient d'office) vivent dans contracts/offres.ts, pures
// et testées ; ici il n'y a que la base.

import { getDb } from "./connection";
import { orders } from "@db/schema";
import { readSetting, swapSetting, writeSetting } from "./settingsStore";
import { tunisianLocalPhone } from "@contracts/phone";
import type { RegistreStore } from "@contracts/suiviLivraison";
import {
  buildOffresList,
  modifierOffres,
  nettoyerMessage,
  noterAccord,
  noterContact,
  parseOffres,
  retirerAccord,
  type OffresLang,
  type OffresList,
  type OffresOrder,
} from "@contracts/offres";

/** Deux clés dans `settings`, donc pas de migration : le registre (accords,
 * retraits, derniers messages) et le message du moment. Une centaine
 * d'octets par personne ; à mille personnes le registre pèse cent
 * kilo-octets, relu et réécrit quelques fois par jour. Au-delà, ce sera une
 * table. */
export const CLE_REGISTRE = "offres_registre";
export const CLE_MESSAGE = "offres_message";

const registre: RegistreStore = {
  read: () => readSetting(CLE_REGISTRE),
  swap: (avant, apres) => swapSetting(CLE_REGISTRE, avant, apres),
};

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

/** La case a été cochée sur cette commande. Rend faux si rien n'a pu être
 * noté (numéro inexploitable, registre occupé) : l'appelant le journalise,
 * il ne fait JAMAIS échouer la commande pour autant. */
export async function noterAccordOffres(
  phone: string,
  orderId: number,
  lang: OffresLang,
  now: Date = new Date(),
): Promise<boolean> {
  const id = tunisianLocalPhone(phone);
  if (!id) return false;
  return modifierOffres(registre, (r) => noterAccord(r, id, { quand: now, commande: orderId, lang }));
}

export async function getOffresList(now: Date = new Date()): Promise<OffresList> {
  const [brut, message] = await Promise.all([readSetting(CLE_REGISTRE), readSetting(CLE_MESSAGE)]);
  const reg = parseOffres(brut);
  // Personne n'a encore dit oui : inutile de lire une seule commande.
  if (Object.keys(reg.accords).length === 0) return buildOffresList([], reg, message ?? "", now);

  const rows = await getDb()
    .select({
      id: orders.id,
      phone: orders.phone,
      customerName: orders.customerName,
      governorate: orders.governorate,
      status: orders.status,
      items: orders.items,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      metaPurchaseReportedAt: orders.metaPurchaseReportedAt,
    })
    .from(orders);
  const commandes: OffresOrder[] = rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    customerName: r.customerName,
    governorate: r.governorate,
    status: r.status,
    itemNames: nomsDesArticles(r.items),
    createdAt: new Date(r.createdAt),
    // Même lecture que le suivi des colis (api/queries/suiviLivraison.ts) :
    // aucune colonne ne dit quand le colis est arrivé ; l'horodatage de
    // l'achat signalé à Meta est posé à l'instant où la commande passe à
    // « terminée », `updatedAt` sert de repli.
    deliveredAt: r.status === "terminee" ? new Date(r.metaPurchaseReportedAt ?? r.updatedAt) : null,
  }));
  return buildOffresList(commandes, reg, message ?? "", now);
}

/** Note (ou efface) qu'on vient d'écrire à cette personne. */
export async function marquerContactOffres(
  customerId: string,
  contacted: boolean,
  now: Date = new Date(),
): Promise<boolean> {
  return modifierOffres(registre, (r) => noterContact(r, customerId, contacted ? now : null));
}

/** « STOP ». Trois issues, et la page doit pouvoir dire laquelle :
 *  — `retire` : elle était dans la liste, elle n'y est plus ;
 *  — `absent` : ce numéro n'y était pas — rien à faire, et il faut le dire
 *    plutôt que laisser croire à un retrait ;
 *  — `echec`  : rien n'a pu être écrit. La pire des trois si on la tait :
 *    quelqu'un a dit stop, et on lui réécrirait. */
export async function retirerDesOffres(
  customerId: string,
  now: Date = new Date(),
): Promise<"retire" | "absent" | "echec"> {
  let trouve = false;
  const ecrit = await modifierOffres(registre, (r) => {
    trouve = retirerAccord(r, customerId, now);
  });
  if (!ecrit) return "echec";
  return trouve ? "retire" : "absent";
}

export async function enregistrerMessageOffres(texte: string): Promise<string> {
  const propre = nettoyerMessage(texte);
  await writeSetting(CLE_MESSAGE, propre);
  return propre;
}
