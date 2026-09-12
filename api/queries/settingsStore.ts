// Accès générique à la table `settings` — un couple clé/valeur, pas une
// migration par réglage.
//
// Volontairement PAS le même code que api/queries/admin.ts : là-bas, une clé
// absente est une anomalie de configuration et lève. Ici une clé absente est
// normale (« ce tableau n'a jamais été affiché ») et rend null.

import { getDb } from "./connection";
import { settings } from "@db/schema";
import { eq } from "drizzle-orm";

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
