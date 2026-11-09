"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { supplierFormSchema, type SupplierFormInput } from "@/lib/validations/supplier";
import { requireRole } from "@/lib/auth/session";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

export type SupplierItem = {
  id: number;
  name: string;
  contactName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  purchasesCount: number;
  totalPurchased: number;
  monthlyPurchased: number;
  productsCount: number;
};

/**
 * Obtiene todos los proveedores con agregados de compras y productos suministrados
 */
export async function getSuppliersAction(): Promise<{
  success: boolean;
  data: SupplierItem[];
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const list = await db.query.suppliers.findMany({
      with: {
        purchases: {
          columns: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        products: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const formatted: SupplierItem[] = list.map((s) => {
      const validPurchases = s.purchases || [];
      const totalPurchased = validPurchases.reduce(
        (acc, p) => acc + (parseFloat(p.totalAmount) || 0),
        0
      );

      const monthlyPurchased = validPurchases
        .filter((p) => p.createdAt && new Date(p.createdAt) >= startOfMonth)
        .reduce((acc, p) => acc + (parseFloat(p.totalAmount) || 0), 0);

      const dateObj = new Date(s.createdAt);
      const formattedDate = dateObj.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return {
        id: s.id,
        name: s.name,
        contactName: s.contactName || null,
        taxId: s.taxId || null,
        email: s.email || null,
        phone: s.phone || null,
        address: s.address || null,
        notes: s.notes || null,
        isActive: s.isActive ?? true,
        createdAt: formattedDate,
        purchasesCount: validPurchases.length,
        totalPurchased,
        monthlyPurchased,
        productsCount: (s.products || []).length,
      };
    });

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error("Error al obtener proveedores:", error);
    return { success: false, data: [], error: error.message || "Error al leer proveedores." };
  }
}

/**
 * Server Action: Registrar un nuevo proveedor
 */
export async function createSupplierAction(
  input: SupplierFormInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);

    const validated = supplierFormSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Datos de proveedor inválidos.",
      };
    }

    const { name, contactName, taxId, email, phone, address, notes, isActive } = validated.data;

    const [created] = await db
      .insert(schema.suppliers)
      .values({
        name: name.trim(),
        contactName: contactName?.trim() || null,
        taxId: taxId?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive ?? true,
      })
      .returning();

    safeRevalidatePath("/admin/proveedores");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");

    return { success: true, data: created };
  } catch (error: any) {
    console.error("Error al crear proveedor:", error);
    return { success: false, error: error.message || "Error al registrar el proveedor." };
  }
}

/**
 * Server Action: Actualizar un proveedor existente
 */
export async function updateSupplierAction(
  id: number,
  input: SupplierFormInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);

    const validated = supplierFormSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "Datos de proveedor inválidos.",
      };
    }

    const { name, contactName, taxId, email, phone, address, notes, isActive } = validated.data;

    const [updated] = await db
      .update(schema.suppliers)
      .set({
        name: name.trim(),
        contactName: contactName?.trim() || null,
        taxId: taxId?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive ?? true,
      })
      .where(eq(schema.suppliers.id, id))
      .returning();

    safeRevalidatePath("/admin/proveedores");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error(`Error al actualizar proveedor #${id}:`, error);
    return { success: false, error: error.message || "Error al actualizar el proveedor." };
  }
}

/**
 * Server Action: Conmutar estado de actividad de un proveedor
 */
export async function toggleSupplierActiveAction(
  id: number,
  isActive: boolean
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);

    const [updated] = await db
      .update(schema.suppliers)
      .set({ isActive })
      .where(eq(schema.suppliers.id, id))
      .returning();

    safeRevalidatePath("/admin/proveedores");
    safeRevalidatePath("/admin/inventario");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error(`Error al cambiar estado de proveedor #${id}:`, error);
    return { success: false, error: error.message || "Error al cambiar estado del proveedor." };
  }
}

/**
 * Server Action: Eliminar proveedor de forma segura
 * - Si tiene compras registradas o productos asociados, desvincula o previene según seguridad
 */
export async function deleteSupplierAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["admin"]);

    // 1. Verificar si tiene compras registradas
    const purchasesCount = await db.query.purchases.findMany({
      where: eq(schema.purchases.supplierId, id),
      columns: { id: true },
    });

    if (purchasesCount.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar porque tiene ${purchasesCount.length} orden(es) de compra registrada(s). Puedes desactivarlo para suspender relaciones comerciales.`,
      };
    }

    // 2. Desvincular productos asociados (supplierId = null) para no romper productos
    await db
      .update(schema.products)
      .set({ supplierId: null })
      .where(eq(schema.products.supplierId, id));

    // 3. Eliminar proveedor
    await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));

    safeRevalidatePath("/admin/proveedores");
    safeRevalidatePath("/admin/inventario");

    return { success: true };
  } catch (error: any) {
    console.error(`Error al eliminar proveedor #${id}:`, error);
    return { success: false, error: error.message || "Error al eliminar el proveedor." };
  }
}
