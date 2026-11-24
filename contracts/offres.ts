/** Les offres sur WhatsApp — seulement pour celles et ceux qui l'ont demandé.
 *
 * POURQUOI. Sur trente jours, 122 personnes ont commandé et 4 seulement
 * avaient déjà commandé avant. La boutique ne revoit presque jamais ses
 * clientes, et elle n'a aucun moyen de leur dire qu'il y a une nouveauté ou
 * que l'Aïd approche : leur numéro ne peut servir qu'à leur commande.
 *
 * C'est la page de confidentialité qui le dit, et la loi tunisienne avec
 * elle (loi organique 2004-63, article 30 : pas d'usage publicitaire d'une
 * donnée sans l'accord EXPRÈS ET SPÉCIFIQUE de la personne ; article 12 :
 * pas d'usage au-delà de la finalité annoncée). Une première version de la
 * « relance des anciens clients » n'a jamais été publiée pour cette raison —
 * voir contracts/suiviLivraison.ts.
 *
 * Ce module est la voie permise : une case dans le formulaire de commande,
 * JAMAIS cochée d'avance, qui dit exactement à quoi elle engage. Seules les
 * personnes qui la cochent entrent dans la liste.
 *
 * CE QUE CE MODULE REFUSE DE FAIRE.
 *
 *  — Écrire à quelqu'un qui n'a pas coché la case. Il n'existe aucun chemin
 *    pour ajouter une personne à la main : la liste ne se remplit que depuis
 *    le formulaire.
 *
 *  — Envoyer quoi que ce soit. Il prépare un lien wa.me ; un humain ouvre la
 *    conversation, relit, appuie sur « envoyer ». Une par une.
 *
 *  — Écrire à un numéro que personne n'a confirmé. La case est cochée au
 *    moment de la commande, avant que quiconque ait décroché : un chiffre
 *    tapé de travers, une commande pour rire, et l'accord est rangé sous le
 *    numéro d'un inconnu — ou d'une vraie cliente qui, elle, n'a rien
 *    demandé. Une personne n'est donc proposée qu'une fois livrée la
 *    commande sur laquelle la case a été cochée, ou une commande passée
 *    APRÈS : la preuve que celle qui a coché est bien celle qui répond.
 *    Ses livraisons d'avant ne prouvent rien sur qui a coché.
 *
 *  — Écrire trop souvent. Une même personne ne revient dans la liste que
 *    trois semaines après son dernier message, jamais dans les dix jours
 *    qui suivent une livraison (ce sont ceux du message « bien arrivé ? »),
 *    et la page ne propose pas plus de vingt-cinq personnes par jour.
 *
 *  — Envoyer un message sans porte de sortie. La ligne « STOP » est ajoutée
 *    par le code, pas par la personne qui rédige : elle ne peut pas être
 *    oubliée. Et « Retirer » sort quelqu'un de la liste pour de bon, jusqu'à
 *    ce qu'il recoche lui-même la case.
 *
 * Fonctions pures, testées sans base : voir offres.test.ts. */

import { tunisianLocalPhone } from "./phone";
import { prenomPourSaluer } from "./prenom";
import { sansDemiCaracteres } from "./demiCaracteres";
import { tunisDayKey } from "./tunisDay";
import type { RegistreStore } from "./suiviLivraison";
import { OFFRES_ACCORD_VERSION, OFFRES_ECART_JOURS, type OffresLang } from "./offresAccord";

// Le texte de la case et le rythme promis vivent dans leur propre fichier,
// sans aucune dépendance : c'est le seul morceau que charge la page de
// commande. Voir offresAccord.ts.
export { OFFRES_ACCORD_TEXTE, OFFRES_ACCORD_VERSION, OFFRES_ECART_JOURS, type OffresLang } from "./offresAccord";

/** Pas d'offre dans les dix jours qui suivent une livraison. C'est la
 * fenêtre du message « votre colis est bien arrivé ? » (SUIVI_MAX_DAYS dans
 * suiviLivraison.ts) : deux messages de la boutique dans la même semaine,
 * dont une publicité, c'est le chemin le plus court vers « bloquer ». Et
 * elle vient de recevoir son makroudh. */
export const OFFRES_APRES_LIVRAISON_JOURS = 10;

/** Plafond par jour : un numéro WhatsApp qui écrit à des dizaines de
 * personnes en une heure se fait signaler, et c'est celui de la boutique. */
export const OFFRES_PLAFOND_JOUR = 25;

