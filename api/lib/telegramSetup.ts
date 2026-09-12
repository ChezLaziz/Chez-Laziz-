// Ce qu'il faut faire UNE FOIS, au démarrage du serveur, pour que le groupe
// soit opérationnel sans que personne ne touche à rien.

import { readSetting, writeSetting } from "../queries/settingsStore";
import {
  isTelegramConfigured,
  registerTelegramWebhook,
  sendMessage,
  setChatIdOverride,
  setMigrationHandler,
} from "./telegram";

const CLE_CHAT_MIGRE = "telegram_chat_id_migre";
const CLE_BONJOUR = "telegram_bonjour_envoye";

/** Le message d'installation. Envoyé UNE SEULE FOIS dans la vie du groupe —
 * il prouve que le lien fonctionne, et il dit aux trois personnes ce que ce
 * groupe va leur demander. Le répéter à chaque redéploiement en ferait du
 * bruit qu'on finit par ignorer. */
const BONJOUR = [
  "🍯 <b>Chez Laziz — القروب يخدم</b>",
  "",
  "من توّا، كل طلبية جديدة توصل هوني على طول.",
  "",
  "👤 <b>اللي يأكّد :</b> تلقى الطلبية كاملة مع نمرة الحريف،",
  "عيّطلو، وبعدها اضغط <b>✅ تأكيد</b> ولا <b>❌ إلغاء</b>.",
  "",
  "🍳 <b>المطبخ :</b> تلقى جدول مثبّت فيه الوزن المطلوب",
  "متاع كل نوع. كي تكمّل نوع، اضغط <b>✅</b> قدّامو.",
  "",
  "⏰ وكان طلبية تقعد بلا تليفون، القروب يفكّركم.",
].join("\n");

/** Prépare Telegram : identifiant à jour, webhook déclaré, message
 * d'installation si c'est la première fois. Ne lève jamais. */
export async function setupTelegram(): Promise<void> {
  if (!isTelegramConfigured()) {
    console.log("[telegram] non configuré — rien à préparer");
    return;
  }
  try {
    // AVANT le webhook : si le groupe a migré, tout doit repartir sur le
    // nouvel identifiant dès le premier appel.
    setChatIdOverride(await readSetting(CLE_CHAT_MIGRE));
    setMigrationHandler((id) => writeSetting(CLE_CHAT_MIGRE, id));
    await registerTelegramWebhook();

    if (await readSetting(CLE_BONJOUR)) return;
    const envoye = await sendMessage(BONJOUR);
    // Le drapeau n'est posé QUE si le message est vraiment parti : sinon un
    // groupe où le bot n'a pas encore le droit d'écrire n'aurait jamais son
    // message d'installation.
    if (envoye) await writeSetting(CLE_BONJOUR, "1");
  } catch (err) {
    console.error("[telegram] préparation incomplète :", err);
  }
}
