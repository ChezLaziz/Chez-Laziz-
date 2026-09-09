-- Rattrapage. Tout ce qui suit existe DÉJÀ en production, créé à la main au
-- fil de septembre 2026 (transporteurs, délégations, dépenses pub). Ce
-- fichier sert à reconstruire une base neuve à l'identique — d'où les
-- IF NOT EXISTS : rejoué sur la production, il ne casse rien et ne fait rien.
CREATE TABLE IF NOT EXISTS "ad_spend" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(30) NOT NULL,
	"month" varchar(7) NOT NULL,
	"amount_millimes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_city_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier" varchar(30) NOT NULL,
	"governorate_key" varchar(160) NOT NULL,
	"city_key" varchar(160) NOT NULL,
	"delegation_external_id" varchar(40) NOT NULL,
	"governorate_label" varchar(160) DEFAULT '' NOT NULL,
	"city_label" varchar(160) DEFAULT '' NOT NULL,
	"decided_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier" varchar(30) NOT NULL,
	"external_id" varchar(40) NOT NULL,
	"name" varchar(160) NOT NULL,
	"governorate" varchar(160) DEFAULT '' NOT NULL,
	"governorate_external_id" varchar(40) DEFAULT '' NOT NULL,
	"raw" text DEFAULT '' NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delegation_external_id" varchar(40);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrier" varchar(30);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_number" varchar(80);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrier_status" varchar(60);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrier_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "label_url" varchar(500);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ad_spend_source_month_idx" ON "ad_spend" USING btree ("source","month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_city_aliases_key_idx" ON "carrier_city_aliases" USING btree ("carrier","governorate_key","city_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_delegations_key_idx" ON "carrier_delegations" USING btree ("carrier","external_id");