/** Un message WhatsApp, pas une lettre. */
export const OFFRES_MESSAGE_MAX = 500;

/** Longueur maximale du lien wa.me, message compris. WhatsApp ne publie
 * aucune limite, mais au-delà de 2 000 caractères environ des téléphones et
 * des navigateurs coupent le lien — et ce qui saute alors, c'est la FIN du
 * message : la ligne STOP, la seule qu'on n'a pas le droit de perdre. */
export const OFFRES_LIEN_MAX = 1900;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Accord = {
  /** Quand la case a été cochée (ISO). */
  depuis: string;
  /** La commande sur laquelle elle l'a été. */
  commande: number;
  /** La langue de la page : c'est le texte qu'elle a lu. */
  lang: OffresLang;
  version: number;
};

/** Tout le registre, tel qu'il est rangé dans `settings`. Les clés sont
 * l'identifiant client de la boutique : les huit chiffres du numéro. */
export type OffresRegistre = {
  accords: Record<string, Accord>;
  /** Quand la personne a demandé à ne plus rien recevoir. */
  retraits: Record<string, string>;
  /** Quand on lui a écrit pour la dernière fois. */
  contacts: Record<string, string>;
};

const estDate = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const estIdentifiant = (id: string) => /^\d{8}$/.test(id);

function datesValides(brut: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return out;
  for (const [id, quand] of Object.entries(brut as Record<string, unknown>)) {
    if (estIdentifiant(id) && estDate(quand)) out[id] = quand;
  }
  return out;
}

/** Lit le registre sans jamais lever : une valeur abîmée ne doit ni faire
 * planter la commande d'une cliente ni vider la liste — on garde ce qui se
 * lit, entrée par entrée. */
export function parseOffres(raw: string | null | undefined): OffresRegistre {
  const vide: OffresRegistre = { accords: {}, retraits: {}, contacts: {} };
  if (!raw) return vide;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return vide;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return vide;
  const p = parsed as Record<string, unknown>;
  const accords: Record<string, Accord> = {};
  if (p.accords && typeof p.accords === "object" && !Array.isArray(p.accords)) {
    for (const [id, a] of Object.entries(p.accords as Record<string, unknown>)) {
      if (!estIdentifiant(id) || !a || typeof a !== "object") continue;
      const x = a as Record<string, unknown>;
      if (!estDate(x.depuis)) continue;
      accords[id] = {
        depuis: x.depuis,
        commande: typeof x.commande === "number" && Number.isInteger(x.commande) ? x.commande : 0,
        lang: x.lang === "ar" ? "ar" : "fr",
        version: typeof x.version === "number" ? x.version : OFFRES_ACCORD_VERSION,
      };
    }
  }
  return { accords, retraits: datesValides(p.retraits), contacts: datesValides(p.contacts) };
}

/** La case a été cochée. Le PREMIER accord est conservé : c'est lui la
 * preuve, et recocher la case à la commande suivante ne le rajeunit pas.
 * Un retrait antérieur est levé — la personne vient de redire oui, elle-même. */
export function noterAccord(
  registre: OffresRegistre,
  id: string,
  accord: { quand: Date; commande: number; lang: OffresLang },
): void {
  if (!estIdentifiant(id)) return;
  delete registre.retraits[id];
  if (registre.accords[id]) return;
  registre.accords[id] = {
    depuis: accord.quand.toISOString(),
    commande: accord.commande,
    lang: accord.lang,
    version: OFFRES_ACCORD_VERSION,
  };
}

/** « STOP ». L'accord disparaît, la date du retrait reste : elle prouve
 * qu'on a obéi, et quand. Rend faux si la personne n'était pas dans la
 * liste. */
export function retirerAccord(registre: OffresRegistre, id: string, quand: Date): boolean {
  if (!registre.accords[id]) return false;
  delete registre.accords[id];
  delete registre.contacts[id];
  registre.retraits[id] = quand.toISOString();
  return true;
}

/** On vient d'ouvrir la conversation avec elle (ou on annule une erreur de
 * doigt). */
export function noterContact(registre: OffresRegistre, id: string, quand: Date | null): void {
  if (!registre.accords[id]) return;
  if (quand) registre.contacts[id] = quand.toISOString();
  else delete registre.contacts[id];
}

/** Même garde que le registre du suivi : on relit et on recommence si
 * quelqu'un d'autre a écrit entre-temps. Ici la marque perdue serait un
 * ACCORD — une personne qui a dit oui et qu'on n'aurait jamais notée — ou
 * un retrait, ce qui est pire : quelqu'un qui a dit stop et qu'on
 * recontacterait. */
