"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import {
  productFormSchema,
  productDbInsertSchema,
  slugify,
  type ProductFormInput,
} from "@/lib/validations/product";
import { CURRENCY_SYMBOL } from "@/lib/currency";
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

/**
 * Obtiene todos los productos de la base de datos para la tabla de inventario
 */
export async function getInventoryProducts() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const prods = await db.query.products.findMany({
      with: {
        category: true,
      },
      orderBy: (p, { desc }) => [desc(p.id)],
    });

    if (prods.length === 0) return [];

    return prods.map((p) => ({
      id: p.id,
      name: p.name,
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
      description: p.description || null,
      image:
        p.imageUrl ||
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
    }));
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
      },
    });

    return product || null;
  } catch (error) {
    console.error(`Error al obtener producto #${id}:`, error);
    return null;
  }
}

/**
 * Server Action: Crear un nuevo producto en Neon DB y registrar Kárdex inicial
 */
export async function createProductAction(input: ProductFormInput): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    // 1. Validar datos con Zod
    const validated = productFormSchema.safeParse(input);
    if (!validated.success) {
      const errorMsg = validated.error.issues[0]?.message || "Datos inválidos en el formulario.";
      return { success: false, error: errorMsg };
    }

    // 2. Transformar datos para inserción en PostgreSQL
    const insertPayload = productDbInsertSchema.parse(validated.data);

    // Prevención de duplicados accidentales por doble clic / doble submit (últimos 4 segundos)
    const recentDuplicate = await db.query.products.findFirst({
      where: and(
        eq(schema.products.name, insertPayload.name),
        eq(schema.products.price, insertPayload.price),
        gt(schema.products.createdAt, new Date(Date.now() - 4000))
      ),
    });
    if (recentDuplicate) {
      return { success: true, data: recentDuplicate };
    }

    // Asegurar slug único si ya existe otro producto con el mismo slug
    let finalSlug = insertPayload.slug;
    const existingSlug = await db.query.products.findFirst({
      where: eq(schema.products.slug, finalSlug),
    });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
    }

    // 3. Insertar producto en la tabla `products`
    const [newProduct] = await db
      .insert(schema.products)
      .values({
        ...insertPayload,
        slug: finalSlug,
      })
      .returning();

    // 4. Asiento Génesis en Kárdex (Apertura contable y trazabilidad desde el día cero)
    // Se registra SIEMPRE al crear el producto (incluso si inicia con 0 uds) para auditar con qué costo y precio nació.
    const initialUnits = insertPayload.stock || 0;
    const initialCostFormatted = Number(insertPayload.costPrice || 0).toFixed(2);
    const initialPriceFormatted = Number(insertPayload.price || 0).toFixed(2);

    await db.insert(schema.inventoryMovements).values({
      productId: newProduct.id,
      movementType: "adjustment_in",
      quantity: initialUnits,
      previousStock: 0,
      newStock: initialUnits,
      unitCost: insertPayload.costPrice,
      referenceType: "product_creation",
      referenceId: newProduct.id,
      reason: `Apertura inicial en Kárdex al crear el producto. Stock inicial: ${initialUnits} uds | Costo de adquisición: ${CURRENCY_SYMBOL} ${initialCostFormatted} | Precio de venta: ${CURRENCY_SYMBOL} ${initialPriceFormatted}`,
      userId: currentUser.id,
    });

    // 5. Revalidar rutas
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/catalogo");

    return { success: true, data: newProduct };
  } catch (error: any) {
    console.error("Error al crear producto:", error);
    return {
      success: false,
      error: error.message || "Error interno al guardar el producto en la base de datos.",
    };
  }
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
    const validated = productFormSchema.safeParse(input);
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

    // Mantener slug original o recalcular si el nombre cambió drásticamente
    let finalSlug = existing.slug;
    if (existing.name.toLowerCase() !== payload.name.toLowerCase()) {
      const candidateSlug = slugify(payload.name);
      const conflict = await db.query.products.findFirst({
        where: eq(schema.products.slug, candidateSlug),
      });
      if (!conflict || conflict.id === id) {
        finalSlug = candidateSlug;
      }
    }

    // 3. Actualizar registro en `products`
    // En la edición directa, el stock físico y el costo de adquisición (CPP) están protegidos
    // para preservar la integridad del Kárdex y la contabilidad.
    const [updatedProduct] = await db
      .update(schema.products)
      .set({
        name: payload.name,
        slug: finalSlug,
        description: payload.description,
        price: payload.price, // Precio de venta libremente actualizable
        costPrice: existing.costPrice, // CPP vigente inmutable por edición directa
        stock: existing.stock, // Stock auditado inmutable por edición directa
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
      })
      .where(eq(schema.products.id, id))
      .returning();

    // 5. Revalidar rutas
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath(`/admin/inventario/${id}/editar`);
    safeRevalidatePath("/catalogo");
    safeRevalidatePath(`/producto/${finalSlug}`);

    return { success: true, data: updatedProduct };
  } catch (error: any) {
    console.error(`Error al actualizar producto #${id}:`, error);
    return {
      success: false,
      error: error.message || "Error interno al actualizar el producto en la base de datos.",
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
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: "El nombre de la categoría no puede estar vacío." };
    }

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
        imageUrl: imageUrl || null,
      })
      .returning();

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");
    return { success: true, data: newCat };
  } catch (error: any) {
    console.error("Error al crear categoría:", error);
    return { success: false, error: error.message || "Error al registrar la categoría." };
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
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: "El nombre no puede estar vacío." };
    }

    const slug = slugify(trimmed);
    const updateData: { name: string; slug: string; imageUrl?: string | null } = {
      name: trimmed,
      slug,
    };
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
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
  } catch (error: any) {
    console.error("Error al actualizar categoría:", error);
    return { success: false, error: error.message || "Error al actualizar categoría." };
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
    // 1. Reasignar productos huérfanos a NULL
    await db
      .update(schema.products)
      .set({ categoryId: null })
      .where(eq(schema.products.categoryId, id));

    // 2. Eliminar la categoría
    await db.delete(schema.categories).where(eq(schema.categories.id, id));

    safeRevalidatePath("/admin/inventario");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar categoría:", error);
    return { success: false, error: error.message || "Error al eliminar categoría." };
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

    const [updated] = await db
      .update(schema.products)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id))
      .returning();

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error al actualizar estado del producto:", error);
    return {
      success: false,
      error: error.message || "Error al cambiar el estado del producto.",
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

        const dateObj = new Date(m.createdAt);
        const formattedDate = dateObj.toLocaleDateString("es-BO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const isNegative =
          m.movementType === "sale_out" ||
          m.movementType === "damaged_out" ||
          m.movementType === "adjustment_out";

        return {
          id: m.id,
          date: formattedDate,
          productId: m.productId,
          product: m.product?.name || `Producto #${m.productId}`,
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
              : m.referenceId
              ? `#REF-${m.referenceId}`
              : "Ajuste Directo",
          referenceType: m.referenceType,
          reason: m.reason || "Sin observación",
          user: m.user?.name || "Administrador",
        };
      }),
    };
  } catch (error: any) {
    console.error("Error al obtener movimientos de kárdex:", error);
    return { success: false, data: [], error: error.message };
  }
}

