ALTER TABLE "orders" ADD COLUMN "acquisition_source" varchar(30);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "acquisition_campaign" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "acquisition_content" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "device_type" varchar(20);