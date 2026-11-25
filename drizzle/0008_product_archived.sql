ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_archived_inactive" CHECK (NOT "is_archived" OR (NOT "is_active" AND NOT "is_visible_web" AND NOT "is_featured"));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
