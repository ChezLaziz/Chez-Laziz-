// La sauvegarde automatique de la base, par le serveur lui-même.
//
// Elle tournait jusqu'ici depuis une session d'agent : le jour où cette
// session s'arrête, les sauvegardes s'arrêtent AVEC ELLE — sans erreur, sans
// avertissement, sans que rien ne change à l'écran. On ne s'en apercevrait
// que le jour où on en a besoin, en découvrant que la dernière date de
// plusieurs semaines. C'est la définition même de la panne muette, sur la
// seule chose qui ne se répare pas après coup.
//
// Désormais : le serveur, tous les jours, dans R2 — le même stockage que les
// photos des produits, déjà configuré.
//
// QUOTIDIENNE, pas hebdomadaire. Le fichier fait quelques centaines de
// kilo-octets ; une semaine de commandes perdues, elle, ne se rattrape pas.
//
// Et surtout : elle SE RELIT après écriture, et elle CRIE quand elle échoue.
// Une sauvegarde silencieuse dont personne ne vérifie qu'elle existe est le
// problème qu'on croyait avoir résolu.

import { getFullExport } from "../queries/backup";
import { objectSize, putObject } from "./r2";
import { readSetting, writeSetting } from "../queries/settingsStore";
import { isTelegramConfigured, sendMessage } from "./telegram";

const CLE_DATE = "backup_last_at";
const CLE_OBJET = "backup_last_key";
const CLE_ALERTE = "backup_alert_at";

const INTERVALLE_MS = 24 * 60 * 60 * 1000;
/** On ne répète une alerte d'échec qu'une fois par jour : répétée toutes les
 * heures, elle deviendrait du bruit qu'on coupe. */
const ALERTE_MS = 24 * 60 * 60 * 1000;
/** Le serveur vérifie souvent, sauvegarde rarement : un redémarrage ne doit
 * pas faire sauter la sauvegarde du jour. */
const VERIF_MS = 60 * 60 * 1000;

function ageMs(iso: string | null, now: number): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? now - t : Number.POSITIVE_INFINITY;
}

async function alerter(message: string, now: Date): Promise<void> {
  if (!isTelegramConfigured()) return;
  if (ageMs(await readSetting(CLE_ALERTE), now.getTime()) < ALERTE_MS) return;
  const envoye = await sendMessage(
    ["⚠️ <b>النسخة الاحتياطية ما نجحتش</b>", "", message, "", "الموقع والطلبيات يخدمو عادي."].join(
      "\n",
    ),
  );
  if (envoye) await writeSetting(CLE_ALERTE, now.toISOString());
}

/** Sauvegarde si la dernière date de plus de 24 h. Ne lève jamais : c'est une
 * tâche de fond, elle ne doit pouvoir casser ni le serveur ni une commande. */
export async function runBackupIfDue(now = new Date()): Promise<void> {
  try {
    if (ageMs(await readSetting(CLE_DATE), now.getTime()) < INTERVALLE_MS) return;

    const contenu = Buffer.from(JSON.stringify(await getFullExport(), null, 2), "utf-8");
    // Une clé par JOUR : deux passages le même jour réécrivent le même objet
    // au lieu d'empiler des copies. L'historique reste lisible à l'œil.
    const key = `backups/chez-laziz-${now.toISOString().slice(0, 10)}.json`;
    await putObject(key, contenu, "application/json");

    // On relit ce qu'on vient d'écrire. Un PUT qui ne lève pas ne prouve rien.
    const taille = await objectSize(key);
    if (taille === null || taille !== contenu.byteLength) {
      await alerter(
        `الملف تكتب أما القراءة ما طابقتش (${taille ?? "غير موجود"} بدل ${contenu.byteLength}).`,
        now,
      );
      console.error(`[backup] relecture incohérente pour ${key} : ${taille} ≠ ${contenu.byteLength}`);
      return;
    }

    await writeSetting(CLE_OBJET, key);
    await writeSetting(CLE_DATE, now.toISOString());
    console.log(`[backup] ${key} — ${Math.round(contenu.byteLength / 1024)} Ko, relu et vérifié`);
  } catch (err) {
    const raison = err instanceof Error ? err.message : String(err);
    console.error("[backup] échec :", raison);
    await alerter(raison.slice(0, 300), now).catch(() => undefined);
  }
}

/** Où en est la dernière sauvegarde — pour que le tableau de bord puisse le
 * DIRE. Une sauvegarde qu'on ne peut pas voir revient à ne pas en avoir. */
export async function backupStatus(): Promise<{
  lastAt: string | null;
  lastKey: string | null;
  ageHours: number | null;
}> {
  const [lastAt, lastKey] = await Promise.all([readSetting(CLE_DATE), readSetting(CLE_OBJET)]);
  // L'âge est calculé ICI, pas dans le navigateur : c'est l'horloge du
  // serveur qui a écrit la date, et une tablette mal réglée dans l'atelier
  // afficherait sinon « sauvegardé il y a 3 jours » sur une copie de ce matin.
  const age = lastAt ? (Date.now() - Date.parse(lastAt)) / 3_600_000 : null;
  return {
    lastAt: lastAt || null,
    lastKey: lastKey || null,
    ageHours: age !== null && Number.isFinite(age) ? Math.max(0, age) : null,
  };
}

export function startBackupScheduler(): void {
  // Trente secondes après le démarrage : si le serveur a passé la nuit
  // éteint, la sauvegarde manquée se rattrape tout de suite.
  setTimeout(() => void runBackupIfDue(), 30_000).unref();
  setInterval(() => void runBackupIfDue(), VERIF_MS).unref();
  console.log("[backup] sauvegarde quotidienne de la base vers R2 activée");
}
