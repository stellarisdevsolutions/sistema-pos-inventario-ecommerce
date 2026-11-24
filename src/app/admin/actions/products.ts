"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { automaticModelCode, automaticSku, createCatalogProductsQuery, type CatalogEntry } from "@/db/operations/catalog";
import { extendModelOptions } from "@/lib/model-variants";
import { deleteUnusedProductQuery, hasNoProductHistory } from "@/db/operations/catalog";
import { productName } from "@/lib/product-name";
import { inventoryAdjustmentQuery } from "@/db/operations/inventory-adjustment";
import { businessDate, formatBusinessDateTime } from "@/lib/business-date";
import { z } from "zod";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  productFormSchema,
  productOptionsSchema,
  productOptionConfigSchema,
  categoryInputSchema,
  type ProductOptionInput,
  type ProductOptionConfig,
  productDbInsertSchema,
  slugify,
  type ProductFormInput,
} from "@/lib/validations/product";
import { requireRole } from "@/lib/auth/session";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera del contexto de una petición Next.js (ej. tests o scripts), no bloquea
  }
}

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

function refreshCatalog() {
  for (const path of ["/admin/inventario", "/admin/ventas", "/catalogo", "/"]) safeRevalidatePath(path);
}

const eligibility = hasNoProductHistory(sql`"products"."id"`).as("can_hard_delete");

export async function deleteProductAction(id: number): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const [, , result] = await db.batch([
      db.execute(sql`SELECT code FROM product_models WHERE code = (SELECT model_code FROM products WHERE id = ${id}) FOR UPDATE`),
      db.execute(sql`SELECT id FROM products WHERE id = ${id} FOR UPDATE`),
      db.execute(deleteUnusedProductQuery(id)),
    ]);
    if (!result.rows.length) return { success: false, error: "El producto ya no existe o tiene historial comercial. Puedes archivarlo para conservar sus movimientos." };
    refreshCatalog();
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "No se pudo eliminar el producto. Actualiza su ficha.") };
  }
}

/**
 * Obtiene todos los productos de la base de datos para la tabla de inventario
 */
export async function getInventoryProducts() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const prods = await db.query.products.findMany({
      extras: { canHardDelete: eligibility },
      with: {
        category: true,
        brand: true,
        supplier: true,
        model: true,
      },
      orderBy: (p, { desc }) => [desc(p.id)],
    });

    if (prods.length === 0) return [];

    return prods.map((p) => {
      const images = [
        ...new Set(
          [p.imageUrl, ...(p.images ?? [])].filter((img): img is string => Boolean(img && img.trim()))
        ),
      ];

      return {
        id: p.id,
        canHardDelete: p.canHardDelete,
        name: productName(p),
        slug: p.slug,
        sku: p.sku || `PROD-${p.id.toString().padStart(4, "0")}`,
        barcode: p.barcode || "-",
        category: p.category?.name || "Sin categoría",
        price: parseFloat(p.price) || 0,
        costPrice: parseFloat(p.costPrice) || 0,
        stock: p.stock,
        minStock: p.minStock,
        status: (p.stock === 0
          ? "out_of_stock"
          : p.stock <= p.minStock
          ? "low_stock"
          : "in_stock") as "in_stock" | "low_stock" | "out_of_stock",
        isActive: p.isActive ?? true,
        isVisibleWeb: p.isVisibleWeb ?? true,
        isFeatured: p.isFeatured ?? false,
        description: p.description || null,
        image:
          p.imageUrl ||
          images[0] ||
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
        images,
        modelCode: p.modelCode || null,
        variant: p.variant || null,
        variantColor: p.variantColor || null,
        attributes: p.attributes ?? null,
        brand: p.brand?.name || null,
        supplier: p.supplier?.name || null,
      };
    });
  } catch (error) {
    console.error("Error al obtener productos de inventario:", error);
    return [];
  }
}

/**
 * Obtiene las categorías, marcas y proveedores activos desde la base de datos
 * para poblar los selectores del formulario de producto.
 */
