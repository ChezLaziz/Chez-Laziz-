// Accès générique à la table `settings` — un couple clé/valeur, pas une
// migration par réglage.
//
// Volontairement PAS le même code que api/queries/admin.ts : là-bas, une clé
// absente est une anomalie de configuration et lève. Ici une clé absente est
// normale (« ce tableau n'a jamais été affiché ») et rend null.

import { getDb } from "./connection";
import { settings } from "@db/schema";
import { and, eq } from "drizzle-orm";

export async function readSetting(key: string): Promise<string | null> {
  const row = await getDb().query.settings.findFirst({ where: eq(settings.key, key) });
  return row?.value ?? null;
}

export async function writeSetting(key: string, value: string): Promise<void> {
  await getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Écrit `apres` SEULEMENT si la valeur vaut encore `avant` — `null` voulant
 * dire « la clé n'existe pas encore ». Rend faux si quelqu'un est passé
 * entre-temps : rien n'a alors été écrit, et c'est à l'appelant de relire.
 *
 * Pour les valeurs qu'on lit, modifie puis réécrit (un registre en JSON) :
 * `writeSetting` y ferait gagner le dernier arrivé, en effaçant sans bruit
 * la modification de l'autre. Même garde que `updateOrderStatus`, qui ne
 * change un statut que s'il est encore celui qu'on a lu. */
export async function swapSetting(key: string, avant: string | null, apres: string): Promise<boolean> {
  if (avant === null) {
    const rows = await getDb()
      .insert(settings)
      .values({ key, value: apres })
      .onConflictDoNothing()
      .returning({ key: settings.key });
    return rows.length === 1;
  }
  const rows = await getDb()
    .update(settings)
    .set({ value: apres })
    .where(and(eq(settings.key, key), eq(settings.value, avant)))
    .returning({ key: settings.key });
  return rows.length === 1;
}
