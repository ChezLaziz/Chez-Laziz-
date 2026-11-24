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
const CLE_NOTE_MATBAKH = "telegram_matbakh_jour_par_jour_annonce";

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
  "متاع كل نوع، نهار بنهار. كي طلبيات نهار تخرج،",
  "اضغط <b>✅ تمّ</b> قدّامو.",
  "",
  "⏰ وكان طلبية تقعد بلا تليفون، القروب يفكّركم.",
].join("\n");

/** Le mot d'explication du jour où le tableau du matbakh a changé de règle.
 *
 * UNE SEULE FOIS, et seulement dans un groupe qui existait AVANT : le message
 * d'installation lui avait appris « un ✅ par type », et le tableau qu'il
 * voit maintenant n'a plus ces boutons-là. Un tableau qui change sans un mot
 * se lit comme une panne. Un groupe installé après ce changement n'en a pas
 * besoin — son message d'installation dit déjà la bonne règle. */
const NOTE_MATBAKH = [
  "🍳 <b>جدول المطبخ تبدّل</b>",
  "",
  "من توّا يحسب كان الطلبيات المأكّدة اللي مازالت ما خرجتش، <b>نهار بنهار</b>.",
  "",
  "• الطلبية تخرج من الجدول وحدها كي تتحطّ «Terminée» في الإدارة.",
  "• ولا اضغطوا <b>✅ تمّ</b> قدّام النهار كي طلبياتو تخرج.",
  "• غلطت؟ اضغط <b>↩️ رجوع</b>.",
].join("\n");

/** Prépare Telegram : identifiant à jour, webhook déclaré, message
 * d'installation si c'est la première fois. Ne lève jamais.
 *
 * Rend VRAI quand le mot d'explication du matbakh vient de partir : le
 * tableau doit alors être renvoyé juste en dessous, pour que l'explication
 * et ce qu'elle explique se lisent ensemble (voir api/boot.ts). */
export async function setupTelegram(): Promise<boolean> {
  if (!isTelegramConfigured()) {
    console.log("[telegram] non configuré — rien à préparer");
    return false;
  }
  try {
    // AVANT le webhook : si le groupe a migré, tout doit repartir sur le
    // nouvel identifiant dès le premier appel.
    setChatIdOverride(await readSetting(CLE_CHAT_MIGRE));
    setMigrationHandler((id) => writeSetting(CLE_CHAT_MIGRE, id));
    await registerTelegramWebhook();

    if (!(await readSetting(CLE_BONJOUR))) {
      const envoye = await sendMessage(BONJOUR);
      // Le drapeau n'est posé QUE si le message est vraiment parti : sinon un
      // groupe où le bot n'a pas encore le droit d'écrire n'aurait jamais son
      // message d'installation.
      if (envoye) {
        await writeSetting(CLE_BONJOUR, "1");
        // Ce groupe-là apprend la bonne règle dès son premier message.
        await writeSetting(CLE_NOTE_MATBAKH, "1");
      }
      return false;
    }

    if (await readSetting(CLE_NOTE_MATBAKH)) return false;
    const note = await sendMessage(NOTE_MATBAKH);
    if (!note) return false;
    await writeSetting(CLE_NOTE_MATBAKH, "1");
    return true;
  } catch (err) {
    console.error("[telegram] préparation incomplète :", err);
    return false;
  }
}
