// Le rappel des commandes qui dorment, posté dans le groupe.
//
// Même discipline que le tableau du matbakh : UN seul message, remplacé, pas
// empilé. Et surtout, une règle sur le bruit — parce qu'un rappel qui sonne
// toutes les vingt minutes pour les mêmes cinq commandes se termine toujours
// de la même façon : quelqu'un coupe les notifications du groupe, et la
// boutique perd aussi les nouvelles commandes.
//
//   — une commande REJOINT la liste  → nouveau message, en bas, qui sonne ;
//   — la liste rétrécit ou vieillit  → modifié sur place, en silence ;
//   — la liste se vide               → le message disparaît. Rien ne le
//     remplace : « tout va bien » n'a pas besoin d'être dit.

import {
  contientDuNouveau,
  estHeureOuvrable,
  formatStalledDigest,
  tunisHour,
} from "@contracts/stalledOrders";
import { listOrdersAwaitingCall, listOrdersAwaitingHandover } from "../queries/reminders";
import { readSetting, writeSetting } from "../queries/settingsStore";
import { deleteMessage, editMessage, isTelegramConfigured, sendMessage } from "./telegram";

const CLE_MESSAGE = "stalled_message_id";
const CLE_IDS = "stalled_ids";

/** Vingt minutes : assez fin pour qu'une commande en retard soit signalée
 * dans le quart d'heure, assez large pour ne pas marteler la base. Le bruit,
 * lui, est réglé par contientDuNouveau, pas par cette fréquence. */
const PERIODE_MS = 20 * 60 * 1000;

async function lireIds(): Promise<number[]> {
  const brut = await readSetting(CLE_IDS);
  if (!brut) return [];
  try {
    const parsed: unknown = JSON.parse(brut);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

async function lireMessageId(): Promise<number | null> {
  const brut = await readSetting(CLE_MESSAGE);
  if (!brut) return null;
  const n = Number(brut);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Un passage du rappel. Ne lève jamais — c'est une tâche de fond, elle ne
 * doit pouvoir casser ni une commande ni le serveur. */
export async function runStalledCheck(now = new Date()): Promise<void> {
  if (!isTelegramConfigured()) return;
  if (!estHeureOuvrable(tunisHour(now))) return;
  try {
    const [aConfirmer, aRemettre] = await Promise.all([
      listOrdersAwaitingCall(now),
      listOrdersAwaitingHandover(now),
    ]);
    const texte = formatStalledDigest(aConfirmer, aRemettre);
    const ancien = await lireMessageId();

    if (texte === null) {
      if (ancien !== null) {
        await deleteMessage(ancien);
        await writeSetting(CLE_MESSAGE, "");
      }
      await writeSetting(CLE_IDS, "[]");
      return;
    }

    const ids = [...aConfirmer.map((o) => o.id), ...aRemettre.map((o) => o.id)];
    const sonner = contientDuNouveau(ids, await lireIds());

    if (!sonner && ancien !== null && (await editMessage(ancien, texte))) {
      await writeSetting(CLE_IDS, JSON.stringify(ids));
      return;
    }
    if (ancien !== null) await deleteMessage(ancien);
    const envoye = await sendMessage(texte);
    await writeSetting(CLE_MESSAGE, envoye ? String(envoye.message_id) : "");
    await writeSetting(CLE_IDS, JSON.stringify(ids));
  } catch (err) {
    console.error("[rappel] non envoyé :", err);
  }
}

/** Lance la vérification périodique. `unref` pour qu'un minuteur ne retienne
 * jamais le processus au moment de s'arrêter. */
export function startReminderScheduler(): void {
  if (!isTelegramConfigured()) {
    console.log("[rappel] Telegram non configuré — aucun rappel programmé");
    return;
  }
  // Un premier passage peu après le démarrage : un redéploiement au milieu de
  // la journée ne doit pas faire perdre vingt minutes de rappel.
  setTimeout(() => void runStalledCheck(), 30_000).unref();
  setInterval(() => void runStalledCheck(), PERIODE_MS).unref();
  console.log("[rappel] vérification des commandes en attente toutes les 20 min");
}
