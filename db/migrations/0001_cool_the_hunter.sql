CREATE TYPE "public"."payment_method" AS ENUM('cod', 'd17');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'pending_verification', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "governorate" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "city" varchar(150) NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "postal_code" varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_millimes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_millimes" integer DEFAULT 8000 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method" DEFAULT 'cod' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_proof_key" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"alt" varchar(255) DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_url" varchar(255);