export async function getInventoryFormData() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const [categoriesList, brandsList, suppliersList] = await Promise.all([
      db.select().from(schema.categories).where(eq(schema.categories.isActive, true)),
      db.select().from(schema.brands),
      db.select().from(schema.suppliers).where(eq(schema.suppliers.isActive, true)),
    ]);

    return {
      categories: categoriesList.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
      brands: brandsList.map((b) => ({ id: b.id, name: b.name })),
      suppliers: suppliersList.map((s) => ({ id: s.id, name: s.name })),
    };
  } catch (error) {
    console.error("Error al obtener datos auxiliares de inventario:", error);
    return { categories: [], brands: [], suppliers: [] };
  }
}

export async function getProductModelsForForm() {
  await requireRole(["admin", "manager", "warehouse"]);
  return db.query.productModels.findMany({
    columns: { code: true, name: true, variantSelector: true, options: true },
    orderBy: (model, { asc }) => [asc(model.name), asc(model.code)],
  });
}

/**
 * Obtiene un producto por su ID para precargar el formulario de edición
 */
export async function getProductById(id: number) {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const product = await db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        category: true,
        brand: true,
        supplier: true,
        model: true,
      },
    });

    if (!product) return null;
    const siblings = await db.select({
      id: schema.products.id, variant: schema.products.variant, variantColor: schema.products.variantColor,
      attributes: schema.products.attributes, sku: schema.products.sku, barcode: schema.products.barcode,
      price: schema.products.price, costPrice: schema.products.costPrice, stock: schema.products.stock,
      isActive: schema.products.isActive, imageUrl: schema.products.imageUrl, canHardDelete: eligibility,
    }).from(schema.products).where(product.modelCode ? eq(schema.products.modelCode, product.modelCode) : eq(schema.products.id, id))
      .orderBy(schema.products.variant);
    return { ...product, siblings, variantSelector: product.model?.variantSelector ?? null };
  } catch (error) {
    console.error(`Error al obtener producto #${id}:`, error);
    return null;
  }
}

/**
 * Server Action: Crear un nuevo producto en Neon DB y registrar Kárdex inicial
 */
export async function createProductAction(
  input: ProductFormInput,
  options?: ProductOptionInput[],
  optionConfigs?: ProductOptionConfig[]
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);
    let entries: CatalogEntry[];
    let existingModel: typeof schema.productModels.$inferSelect | undefined;

    let parsedConfigs: ProductOptionConfig[] | null = null;
    if (optionConfigs && optionConfigs.length > 0) {
      const cfgResult = z.array(productOptionConfigSchema).max(3).safeParse(optionConfigs);
      if (!cfgResult.success) {
        return { success: false, error: cfgResult.error.issues[0]?.message || "Configuración de opciones inválida." };
      }
      parsedConfigs = cfgResult.data;
    }

    if (options === undefined) {
      const validated = productFormSchema.safeParse(input);
      if (!validated.success) return { success: false, error: validated.error.issues[0]?.message };
      entries = [{
        ...productDbInsertSchema.parse(validated.data),
        variantSelector: validated.data.variantSelector || null,
        options: parsedConfigs,
      }];
    } else {
      const validated = productOptionsSchema.safeParse(options);
      if (!validated.success) {
        const issue = validated.error.issues[0];
        const prefix = typeof issue.path[0] === "number" ? `Opción ${issue.path[0] + 1}. ` : "";
        return { success: false, error: prefix + issue.message };
      }

      const existingCode = input.modelCode?.trim().toUpperCase();
      const model = existingCode ? await db.query.productModels.findFirst({ where: eq(schema.productModels.code, existingCode) }) : undefined;
      if (existingCode && !model) return { success: false, error: "El modelo seleccionado ya no está disponible." };
      const modelCode = model?.code ?? automaticModelCode();
      existingModel = model;
      let modelOptionsToSave = parsedConfigs;
      if (model) {
        try { modelOptionsToSave = extendModelOptions(model, validated.data); }
        catch (error) { return { success: false, error: (error as Error).message }; }
      }
      entries = validated.data.map(option => {
        const mergedAttributes = option.attributes ?? input.attributes ?? null;
        const product = productFormSchema.parse({
          ...input,
          ...option,
          modelCode,
          name: model?.name ?? input.name,
          variantSelector: model ? model.variantSelector : input.variantSelector,
          mainImage: option.mainImage || input.mainImage,
          additionalImages: input.additionalImages,
          attributes: mergedAttributes,
        });
        return {
          ...productDbInsertSchema.parse(product),
          variantSelector: product.variantSelector || null,
          attributes: mergedAttributes,
          options: modelOptionsToSave,
        };
      });
    }

    const [first] = entries;
    if (first.modelCode && options === undefined) {
      const model = await db.query.productModels.findFirst({ where: eq(schema.productModels.code, first.modelCode) });
      if (model) return { success: false, error: "Añade las variantes desde el modelo existente." };
    }
    const query = createCatalogProductsQuery(entries, currentUser.id, existingModel);
    const { rows } = existingModel ? (await db.batch([
      db.execute(sql`SELECT code FROM product_models WHERE code = ${existingModel.code} FOR UPDATE`), db.execute(query),
    ]))[1] : await db.execute(query);
    if (!rows.length) return { success: false, error: "La variante, SKU o código ya existe, o cambió el modelo. Actualiza la ficha." };
    refreshCatalog();
    return { success: true, data: rows[0] };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      return { success: false, error: "Ya existe una variante, SKU o código de barras con esos datos." };
    }
    return {
      success: false,
      error: adminActionError(error, "Error al guardar el producto."),
    };
  }
}

