// Le tableau du MATBAKH : combien de kilos, par type, restent à préparer —
// JOUR PAR JOUR.
//
// Le cuisinier ne travaille pas commande par commande, il cuit en gros. Cinq
// clients à 500 g du même makroudh, c'est UNE fournée de 2,5 kg — et c'est
// tout ce qu'il a besoin de lire. Rien ici ne porte de nom, de téléphone ni
// d'adresse : le poids, le type, et c'est fini.
//
// CE QUI A CHANGÉ, ET POURQUOI.
//
// La première version comptait « tout ce qui a été confirmé depuis toujours,
// moins ce que le cuisinier a déclaré cuit ». Une commande ne quittait donc
// le tableau QUE si quelqu'un appuyait sur « تم ». Personne n'a appuyé. Le
// 24 novembre 2026 le tableau affichait 856,5 kg « à préparer » sur vingt
// types, alors que 396 commandes sur 397 étaient livrées et qu'une seule,
// de 1,5 kg, attendait vraiment. Deux mois de ventes empilées : un tableau
// que plus personne ne peut lire, donc que plus personne ne regarde.
//
// La règle est maintenant celle que suit la boutique sans y penser :
//
//   — une commande ENTRE sur le tableau quand elle est confirmée
//     (« en préparation ») ;
//   — elle en SORT TOUTE SEULE dès qu'elle n'est plus « en préparation » :
//     prête, livrée, annulée, supprimée. Marquer une commande livrée dans
//     l'administration suffit — le tableau ne peut plus grossir sans fin,
//     même si personne ne touche jamais un bouton ;
//   — entre les deux, elle est rangée sous le JOUR où elle a été confirmée.
//     Le travail neuf se lit en haut ; ce qui traîne en dessous est daté, et
//     se voit pour ce qu'il est.
//
// « تم » existe toujours, mais il vaut pour UN JOUR entier, pas pour un type :
// un bouton par jour affiché au lieu de vingt boutons par parfum, et le geste
// colle à ce qui se passe vraiment — « les colis d'hier sont partis ». Un
// appui par erreur se défait.
//
// La mesure reste toujours DÉRIVÉE des commandes, jamais un compteur qu'on
// incrémente : un compteur dérive au premier envoi manqué ; une lecture, non.

import { pluralAr } from "./arabicPlural";
import { tunisDayKey } from "./tunisDay";

/** Une ligne de commande telle qu'elle est enregistrée (voir OrderItem).
 * `contents` = les produits d'un pack ; quand il est présent, c'est LUI qui
 * porte le poids réel à préparer, pas la ligne du pack. */
export type KitchenItem = {
  productId?: number;
  name: string;
  weightKg: number;
  qty: number;
  contents?: { productId?: number; name: string; weightKg: number }[];
};

/** Poids cumulé par type, et le nom sous lequel il a été commandé. */
export type ConfirmedTotals = Record<string, { kg: number; name: string }>;

/** Une commande « en préparation », telle que la cuisine a besoin de la
 * connaître : ce qu'il y a dedans, et quand elle a été confirmée. */
export type KitchenOrder = {
  id: number;
  items: KitchenItem[];
  /** L'instant de la confirmation — c'est lui qui range la commande sous un
   * jour. PAS l'heure de la commande : une commande passée à 23 h et
   * confirmée le lendemain matin est du travail du lendemain, et la ranger
   * sous la veille l'ajouterait à un jour que la cuisine croit terminé. */
  confirmedAt: Date;
};

/** Ce que la cuisine a déclaré fait : les commandes sorties du tableau par un
 * « تم ». `last` = celles du dernier appui, pour pouvoir le défaire. */
export type KitchenDone = { done: number[]; last: number[] };

export const EMPTY_DONE: KitchenDone = { done: [], last: [] };

export type KitchenLine = { key: string; label: string; kg: number };

