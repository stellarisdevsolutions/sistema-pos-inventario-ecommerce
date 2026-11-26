"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { supplierFormSchema, type SupplierFormInput } from "@/lib/validations/supplier";
import { businessMonthEnd, businessMonthStart, formatBusinessDate } from "@/lib/business-date";
import { requireRole } from "@/lib/auth/session";
import { summarizePurchaseReturnAmounts } from "@/lib/purchase-return-math";

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
 * Obtiene todos los proveedores con agregados netos de compras y productos suministrados
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
          with: {
            returns: {
              columns: {
                createdAt: true,
                creditedAmount: true,
              },
              with: {
                items: {
                  columns: {
                    quantity: true,
                    originalUnitCost: true,
                  },
                },
              },
            },
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

    const startOfMonth = businessMonthStart();
    const endOfMonth = businessMonthEnd();

    const formatted: SupplierItem[] = list.map((s) => {
      const receivedPurchases = (s.purchases || []).filter((p) => p.status === "received");

      let totalPurchased = 0;
      let monthlyPurchased = 0;

      for (const p of receivedPurchases) {
        const total = parseFloat(p.totalAmount) || 0;
        let totalReturned = 0;
        let monthReturned = 0;
        for (const r of p.returns || []) {
          const rValue = summarizePurchaseReturnAmounts(r.items, r.creditedAmount).creditedAmount;
          totalReturned += rValue;
          const rDate = new Date(r.createdAt);
          if (rDate >= startOfMonth && rDate < endOfMonth) {
            monthReturned += rValue;
          }
        }

        totalPurchased += Math.max(0, total - totalReturned);
        const pDate = p.createdAt ? new Date(p.createdAt) : null;
        const inMonth = pDate !== null && pDate >= startOfMonth && pDate < endOfMonth;
        monthlyPurchased += (inMonth ? total : 0) - monthReturned;
      }

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
        createdAt: formatBusinessDate(s.createdAt),
        purchasesCount: receivedPurchases.length,
        totalPurchased: Number(totalPurchased.toFixed(2)),
        monthlyPurchased: Number(monthlyPurchased.toFixed(2)),
        productsCount: (s.products || []).length,
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, data: [], error: adminActionError(error, "Error al leer proveedores.") };
  }
}

/**
 * Server Action: Registrar un nuevo proveedor
 */
export async function createSupplierAction(
  input: SupplierFormInput
): Promise<{ success: boolean; data?: typeof schema.suppliers.$inferSelect; error?: string }> {
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
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al registrar el proveedor.") };
  }
}

/**
 * Server Action: Actualizar un proveedor existente
 */
export async function updateSupplierAction(
  id: number,
  input: SupplierFormInput
): Promise<{ success: boolean; data?: typeof schema.suppliers.$inferSelect; error?: string }> {
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
  } catch (error) {
    console.error(`Error al actualizar proveedor #${id}:`, error);
    return { success: false, error: adminActionError(error, "Error al actualizar el proveedor.") };
  }
}

/**
 * Server Action: Conmutar estado de actividad de un proveedor
 */
export async function toggleSupplierActiveAction(
  id: number,
  isActive: boolean
): Promise<{ success: boolean; data?: typeof schema.suppliers.$inferSelect; error?: string }> {
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
  } catch (error) {
    console.error(`Error al cambiar estado de proveedor #${id}:`, error);
    return { success: false, error: adminActionError(error, "Error al cambiar estado del proveedor.") };
  }
}

/**
 * Server Action: Eliminar proveedor de forma segura
 */
export async function deleteSupplierAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["admin"]);

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

    await db.batch([
      db.update(schema.products).set({ supplierId: null }).where(eq(schema.products.supplierId, id)),
      db.delete(schema.suppliers).where(eq(schema.suppliers.id, id)),
    ]);

    safeRevalidatePath("/admin/proveedores");
    safeRevalidatePath("/admin/inventario");

    return { success: true };
  } catch (error) {
    console.error(`Error al eliminar proveedor #${id}:`, error);
    return { success: false, error: adminActionError(error, "Error al eliminar el proveedor.") };
  }
}
