/** Le message d'après livraison : « votre colis est bien arrivé ? »
 *
 * POURQUOI. La livraison est sous-traitée. Une fois le colis remis au
 * transporteur, la boutique n'apprend plus rien : ni s'il est arrivé écrasé,
 * ni s'il manquait une boîte, ni si la cliente a été contente. Elle ne le
 * sait que quand quelqu'un se plaint — c'est-à-dire presque jamais, parce
 * que les gens déçus ne se plaignent pas, ils ne recommandent pas. 382
 * clientes, 13 revenues.
 *
 * Un message deux jours après la livraison pose la question. Il fait
 * remonter les problèmes pendant qu'on peut encore les réparer, il laisse à
 * la cliente une conversation ouverte avec la boutique, et ses réponses sont
 * la seule parole de cliente que la boutique ait jamais recueillie.
 *
 * CE QUE CE MODULE REFUSE DE FAIRE, ET POURQUOI.
 *
 *  — VENDRE. Pas d'offre, pas de lien de commande, pas de « on vous en
 *    renvoie ? ». La première version de ce module était une relance
 *    commerciale ; elle n'a jamais été publiée. La page de confidentialité
 *    promet que le numéro sert « uniquement à préparer, livrer et confirmer
 *    votre commande », et la loi tunisienne (loi organique 2004-63,
 *    articles 12 et 30) interdit d'utiliser une donnée à des fins
 *    publicitaires sans l'accord exprès de la personne. Vérifier qu'un colis
 *    est bien arrivé, c'est finir la livraison. Proposer d'en racheter un,
 *    c'est de la publicité. Ne pas ajouter de lien ici sans avoir d'abord
 *    recueilli cet accord et réécrit la promesse.
 *
 *  — Envoyer quoi que ce soit. Le module prépare une liste et un lien
 *    wa.me ; un humain ouvre la conversation, relit, appuie sur « envoyer ».
 *
 *  — Écrire deux fois à la même personne. Une cliente contactée sort de la
 *    liste pour de bon.
 *
 *  — Écrire trop tard. Au-delà de dix jours, « bien arrivé ? » n'est plus
 *    une question, c'est un prétexte : la cliente sort de la liste sans
 *    avoir été contactée, et c'est voulu.
 *
 * Fonctions pures, testées sans base : voir suiviLivraison.test.ts. */

import { tunisianLocalPhone } from "./phone";
import { prenomPourSaluer } from "./prenom";
import { tunisDayKey } from "./tunisDay";

/** Livrée depuis au moins deux jours : le temps d'avoir ouvert la boîte. */
export const SUIVI_MIN_DAYS = 2;

/** …et depuis dix jours au plus — voir « Écrire trop tard » plus haut. */
export const SUIVI_MAX_DAYS = 10;

/** Plafond par jour. À cinq commandes par jour il n'est jamais atteint ; il
 * est là pour le jour où la boutique en livre cinquante : un numéro WhatsApp
 * qui écrit à des dizaines d'inconnus en une heure se fait signaler, et
 * c'est le numéro de la boutique. */
export const SUIVI_DAILY_BATCH = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SuiviOrder = {
  id: number;
  phone: string;
  customerName: string;
  governorate: string;
  status: string;
  subtotalMillimes: number;
  /** Noms des articles, dans l'ordre de la commande. */
  itemNames: string[];
  createdAt: Date;
  /** Quand la commande a été marquée livrée ; null tant qu'elle ne l'est pas. */
  deliveredAt: Date | null;
};

export type SuiviCustomer = {
  /** Les huit chiffres du numéro : l'identité client de toute la boutique. */
  id: string;
  customerName: string;
  governorate: string;
  /** La commande dont on prend des nouvelles. */
  orderId: number;
  deliveredAt: string;
  daysSince: number;
  /** Ce qu'elle a reçu, en clair et court. */
  items: string;
  subtotalMillimes: number;
  whatsappUrl: string;
};

export type SuiviList = {
  /** Celles à qui écrire AUJOURD'HUI — au plus ce qu'il reste du plafond. */
  today: SuiviCustomer[];
  /** Dans la fenêtre, mais au-delà du plafond du jour. */
  waiting: number;
  /** Contactées aujourd'hui, la plus récente d'abord : pour annuler une
   * erreur de doigt. */
  contactedToday: (SuiviCustomer & { contactedAt: string })[];
  contactedTotal: number;
  dailyBatch: number;
};

// « Aujourd'hui » est celui de la personne qui envoie les messages : voir
// contracts/tunisDay.ts. Réexporté ici pour ceux qui l'importaient déjà.
export { tunisDayKey };

/** Le message. Trois lignes, en tunisien, et aucune ne demande rien d'autre
 * que des nouvelles du colis — voir « VENDRE » plus haut.
 *
 * Aucun verbe à la deuxième personne : le tunisien de l'intérieur accorde
 * l'impératif au féminin, celui de Tunis non, et la boutique ne sait pas à
 * qui elle écrit. Ainsi tourné, le message est juste pour tout le monde. */
export function suiviMessage(firstName: string): string {
  return [
    `عسلامة${firstName ? ` ${firstName}` : ""} 👋 معاك Chez Laziz.`,
    `وصلتك طلبيتك بخير؟ حبّينا نتأكّدو اللي كل شيء وصلك مريقل.`,
    `وكان فما أي ملاحظة، نسمعوك هنا.`,
  ].join("\n");
}

export function suiviWhatsAppUrl(phone: string, customerName: string): string | null {
  const local = tunisianLocalPhone(phone);
  if (!local) return null;
  const texte = suiviMessage(prenomPourSaluer(customerName));
  return `https://wa.me/216${local}?text=${encodeURIComponent(texte)}`;
}