export type KitchenSection = {
  /** `day` = les commandes confirmées ce jour-là ; `before` = tout ce qui a
   * été confirmé AVANT ce jour, regroupé. */
  kind: "day" | "before";
  /** Jour civil à Tunis, AAAA-MM-JJ. */
  day: string;
  /** Les commandes de la section, par numéro croissant. */
  orderIds: number[];
  lines: KitchenLine[];
  /** L'empreinte de ce que la section montrait quand elle a été affichée.
   * Un « تم » ne vaut que pour CE contenu — voir markKitchenSection. */
  stamp: string;
  /** Confirmée avant-hier ou plus tôt : ce n'est sans doute plus du travail
   * de cuisine mais une commande partie qu'on a oublié de fermer dans
   * l'administration. Le tableau le dit, et donne les numéros. */
  stale: boolean;
};

export type KitchenBoard = {
  /** Du plus récent au plus ancien. */
  sections: KitchenSection[];
  /** Tout ce qui reste, tous jours confondus : l'écran de l'atelier. */
  lines: KitchenLine[];
  canUndo: boolean;
};

/** Deux jours en clair, le reste regroupé. Avec une boutique qui marque ses
 * livraisons tous les un à trois jours, c'est « aujourd'hui, hier, et ce qui
 * traîne » — trois blocs, donc trois boutons au plus. */
export const KITCHEN_DAY_SECTIONS = 2;

/** Deux commandes du même produit doivent tomber dans le même seau.
 * L'identifiant produit est le repère sûr ; un produit supprimé du catalogue
 * n'en a plus, on se rabat alors sur son nom — normalisé, pour qu'une
 * majuscule ou un espace en trop ne crée pas un deuxième seau. */
export function kitchenKey(productId: number | null | undefined, name: string): string {
  if (typeof productId === "number" && Number.isFinite(productId)) return `p${productId}`;
  return `n${fnv1a(name.trim().toLowerCase().replace(/\s+/g, " "))}`;
}

/** Hachage court et stable, en JavaScript pur : ce fichier est partagé avec
 * le navigateur, node:crypto n'y a pas sa place. Il ne protège rien — il
 * raccourcit un nom, ou une liste de commandes, pour tenir dans les 64
 * octets d'un bouton Telegram. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Les additions de flottants (0,5 + 0,5 + 0,5) laissent des traînées :
 * 1.4999999999999998 s'afficherait « 1,5 kg ». On arrondit au gramme,
 * partout. */
function auGramme(kg: number): number {
  return Math.round(kg * 1000) / 1000;
}

/** Poids à préparer, par type, pour un lot de commandes.
 *
 * Un pack compte par son CONTENU, jamais deux fois : « Custom Pack 2 kg »
 * n'est pas un produit qu'on cuit, ses deux kilos le sont. */
export function accumulateKitchen(orders: { items: KitchenItem[] }[]): ConfirmedTotals {
  const totaux: ConfirmedTotals = {};
  const ajoute = (productId: number | undefined, name: string, kg: number) => {
    if (!(kg > 0)) return;
    const key = kitchenKey(productId, name);
    const seau = (totaux[key] ??= { kg: 0, name });
    seau.kg = auGramme(seau.kg + kg);
  };
  for (const order of orders) {
    for (const it of order.items) {
      const qty = Number.isFinite(it.qty) ? it.qty : 0;
      if (it.contents?.length) {
        for (const c of it.contents) ajoute(c.productId, c.name, c.weightKg * qty);
      } else {
        ajoute(it.productId, it.name, it.weightKg * qty);
      }
    }
  }
  return totaux;
}

/** Du plus lourd au plus léger : le cuisinier commence par la grosse fournée.
 * `labels` remplace le nom enregistré à la commande par le nom actuel du
 * catalogue — en arabe quand il existe. */
function lignes(totaux: ConfirmedTotals, labels: Record<string, string>): KitchenLine[] {
  return Object.entries(totaux)
    .map(([key, { kg, name }]) => ({ key, label: labels[key] ?? name, kg }))
    .filter((l) => l.kg > 0)
    .sort((a, b) => b.kg - a.kg || a.label.localeCompare(b.label, "ar"));
}