export async function addModelVariantsAction(modelCode: string, newOptions: ProductOptionInput[]): Promise<ActionResult> {
  await requireRole(["admin", "manager", "warehouse"]);
  const base = await db.query.products.findFirst({ where: eq(schema.products.modelCode, modelCode), orderBy: schema.products.id });
  if (!base) return { success: false, error: "El modelo ya no está disponible." };
  return createProductAction({
    ...base, modelCode, description: base.description ?? "", mainImage: base.imageUrl, additionalImages: base.images ?? [],
    initialStock: 0, price: Number(base.price), costPrice: Number(base.costPrice), isActive: true, isFeatured: false,
  }, newOptions);
}

/**
 * Server Action: Actualizar un producto existente
 */
export async function updateProductAction(
  id: number,
  input: ProductFormInput
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    // 1. Validar datos con Zod
    const validated = productFormSchema.safeParse({
      ...input,
      modelCode: input.variant?.trim() && !input.modelCode?.trim() ? automaticModelCode() : input.modelCode,
    });
    if (!validated.success) {
      const errorMsg = validated.error.issues[0]?.message || "Datos inválidos en el formulario.";
      return { success: false, error: errorMsg };
    }

    // 2. Verificar existencia
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.id, id),
    });

    if (!existing) {
      return { success: false, error: `El producto #${id} no existe en la base de datos.` };
    }

    const payload = productDbInsertSchema.parse(validated.data);

    if (existing.modelCode) {
      const model = await db.query.productModels.findFirst({ where: eq(schema.productModels.code, existing.modelCode) });
      if (payload.modelCode !== existing.modelCode || (model?.variantSelector ?? "Variante") !== (validated.data.variantSelector || "Variante") ||
          Object.keys(existing.attributes ?? {}).sort().join("|") !== Object.keys(payload.attributes ?? {}).sort().join("|") ||
          (!existing.variantColor && payload.variantColor && !model?.options?.some(d => d.type === "color") && !/color/i.test(model?.variantSelector ?? ""))) {
        return { success: false, error: "Conserva los atributos del modelo. Para otra estructura crea un modelo nuevo." };
      }
    }

    const setData: Partial<typeof schema.products.$inferInsert> = {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      sku: payload.sku || existing.sku || automaticSku(),
      barcode: payload.barcode,
      modelCode: payload.modelCode,
      variant: payload.variant,
      variantColor: payload.variantColor,
      minStock: payload.minStock,
      imageUrl: payload.imageUrl,
      images: payload.images,
      categoryId: payload.categoryId,
      brandId: payload.brandId,
      supplierId: payload.supplierId,
      isActive: payload.isActive,
      isVisibleWeb: payload.isVisibleWeb,
      isFeatured: payload.isFeatured,
      updatedAt: new Date(),
    };
    if (input.attributes !== undefined) {
      setData.attributes = payload.attributes;
    }

    const update = db.update(schema.products).set(setData).where(eq(schema.products.id, id)).returning();

    let updatedProduct;
    if (payload.modelCode) {
      const model = { code: payload.modelCode, name: payload.name, variantSelector: validated.data.variantSelector || null };
      const [, , [updated]] = await db.batch([
        existing.modelCode
          ? db.update(schema.productModels).set({ name: model.name }).where(eq(schema.productModels.code, existing.modelCode))
          : db.insert(schema.productModels).values(model),
        db.update(schema.products).set({ name: model.name, updatedAt: new Date() }).where(eq(schema.products.modelCode, payload.modelCode)),
        update,
      ]);
      updatedProduct = updated;
    } else {
      [updatedProduct] = await update;
    }

    // 5. Revalidar rutas
    safeRevalidatePath(`/admin/inventario/${id}/editar`);
    safeRevalidatePath(`/producto/${existing.slug}`);
    refreshCatalog();
    if (!updatedProduct) return { success: false, error: "El producto ya no existe." };
    return { success: true, data: updatedProduct };
  } catch (error) {
    console.error(`Error al actualizar producto #${id}:`, error);
    return {
      success: false,
      error: adminActionError(error, "Error interno al actualizar el producto en la base de datos."),
    };
  }
}

