import { getDb } from "./connection";

/** Export complet des données métier — exclut les secrets (mots de passe,
 * clé de signature des sessions) même si l'export reste réservé aux admins. */
export async function getFullExport() {
  const db = getDb();
  const [products, orders, contactMessages, galleryImages, socialStats, adminUsersRaw] =
    await Promise.all([
      db.query.products.findMany(),
      db.query.orders.findMany(),
      db.query.contactMessages.findMany(),
      db.query.galleryImages.findMany(),
      db.query.socialStats.findMany(),
      db.query.adminUsers.findMany(),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    products,
    orders,
    contactMessages,
    galleryImages,
    socialStats,
    adminUsers: adminUsersRaw.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt })),
  };
}