function empreinte(kind: KitchenSection["kind"], day: string, ids: number[]): string {
  return fnv1a(`${kind}:${day}:${ids.join(",")}`);
}

/** Le tableau, à partir des commandes « en préparation ».
 *
 * `orders` ne doit contenir QUE des commandes en préparation : c'est ce qui
 * fait sortir une commande toute seule quand son statut change — elle n'est
 * simplement plus dans la liste. Celles que la cuisine a déjà déclarées
 * faites (`done`) sont écartées ici.
 *
 * Une commande sans rien à cuire (lignes vides ou illisibles) n'ouvre pas de
 * section : un jour affiché sans une seule ligne ne dirait rien. */
export function buildKitchenBoard(
  orders: KitchenOrder[],
  done: KitchenDone = EMPTY_DONE,
  labels: Record<string, string> = {},
  now: Date = new Date(),
): KitchenBoard {
  // Une commande confirmée hier part aujourd'hui : c'est le rythme normal.
  // Plus vieille que ça, elle aurait dû partir — voir `stale`.
  const hier = tunisDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const faites = new Set(done.done);
  const restantes = orders
    .filter((o) => !faites.has(o.id))
    .filter((o) => Object.keys(accumulateKitchen([o])).length > 0);

  const parJour = new Map<string, KitchenOrder[]>();
  for (const o of restantes) {
    const jour = tunisDayKey(o.confirmedAt);
    const lot = parJour.get(jour) ?? [];
    lot.push(o);
    parJour.set(jour, lot);
  }
  const jours = [...parJour.keys()].sort().reverse(); // le plus récent d'abord

  const section = (kind: KitchenSection["kind"], day: string, lot: KitchenOrder[]): KitchenSection => {
    const orderIds = lot.map((o) => o.id).sort((a, b) => a - b);
    return {
      kind,
      day,
      orderIds,
      lines: lignes(accumulateKitchen(lot), labels),
      stamp: empreinte(kind, day, orderIds),
      // « Avant <jour> » regroupe par construction des jours plus anciens que
      // les deux affichés ; un jour seul se juge à sa date.
      stale: kind === "before" || day < hier,
    };
  };

  const sections: KitchenSection[] = jours
    .slice(0, KITCHEN_DAY_SECTIONS)
    .map((jour) => section("day", jour, parJour.get(jour)!));
  const anciens = jours.slice(KITCHEN_DAY_SECTIONS);
  if (anciens.length > 0) {
    // « Avant » le plus ancien jour affiché en clair : le libellé reste juste
    // même si le message est relu le lendemain, ce que « avant-hier » ne
    // ferait pas.
    const borne = jours[KITCHEN_DAY_SECTIONS - 1]!;
    sections.push(section("before", borne, anciens.flatMap((j) => parJour.get(j)!)));
  }

  const actives = new Set(orders.map((o) => o.id));
  return {
    sections,
    lines: lignes(accumulateKitchen(restantes), labels),
    // « رجوع » n'a de sens que s'il reste quelque chose à faire revenir : une
    // commande livrée depuis le dernier « تم » ne reviendra pas.
    canUndo: done.last.some((id) => actives.has(id)),
  };
}

/** « تم » sur une section : ses commandes sortent du tableau.
 *
 * `stamp` est l'empreinte que portait le BOUTON, donc ce que la personne
 * avait sous les yeux en appuyant. Si la section a changé depuis — une
 * commande confirmée une seconde plus tôt, que son écran ne montrait pas
 * encore — on ne marque RIEN et on le dit (`ok: false`) : le tableau est
 * réaffiché et elle appuie de nouveau, cette fois en voyant tout. Sans cette
 * garde, un appui sur « تم » avalerait une commande que personne n'a vue —
 * la seule faute que ce tableau ne doit jamais commettre. */