/**
 * Server Action: Crear nueva categoría al vuelo
 */
export async function createCategoryAction(
  name: string,
  imageUrl?: string | null
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const parsedCat = categoryInputSchema.safeParse({ name, imageUrl: imageUrl ?? "" });
    if (!parsedCat.success) {
      return { success: false, error: parsedCat.error.issues[0]?.message || "Datos de categoría inválidos." };
    }
    const trimmed = parsedCat.data.name;
    const validImageUrl = parsedCat.data.imageUrl || null;

    const baseSlug = slugify(trimmed) || `cat-${Date.now()}`;
    let slug = baseSlug;
    const existing = await db.query.categories.findFirst({
      where: eq(schema.categories.slug, slug),
    });
    if (existing) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const [newCat] = await db
      .insert(schema.categories)
      .values({
        name: trimmed,
        slug,
        imageUrl: validImageUrl,
      })
      .returning();

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");
    return { success: true, data: newCat };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al registrar la categoría.") };
  }
}

/**
 * Server Action: Actualizar nombre e imagen de categoría existente
 */
export async function updateCategoryAction(
  id: number,
  newName: string,
  imageUrl?: string | null
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const parsedCat = categoryInputSchema.safeParse({ name: newName, imageUrl: imageUrl ?? "" });
    if (!parsedCat.success) {
      return { success: false, error: parsedCat.error.issues[0]?.message || "Datos de categoría inválidos." };
    }
    const trimmed = parsedCat.data.name;

    const slug = slugify(trimmed) || `cat-${id}`;
    const updateData: { name: string; slug: string; imageUrl?: string | null } = {
      name: trimmed,
      slug,
    };
    if (imageUrl !== undefined) {
      updateData.imageUrl = parsedCat.data.imageUrl || null;
    }

    const [updated] = await db
      .update(schema.categories)
      .set(updateData)
      .where(eq(schema.categories.id, id))
      .returning();

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al actualizar categoría.") };
  }
}

/**
 * Server Action: Renombrar categoría existente (compatibilidad)
 */
