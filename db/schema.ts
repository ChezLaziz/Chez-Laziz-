import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "nouvelle",
  "en_preparation",
  "prete",
  "terminee",
  "annulee",
]);

// Deux moyens de paiement seulement : espèces à la livraison, ou virement D17
// (preuve manuelle par capture d'écran, vérifiée par l'admin).
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "d17"]);

// COD : "pending" jusqu'à la livraison (pas de vérification de paiement).
// D17 : "pending_verification" à la création (capture reçue, pas encore
// vérifiée) puis "approved"/"rejected" décidé par l'admin.
// "paid" : encaissé. Sert surtout aux commandes en espèces à la livraison,
// qui restaient sinon "pending" à vie — l'admin n'avait aucune trace de
// l'argent réellement rentré. Pour D17, "approved" reste la preuve du
// paiement (capture vérifiée) ; "paid" n'y est pas utilisé.
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "pending_verification",
  "approved",
  "rejected",
  "paid",
]);

// Catalogue des produits (géré depuis l'admin, affiché sur le site)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Version arabe du nom/description, éditable depuis l'admin. Vide =
  // repli automatique sur le français (voir productName/productDescription
  // dans contracts/productText.ts) : la version arabe du site ne casse
  // jamais si un nouveau produit n'a pas encore été traduit.
  nameAr: varchar("name_ar", { length: 255 }),
  descriptionAr: text("description_ar"),
  // Prix en millimes : 8000 = 8.000 TND
  priceMillimes: integer("price_millimes").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  badge: varchar("badge", { length: 50 }),
  imageUrl: varchar("image_url", { length: 255 }),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Commandes passées via le formulaire en ligne
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  // Livraison — obligatoire (toute la Tunisie, porte-à-porte, voir src/lib/shop.ts)
  governorate: varchar("governorate", { length: 100 }).notNull(),
  city: varchar("city", { length: 150 }).notNull(),
  address: text("address").notNull(),
  postalCode: varchar("postal_code", { length: 10 }),
  // JSON : [{ productId, name, weightKg, qty, unitPriceMillimes }]
  items: text("items").notNull(),
  subtotalMillimes: integer("subtotal_millimes").notNull(),
  deliveryFeeMillimes: integer("delivery_fee_millimes").notNull().default(8000),
  totalMillimes: integer("total_millimes").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  // Clé de stockage R2 de la capture d'écran D17 (jamais une URL publique — voir api/lib/r2.ts)
  paymentProofKey: varchar("payment_proof_key", { length: 255 }),
  // Clé générée par le client pour une tentative de commande : un double
  // clic ou une nouvelle tentative réseau renvoie la commande déjà créée
  // au lieu d'en créer une deuxième.
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
  note: text("note"),
  status: orderStatusEnum("status").notNull().default("nouvelle"),
  // Horodatage de l'envoi de l'événement "Purchase" à Meta (Pixel/Conversions
  // API) — jamais à la création de la commande, seulement une fois la
  // commande confirmée réelle (voir shouldReportMetaPurchase). Empêche un
  // double envoi si le statut change plusieurs fois après confirmation.
  metaPurchaseReportedAt: timestamp("meta_purchase_reported_at"),
  /** Date d'encaissement (espèces à la livraison) — voir paymentStatusEnum. */
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("orders_created_at_idx").on(t.createdAt)]);

// Messages du formulaire de contact
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Paramètres internes (mot de passe admin, secret des tokens)
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
});

// Visites du site (compteur anonyme, une ligne par page vue)
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("page_views_created_at_idx").on(t.createdAt)]);

// Comptes admin (email + mot de passe) — plusieurs personnes peuvent
// gérer le site, chacune avec ses propres identifiants.
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Photos de la page Galerie, gérées depuis l'admin (upload + suppression)
export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  alt: varchar("alt", { length: 255 }).notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relevés réseaux sociaux : un enregistrement par mise à jour (historique)
export const socialStats = pgTable("social_stats", {
  id: serial("id").primaryKey(),
  network: varchar("network", { length: 30 }).notNull(), // instagram | facebook | tiktok | google
  followers: integer("followers").notNull(),
  messages: integer("messages").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SocialStat = typeof socialStats.$inferSelect;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