export function markKitchenSection(
  done: KitchenDone,
  board: KitchenBoard,
  kind: KitchenSection["kind"],
  day: string,
  stamp: string,
): { done: KitchenDone; ok: boolean } {
  const section = board.sections.find((s) => s.kind === kind && s.day === day);
  if (!section || section.stamp !== stamp) return { done, ok: false };
  return {
    done: { done: [...new Set([...done.done, ...section.orderIds])], last: [...section.orderIds] },
    ok: true,
  };
}

/** Défaire le dernier « تم ». Appuyer deux fois ne creuse pas plus loin :
 * un seul pas en arrière, celui de l'erreur qu'on vient de faire. */
export function undoKitchen(done: KitchenDone): KitchenDone {
  if (done.last.length === 0) return done;
  const retour = new Set(done.last);
  return { done: done.done.filter((id) => !retour.has(id)), last: [] };
}

/** Oublie les commandes qui ne sont plus en préparation : livrées, annulées
 * ou supprimées, elles sont sorties du tableau par leur statut et n'ont plus
 * rien à faire dans le registre. Il ne garde ainsi jamais plus que les
 * quelques commandes du moment — et une commande remise « en préparation »
 * après une annulation réapparaît entière, ce qui est voulu. */
export function pruneKitchenDone(done: KitchenDone, activeIds: number[]): KitchenDone {
  const actives = new Set(activeIds);
  return {
    done: done.done.filter((id) => actives.has(id)),
    last: done.last.filter((id) => actives.has(id)),
  };
}

/** Le registre tel qu'il est rangé dans `settings`. Illisible, il repart de
 * zéro : réafficher du travail déjà fait est visible et corrigible, en
 * cacher ne l'est pas. */
export function parseKitchenDone(raw: string | null | undefined): KitchenDone {
  if (!raw) return EMPTY_DONE;
  try {
    const parsed = JSON.parse(raw) as Partial<KitchenDone> | null;
    const ids = (v: unknown): number[] =>
      Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x > 0) : [];
    return { done: ids(parsed?.done), last: ids(parsed?.last) };
  } catch {
    return EMPTY_DONE;
  }
}

/** 3 → « 3 كغ », 5.5 → « 5,5 كغ », 0.25 → « 250 غ ». */
export function formatKgAr(kg: number): string {
  const g = auGramme(kg);
  if (g < 1) return `${Math.round(g * 1000)} غ`;
  return `${String(g).replace(".", ",")} كغ`;
}

const JOURS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** « 2026-11-24 » → « الثلاثاء 24/11 ».
 *
 * Une date, jamais « اليوم » ou « البارح » : le message reste épinglé dans le
 * groupe sans être réécrit à minuit, et un « aujourd'hui » relu le lendemain
 * matin désignerait le mauvais jour — au moment précis où on cuit. */
export function formatKitchenDayAr(day: string): string {
  const [annee, mois, jour] = day.split("-").map(Number);
  const d = new Date(Date.UTC(annee!, mois! - 1, jour!));
  if (Number.isNaN(d.getTime())) return day;
  return `${JOURS_AR[d.getUTCDay()]} ${jour}/${mois}`;
}

const COMMANDES = { un: "طلبية", deux: "طلبيتين", peu: "طلبيات", beaucoup: "طلبية" };

/** « طلبية واحدة », « طلبيتين », « 5 طلبيات », « 12 طلبية ». */
function nbCommandesAr(n: number): string {
  if (n === 1) return "طلبية واحدة";
  if (n === 2) return COMMANDES.deux;
  return `${n} ${pluralAr(n, COMMANDES)}`;
}

function titreSection(s: KitchenSection): string {
  return s.kind === "day" ? formatKitchenDayAr(s.day) : `قبل ${formatKitchenDayAr(s.day)}`;
}

/** Au-delà, la liste des numéros noierait le reste : on en donne le début. */
const NUMEROS_AFFICHES = 12;

