ALTER TABLE "product_models" ADD COLUMN IF NOT EXISTS "options" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "attributes" jsonb;