function resumeArticles(names: string[]): string {
  if (names.length === 0) return "—";
  if (names.length === 1) return names[0]!;
  return `${names[0]} + ${names.length - 1} autre${names.length > 2 ? "s" : ""}`;
}

/** `contacted` : identifiant client → date ISO du message. */
export function buildSuiviList(
  orders: SuiviOrder[],
  contacted: Record<string, string>,
  now: Date,
): SuiviList {
  const parClient = new Map<string, SuiviOrder[]>();
  for (const o of orders) {
    const id = tunisianLocalPhone(o.phone);
    if (!id) continue; // numéro inexploitable : personne à qui écrire
    const liste = parClient.get(id) ?? [];
    liste.push(o);
    parClient.set(id, liste);
  }

  const fiches = new Map<string, SuiviCustomer>();
  const eligibles: SuiviCustomer[] = [];

  for (const [id, liste] of parClient) {
    // Sa livraison la plus récente : c'est d'elle qu'on prend des nouvelles.
    let derniere: (SuiviOrder & { deliveredAt: Date }) | null = null;
    for (const o of liste) {
      if (o.status !== "terminee" || !o.deliveredAt) continue;
      if (!derniere || o.deliveredAt.getTime() > derniere.deliveredAt.getTime()) {
        derniere = o as SuiviOrder & { deliveredAt: Date };
      }
    }
    if (!derniere) continue; // rien de livré : rien à demander

    const whatsappUrl = suiviWhatsAppUrl(derniere.phone, derniere.customerName);
    if (!whatsappUrl) continue;

    const joursDepuis = Math.floor((now.getTime() - derniere.deliveredAt.getTime()) / DAY_MS);
    const fiche: SuiviCustomer = {
      id,
      customerName: derniere.customerName.trim(),
      governorate: derniere.governorate,
      orderId: derniere.id,
      deliveredAt: derniere.deliveredAt.toISOString(),
      daysSince: joursDepuis,
      items: resumeArticles(derniere.itemNames),
      subtotalMillimes: derniere.subtotalMillimes,
      whatsappUrl,
    };
    fiches.set(id, fiche);

    if (contacted[id]) continue;
    // Une autre commande est en route : on lui parle déjà, pour celle-là.
    if (liste.some((o) => o.status !== "terminee" && o.status !== "annulee")) continue;
    if (joursDepuis < SUIVI_MIN_DAYS || joursDepuis > SUIVI_MAX_DAYS) continue;
    eligibles.push(fiche);
  }

  // La plus ancienne d'abord : c'est elle qui sortira de la fenêtre la
  // première. Le jour où le plafond mord, personne n'est perdu par l'ordre.
  eligibles.sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));

  const aujourdhui = tunisDayKey(now);
  const duJour = Object.entries(contacted)
    .filter(([, quand]) => {
      const d = new Date(quand);
      return !Number.isNaN(d.getTime()) && tunisDayKey(d) === aujourdhui;
    })
    .sort((a, b) => b[1].localeCompare(a[1]));

  // Le plafond compte les messages du registre, pas les fiches retrouvées :
  // une cliente contactée dont la commande a disparu a quand même reçu son
  // message.
  const reste = Math.max(SUIVI_DAILY_BATCH - duJour.length, 0);
  const today = eligibles.slice(0, reste);

  return {
    today,
    waiting: eligibles.length - today.length,
    contactedToday: duJour.flatMap(([id, quand]) => {
      const fiche = fiches.get(id);
      return fiche ? [{ ...fiche, contactedAt: quand }] : [];
    }),
    contactedTotal: Object.keys(contacted).length,
    dailyBatch: SUIVI_DAILY_BATCH,
  };
}

/** Le registre des clientes contactées, tel qu'il est rangé dans `settings`.
 * Tout ce qui n'a pas la bonne forme est écarté : une valeur abîmée ne doit
 * ni faire planter la page ni remettre tout le monde dans la liste par
 * surprise — on garde ce qui se lit. */
export function parseContacted(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, quand] of Object.entries(parsed as Record<string, unknown>)) {
      if (/^\d{8}$/.test(id) && typeof quand === "string" && !Number.isNaN(Date.parse(quand))) {
        out[id] = quand;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Ce qu'il faut à un registre pour être modifié sans perdre une marque. */
export type RegistreStore = {
  read: () => Promise<string | null>;
  /** Écrit `apres` SEULEMENT si la valeur vaut encore `avant` (null = la clé
   * n'existe pas encore). Rend faux si quelqu'un est passé entre-temps. */
  swap: (avant: string | null, apres: string) => Promise<boolean>;
};

/** Modifie le registre, et recommence si quelqu'un d'autre l'a modifié
 * entre la lecture et l'écriture.
 *
 * Lire, modifier, réécrire sans cette garde perd une marque dès que deux
 * boutons sont touchés dans la même demi-seconde : la seconde écriture
 * repart de l'ancienne valeur et efface la première. Or une marque perdue,
 * ici, c'est une cliente qui revient dans la liste et reçoit le message une
 * deuxième fois — exactement ce que le registre existe pour empêcher.
 *
 * Rend faux après `essais` tentatives perdues : l'appelant le dit, plutôt
 * que de laisser croire que c'est noté. */
export async function modifierRegistre(
  store: RegistreStore,
  change: (registre: Record<string, string>) => void,
  essais = 5,
): Promise<boolean> {
  for (let i = 0; i < essais; i++) {
    const brut = await store.read();
    const registre = parseContacted(brut);
    change(registre);
    if (await store.swap(brut, JSON.stringify(registre))) return true;
  }
  return false;
}
