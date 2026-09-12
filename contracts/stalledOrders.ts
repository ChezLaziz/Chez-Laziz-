// Les commandes qui dorment — le seul rappel qui rapporte de l'argent.
//
// Sur du paiement à la livraison, une commande n'est vendue qu'une fois le
// client rappelé. Tant que personne n'appelle, ce n'est pas une vente : c'est
// une intention qui refroidit. Rien dans la boutique ne le disait, et cinq
// commandes ont attendu jusqu'à neuf heures.
//
// Deux fautes distinctes, et il faut les nommer séparément :
//   — une commande jamais confirmée : personne n'a téléphoné ;
//   — une commande confirmée mais jamais remise au transporteur : le carton
//     est resté à la maison. Ce n'est PAS du suivi de livraison — aucun
//     véhicule, aucun livreur, aucun état de colis : juste « celui-là n'est
//     pas parti ».

import { formatDinars } from "./shop";
import { pluralAr } from "./arabicPlural";

export type StalledOrder = {
  id: number;
  customerName: string;
  phone: string;
  totalMillimes: number;
  ageHours: number;
};

export type UnshippedOrder = { id: number; customerName: string; ageHours: number };

/** Au-delà de deux heures sans appel, une commande est en retard. En dessous,
 * c'est le délai normal d'une personne qui finit ce qu'elle faisait. */
export const RETARD_CONFIRMATION_H = 2;

/** Un carton confirmé la veille et toujours là le lendemain : le client
 * attend une livraison qui n'a même pas commencé. */
export const RETARD_REMISE_H = 24;

/** Assez pour décider, pas assez pour faire défiler : au-delà, le compte
 * suffit. */
const MAX_LIGNES = 10;

/** « ساعة », « ساعتين », « 5 ساعات », « 14 ساعة », puis en jours. L'arabe
 * compte en quatre temps — écrire « 5 ساعة » sonne faux à qui le lit. */
export function formatAgeAr(hours: number): string {
  const h = Math.max(0, Math.round(hours));
  if (h < 24) {
    if (h <= 1) return "من ساعة";
    if (h === 2) return "من ساعتين";
    return `من ${h} ${pluralAr(h, { un: "ساعة", deux: "ساعتين", peu: "ساعات", beaucoup: "ساعة" })}`;
  }
  const j = Math.floor(h / 24);
  if (j === 1) return "من يوم";
  if (j === 2) return "من يومين";
  return `من ${j} ${pluralAr(j, { un: "يوم", deux: "يومين", peu: "أيام", beaucoup: "يوم" })}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Le rappel, ou null quand il n'y a rien à rappeler — et dans ce cas on
 * n'écrit RIEN dans le groupe : un rappel qui arrive toutes les heures pour
 * dire que tout va bien finit par ne plus être lu, et le jour où il compte
 * il passe inaperçu. */
export function formatStalledDigest(
  aConfirmer: StalledOrder[],
  aRemettre: UnshippedOrder[],
): string | null {
  if (aConfirmer.length === 0 && aRemettre.length === 0) return null;

  const blocs: string[] = [];

  if (aConfirmer.length > 0) {
    // Le montant en attente, en tête : c'est lui qui fait décrocher le
    // téléphone, pas le nombre de lignes.
    const somme = aConfirmer.reduce((s, o) => s + o.totalMillimes, 0);
    const n = aConfirmer.length;
    const mot = pluralAr(n, {
      un: "طلبية تستنّى",
      deux: "طلبيات يستنّاو",
      peu: "طلبيات يستنّاو",
      beaucoup: "طلبية تستنّى",
    });
    blocs.push(`⏰ <b>${n} ${mot} تليفون — ${formatDinars(somme)} د.ت</b>`);
    blocs.push("");
    for (const o of aConfirmer.slice(0, MAX_LIGNES)) {
      blocs.push(`🔸 <b>#${o.id}</b> ${esc(o.customerName)} — ${esc(o.phone)}`);
      blocs.push(`     ${formatDinars(o.totalMillimes)} د.ت · ${formatAgeAr(o.ageHours)}`);
    }
    if (aConfirmer.length > MAX_LIGNES) {
      blocs.push(`     … و ${aConfirmer.length - MAX_LIGNES} أخرى`);
    }
  }

  if (aRemettre.length > 0) {
    if (blocs.length > 0) blocs.push("");
    blocs.push("📦 <b>مؤكّدة وما تسلّمتش لشركة التوصيل :</b>");
    for (const o of aRemettre.slice(0, MAX_LIGNES)) {
      blocs.push(`🔸 <b>#${o.id}</b> ${esc(o.customerName)} — ${formatAgeAr(o.ageHours)}`);
    }
    if (aRemettre.length > MAX_LIGNES) {
      blocs.push(`     … و ${aRemettre.length - MAX_LIGNES} أخرى`);
    }
  }

  return blocs.join("\n");
}

/** L'heure locale à Tunis, demandée au système plutôt que calculée à la main :
 * un décalage codé en dur est une bombe à retardement. */
export function tunisHour(now: Date): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(h) % 24;
}

/** On ne réveille personne pour une commande. Le rappel se tait la nuit et
 * reprend le matin — les commandes de la nuit sont là au réveil. */
export function estHeureOuvrable(hour: number): boolean {
  return hour >= 8 && hour < 21;
}

/** Faut-il faire du BRUIT, ou corriger en silence ?
 *
 * Le bruit est réservé à une dégradation : une commande qui rejoint la liste.
 * Sans cette règle, le même rappel sonnerait toutes les vingt minutes pour
 * les mêmes cinq commandes, et on couperait les notifications du groupe — ce
 * qui ferait perdre aussi les nouvelles commandes. */
export function contientDuNouveau(actuels: number[], precedents: number[]): boolean {
  const connus = new Set(precedents);
  return actuels.some((id) => !connus.has(id));
}
