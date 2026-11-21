import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { ProductDbInsert } from "@/lib/validations/product";

export type CatalogEntry = ProductDbInsert & { variantSelector?: string | null; importKey?: string };

export function automaticSku() {
  return "PROD-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
}

export function createCatalogProductsQuery(entries: CatalogEntry[], userId: number) {
  const rows = entries.map(entry => ({
    ...entry,
    slug: entry.slug + "-" + randomUUID().slice(0, 8),
    sku: entry.sku || automaticSku(),
  }));

  return sql`
    WITH input AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS row(
        name text, slug text, sku text, barcode text, description text, price numeric, "costPrice" numeric,
        stock integer, "minStock" integer, "imageUrl" text, images text[], "categoryId" integer,
        "brandId" integer, "supplierId" integer, "isActive" boolean, "isVisibleWeb" boolean, "isFeatured" boolean,
        "modelCode" text, variant text, "variantColor" text, "variantSelector" text, "importKey" text)
    ), models AS (
      INSERT INTO product_models (code, name, variant_selector)
      SELECT DISTINCT ON ("modelCode") "modelCode", name, "variantSelector"
      FROM input WHERE "modelCode" IS NOT NULL
      ORDER BY "modelCode"
      ON CONFLICT (code) DO NOTHING
      RETURNING code
    ), created AS (
      INSERT INTO products (name, slug, sku, barcode, description, price, cost_price, stock, min_stock, image_url,
        images, category_id, brand_id, supplier_id, is_active, is_visible_web, is_featured, model_code, variant,
        variant_color, import_key)
      SELECT name, slug, sku, barcode, description, price, "costPrice", stock, "minStock", "imageUrl",
        images, "categoryId", "brandId", "supplierId", "isActive", "isVisibleWeb", "isFeatured", "modelCode", variant,
        "variantColor", "importKey"
      FROM input
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