export async function modifierOffres(
  store: RegistreStore,
  change: (registre: OffresRegistre) => void,
  essais = 5,
): Promise<boolean> {
  for (let i = 0; i < essais; i++) {
    const brut = await store.read();
    const registre = parseOffres(brut);
    change(registre);
    if (await store.swap(brut, JSON.stringify(registre))) return true;
  }
  return false;
}

/** Ce qu'un texte pèse dans un lien : `é` vaut six caractères, une lettre
 * arabe six, un emoji douze. */
const poids = (s: string) => encodeURIComponent(s).length;

/** Le bonjour et la porte de sortie, dans la langue du texte.
 *
 * En arabe, aucun verbe à la deuxième personne — même raison que le message
 * de suivi : l'accord au féminin change d'une région à l'autre, et la
 * boutique ne sait pas à qui elle écrit. */
function cadre(arabe: boolean, nom: string): { bonjour: string; sortie: string } {
  return arabe
    ? { bonjour: `عسلامة${nom} 👋 معاك Chez Laziz.`, sortie: "باش توقف العروض، كلمة STOP تكفي." }
    : { bonjour: `Bonjour${nom} 👋 c'est Chez Laziz.`, sortie: "Pour ne plus recevoir nos offres, répondez STOP." };
}
const assembler = (bonjour: string, corps: string, sortie: string) => [bonjour, corps, "", sortie].join("\n");

/** Tout ce qui, dans le lien, n'est pas le texte de la boutique, compté au
 * pire : l'adresse wa.me, le cadre le plus lourd des deux langues, et le
 * prénom le plus lourd que prenomPourSaluer puisse rendre — vingt-quatre
 * unités à neuf caractères de lien chacune, plus l'espace qui le précède. */
const ADRESSE_POIDS = "https://wa.me/21600000000?text=".length;
const PRENOM_POIDS_MAX = 3 + 24 * 9;
const CADRE_POIDS_MAX =
  Math.max(...[true, false].map((arabe) => poids(assembler(cadre(arabe, "").bonjour, "", cadre(arabe, "").sortie)))) +
  PRENOM_POIDS_MAX;

/** Ce qu'il reste au texte de la boutique, en caractères de lien. Un message
 * en français n'y touche jamais ; un message en arabe l'atteint entre 230
 * et 280 caractères, bien avant OFFRES_MESSAGE_MAX. */
export const OFFRES_CORPS_POIDS_MAX = OFFRES_LIEN_MAX - ADRESSE_POIDS - CADRE_POIDS_MAX;

/** Ce qui tient dans un message : au plus OFFRES_MESSAGE_MAX caractères, et
 * un poids qui garde le lien sous OFFRES_LIEN_MAX. Rien d'autre n'est
 * retouché : c'est ce que la zone de saisie applique à chaque frappe, où un
 * nettoyage complet mangerait l'espace qu'on vient de taper. */
export function bornerMessage(texte: string): string {
  // Deux passages : avant la coupe pour ce qui a été collé abîmé, après
  // pour l'emoji que la coupe elle-même vient de fendre.
  const sain = sansDemiCaracteres(sansDemiCaracteres(texte).slice(0, OFFRES_MESSAGE_MAX));
  if (poids(sain) <= OFFRES_CORPS_POIDS_MAX) return sain;
  let garde = "";
  let total = 0;
  // Caractère entier par caractère entier : Array.from ne fend pas un emoji.
  for (const ch of Array.from(sain)) {
    const p = poids(ch);
    if (total + p > OFFRES_CORPS_POIDS_MAX) break;
    garde += ch;
    total += p;
  }
  return garde;
}

/** La place qu'occupe un brouillon, de 0 à 1 : la plus serrée de ses deux
 * limites. Pour la jauge de la page — un compteur de caractères seul
 * mentirait en arabe, où le lien est plein bien avant le compteur. */
export function placeDuMessage(texte: string): number {
  const sain = sansDemiCaracteres(texte);
  return Math.min(1, Math.max(sain.length / OFFRES_MESSAGE_MAX, poids(sain) / OFFRES_CORPS_POIDS_MAX));
}

/** Nettoie le message rédigé dans l'administration. Appliquée deux fois,
 * elle rend la même chose : la page s'en sert pour savoir si le brouillon
 * diffère du message enregistré. */
