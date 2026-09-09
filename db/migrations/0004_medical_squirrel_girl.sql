ALTER TYPE "public"."payment_status" ADD VALUE 'paid';--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "reset_token_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "reset_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "name_ar" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description_ar" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp;
