ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "other_sales" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "request_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "request_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_request_id_unique" ON "purchases" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_adjustments_request_id_unique" ON "inventory_adjustments" USING btree ("request_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sale_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"cash_shift_id" integer,
	"user_id" integer NOT NULL,
	"authorized_by_user_id" integer NOT NULL,
	"request_id" uuid,
	"refund_method" "payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sale_refunds_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "sale_refunds_amount_positive" CHECK ("amount" > 0)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_refunds_sale_idx" ON "sale_refunds" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_refunds_created_at_idx" ON "sale_refunds" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_refunds_cash_shift_idx" ON "sale_refunds" USING btree ("cash_shift_id");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sale_refunds" ADD CONSTRAINT "sale_refunds_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sale_refunds" ADD CONSTRAINT "sale_refunds_cash_shift_id_cash_shifts_id_fk" FOREIGN KEY ("cash_shift_id") REFERENCES "public"."cash_shifts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sale_refunds" ADD CONSTRAINT "sale_refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sale_refunds" ADD CONSTRAINT "sale_refunds_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_cost_non_negative" CHECK ("cost_price" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_expected_cash_non_negative" CHECK ("expected_cash" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_qty_positive" CHECK ("quantity" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_refunded_bounds" CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "total_amount");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_qty_positive" CHECK ("quantity" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_returned_bounds" CHECK ("returned_quantity" >= 0 AND "returned_quantity" <= "quantity");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "inventory_adjustment_items" ADD CONSTRAINT "inventory_adjustment_items_qty_positive" CHECK ("quantity" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