export function nettoyerMessage(texte: string): string {
  const propre = sansDemiCaracteres(texte).replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // La coupe peut s'arrêter juste après un retour à la ligne.
  return bornerMessage(propre).trim();
}

/** La langue du texte est celle de la majorité de ses lettres : un message
 * en arabe qui cite « Chez Laziz » reste en arabe, un message en français
 * qui glisse un mot en arabe reste en français. */
function ecritEnArabe(texte: string): boolean {
  const arabe = texte.match(/[\u0600-\u06FF\u0750-\u077F]/g)?.length ?? 0;
  const latin = texte.match(/[A-Za-z\u00C0-\u024F]/g)?.length ?? 0;
  return arabe > 0 && arabe >= latin;
}

/** Le message complet, tel qu'il s'ouvrira dans WhatsApp : un bonjour, le
 * texte de la boutique, et la porte de sortie.
 *
 * Le bonjour et la ligne STOP suivent la langue DU TEXTE rédigé, pas celle
 * de la page où la cliente a commandé : un message moitié français, moitié
 * arabe se lit comme un envoi automatique. */
export function offreMessage(texte: string, prenom: string): string {
  const corps = nettoyerMessage(texte);
  if (!corps) return "";
  const { bonjour, sortie } = cadre(ecritEnArabe(corps), prenom ? ` ${prenom}` : "");
  return assembler(bonjour, corps, sortie);
}

/** Le lien qui ouvre la conversation, message déjà écrit. Toujours sous
 * OFFRES_LIEN_MAX, par construction : voir OFFRES_CORPS_POIDS_MAX. */
export function offreWhatsAppUrl(phone: string, customerName: string, texte: string): string | null {
  const local = tunisianLocalPhone(phone);
  const message = offreMessage(texte, prenomPourSaluer(customerName));
  if (!local || !message) return null;
  return `https://wa.me/216${local}?text=${encodeURIComponent(message)}`;
}

export type OffresOrder = {
  id: number;
  phone: string;
  customerName: string;
  governorate: string;
  status: string;
  itemNames: string[];
  createdAt: Date;
  /** Quand la commande a été marquée livrée ; null tant qu'elle ne l'est pas. */
  deliveredAt: Date | null;
};

export type OffresClient = {
  id: string;
  customerName: string;
  governorate: string;
  /** Quand elle a coché la case. */
  depuis: string;
  /** Ses commandes non annulées. */
  commandes: number;
  /** La commande reçue qui confirme son numéro, sinon sa dernière commande. */
  derniereCommande: string;
  derniersArticles: string;
  dernierContact: string | null;
  /** Null tant qu'aucun message n'est rédigé. */
  whatsappUrl: string | null;
};

export type OffresList = {
  /** Le message du moment, tel qu'enregistré. */
  message: string;
  /** À qui écrire aujourd'hui — au plus ce qu'il reste du plafond. */
  aContacter: OffresClient[];
  /** Prêtes, mais au-delà du plafond du jour. */
  enAttente: number;
  /** Contactées aujourd'hui, la plus récente d'abord. */
  contacteesAujourdhui: OffresClient[];
  /** Contactées il y a moins de trois semaines : on les laisse tranquilles. */
  auRepos: number;
  /** Une commande est en cours : on leur parle déjà, pour celle-là. */
  commandeEnCours: number;
  /** Livrées il y a moins de dix jours : c'est le temps du « bien arrivé ? ». */
  livreesRecemment: number;
  /** Ont coché la case, mais rien n'a été livré à ce numéro depuis : rien
   * ne prouve qu'il est à la personne qui a coché. */
  sansLivraison: number;
  total: number;
  retraits: number;
  plafondJour: number;
  ecartJours: number;
  apresLivraisonJours: number;
};

function resumeArticles(names: string[]): string {
  if (names.length === 0) return "—";
  if (names.length === 1) return names[0]!;
  return `${names[0]} + ${names.length - 1} autre${names.length > 2 ? "s" : ""}`;
}

