import { db } from "@/db";
import { products, categories, brands, productModels, type ProductOptionConfig } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export interface StoreProduct {
  id: number;
  name: string;
  modelCode?: string | null;
  variant?: string | null;
  variantColor?: string | null;
  variantSelector?: string | null;
  attributes?: Record<string, string> | null;
  modelOptions?: ProductOptionConfig[] | null;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  stock: number;
  minStock: number;
  imageUrl: string;
  images: string[];
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  brand?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  isActive: boolean;
  isVisibleWeb: boolean;
  isFeatured: boolean;
  variantCount?: number;
  totalStock?: number;
  minPrice?: number;
  maxPrice?: number;
  colorSwatches?: { name: string; hex: string }[];
}

export interface StoreCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  count: number;
}

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

type ProductRow = typeof products.$inferSelect & {
  category: typeof categories.$inferSelect | null;
  model: typeof productModels.$inferSelect | null;
  brand: typeof brands.$inferSelect | null;
};

function toStoreProduct(p: ProductRow, modelImage?: string | null): StoreProduct {
  const images = p.images ?? [];
  const imageUrl = p.imageUrl || images[0] || modelImage || DEFAULT_PRODUCT_IMAGE;
  return {
    id: p.id, name: p.model?.name ?? p.name, slug: p.slug, sku: p.sku, barcode: p.barcode,
    modelCode: p.modelCode, variant: p.variant, variantColor: p.variantColor,
    variantSelector: p.model?.variantSelector,
    attributes: p.attributes ?? null,
    modelOptions: p.model?.options ?? null,
    description: p.description, price: Number(p.price), stock: p.stock, minStock: p.minStock,
    imageUrl, images: [...new Set([imageUrl, ...images])], category: p.category,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
    isActive: p.isActive, isVisibleWeb: p.isVisibleWeb, isFeatured: p.isFeatured,
  };
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
  try {
    const rows = await db.query.products.findMany({
      where: and(eq(products.isActive, true), eq(products.isVisibleWeb, true)),
      with: { category: true, model: true, brand: true },
      orderBy: [desc(products.id)],
    });
    const groups = new Map<string, ProductRow[]>();
    for (const row of rows) {
      const key = row.modelCode ? "model:" + row.modelCode : "product:" + row.id;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    return [...groups.values()].map(group => {
      const representative = group.find(row => row.stock > 0) ?? group[0];
      const modelImage = group.find(row => row.imageUrl || row.images[0]);
      const product = toStoreProduct(representative, modelImage?.imageUrl || modelImage?.images[0]);
      const prices = group.map(row => Number(row.price));
      const totalStock = group.reduce((sum, row) => sum + Math.max(0, row.stock), 0);

      const swatchMap = new Map<string, string>();
      for (const row of group) {
        if (row.variantColor && /^#[0-9A-Fa-f]{6}$/.test(row.variantColor)) {
          const label = row.variant || row.variantColor;
          if (!swatchMap.has(row.variantColor.toLowerCase())) {
            swatchMap.set(row.variantColor.toLowerCase(), label);
          }
        }
        if (row.attributes) {
          for (const val of Object.values(row.attributes)) {
            if (typeof val === "string" && val.includes("|")) {
              const [label, hex] = val.split("|");
              if (hex && /^#[0-9A-Fa-f]{6}$/.test(hex) && !swatchMap.has(hex.toLowerCase())) {
                swatchMap.set(hex.toLowerCase(), label || hex);
              }
            }
          }
        }
      }

      return {
        ...product,
        isFeatured: group.some(row => row.isFeatured),
        variantCount: group.length,
        totalStock,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        colorSwatches: [...swatchMap.entries()].map(([hex, name]) => ({ hex, name })),
      };
    });
  } catch (error) {
    console.error("Error al obtener productos para la tienda:", error);
    return [];
  }
}

/**
 * Obtiene las categorías activas con el conteo real de productos
 */
export async function getStoreCategories(): Promise<StoreCategory[]> {
  try {
    const [rawCats, rawProds] = await Promise.all([
      db.query.categories.findMany({
        where: (c, { eq }) => eq(c.isActive, true),
        orderBy: (c, { asc }) => [asc(c.name)],
      }),
      db.query.products.findMany({
        where: (p, { and, eq }) => and(eq(p.isActive, true), eq(p.isVisibleWeb, true)),
        columns: {
          categoryId: true,
          modelCode: true,
          id: true,
        },
      }),
    ]);

    // Calcular conteo por categoría
    const countsMap = new Map<number, Set<string>>();
    rawProds.forEach((p) => {
      if (p.categoryId) {
        const groupKeys = countsMap.get(p.categoryId) ?? new Set<string>();
        groupKeys.add(p.modelCode ? "model:" + p.modelCode : "product:" + p.id);
        countsMap.set(p.categoryId, groupKeys);
      }
    });

    return rawCats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      imageUrl: c.imageUrl || null,
      count: countsMap.get(c.id)?.size || 0,
    }));
  } catch (error) {
    console.error("Error al obtener categorías de la tienda:", error);
    return [];
  }
}

/**
 * Obtiene un producto individual por slug o ID
 */
export async function getStoreProductBySlug(slug: string): Promise<StoreProduct | null> {
  try {
    const p = await db.query.products.findFirst({
      where: (p, { eq, or }) => or(
        eq(p.slug, slug),
        /^\d+$/.test(slug) && Number(slug) <= 2147483647 ? eq(p.id, Number(slug)) : undefined
      ),
      with: { category: true, model: true, brand: true },
    });
    return p?.isActive && p.isVisibleWeb ? toStoreProduct(p) : null;
  } catch (error) {
    console.error("Error al buscar producto por slug:", error);
    return null;
  }
}

export async function getStoreVariants(modelCode: string): Promise<StoreProduct[]> {
  try {
    const rows = await db.query.products.findMany({
      where: and(eq(products.modelCode, modelCode), eq(products.isActive, true), eq(products.isVisibleWeb, true)),
      with: { category: true, model: true, brand: true },
      orderBy: (p, { asc }) => [asc(p.variant), asc(p.id)],
    });
    const firstImage = rows.find(row => row.imageUrl || row.images[0]);
    return rows.map(row => toStoreProduct(row, firstImage?.imageUrl || firstImage?.images[0]));
  } catch (error) {
    console.error("Error al obtener variantes del producto:", error);
    return [];
  }
}
