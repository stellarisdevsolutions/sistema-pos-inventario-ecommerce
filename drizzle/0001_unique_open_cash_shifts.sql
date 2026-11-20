ALTER TABLE "products" ALTER COLUMN "sku" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "supplier_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_visible_web" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "returned_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "refunded_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "net_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin" text;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_supplier_id_suppliers_id_fk'
  ) THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk"
      FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cash_shifts_open_register_unique" ON "cash_shifts" USING btree ("cash_register_id") WHERE "cash_shifts"."status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cash_shifts_open_operator_unique" ON "cash_shifts" USING btree ("user_id") WHERE "cash_shifts"."status" = 'open';