export function buildOffresList(
  orders: OffresOrder[],
  registre: OffresRegistre,
  message: string,
  now: Date,
): OffresList {
  const texte = nettoyerMessage(message);
  const parClient = new Map<string, OffresOrder[]>();
  for (const o of orders) {
    const id = tunisianLocalPhone(o.phone);
    // On ne range que les commandes de celles qui ont dit oui : les autres
    // n'ont rien à faire dans cette page, même en mémoire.
    if (!id || !registre.accords[id]) continue;
    const liste = parClient.get(id) ?? [];
    liste.push(o);
    parClient.set(id, liste);
  }

  const aujourdhui = tunisDayKey(now);
  const pretes: OffresClient[] = [];
  const duJour: OffresClient[] = [];
  let auRepos = 0;
  let commandeEnCours = 0;
  let livreesRecemment = 0;
  let sansLivraison = 0;

  for (const [id, accord] of Object.entries(registre.accords)) {
    const liste = parClient.get(id);
    // Plus aucune commande à ce numéro (supprimée) : on ne sait plus qui
    // saluer. L'accord reste au registre, la personne n'est pas proposée.
    if (!liste || liste.length === 0) continue;

    const livreeLe = (o: OffresOrder) => (o.deliveredAt ?? o.createdAt).getTime();
    let derniere = liste[0]!;
    // La livraison qui CONFIRME le numéro : celle de la commande où la case
    // a été cochée, ou d'une commande passée après (les numéros de commande
    // se suivent). Voir « Écrire à un numéro que personne n'a confirmé ».
    let confirmee: OffresOrder | null = null;
    // La livraison la plus récente, quelle qu'elle soit : c'est elle qui
    // ouvre les dix jours de silence.
    let derniereLivraison = 0;
    for (const o of liste) {
      if (o.createdAt.getTime() > derniere.createdAt.getTime()) derniere = o;
      if (o.status !== "terminee") continue;
      derniereLivraison = Math.max(derniereLivraison, livreeLe(o));
      if (o.id >= accord.commande && (!confirmee || livreeLe(o) > livreeLe(confirmee))) confirmee = o;
    }
    // La fiche parle de la commande qui confirme le numéro quand il y en a
    // une : c'est le nom qu'on a vu à la porte. Une commande annulée plus
    // récente peut porter n'importe quel nom — y compris celui de quelqu'un
    // d'autre.
    const ref = confirmee ?? derniere;
    const dernierContact = registre.contacts[id] ?? null;
    const fiche: OffresClient = {
      id,
      customerName: ref.customerName.trim(),
      governorate: ref.governorate,
      depuis: accord.depuis,
      commandes: liste.filter((o) => o.status !== "annulee").length,
      derniereCommande: ref.createdAt.toISOString(),
      derniersArticles: resumeArticles(ref.itemNames),
      dernierContact,
      whatsappUrl: texte ? offreWhatsAppUrl(ref.phone, ref.customerName, texte) : null,
    };

    if (dernierContact) {
      const quand = new Date(dernierContact);
      if (tunisDayKey(quand) === aujourdhui) {
        duJour.push(fiche);
        continue;
      }
      if (now.getTime() - quand.getTime() < OFFRES_ECART_JOURS * DAY_MS) {
        auRepos++;
        continue;
      }
    }
    if (liste.some((o) => o.status !== "terminee" && o.status !== "annulee")) {
      commandeEnCours++;
      continue;
    }
    // Rien de livré depuis que la case a été cochée : elle a pu l'être par
    // n'importe qui.
    if (!confirmee) {
      sansLivraison++;
      continue;
    }
    if (now.getTime() - derniereLivraison < OFFRES_APRES_LIVRAISON_JOURS * DAY_MS) {
      livreesRecemment++;
      continue;
    }
    pretes.push(fiche);
  }

  // Jamais contactées d'abord, puis celles dont le dernier message est le
  // plus ancien ; à égalité, la commande la plus récente — la personne qui
  // se souvient le mieux de la boutique.
  pretes.sort(
    (a, b) =>
      (a.dernierContact ?? "").localeCompare(b.dernierContact ?? "") ||
      b.derniereCommande.localeCompare(a.derniereCommande),
  );
  duJour.sort((a, b) => (b.dernierContact ?? "").localeCompare(a.dernierContact ?? ""));

  const reste = Math.max(OFFRES_PLAFOND_JOUR - duJour.length, 0);
  const aContacter = pretes.slice(0, reste);

  return {
    message: texte,
    aContacter,
    enAttente: pretes.length - aContacter.length,
    contacteesAujourdhui: duJour,
    auRepos,
    commandeEnCours,
    livreesRecemment,
    sansLivraison,
    total: Object.keys(registre.accords).length,
    retraits: Object.keys(registre.retraits).length,
    plafondJour: OFFRES_PLAFOND_JOUR,
    ecartJours: OFFRES_ECART_JOURS,
    apresLivraisonJours: OFFRES_APRES_LIVRAISON_JOURS,
  };
}
