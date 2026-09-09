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
  uniqueIndex,
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
  // Prix de VENTE au kilo, en millimes : 8000 = 8.000 TND/kg.
  // Le prix d'une ligne est priceMillimes × weightKg (voir priceForWeight).
  priceMillimes: integer("price_millimes").notNull(),
  // Coût de revient au kilo, même unité que priceMillimes.
  //
  // NULLABLE, et ce n'est pas un détail : un coût absent ne doit jamais être
  // lu comme un coût nul, sinon le produit afficherait 100 % de marge. Les
  // lignes sans coût sont exclues du calcul et comptées dans le taux de
  // couverture, jamais estimées.
  costPerKgMillimes: integer("cost_per_kg_millimes"),
  category: varchar("category", { length: 100 }).notNull(),
  badge: varchar("badge", { length: 50 }),
  imageUrl: varchar("image_url", { length: 255 }),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  // Nom/recette inventés par Chez Laziz (pas un dérivé d'un produit déjà sur
  // le marché) — affiche un ™ à côté du nom sur le site, pour documenter
  // publiquement (avec createdAt) l'antériorité d'usage de ce nom.
  isExclusiveCreation: boolean("is_exclusive_creation").notNull().default(false),
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
  // Origine de la commande, captée sans rien demander au client : UTM du lien
  // publicitaire, à défaut domaine référent (voir src/lib/attribution.ts).
  //
  // NULL = origine inconnue, et c'est le cas majoritaire attendu : un lien
  // non étiqueté, un navigateur qui masque le référent, une visite tapée à la
  // main. L'analytique le compte comme non couvert plutôt que de le ranger
  // d'office en « direct », ce qui ferait passer une mesure manquante pour
  // une acquisition directe.
  acquisitionSource: varchar("acquisition_source", { length: 30 }),
  // utm_campaign / utm_content : étiquettes libres, bornées, venant de l'URL.
  acquisitionCampaign: varchar("acquisition_campaign", { length: 120 }),
  acquisitionContent: varchar("acquisition_content", { length: 120 }),
  // mobile | tablet | desktop, déduit de l'agent utilisateur.
  deviceType: varchar("device_type", { length: 20 }),
  // ---- Remise au transporteur ----
  //
  // La livraison est SOUS-TRAITÉE : ces colonnes ne pilotent aucun livreur et
  // ne suivent aucun véhicule. Elles répondent à une seule question que
  // personne ne pouvait trancher jusqu'ici : ce colis est chez qui, sous quel
  // numéro ?
  //
  // Un seul transporteur par commande, garanti par la structure elle-même :
  // ce sont des colonnes de `orders`, pas une table d'expéditions. Renvoyer
  // deux fois le même colis est donc impossible par construction.
  //
  // carrier : tpe | jetpack (voir contracts/carriers.ts).
  carrier: varchar("carrier", { length: 30 }),
  // Numéro donné par le transporteur. NULL = pas encore remis.
  trackingNumber: varchar("tracking_number", { length: 80 }),
  // Dernier état connu, tel que le transporteur le nomme — jamais traduit ni
  // interprété : un état inventé se lirait comme une mesure.
  carrierStatus: varchar("carrier_status", { length: 60 }),
  carrierSyncedAt: timestamp("carrier_synced_at"),
  // Étiquette / bordereau, quand le transporteur en fournit un.
  labelUrl: varchar("label_url", { length: 500 }),
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
  // Réinitialisation de mot de passe oublié (lien à usage unique envoyé par
  // e-mail) — resetTokenHash stocke le hash du jeton, jamais le jeton lui-même.
  resetTokenHash: varchar("reset_token_hash", { length: 255 }),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
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