export async function renameCategoryAction(id: number, newName: string): Promise<ActionResult> {
  return updateCategoryAction(id, newName);
}

/**
 * Server Action: Eliminar categoría reasignando productos a NULL (Sin categoría)
 */
export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    await db.batch([
      db.update(schema.products).set({ categoryId: null }).where(eq(schema.products.categoryId, id)),
      db.delete(schema.categories).where(eq(schema.categories.id, id)),
    ]);

    safeRevalidatePath("/admin/inventario");
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al eliminar categoría.") };
  }
}

/**
 * Server Action: Activa o desactiva rápidamente un producto (toggle de estado)
 */
export async function toggleProductActiveAction(
  id: number,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    if (typeof isActive !== "boolean") return { success: false, error: "Estado de producto inválido." };
    const [updated] = await db
      .update(schema.products)
      .set({
        isActive,
        ...(!isActive && { isVisibleWeb: false, isFeatured: false }),
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id))
      .returning();

    if (!updated) return { success: false, error: "El producto ya no existe." };
    refreshCatalog();
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al cambiar el estado del producto."),
    };
  }
}

/**
 * Obtiene los movimientos de kárdex registrados en base de datos para un producto o general
 */
export async function getProductKardexAction(productId?: number) {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const movements = await db.query.inventoryMovements.findMany({
      where: productId ? eq(schema.inventoryMovements.productId, productId) : undefined,
      with: {
        product: true,
        user: true,
      },
      orderBy: (m, { desc }) => [desc(m.createdAt), desc(m.id)],
    });

    return {
      success: true,
      data: movements.map((m) => {
        let typeLabel = "Movimiento de Kárdex";
        if (m.referenceType === "product_creation") {
          typeLabel = "Apertura Inicial";
        } else if (m.movementType === "purchase_in") {
          typeLabel = "Recepción de Compra";
        } else if (m.movementType === "sale_out") {
          typeLabel = "Salida por Venta";
        } else if (m.movementType === "adjustment_in") {
          typeLabel = "Ajuste de Entrada (+)";
        } else if (m.referenceType === "purchase_return") {
          typeLabel = "Devolución a proveedor";
        } else if (m.movementType === "adjustment_out") {
          if (
            m.referenceType === "purchase" ||
            m.reason?.toLowerCase().includes("anulacion") ||
            m.reason?.toLowerCase().includes("compra")
          ) {
            typeLabel = "Anulación de Compra";
          } else {
            typeLabel = "Ajuste de Salida (-)";
          }
        } else if (m.movementType === "damaged_out") {
          typeLabel = "Baja por Merma";
        } else if (m.movementType === "return_in") {
          typeLabel = "Devolución Cliente";
        }

        const formattedDate = formatBusinessDateTime(m.createdAt);

        const isNegative =
          m.movementType === "sale_out" ||
          m.movementType === "damaged_out" ||
          m.movementType === "adjustment_out";

        return {
          id: m.id,
          date: formattedDate,
          productId: m.productId,
          product: m.product ? productName(m.product) : `Producto #${m.productId}`,
          sku: m.product?.sku || `PROD-${m.productId}`,
          type: m.movementType,
          typeLabel,
          quantity: isNegative ? -Math.abs(m.quantity) : m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          unitCost: Number(m.unitCost || 0),
          reference:
            m.referenceType === "product_creation"
              ? `ALTA-#${m.productId}`
              : m.referenceType === "purchase_return"
              ? "DEV-" + m.referenceId
              : m.referenceId
              ? `#REF-${m.referenceId}`
              : "Ajuste Directo",
          referenceType: m.referenceType,
          reason: m.reason || "Sin observación",
          user: m.user?.name || "Administrador",
        };
      }),
    };
  } catch (error) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}

export interface CreateAdjustmentInput {
  productId: number;
  quantity: number;
  reason: "damaged" | "defective" | "expired" | "loss_theft" | "supplier_return" | "internal_use";
  notes?: string;
  requestId?: string;
}

