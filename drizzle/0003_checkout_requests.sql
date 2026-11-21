ALTER TABLE "sales" ADD COLUMN "checkout_request_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "checkout_fingerprint" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_operator_checkout_unique" ON "sales" USING btree ("user_id","checkout_request_id");