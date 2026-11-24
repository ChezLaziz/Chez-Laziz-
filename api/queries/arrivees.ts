// Les visites par publicité — la mémoire du serveur et la table `settings`.
// Toutes les règles (ce qu'est une arrivée, les plafonds, la fusion) vivent
// dans contracts/arrivees.ts, pures et testées ; ici il n'y a que le
// transport : compter en mémoire, écrire par petits paquets, relire.

import { inArray } from "drizzle-orm";
import { settings } from "@db/schema";
import { getDb } from "./connection";
import { readSetting, swapSetting } from "./settingsStore";
import { dayKey, daysInPeriod, type Period } from "./analytics/period";
import {
  CLE_ARRIVEES_DEBUT,
  ajouterArrivee,
  cleArrivees,
  ecrireJourArrivees,
  fusionnerArrivees,
  jourEstVide,
  jourVide,
  parseJourArrivees,
  sommerArrivees,
  type Arrivee,
  type JourArrivees,
  type TotalArrivees,
} from "@contracts/arrivees";

export type ArriveesStore = {
  read: (key: string) => Promise<string | null>;
  readMany: (keys: string[]) => Promise<Map<string, string>>;
  /** Écrit `apres` seulement si la valeur vaut encore `avant` (null = la
   * clé n'existe pas) — voir swapSetting. */
  swap: (key: string, avant: string | null, apres: string) => Promise<boolean>;
};

export type ArriveesLues = {
  /** L'instant de la première arrivée jamais comptée ; null = aucune. */
  debut: Date | null;
  /** Seulement les jours où quelque chose a été compté. */
  jours: Map<string, JourArrivees>;
};

export type CompteurArrivees = {
  /** Compte une arrivée. Ne lève JAMAIS et n'attend rien : la visite d'une
   * cliente ne dépend pas d'un compteur. */
  noter: (arrivee: Arrivee, now?: Date) => void;
  /** Écrit ce qui attend en mémoire. Ne lève jamais non plus. */
  vider: () => Promise<void>;
  lire: (jours: string[]) => Promise<ArriveesLues>;
};

/** Quinze secondes entre une arrivée et son écriture.
 *
 * POURQUOI NE PAS ÉCRIRE À CHAQUE ARRIVÉE. Le compteur d'un jour est une
 * seule ligne, lue, augmentée, réécrite. Deux clics publicitaires dans la
 * même seconde se marcheraient dessus : la seconde écriture échouerait
 * (voir swapSetting) et devrait tout relire. En regroupant, un seul
 * écrivain passe toutes les quinze secondes, quel que soit le trafic.
 *
 * Ce que ça coûte : un redémarrage du serveur perd au plus quinze secondes
 * de visites. Le tableau de bord, lui, ne voit pas de retard — la lecture
 * ajoute ce qui attend encore en mémoire. */
const DELAI_MS = 15_000;
/** Base indisponible : on réessaie de moins en moins souvent, pour ne pas
 * remplir le journal d'une même erreur quatre fois par minute. */
const DELAI_MAX_MS = 5 * 60_000;
const ESSAIS = 4;

type Options = {
  delaiMs?: number;
  /** Remplacé dans les tests : pas de vrai minuteur. */
  planifier?: (fn: () => void, ms: number) => void;
  journal?: (message: string, erreur?: unknown) => void;
};

