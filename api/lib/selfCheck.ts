// Auto-test du serveur sur sa propre API, quelques secondes après chaque
// démarrage.
//
// Le 12 septembre à 12 h 42, un déploiement a fait répondre 405 à chaque
// lecture tRPC — catalogue vide, admin impossible à ouvrir — pendant cinq
// minutes, jusqu'à ce que quelqu'un le voie. Les vérifications avant
// déploiement simulent l'API : elles ne pouvaient pas l'attraper. Ici le
// serveur, une fois lancé, fait exactement ce que fait un navigateur : une
// lecture en POST vers une procédure publique. Si la réponse n'est pas
// 200, une ligne de journal ET un message Telegram, dans la minute.

import { isTelegramConfigured, sendMessage } from "./telegram";

/** Décision, sans réseau : le code HTTP suffit. */
export function verdictAutoTest(status: number): { ok: boolean; message: string } {
  if (status === 200) return { ok: true, message: "[auto-test] lectures tRPC OK" };
  return {
    ok: false,
    message: `[auto-test] ÉCHEC : une lecture tRPC répond ${status} — le site ne charge plus ses données`,
  };
}

export async function runSelfCheck(port: number): Promise<void> {
  let status = 0;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/trpc/content.footer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: null }),
    });
    status = res.status;
  } catch (err) {
    console.error("[auto-test] injoignable :", err instanceof Error ? err.message : err);
  }
  const verdict = verdictAutoTest(status);
  if (verdict.ok) {
    console.log(verdict.message);
    return;
  }
  console.error(verdict.message);
  if (isTelegramConfigured()) {
    await sendMessage(
      `⚠️ <b>الموقع فيه مشكل</b>\nبعد آخر نشر، طلبات البيانات ترجع خطأ ${status} — الكتالوج والأدمن ما يحمّلوش. لازم تدخّل فوري.`,
    ).catch(() => undefined);
  }
}
