/** Combien de visites chaque publicité amène — et combien en font une commande.
 *
 * POURQUOI. Le tableau « Publicités » de l'admin compte les COMMANDES de
 * chaque publicité (l'étiquette `utm_content` du lien, enregistrée sur la
 * commande). Il ne savait pas combien de personnes cette publicité avait
 * amenées. Or c'est le rapport des deux qui juge une vidéo : en octobre la
 * meilleure faisait 2,6 commandes pour cent visites, en novembre une autre
 * en faisait 0,3 — neuf fois moins, pour le même prix du clic. Sans le
 * nombre de visites, cet écart ne se voyait qu'en recoupant à la main le
 * Gestionnaire de publicités (heure du Pacifique, dirhams) et l'admin (heure
 * de Tunis, dinars).
 *
 * D'OÙ VIENT L'ÉTIQUETTE — à savoir avant de toucher à quoi que ce soit ici.
 * Jusqu'en novembre 2026, AUCUNE publicité de la boutique ne portait de
 * paramètres d'URL : le champ était vide, et c'est Meta qui ajoutait de
 * lui-même `utm_source`, `utm_campaign` et `utm_content` (l'identifiant de
 * la publicité) au lien. Tout le tableau « Publicités » reposait là-dessus
 * sans que personne l'ait décidé. Meta écrit qu'il « peut » le faire, pas
 * qu'il le fera toujours ; les publicités créées depuis portent donc les
 * mêmes valeurs en toutes lettres dans leur champ « Paramètres de l'URL ».
 *
 * Deuxième service rendu, donc : le jour où une publicité arrive SANS
 * étiquette — ni la nôtre, ni celle de Meta — ses commandes tombent dans
 * « sans étiquette », et on ne l'apprendrait qu'après des heures de
 * dépense. Ses visites, elles, arrivent dès la première minute : elles
 * portent le `fbclid` que Meta met sur tous ses liens, mais pas
 * d'étiquette. On les compte à part.
 *
 * CE QUI EST COMPTÉ. Une « arrivée » : la première page d'une session
 * (voir src/lib/attribution.ts, qui décide déjà de l'origine d'une commande
 * au même instant). Donc ni un visiteur unique, ni une page vue : la même
 * personne qui reclique demain compte deux fois, exactement comme le clic
 * que Meta facture deux fois.
 *
 * CE QUI N'EST PAS ENREGISTRÉ. Aucun identifiant de personne, aucune
 * adresse, aucun cookie, pas même le `fbclid` : seulement « une arrivée de
 * plus pour telle étiquette, tel jour ». Un compteur par jour, rangé dans
 * `settings` — donc pas de migration.
 *
 * Fonctions pures, testées sans base : voir arrivees.test.ts. */

import { etiquettePropre } from "./etiquette";

/** Ce que le navigateur dit de la première page d'une session. */
export type Arrivee = {
  /** `utm_content` du lien d'arrivée : l'identifiant de la publicité. */
  pub?: string;
  /** Le lien portait un `fbclid` : la visite vient de Facebook ou
   * d'Instagram, étiquetée ou non. */
  meta?: boolean;
};

/** Les compteurs d'une journée. */
export type JourArrivees = {
  /** Arrivées étiquetées, par étiquette. Une Map et pas un objet : la clé
   * vient d'une URL, donc de n'importe qui, « __proto__ » compris. */
  parPub: Map<string, number>;
  /** Arrivées sans étiquette de publicité, toutes origines confondues. */
  sans: number;
  /** … dont celles venues de Meta. C'est LE chiffre du jour d'un
   * lancement : s'il grimpe, une publicité tourne sans étiquette. */
  metaSans: number;
  /** Arrivées étiquetées qu'on n'a pas rangées (voir les deux plafonds).
   * Gardées en nombre pour que le total reste le total. */
  nonRangees: number;
};

/** Étiquettes distinctes par jour. La boutique en a une dizaine ; au-delà de
 * quarante, c'est quelqu'un qui s'amuse avec l'URL, et la ligne du jour ne
 * doit pas grossir pour lui. */
export const ARRIVEES_ETIQUETTES_MAX = 40;

/** Un identifiant de publicité Meta fait dix-huit chiffres. */
export const ARRIVEES_ETIQUETTE_LONGUEUR_MAX = 80;

/** L'instant de la toute première arrivée comptée. Avant lui, le tableau ne
 * sait rien des visites — et doit le dire au lieu d'afficher zéro. */
export const CLE_ARRIVEES_DEBUT = "pub_arrivees_debut";

/** Une ligne de `settings` par jour (`YYYY-MM-DD`, même découpage que le
 * reste de l'analytique) : quelques centaines d'octets, réécrits seuls. */
export function cleArrivees(jour: string): string {
  return `pub_arrivees:${jour}`;
}

export function jourVide(): JourArrivees {
  return { parPub: new Map(), sans: 0, metaSans: 0, nonRangees: 0 };
}