/**
 * Server Action: Registrar un acta formal de baja/merma en la base de datos
 * - Descuenta las existencias en `products.stock`
 * - Registra el acta formal en `inventory_adjustments` y su ítem en `inventory_adjustment_items`
 * - Asienta la salida negativa inmutable en `inventory_movements` (Kárdex)
 */
export async function createInventoryAdjustmentAction(
  input: CreateAdjustmentInput
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    const parsed = z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(2_147_483_647),
      reason: z.enum(["damaged", "defective", "expired", "loss_theft", "supplier_return", "internal_use"]),
      notes: z.string().trim().max(500).optional(),
      requestId: z.uuid().optional(),
    }).safeParse(input);

    if (!parsed.success) return { success: false, error: "Revisa los datos de la baja." };

    if (parsed.data.requestId) {
      const existing = await db.query.inventoryAdjustments.findFirst({
        where: eq(schema.inventoryAdjustments.requestId, parsed.data.requestId),
        with: { items: { with: { product: true } } },
      });
      if (existing) {
        const firstItem = existing.items[0];
        return {
          success: true,
          data: {
            adjustment: { id: existing.id, adjustmentNumber: existing.adjustmentNumber },
            newStock: firstItem?.product?.stock ?? 0,
            previousStock: (firstItem?.product?.stock ?? 0) + (firstItem?.quantity ?? 0),
            productName: firstItem?.product ? productName(firstItem.product) : "Producto",
          },
        };
      }
    }

    const { rows: [result] } = await db.execute<{
      id: number;
      adjustmentNumber: string;
      newStock: number;
      previousStock: number;
      productName: string;
    }>(inventoryAdjustmentQuery({
      ...parsed.data,
      notes: parsed.data.notes || `Baja por ${parsed.data.reason}`,
      userId: currentUser.id,
      authorizedByUserId: currentUser.role === "warehouse" ? null : currentUser.id,
      prefix: `BAJA-${businessDate().slice(0, 4)}-`,
      requestId: parsed.data.requestId ?? null,
    }));
    if (!result) {
      return { success: false, error: "El producto no existe o no tiene stock suficiente." };
    }

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");

    return {
      success: true,
      data: {
        adjustment: { id: result.id, adjustmentNumber: result.adjustmentNumber },
        newStock: result.newStock,
        previousStock: result.previousStock,
        productName: result.productName,
      },
    };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al procesar la baja de inventario.") };
  }
}

/**
 * Server Action: Obtiene las actas de bajas y mermas registradas en la base de datos
 */
export async function getInventoryAdjustmentsAction() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const adjustments = await db.query.inventoryAdjustments.findMany({
      with: {
        user: true,
        authorizedByUser: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt), desc(a.id)],
    });

    const reasonLabels: Record<string, string> = {
      damaged: "Rotura física en tienda/almacén",
      defective: "Defecto de fábrica (Garantía)",
      expired: "Producto caducado / vencido",
      loss_theft: "Merma desconocida / Faltante",
      supplier_return: "Devolución a proveedor (RMA)",
      internal_use: "Uso interno / Muestras",
    };

    const flatList = adjustments.map((a) => {
      const firstItem = a.items[0];
      const product = firstItem?.product;

      const formattedDate = formatBusinessDateTime(a.createdAt);

      return {
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        date: formattedDate,
        productId: product?.id || 0,
        productName: product ? productName(product) : "Varios productos",
        sku: product?.sku || "N/A",
        quantity: firstItem ? firstItem.quantity : 1,
        reason: a.reason,
        reasonLabel: reasonLabels[a.reason] || a.reason,
        totalLoss: Number(a.totalCost || 0),
        reportedBy: a.user?.name || "Almacenero",
        authorizedBy: a.authorizedByUser?.name || "Pendiente de autorización",
        notes: a.notes || "Sin observaciones adicionales",
      };
    });

    return { success: true, data: flatList };
  } catch (error) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}
