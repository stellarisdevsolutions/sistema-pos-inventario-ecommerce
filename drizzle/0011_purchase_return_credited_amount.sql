ALTER TABLE "purchase_returns" ADD COLUMN IF NOT EXISTS "credited_amount" numeric(12, 2);
--> statement-breakpoint
UPDATE "purchase_returns" r
SET "credited_amount" = COALESCE((
  SELECT SUM(ri.quantity * ri.original_unit_cost)
  FROM "purchase_return_items" ri
  WHERE ri.return_id = r.id
), 0)
WHERE r."credited_amount" IS NULL;
--> statement-breakpoint
ALTER TABLE "purchase_returns" DROP CONSTRAINT IF EXISTS "purchase_returns_credited_amount_nonnegative";
--> statement-breakpoint
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_credited_amount_nonnegative" CHECK ("credited_amount" IS NULL OR "credited_amount" >= 0);