// Dépenses publicitaires, SAISIES À LA MAIN : aucune API publicitaire n'est
// connectée, et aucun montant n'est jamais déduit ni estimé.
//
// Une ligne par (plateforme, mois). Le mois entier est l'unité — voir
// api/queries/analytics/adspend.ts : rapprocher une dépense mensuelle de
// ventes hebdomadaires supposerait une dépense étale, ce qui est faux dès
// qu'une publication est boostée trois jours. Mieux vaut une période imposée
// et exacte qu'une période choisie et estimée.
export const adSpend = pgTable(
  "ad_spend",
  {
    id: serial("id").primaryKey(),
    // instagram | facebook | tiktok | google | autre. Pas de « direct » :
    // on n'achète pas du trafic direct.
    source: varchar("source", { length: 30 }).notNull(),
    // `YYYY-MM`, en mois LOCAL (Tunis), jamais UTC.
    month: varchar("month", { length: 7 }).notNull(),
    amountMillimes: integer("amount_millimes").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // Un seul montant par plateforme et par mois : la saisie est une mise à
  // jour, jamais un cumul de lignes qu'on additionnerait par erreur.
  (t) => [uniqueIndex("ad_spend_source_month_idx").on(t.source, t.month)],
);

export type AdSpend = typeof adSpend.$inferSelect;

// Table des délégations d'un transporteur, telle QU'IL la définit.
//
// Nos commandes portent une ville en texte libre ; Team Parcel Express exige
// un identifiant de délégation. Sans cette correspondance aucun colis ne peut
// leur être transmis — c'est le verrou principal de l'intégration.
//
// `raw` garde la ligne d'origine entière : leur API n'étant pas documentée,
// un champ qu'on ne sait pas encore lire aujourd'hui reste récupérable demain
// sans redemander la liste.
export const carrierDelegations = pgTable(
  "carrier_delegations",
  {
    id: serial("id").primaryKey(),
    carrier: varchar("carrier", { length: 30 }).notNull(),
    // Identifiant CHEZ LE TRANSPORTEUR, jamais le nôtre.
    externalId: varchar("external_id", { length: 40 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    // Vide si le transporteur ne le fournit pas — jamais deviné.
    governorate: varchar("governorate", { length: 160 }).notNull().default(""),
    // Leur identifiant de gouvernorat. La création d'un colis exige les DEUX
    // identifiants, délégation et gouvernorat.
    governorateExternalId: varchar("governorate_external_id", { length: 40 })
      .notNull()
      .default(""),
    raw: text("raw").notNull().default(""),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("carrier_delegations_key_idx").on(t.carrier, t.externalId)],
);

/** Les rapprochements ville → délégation décidés par un humain.
 *
 * Une ligne ici est une phrase du type « à Nabeul, بني خلاد veut dire la
 * délégation 127 ». Elle est écrite une fois, sur un clic explicite, et sert
 * ensuite à toutes les commandes qui portent la même ville.
 *
 * Les clés sont NORMALISÉES (voir contracts/delegations.ts) pour qu'une
 * différence de casse ou d'accent ne redemande pas la même décision. Les
 * libellés bruts sont conservés à côté : ce sont eux qu'un humain relit. */
export const carrierCityAliases = pgTable(
  "carrier_city_aliases",
  {
    id: serial("id").primaryKey(),
    carrier: varchar("carrier", { length: 30 }).notNull(),
    governorateKey: varchar("governorate_key", { length: 160 }).notNull(),
    cityKey: varchar("city_key", { length: 160 }).notNull(),
    /** L'identifiant CHEZ LE TRANSPORTEUR. */
    delegationExternalId: varchar("delegation_external_id", { length: 40 }).notNull(),
    /** Tels qu'écrits dans la commande, pour que la décision reste relisible. */
    governorateLabel: varchar("governorate_label", { length: 160 }).notNull().default(""),
    cityLabel: varchar("city_label", { length: 160 }).notNull().default(""),
    decidedAt: timestamp("decided_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("carrier_city_aliases_key_idx").on(t.carrier, t.governorateKey, t.cityKey)],
);

export type CarrierCityAlias = typeof carrierCityAliases.$inferSelect;

export type CarrierDelegation = typeof carrierDelegations.$inferSelect;

export type SocialStat = typeof socialStats.$inferSelect;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
