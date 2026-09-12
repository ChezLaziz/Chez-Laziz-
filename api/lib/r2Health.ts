// Le stockage des photos, surveillé — pour qu'il ne puisse plus tomber en
// silence.
//
// CE QUI S'EST PASSÉ. Les identifiants R2 ont cessé d'être acceptés. Toutes
// les photos produits sont devenues des images cassées, y compris sur la page
// où atterrissait la publicité payante. Aucune alerte, aucune erreur visible,
// rien dans le tableau de bord : la panne a duré des heures et c'est un
// client qui l'a signalée.
//
// Le code était correct. Ce qui manquait n'était pas une correction, c'était
// un TÉMOIN. Une dépendance extérieure — un jeton qui expire, une permission
// retirée, un compte suspendu — tombe toujours un jour ; ce qu'on choisit,
// c'est de l'apprendre en une heure ou en une journée.
//
// Le test utilise un LISTAGE, pas la lecture d'une photo précise : « Access
// Denied » sur un objet est ambigu (droits, ou objet absent), un listage ne
// dépend d'aucun objet. S'il passe, le jeton est vivant.

import { canListBucket } from "./r2";
import { readSetting, writeSetting } from "../queries/settingsStore";
import { isTelegramConfigured, sendMessage } from "./telegram";

const CLE_ETAT = "r2_health_state";
const CLE_ALERTE = "r2_health_alert_at";

const PERIODE_MS = 60 * 60 * 1000;
/** Une alerte toutes les deux heures tant que c'est cassé : assez pour ne pas
 * oublier, assez rare pour ne pas être coupée. */
const ALERTE_MS = 2 * 60 * 60 * 1000;

const ALERTE = [
  "🖼️ <b>صور الموقع ما تتحمّلش</b>",
  "",
  "السيرفر ما عادش ينجّم يوصل للمخزن (R2). الحرفاء اللي داخلين من الإعلان",
  "يشوفو صور مكسّرة.",
  "",
  "غالباً التوكن متاع Cloudflare انتهى ولا تبدّلت صلاحياتو.",
  "الحلّ : Cloudflare → R2 → Manage R2 API Tokens → اعمل توكن جديد،",
  "وحطّو في Railway (R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY).",
  "",
  "⚠️ الطلبيات والموقع يخدمو عادي — الصور برك.",
].join("\n");

const RETOUR = "✅ <b>صور الموقع رجعت تخدم</b>";

async function alerter(texte: string, now: Date, throttle: boolean): Promise<void> {
  if (!isTelegramConfigured()) return;
  if (throttle) {
    const dernier = await readSetting(CLE_ALERTE);
    const t = dernier ? Date.parse(dernier) : Number.NaN;
    if (Number.isFinite(t) && now.getTime() - t < ALERTE_MS) return;
  }
  if (await sendMessage(texte)) await writeSetting(CLE_ALERTE, now.toISOString());
}

/** Un passage du témoin. Ne lève jamais. */
export async function checkR2Health(now = new Date()): Promise<void> {
  try {
    const vivant = await canListBucket();
    const avant = await readSetting(CLE_ETAT);

    if (!vivant) {
      if (avant !== "ko") {
        console.error("[r2-health] accès au stockage PERDU");
        await writeSetting(CLE_ETAT, "ko");
      }
      await alerter(ALERTE, now, true);
      return;
    }

    // Le retour à la normale se dit UNE fois — sinon personne ne saurait
    // quand il est redevenu sûr de relancer une publicité.
    if (avant === "ko") {
      console.log("[r2-health] accès au stockage rétabli");
      await writeSetting(CLE_ETAT, "ok");
      await alerter(RETOUR, now, false);
      return;
    }
    if (avant !== "ok") await writeSetting(CLE_ETAT, "ok");
  } catch (err) {
    // Le témoin ne doit jamais devenir lui-même une panne.
    console.error("[r2-health] vérification impossible :", err);
  }
}

export function startR2HealthScheduler(): void {
  // Vite après le démarrage : un redéploiement avec un jeton mort doit se
  // voir tout de suite, pas dans une heure.
  setTimeout(() => void checkR2Health(), 45_000).unref();
  setInterval(() => void checkR2Health(), PERIODE_MS).unref();
  console.log("[r2-health] surveillance du stockage des photos activée");
}
