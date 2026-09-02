import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  int,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";

// Catalogue des produits (géré depuis l'admin, affiché sur le site)
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Prix en millimes : 8000 = 8.000 TND
  priceMillimes: int("price_millimes").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  badge: varchar("badge", { length: 50 }),
  available: boolean("available").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Commandes passées via le formulaire en ligne
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  // JSON : [{ productId, name, qty, priceMillimes }]
  items: text("items").notNull(),
  totalMillimes: int("total_millimes").notNull(),
  note: text("note"),
  status: mysqlEnum("status", [
    "nouvelle",
    "en_preparation",
    "prete",
    "terminee",
    "annulee",
  ])
    .notNull()
    .default("nouvelle"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messages du formulaire de contact
export const contactMessages = mysqlTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Paramètres internes (mot de passe admin, secret des tokens)
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
});

// Visites du site (compteur anonyme, une ligne par page vue)
export const pageViews = mysqlTable("page_views", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relevés réseaux sociaux : un enregistrement par mise à jour (historique)
export const socialStats = mysqlTable("social_stats", {
  id: serial("id").primaryKey(),
  network: varchar("network", { length: 30 }).notNull(), // instagram | facebook | tiktok | google
  followers: int("followers").notNull(),
  messages: int("messages").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SocialStat = typeof socialStats.$inferSelect;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
