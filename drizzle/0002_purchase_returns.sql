CREATE TABLE "purchase_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"purchase_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"original_unit_cost" numeric(12, 2) NOT NULL,
	"inventory_unit_cost" numeric(12, 2) NOT NULL,
	CONSTRAINT "purchase_return_items_positive_quantity" CHECK ("purchase_return_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"request_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"credit_note_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_returns_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_return_id_purchase_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."purchase_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_item_id_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_return_items_line_unique" ON "purchase_return_items" USING btree ("return_id","purchase_item_id");--> statement-breakpoint
CREATE INDEX "purchase_return_items_purchase_item_idx" ON "purchase_return_items" USING btree ("purchase_item_id");--> statement-breakpoint
CREATE INDEX "purchase_returns_purchase_idx" ON "purchase_returns" USING btree ("purchase_id");
--> statement-breakpoint
CREATE FUNCTION prevent_cancelling_returned_purchase() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM purchase_returns WHERE purchase_id = NEW.id) THEN
    RAISE EXCEPTION 'Una compra con devoluciones no se puede anular' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER purchases_prevent_cancelling_returned
BEFORE UPDATE OF status ON purchases
FOR EACH ROW WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION prevent_cancelling_returned_purchase();