export interface CreateAdjustmentInput {
  productId: number;
  quantity: number;
  reason: "damaged" | "defective" | "expired" | "loss_theft" | "supplier_return" | "internal_use";
  notes?: string;
  authorizedByUserId?: number;
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

    const { productId, quantity, reason, notes, authorizedByUserId } = input;

    if (!productId || typeof productId !== "number") {
      return { success: false, error: "Producto no válido." };
    }
    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return { success: false, error: "La cantidad debe ser un número entero mayor a 0." };
    }

    // 1. Obtener producto y verificar existencia y stock suficiente
    const product = await db.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (!product) {
      return { success: false, error: "El producto seleccionado no existe." };
    }

    if (product.stock < quantity) {
      return {
        success: false,
        error: `Stock insuficiente: El producto solo tiene ${product.stock} unidad(es) disponible(s).`,
      };
    }

    const previousStock = product.stock;
    const newStock = previousStock - quantity;
    const unitCostNum = Number(product.costPrice || 0);
    const totalCostNum = unitCostNum * quantity;

    // 2. Generar correlativo formal de baja (ej: BAJA-2026-002)
    const countResult = await db.query.inventoryAdjustments.findMany({
      columns: { id: true },
    });
    const currentYear = new Date().getFullYear();
    const folioNumber = String(countResult.length + 1).padStart(3, "0");
    const adjustmentNumber = `BAJA-${currentYear}-${folioNumber}`;

    // 3. Asentar las operaciones en la base de datos
    // a) Insertar cabecera de baja
    const [adj] = await db
      .insert(schema.inventoryAdjustments)
      .values({
        adjustmentNumber,
        reason,
        userId: currentUser.id,
        authorizedByUserId: authorizedByUserId || (currentUser.role === "admin" || currentUser.role === "manager" ? currentUser.id : 1),
        totalCost: totalCostNum.toFixed(2),
        notes: notes?.trim() || `Baja por ${reason}`,
      })
      .returning();

    // b) Insertar ítem de detalle de la baja
    await db.insert(schema.inventoryAdjustmentItems).values({
      adjustmentId: adj.id,
      productId: product.id,
      quantity,
      unitCost: unitCostNum.toFixed(2),
      subtotal: totalCostNum.toFixed(2),
    });

    // c) Actualizar stock del producto
    await db
      .update(schema.products)
      .set({
        stock: newStock,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, product.id));

    // d) Registrar asiento inmutable en el Kárdex (damaged_out)
    await db.insert(schema.inventoryMovements).values({
      productId: product.id,
      movementType: "damaged_out",
      quantity: -quantity, // Salida negativa
      previousStock,
      newStock,
      unitCost: unitCostNum.toFixed(2),
      referenceType: "adjustment",
      referenceId: adj.id,
      reason: `Baja #${adjustmentNumber}: ${notes?.trim() || reason}`,
      userId: currentUser.id,
    });

    const result = adj;

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");

    return {
      success: true,
      data: {
        adjustment: result,
        newStock,
        previousStock,
        productName: product.name,
      },
    };
  } catch (error: any) {
    console.error("Error al registrar acta de baja:", error);
    return { success: false, error: error.message || "Error al procesar la baja de inventario." };
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

      const dateObj = new Date(a.createdAt);
      const formattedDate = dateObj.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        date: formattedDate,
        productId: product?.id || 0,
        productName: product?.name || "Varios productos",
        sku: product?.sku || "N/A",
        quantity: firstItem ? firstItem.quantity : 1,
        reason: a.reason,
        reasonLabel: reasonLabels[a.reason] || a.reason,
        totalLoss: Number(a.totalCost || 0),
        reportedBy: a.user?.name || "Almacenero",
        authorizedBy: a.authorizedByUser?.name || "Supervisor General",
        notes: a.notes || "Sin observaciones adicionales",
      };
    });

    return { success: true, data: flatList };
  } catch (error: any) {
    console.error("Error al obtener actas de bajas:", error);
    return { success: false, data: [], error: error.message };
  }
}
