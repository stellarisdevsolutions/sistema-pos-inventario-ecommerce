ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "actual_transfer" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "transfer_difference" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "actual_card" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "card_difference" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "recount_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "cash_shifts" ADD COLUMN IF NOT EXISTS "recount_reason" text;
