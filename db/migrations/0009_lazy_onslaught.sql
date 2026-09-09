ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "meta_fbc" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "meta_fbp" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "meta_client_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "meta_client_user_agent" varchar(400);