export function creerCompteurArrivees(store: ArriveesStore, options: Options = {}): CompteurArrivees {
  const delaiMs = options.delaiMs ?? DELAI_MS;
  const planifier =
    options.planifier ??
    ((fn: () => void, ms: number) => {
      // unref : un minuteur en attente ne doit jamais retenir l'arrêt du serveur.
      setTimeout(fn, ms).unref();
    });
  const journal = options.journal ?? ((message: string, erreur?: unknown) => console.error(message, erreur ?? ""));

  /** Ce qui a été compté et pas encore écrit, par jour. */
  const enAttente = new Map<string, JourArrivees>();
  let premiere: Date | null = null;
  let debutEcrit = false;
  let minuteurPose = false;
  let enCours: Promise<void> | null = null;
  let echecs = 0;

  function poserMinuteur(): void {
    if (minuteurPose) return;
    minuteurPose = true;
    const attente = Math.min(delaiMs * 2 ** Math.min(echecs, 10), Math.max(DELAI_MAX_MS, delaiMs));
    planifier(() => {
      minuteurPose = false;
      void vider();
    }, attente);
  }

  function noter(arrivee: Arrivee, now: Date = new Date()): void {
    try {
      const cle = dayKey(now);
      let jour = enAttente.get(cle);
      if (!jour) {
        jour = jourVide();
        enAttente.set(cle, jour);
      }
      ajouterArrivee(jour, arrivee);
      if (!premiere) premiere = now;
      poserMinuteur();
    } catch (erreur) {
      journal("[arrivées] une arrivée n'a pas pu être comptée :", erreur);
    }
  }

  async function ecrireJour(cleJour: string, ajout: JourArrivees): Promise<boolean> {
    for (let essai = 0; essai < ESSAIS; essai++) {
      const avant = await store.read(cleArrivees(cleJour));
      const apres = ecrireJourArrivees(fusionnerArrivees(parseJourArrivees(avant), ajout));
      if (await store.swap(cleArrivees(cleJour), avant, apres)) return true;
    }
    return false;
  }

  async function toutEcrire(): Promise<void> {
    if (!debutEcrit && premiere) {
      // Faux = la clé existe déjà : un démarrage plus ancien a posé le vrai
      // début, et c'est lui qui compte.
      await store.swap(CLE_ARRIVEES_DEBUT, null, premiere.toISOString());
      debutEcrit = true;
    }
    for (const cleJour of Array.from(enAttente.keys())) {
      const ajout = enAttente.get(cleJour);
      if (!ajout) continue;
      // Retiré AVANT d'écrire : ce qui arrive pendant l'écriture ouvre un
      // nouveau paquet, et ne peut être ni perdu ni compté deux fois.
      enAttente.delete(cleJour);
      let ecrit = false;
      try {
        ecrit = await ecrireJour(cleJour, ajout);
      } finally {
        if (!ecrit) {
          const depuis = enAttente.get(cleJour);
          enAttente.set(cleJour, depuis ? fusionnerArrivees(ajout, depuis) : ajout);
        }
      }
      if (!ecrit) throw new Error(`le compteur du ${cleJour} a changé ${ESSAIS} fois pendant l'écriture`);
    }
  }

  function vider(): Promise<void> {
    if (enCours) return enCours;
    enCours = toutEcrire()
      .then(() => {
        echecs = 0;
      })
      .catch((erreur: unknown) => {
        echecs++;
        journal("[arrivées] visites non écrites, elles le seront au prochain passage :", erreur);
      })
      .finally(() => {
        enCours = null;
        if (enAttente.size > 0) poserMinuteur();
      });
    return enCours;
  }

  async function lire(jours: string[]): Promise<ArriveesLues> {
    const lues = await store.readMany([CLE_ARRIVEES_DEBUT, ...jours.map(cleArrivees)]);
    const parJour = new Map<string, JourArrivees>();
    for (const jour of jours) {
      const enBase = parseJourArrivees(lues.get(cleArrivees(jour)));
      // Ce qui attend encore en mémoire fait partie du compte : le tableau
      // de bord n'a pas à attendre le prochain passage de l'écrivain.
      const attente = enAttente.get(jour);
      const total = attente ? fusionnerArrivees(enBase, attente) : enBase;
      if (!jourEstVide(total)) parJour.set(jour, total);
    }
    const brut = lues.get(CLE_ARRIVEES_DEBUT);
    let debut = brut ? new Date(brut) : null;
    if (debut && Number.isNaN(debut.getTime())) debut = null;
    // Rien d'écrit encore, mais une première arrivée attend en mémoire.
    if (!debut && premiere) debut = premiere;
    return { debut, jours: parJour };
  }

  return { noter, vider, lire };
}

const enBase: ArriveesStore = {
  read: readSetting,
  swap: swapSetting,
  readMany: async (keys) => {
    const out = new Map<string, string>();
    if (keys.length === 0) return out;
    const rows = await getDb().query.settings.findMany({ where: inArray(settings.key, keys) });
    for (const r of rows) out.set(r.key, r.value);
    return out;
  },
};

const compteur = creerCompteurArrivees(enBase);

/** À appeler depuis `stats.track`. Synchrone, sans attente, sans exception. */
export function noterArrivee(arrivee: Arrivee, now: Date = new Date()): void {
  compteur.noter(arrivee, now);
}

/** Au-delà, une période personnalisée de plusieurs années demanderait des
 * centaines de lignes à chaque rafraîchissement du tableau de bord. On
 * garde les jours les plus récents. */
const JOURS_LUS_MAX = 400;
const JOUR_MS = 24 * 60 * 60 * 1000;

export type ArriveesPeriode = TotalArrivees & {
  /** Première arrivée jamais comptée. */
  debut: Date;
  /** Vrai quand la période commence AVANT le début du comptage : les
   * visites ne couvrent alors qu'une partie de ses commandes. */
  partielle: boolean;
  /** Hier et aujourd'hui, QUELLE QUE SOIT la période affichée. Une
   * publicité qui tourne sans étiquette se corrige maintenant ou jamais :
   * la chercher dans une moyenne de quatre-vingt-dix jours la noierait, et
   * en retrouver une vieille de trois semaines n'aiderait personne. */
  recentes: { etiquetees: number; metaSans: number };
};

function joursRecents(now: Date): string[] {
  return [dayKey(new Date(now.getTime() - JOUR_MS)), dayKey(now)];
}

/** Les jours à demander au compteur : ceux de la période, plus hier et
 * aujourd'hui s'ils n'en font pas partie. */
export function joursALire(period: Period, now: Date): string[] {
  return Array.from(new Set([...daysInPeriod(period).slice(-JOURS_LUS_MAX), ...joursRecents(now)]));
}

/** Les visites d'une période — ou `null` quand on n'en sait rien : rien n'a
 * jamais été compté, ou la période s'arrête avant le début du comptage.
 * « On ne sait pas » et « zéro visite » ne sont pas la même réponse. */
export function resumerArrivees(lues: ArriveesLues, period: Period, now: Date): ArriveesPeriode | null {
  const { debut, jours } = lues;
  if (!debut || debut.getTime() >= period.end.getTime()) return null;
  const pris = (cles: string[]) => cles.flatMap((cle) => jours.get(cle) ?? []);
  const recentes = sommerArrivees(pris(joursRecents(now)));
  return {
    ...sommerArrivees(pris(daysInPeriod(period).slice(-JOURS_LUS_MAX))),
    debut,
    partielle: debut.getTime() > period.start.getTime(),
    recentes: { etiquetees: recentes.etiquetees, metaSans: recentes.metaSans },
  };
}

export async function lireArriveesPeriode(period: Period, now: Date = new Date()): Promise<ArriveesPeriode | null> {
  return resumerArrivees(await compteur.lire(joursALire(period, now)), period, now);
}
