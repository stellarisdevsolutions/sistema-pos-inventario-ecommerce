import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { ProductDbInsert, ProductOptionConfig } from "@/lib/validations/product";

export type CatalogEntry = ProductDbInsert & {
  variantSelector?: string | null;
  importKey?: string;
  options?: ProductOptionConfig[] | null;
  attributes?: Record<string, string> | null;
  modelImageUrl?: string | null;
  modelImages?: string[] | null;
};

export function automaticSku() {
  return "PROD-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
}

export function automaticModelCode() {
  return "MOD-" + randomUUID().toUpperCase();
}

export function createCatalogProductsQuery(entries: CatalogEntry[], userId: number, existingModel?: { code: string; options: ProductOptionConfig[] | null }) {
  const rows = entries.map(entry => ({
    ...entry,
    slug: entry.slug + "-" + randomUUID().slice(0, 8),
    sku: entry.sku || automaticSku(),
    attributes: entry.attributes ?? null,
    options: entry.options ?? null,
    modelImageUrl: entry.modelImageUrl !== undefined ? (entry.modelImageUrl ?? null) : (entry.imageUrl ?? null),
    modelImages: entry.modelImages !== undefined ? (entry.modelImages ?? []) : (entry.images ?? []),
  }));

  return sql`
    WITH input AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS row(
        name text, slug text, sku text, barcode text, description text, price numeric, "costPrice" numeric,
        stock integer, "minStock" integer, "imageUrl" text, images text[], "categoryId" integer,
        "brandId" integer, "supplierId" integer, "isActive" boolean, "isVisibleWeb" boolean, "isFeatured" boolean,
        "modelCode" text, variant text, "variantColor" text, "variantSelector" text, "importKey" text,
        attributes jsonb, options jsonb, "modelImageUrl" text, "modelImages" text[])
    ), models AS (${existingModel ? sql`
      UPDATE product_models SET options = (SELECT options FROM input LIMIT 1)
      WHERE code = ${existingModel.code} AND options IS NOT DISTINCT FROM ${existingModel.options ? JSON.stringify(existingModel.options) : null}::jsonb
      AND NOT EXISTS (
        SELECT FROM input i JOIN products p ON lower(p.sku) = lower(i.sku)
          OR lower(p.barcode) = lower(i.barcode)
          OR (p.model_code = i."modelCode" AND (
            lower(p.variant) = lower(i.variant) OR lower(p.attributes::text) = lower(i.attributes::text)
          ))
      ) RETURNING code` : sql`
      INSERT INTO product_models (code, name, variant_selector, options, image_url, images)
      SELECT DISTINCT ON ("modelCode") "modelCode", name, "variantSelector", options, "modelImageUrl", COALESCE("modelImages", '{}'::text[])
      FROM input WHERE "modelCode" IS NOT NULL
      ORDER BY "modelCode"
      ON CONFLICT (code) DO UPDATE SET
        options = COALESCE(EXCLUDED.options, product_models.options),
        variant_selector = COALESCE(EXCLUDED.variant_selector, product_models.variant_selector),
        image_url = COALESCE(product_models.image_url, EXCLUDED.image_url),
        images = CASE
          WHEN COALESCE(array_length(product_models.images, 1), 0) = 0 THEN EXCLUDED.images
          ELSE product_models.images
        END
      RETURNING code`}
    ), created AS (
      INSERT INTO products (name, slug, sku, barcode, description, price, cost_price, stock, min_stock, image_url,
        images, category_id, brand_id, supplier_id, is_active, is_visible_web, is_featured, model_code, variant,
        variant_color, import_key, attributes)
      SELECT name, slug, sku, barcode, description, price, "costPrice", stock, "minStock", "imageUrl",
        images, "categoryId", "brandId", "supplierId", "isActive", "isVisibleWeb", "isFeatured", "modelCode", variant,
        "variantColor", "importKey", attributes
      FROM input
      WHERE "modelCode" IS NULL OR "modelCode" IN (SELECT code FROM models)
      RETURNING id, stock, cost_price
    ), opening AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT id, 'adjustment_in', stock, 0, stock, cost_price, 'product_creation', id,
        'Apertura inicial del producto', ${userId}
      FROM created
    )
    SELECT id FROM created
  `;
}

export function hasNoProductHistory(productId: ReturnType<typeof sql> | number) {
  return sql<boolean>`NOT EXISTS (SELECT FROM sale_items WHERE product_id = ${productId})
    AND NOT EXISTS (SELECT FROM purchase_items WHERE product_id = ${productId})
    AND NOT EXISTS (SELECT FROM inventory_adjustment_items WHERE product_id = ${productId})
    AND NOT EXISTS (SELECT FROM inventory_movements WHERE product_id = ${productId}
      AND reference_type IS DISTINCT FROM 'product_creation')`;
}

// The caller locks the model and product in a batch before this statement so
// references committed while waiting for the locks are visible to this check.
export function deleteUnusedProductQuery(id: number) {
  return sql`WITH eligible AS MATERIALIZED (
      SELECT id, model_code FROM products WHERE id = ${id} AND ${hasNoProductHistory(id)}
    ), opening AS (
      DELETE FROM inventory_movements USING eligible WHERE product_id = eligible.id
        AND reference_type = 'product_creation'
    ), removed AS (
      DELETE FROM products USING eligible WHERE products.id = eligible.id RETURNING products.id, products.model_code
    ), orphan AS (
      DELETE FROM product_models m USING removed r WHERE m.code = r.model_code
        AND NOT EXISTS (SELECT FROM products p WHERE p.model_code = m.code AND p.id <> r.id)
    ) SELECT id FROM removed`;
}