/** Le message tel que le cuisinier le lit. Aucune donnée client, par
 * construction : cette fonction ne reçoit que des poids, des noms de
 * produits et des numéros de commande.
 *
 * PAS DE TOTAL GÉNÉRAL, et c'est délibéré. « 50 kg » ne se cuit pas : on ne
 * cuit pas des kilos, on cuit dix kilos de fraise, cinq de vanille, trois de
 * figue. Le total qui compte est celui de CHAQUE type, et il est sur sa
 * ligne.
 *
 * Les numéros de commande n'apparaissent que sous une section VIEILLIE
 * (`stale`) : là, ce n'est sans doute plus du travail de cuisine mais de la
 * tenue de carnet — des commandes restées « En préparation » dans
 * l'administration alors qu'elles sont parties. Il faut pouvoir les
 * retrouver pour les fermer. La phrase reste au conditionnel (« كان خرجت ») :
 * un vrai retard de cuisine a exactement la même tête, et le tableau ne
 * sait pas les distinguer. */
export function formatKitchenBoard(board: KitchenBoard): string {
  if (board.sections.length === 0) {
    return ["🍳 <b>المطبخ</b>", "", "✅ ما فماش شي يستنى — كل شي مكمّل."].join("\n");
  }
  const blocs = board.sections.map((s) => {
    const n = nbCommandesAr(s.orderIds.length);
    const numeros =
      s.orderIds.slice(0, NUMEROS_AFFICHES).map((id) => `#${id}`).join(" ") +
      (s.orderIds.length > NUMEROS_AFFICHES ? " …" : "");
    const entete = s.stale
      ? `⏳ <b>${titreSection(s)}</b> · ${n} (${numeros})`
      : `📅 <b>${titreSection(s)}</b> · ${n}`;
    const corps = s.lines.map((l) => `🔸 ${escapeTelegramHtml(l.label)} — <b>${formatKgAr(l.kg)}</b>`);
    const pied = s.stale ? ["مازالت «En préparation» في الإدارة: كان خرجت، حطّوها «Terminée»."] : [];
    return [entete, ...corps, ...pied].join("\n");
  });
  return ["🍳 <b>المطبخ — المطلوب توّا</b>", "", blocs.join("\n\n")].join("\n");
}

/** Telegram en mode HTML n'interprète que ces trois caractères. */
export function escapeTelegramHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Un bouton « تم » par section affichée, plus « رجوع » quand il y a une
 * erreur à défaire. Un bouton par ligne : au doigt, sur un téléphone de
 * cuisine, deux boutons côte à côte se confondent.
 *
 * `callback_data` : « k:d:<jour>:<empreinte> » ou « k:b:<jour>:<empreinte> »,
 * 23 octets — loin des 64 que Telegram accorde. */
export function kitchenKeyboard(board: KitchenBoard) {
  const rows = board.sections.map((s) => [
    {
      text: `✅ تمّ: ${titreSection(s)}`,
      callback_data: `k:${s.kind === "day" ? "d" : "b"}:${s.day}:${s.stamp}`,
    },
  ]);
  if (board.canUndo) rows.push([{ text: "↩️ رجوع (غلطت)", callback_data: "k:undo" }]);
  return { inline_keyboard: rows };
}

/** Ce que porte un bouton du tableau, relu avec méfiance : il vient de nous,
 * mais d'un message qui peut dater de plusieurs jours — voire d'avant ce
 * changement, quand les boutons portaient un type de makroudh (« k:p12 »).
 * Ceux-là rendent `null` : on réaffiche le tableau au lieu de deviner. */
export function parseKitchenCallback(
  data: string,
): { kind: KitchenSection["kind"]; day: string; stamp: string } | null {
  const m = /^k:([db]):(\d{4}-\d{2}-\d{2}):([0-9a-f]{8})$/.exec(data);
  if (!m) return null;
  return { kind: m[1] === "d" ? "day" : "before", day: m[2]!, stamp: m[3]! };
}
