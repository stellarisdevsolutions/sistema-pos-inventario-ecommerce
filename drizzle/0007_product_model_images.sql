ALTER TABLE "product_models" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
ALTER TABLE "product_models" ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "product_models" m
SET
  "image_url" = COALESCE(
    m."image_url",
    (SELECT p."image_url" FROM "products" p WHERE p."model_code" = m."code" AND p."image_url" IS NOT NULL AND p."image_url" <> '' ORDER BY p."id" ASC LIMIT 1)
  ),
  "images" = CASE
    WHEN COALESCE(array_length(m."images", 1), 0) = 0 THEN COALESCE(
      (SELECT p."images" FROM "products" p WHERE p."model_code" = m."code" AND COALESCE(array_length(p."images", 1), 0) > 0 ORDER BY p."id" ASC LIMIT 1),
      '{}'::text[]
    )
    ELSE m."images"
  END;
