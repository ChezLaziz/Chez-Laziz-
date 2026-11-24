import { inArray } from "drizzle-orm";
import { settings } from "@db/schema";
import { getDb } from "./connection";
import { CLE_MESSAGE as CLE_OFFRES_MESSAGE, CLE_REGISTRE as CLE_OFFRES_REGISTRE } from "./offres";
import { CLE as CLE_SUIVI } from "./suiviLivraison";

/** Les registres rangés dans `settings` qui partent dans la sauvegarde.
 *
 * Les accords pour les offres sur WhatsApp sont une PREUVE : qui a dit oui,
 * sur quelle commande, à quel texte — et qui a dit stop, et quand. Une base
 * restaurée sans eux, et la boutique ne sait plus à qui elle a le droit
 * d'écrire, ni à qui elle a promis de ne plus le faire. Les clientes déjà
 * contactées après livraison suivent pour la même raison : sans ce registre,
 * elles recevraient toutes leur message une seconde fois.
 *
 * LISTE FERMÉE, exprès. `settings` porte aussi la clé de signature des
 * sessions : une clé ajoutée demain ne doit jamais partir dans une
 * sauvegarde parce qu'on aurait écrit « tout sauf… ». */
const REGISTRES_SAUVEGARDES = [CLE_OFFRES_REGISTRE, CLE_OFFRES_MESSAGE, CLE_SUIVI];

/** Export complet des données métier — exclut les secrets (mots de passe,
 * clé de signature des sessions) même si l'export reste réservé aux admins. */
export async function getFullExport() {
  const db = getDb();
  const [products, orders, contactMessages, galleryImages, socialStats, adminUsersRaw, registres] =
    await Promise.all([
      db.query.products.findMany(),
      db.query.orders.findMany(),
      db.query.contactMessages.findMany(),
      db.query.galleryImages.findMany(),
      db.query.socialStats.findMany(),
      db.query.adminUsers.findMany(),
      db.query.settings.findMany({ where: inArray(settings.key, REGISTRES_SAUVEGARDES) }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    products,
    orders,
    contactMessages,
    galleryImages,
    socialStats,
    adminUsers: adminUsersRaw.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt })),
    // Tels quels : chaque valeur est le JSON que le module concerné sait relire.
    registres: Object.fromEntries(registres.map((r) => [r.key, r.value])),
  };
}
