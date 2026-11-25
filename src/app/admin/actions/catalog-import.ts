"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { createCatalogProductsQuery } from "@/db/operations/catalog";
import { requireRole } from "@/lib/auth/session";
import { adminActionError } from "@/lib/admin-action-error";
import { CATALOG_FILE_LIMIT, catalogIdentity, readCatalogWorkbook } from "@/lib/catalog-workbook";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignorar en entornos de prueba fuera de Next.js
  }
}

export async function importCatalogAction(form: FormData, confirm = false): Promise<{
  success: boolean;
  count?: number;
  rows?: { row: number; name: string; variant: string | null; stock: number }[];
  issues?: { row: number; message: string }[];
  error?: string;
}> {
  try {
    const actor = await requireRole(["admin", "manager", "warehouse"]);
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size > CATALOG_FILE_LIMIT) {
      return { success: false, error: "Elige un archivo .xlsx de hasta 500 KB." };
    }

    let parsed;
    try {
      parsed = await readCatalogWorkbook(await file.arrayBuffer());
    } catch (error) {
      return { success: false, error: error instanceof Error && /^El archivo|^Las columnas|^Importa/.test(error.message) ? error.message : "No se pudo leer el archivo Excel." };
    }

    const [products, models] = await Promise.all([
      db.query.products.findMany({ columns: { name: true, modelCode: true, variant: true, sku: true, barcode: true, importKey: true } }),
      db.query.productModels.findMany(),
    ]);
    const identities = new Set(products.flatMap(row => [catalogIdentity(row), row.importKey]));
    const skus = new Set(products.flatMap(row => row.sku ? [row.sku.toUpperCase()] : []));
    const barcodes = new Set(products.flatMap(row => row.barcode ? [row.barcode] : []));
    const modelByCode = new Map(models.map(model => [model.code, model]));
    const { entries, errors } = parsed;
    for (const { row, entry } of entries) {
      const key = catalogIdentity(entry);
      if (identities.has(key)) errors.push({ row, message: "El producto o variante ya existe o está repetido en este archivo." });
      identities.add(key);
      if (entry.sku) {
        const sku = entry.sku.toUpperCase();
        if (skus.has(sku)) errors.push({ row, message: "El SKU ya existe o está repetido." });
        skus.add(sku);
      }
      if (entry.barcode) {
        if (barcodes.has(entry.barcode)) errors.push({ row, message: "El código de barras ya existe o está repetido." });
        barcodes.add(entry.barcode);
      }
      if (entry.modelCode) {
        const model = modelByCode.get(entry.modelCode);
        const variantSelector = entry.variantSelector ?? null;
        if (model && (model.name !== entry.name || model.variantSelector !== variantSelector)) {
          errors.push({ row, message: "El nombre del producto y el selector deben coincidir para todas las filas de este grupo." });
        } else if (!model) {
          modelByCode.set(entry.modelCode, { code: entry.modelCode, name: entry.name, variantSelector, options: null, imageUrl: null, images: [] });
        }
      }
    }
    if (errors.length) return { success: false, issues: errors.sort((a, b) => a.row - b.row) };
    if (confirm !== true) {
      return { success: true, count: entries.length,
        rows: entries.slice(0, 15).map(({ row, entry }) => ({ row, name: entry.name, variant: entry.variant, stock: entry.stock })),
      };
    }

    const result = await db.execute(createCatalogProductsQuery(entries.map(({ entry }) => entry), actor.id));
    for (const path of ["/admin/inventario", "/admin/ventas", "/admin/compras/nueva", "/catalogo", "/"]) {
      safeRevalidatePath(path);
    }
    return { success: true, count: result.rows.length };
  } catch (error) {
    return { success: false, error: adminActionError(error, "No se confirmó la carga. Revisa los duplicados y vuelve a validar el archivo.") };
  }
}
