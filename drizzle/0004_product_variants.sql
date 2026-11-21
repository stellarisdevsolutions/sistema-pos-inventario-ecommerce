CREATE TABLE "product_models" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"variant_selector" text
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model_code" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variant" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variant_color" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "import_key" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_model_code_product_models_code_fk" FOREIGN KEY ("model_code") REFERENCES "public"."product_models"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "products_model_variant_unique" ON "products" USING btree ("model_code",lower("variant"));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_import_key_unique" UNIQUE("import_key");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_model_variant_pair" CHECK (("products"."model_code" IS NULL) = ("products"."variant" IS NULL));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_variant_color_valid" CHECK ("products"."variant_color" IS NULL OR ("products"."variant" IS NOT NULL AND "products"."variant_color" ~ '^#[0-9A-Fa-f]{6}$'));