function entierPositif(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Lit une ligne du registre. Tout ce qui n'est pas un compteur lisible est
 * ignoré : une ligne abîmée donne un jour vide, jamais une erreur sur le
 * tableau de bord. */
export function parseJourArrivees(brut: string | null | undefined): JourArrivees {
  const jour = jourVide();
  if (!brut) return jour;
  let lu: unknown;
  try {
    lu = JSON.parse(brut);
  } catch {
    return jour;
  }
  if (!lu || typeof lu !== "object" || Array.isArray(lu)) return jour;
  const o = lu as { p?: unknown; s?: unknown; m?: unknown; x?: unknown };
  if (o.p && typeof o.p === "object" && !Array.isArray(o.p)) {
    for (const [etiquette, n] of Object.entries(o.p as Record<string, unknown>)) {
      const compte = entierPositif(n);
      if (compte > 0 && etiquette !== "") jour.parPub.set(etiquette, compte);
    }
  }
  jour.sans = entierPositif(o.s);
  // « Venues de Meta » est une partie de « sans étiquette », jamais plus.
  jour.metaSans = Math.min(entierPositif(o.m), jour.sans);
  jour.nonRangees = entierPositif(o.x);
  return jour;
}

export function ecrireJourArrivees(jour: JourArrivees): string {
  return JSON.stringify({
    p: Object.fromEntries(jour.parPub),
    s: jour.sans,
    m: jour.metaSans,
    x: jour.nonRangees,
  });
}

export function jourEstVide(jour: JourArrivees): boolean {
  return jour.parPub.size === 0 && jour.sans === 0 && jour.nonRangees === 0;
}

function ranger(jour: JourArrivees, etiquette: string, combien: number): void {
  const deja = jour.parPub.get(etiquette);
  if (deja === undefined && jour.parPub.size >= ARRIVEES_ETIQUETTES_MAX) {
    jour.nonRangees += combien;
    return;
  }
  jour.parPub.set(etiquette, (deja ?? 0) + combien);
}

/** Compte une arrivée dans le jour donné (qu'elle modifie).
 *
 * L'étiquette est nettoyée comme la commande la gardera (etiquettePropre) :
 * sinon la ligne des visites et la ligne des commandes d'une même publicité
 * ne se rejoindraient pas. */
export function ajouterArrivee(jour: JourArrivees, arrivee: Arrivee): void {
  const etiquette = etiquettePropre(arrivee.pub);
  if (etiquette === "") {
    jour.sans++;
    if (arrivee.meta === true) jour.metaSans++;
    return;
  }
  if (etiquette.length > ARRIVEES_ETIQUETTE_LONGUEUR_MAX) {
    jour.nonRangees++;
    return;
  }
  ranger(jour, etiquette, 1);
}

/** `base` + `ajout`, dans un nouveau jour. Sert à l'écriture (ce qui est en
 * base + ce qui attend en mémoire) comme à la lecture. */
export function fusionnerArrivees(base: JourArrivees, ajout: JourArrivees): JourArrivees {
  const somme: JourArrivees = {
    parPub: new Map(base.parPub),
    sans: base.sans + ajout.sans,
    metaSans: base.metaSans + ajout.metaSans,
    nonRangees: base.nonRangees + ajout.nonRangees,
  };
  for (const [etiquette, n] of ajout.parPub) ranger(somme, etiquette, n);
  return somme;
}

export type TotalArrivees = {
  parPub: Map<string, number>;
  /** Arrivées étiquetées, toutes publicités confondues (non rangées comprises). */
  etiquetees: number;
  sans: number;
  metaSans: number;
  nonRangees: number;
};

/** Les jours d'une période, additionnés. Pas de plafond ici : chaque jour a
 * déjà le sien, et couper une publicité à la lecture la ferait disparaître
 * d'un tableau où ses commandes figurent. */
export function sommerArrivees(jours: Iterable<JourArrivees>): TotalArrivees {
  const total: TotalArrivees = { parPub: new Map(), etiquetees: 0, sans: 0, metaSans: 0, nonRangees: 0 };
  for (const jour of jours) {
    for (const [etiquette, n] of jour.parPub) {
      total.parPub.set(etiquette, (total.parPub.get(etiquette) ?? 0) + n);
      total.etiquetees += n;
    }
    total.sans += jour.sans;
    total.metaSans += jour.metaSans;
    total.nonRangees += jour.nonRangees;
    total.etiquetees += jour.nonRangees;
  }
  return total;
}

/** Un programme, pas une personne.
 *
 * Meta, Google et les outils de surveillance ouvrent les liens publicitaires
 * avec de vrais navigateurs, JavaScript compris : sans ce tri, chaque
 * contrôle d'une publicité par Meta compterait comme une visite de plus —
 * précisément sur les publicités neuves, celles qu'on regarde de près.
 *
 * Un navigateur envoie toujours son nom : son absence est un programme.
 *
 * « bot/ » et « bot- », PAS « bot » tout court : CUBOT est une marque de
 * téléphones Android bon marché, et « CUBOT NOTE 7 » est une cliente. */
const AUTOMATES =
  /bot\/|bot-|petalbot|telegrambot|crawler|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|facebookexternalhit|facebookcatalog|meta-external|google-inspectiontool|googleother|mediapartners|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|python-requests|python-urllib|curl\/|wget\/|axios\/|node-fetch|go-http-client/i;

/** Tous les navigateurs — Chrome, Safari, Firefox, Samsung, et les
 * navigateurs intégrés de Facebook et d'Instagram — s'annoncent par
 * « Mozilla/ » (« Opera/ » pour Opera Mini). Un programme qui appelle
 * l'API sans se faire passer pour l'un d'eux (« node », « okhttp »,
 * « Go-http-client ») n'a pas à figurer dans une liste : il n'y entre pas. */
const NAVIGATEUR = /^(mozilla|opera)\//i;

export function agentAutomatique(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").trim();
  return !NAVIGATEUR.test(ua) || AUTOMATES.test(ua);
}

/* ------------------------------ Lecture ------------------------------ */

/** En dessous, un « pour cent visites » n'est que du hasard : une commande
 * sur vingt visites afficherait 5, la suivante sur vingt autres 0. */
export const VISITES_MIN_POUR_UN_TAUX = 100;

/** Commandes pour cent visites — ou rien quand on ne peut pas le dire. */
export function pourCentVisites(commandes: number, visites: number): number | null {
  if (visites < VISITES_MIN_POUR_UN_TAUX) return null;
  return (commandes / visites) * 100;
}
