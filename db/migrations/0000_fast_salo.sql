-- Migration initiale, reconstituée depuis meta/0000_snapshot.json.
--
-- Le fichier d'origine n'a jamais été versionné : db/migrations/*.sql était
-- dans .gitignore depuis le premier commit, et seul le snapshot a survécu.
-- Sans lui, aucune base ne peut être reconstruite depuis zéro. Le contenu
-- ci-dessous est celui du snapshot, colonne pour colonne, dans l'ordre.
CREATE TYPE "public"."order_status" AS ENUM('nouvelle', 'en_preparation', 'prete', 'terminee', 'annulee');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"items" text NOT NULL,
	"total_millimes" integer NOT NULL,
	"note" text,
	"status" "order_status" DEFAULT 'nouvelle' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price_millimes" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	"badge" varchar(50),
	"available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"network" varchar(30) NOT NULL,
	"followers" integer NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
