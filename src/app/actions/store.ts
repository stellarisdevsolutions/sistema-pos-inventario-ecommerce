import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export interface StoreProduct {
  id: number;
  name: string;
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
  isActive: boolean;
  isVisibleWeb: boolean;
  isFeatured: boolean;
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

/**
 * Obtiene los productos activos para la tienda online desde PostgreSQL / Neon
 */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  try {
    const rawProds = await db.query.products.findMany({
      where: (p, { and, eq }) => and(eq(p.isActive, true), eq(p.isVisibleWeb, true)),
      with: {
        category: true,
      },
      orderBy: (p, { desc }) => [desc(p.id)],
    });

    return rawProds.map((p) => {
      const priceNum = typeof p.price === "string" ? parseFloat(p.price) : Number(p.price) || 0;
      const imagesList = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
      const primaryImage = p.imageUrl || imagesList[0] || DEFAULT_PRODUCT_IMAGE;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug || `prod-${p.id}`,
        sku: p.sku || null,
        barcode: p.barcode || null,
        description: p.description || null,
        price: priceNum,
        stock: p.stock ?? 0,
        minStock: p.minStock ?? 5,
        imageUrl: primaryImage,
        images: imagesList.length > 0 ? imagesList : [primaryImage],
        category: p.category
          ? {
              id: p.category.id,
              name: p.category.name,
              slug: p.category.slug,
            }
          : null,
        isActive: p.isActive ?? true,
        isVisibleWeb: p.isVisibleWeb ?? true,
        isFeatured: p.isFeatured ?? false,
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
        },
      }),
    ]);

    // Calcular conteo por categoría
    const countsMap = new Map<number, number>();
    rawProds.forEach((p) => {
      if (p.categoryId) {
        countsMap.set(p.categoryId, (countsMap.get(p.categoryId) || 0) + 1);
      }
    });

    return rawCats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      imageUrl: c.imageUrl || null,
      count: countsMap.get(c.id) || 0,
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
      where: (p, { eq, or }) =>
        or(
          eq(p.slug, slug),
          !isNaN(Number(slug)) ? eq(p.id, Number(slug)) : undefined
        ),
      with: {
        category: true,
      },
    });

    if (!p?.isActive || !p.isVisibleWeb) return null;

    const priceNum = typeof p.price === "string" ? parseFloat(p.price) : Number(p.price) || 0;
    const imagesList = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
    const primaryImage = p.imageUrl || imagesList[0] || DEFAULT_PRODUCT_IMAGE;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku || null,
      barcode: p.barcode || null,
      description: p.description || null,
      price: priceNum,
      stock: p.stock ?? 0,
      minStock: p.minStock ?? 5,
      imageUrl: primaryImage,
      images: imagesList.length > 0 ? imagesList : [primaryImage],
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
            slug: p.category.slug,
          }
        : null,
      isActive: p.isActive ?? true,
      isVisibleWeb: p.isVisibleWeb ?? true,
      isFeatured: p.isFeatured ?? false,
    };
  } catch (error) {
    console.error("Error al buscar producto por slug:", error);
    return null;
  }
}
