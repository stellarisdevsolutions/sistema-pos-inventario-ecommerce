"use server";

import { productName } from "@/lib/product-name";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cancelPurchaseQuery, createPurchaseQuery, lockPurchaseQuery, returnPurchaseQuery } from "@/db/operations/purchases";
import { businessDate } from "@/lib/business-date";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { purchaseFormSchema, purchaseReturnSchema, type PurchaseFormInput, type PurchaseReturnInput } from "@/lib/validations/purchase";
import { requireRole } from "@/lib/auth/session";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

export type PurchaseItemDetail = {
  id: number;
  productId: number;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  quantity: number;
  returnedQuantity: number;
  availableStock: number;
  unitCost: number;
  subtotal: number;
};

export type PurchaseListItem = {
  id: number;
  purchaseNumber: string;
  invoiceNumber: string | null;
  supplierId: number;
  supplierName: string;
  supplierTaxId: string | null;
  userId: number;
  userName: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "pending" | "received" | "cancelled";
  paymentStatus: "paid" | "pending" | "partial";
  paymentMethod: "cash" | "card" | "transfer" | "other";
  notes: string | null;
  createdAt: string;
  rawCreatedAt: string;
  itemsCount: number; // Cantidad total de piezas físicas
  linesCount: number; // Cantidad de renglones / productos distintos
  items: PurchaseItemDetail[];
  returns: {
    id: number;
    createdAt: string;
    userName: string;
    reason: string;
    creditNoteReference: string | null;
    items: { purchaseItemId: number; quantity: number; originalUnitCost: number; inventoryUnitCost: number }[];
  }[];
};

export type PurchasesKpiSummary = {
  monthlyInvestment: number;
  monthlyPurchasesCount: number;
  monthlyUnitsReceived: number;
  totalSuppliersCount: number;
};

/**
 * Obtiene todas las compras registradas con proveedores, items y cálculos de KPIs
 */
export async function getPurchasesAction(): Promise<{
  success: boolean;
  data: PurchaseListItem[];
  kpis: PurchasesKpiSummary;
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const list = await db.query.purchases.findMany({
      with: {
        returns: { with: { user: true, items: true }, orderBy: (r, { desc }) => [desc(r.id)] },
        supplier: true,
        user: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (p, { desc }) => [desc(p.id)],
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    let monthlyInvestment = 0;
    let monthlyPurchasesCount = 0;
    let monthlyUnitsReceived = 0;
    const activeSupplierIds = new Set<number>();

    const formatted: PurchaseListItem[] = list.map((p) => {
      const itemsList = p.items || [];
      const totalUnits = itemsList.reduce((acc, it) => acc + (it.quantity || 0), 0);
      const totalNum = parseFloat(p.totalAmount) || 0;
      const pDate = new Date(p.createdAt);

      if (p.supplierId) {
        activeSupplierIds.add(p.supplierId);
      }

      if (pDate >= startOfMonth && p.status !== "cancelled") {
        monthlyInvestment += totalNum;
        monthlyPurchasesCount += 1;
        if (p.status === "received") {
          monthlyUnitsReceived += totalUnits;
        }
      }

      const formattedDate = pDate.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const returnedByLine = new Map<number, number>();
      for (const receipt of p.returns) {
        for (const item of receipt.items) {
          returnedByLine.set(item.purchaseItemId, (returnedByLine.get(item.purchaseItemId) ?? 0) + item.quantity);
        }
      }

      const formattedItems: PurchaseItemDetail[] = itemsList.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product ? productName(it.product) : "Producto no especificado",
        productSku: it.product?.sku || null,
        productImage: it.product?.imageUrl || null,
        quantity: it.quantity,
        returnedQuantity: returnedByLine.get(it.id) ?? 0,
        availableStock: it.product?.stock ?? 0,
        unitCost: parseFloat(it.unitCost) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
      }));

      return {
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        invoiceNumber: p.invoiceNumber || null,
        supplierId: p.supplierId,
        supplierName: p.supplier?.name || "Proveedor eliminado",
        supplierTaxId: p.supplier?.taxId || null,
        userId: p.userId,
        userName: p.user?.name || "Administrador",
        subtotal: parseFloat(p.subtotal) || 0,
        taxAmount: parseFloat(p.taxAmount) || 0,
        totalAmount: totalNum,
        status: p.status as "pending" | "received" | "cancelled",
        paymentStatus: p.paymentStatus as "paid" | "pending" | "partial",
        paymentMethod: (p.paymentMethod as any) || "transfer",
        notes: p.notes || null,
        createdAt: formattedDate,
        rawCreatedAt: p.createdAt.toISOString(),
        itemsCount: totalUnits,
        linesCount: itemsList.length,
        items: formattedItems,
        returns: p.returns.map(receipt => ({
          id: receipt.id,
          createdAt: businessDate(receipt.createdAt),
          userName: receipt.user?.name ?? "Usuario",
          reason: receipt.reason,
          creditNoteReference: receipt.creditNoteReference,
          items: receipt.items.map(item => ({
            purchaseItemId: item.purchaseItemId,
            quantity: item.quantity,
            originalUnitCost: Number(item.originalUnitCost),
            inventoryUnitCost: Number(item.inventoryUnitCost),
          })),
        })),
      };
    });

    return {
      success: true,
      data: formatted,
      kpis: {
        monthlyInvestment,
        monthlyPurchasesCount,
        monthlyUnitsReceived,
        totalSuppliersCount: activeSupplierIds.size,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      kpis: {
        monthlyInvestment: 0,
        monthlyPurchasesCount: 0,
        monthlyUnitsReceived: 0,
        totalSuppliersCount: 0,
      },
      error: adminActionError(error, "Error al leer compras del sistema."),
    };
  }
}

/**
 * Obtiene lista optimizada de productos para el selector de compras
 */
export async function getProductsForPurchaseAction() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const prods = await db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      columns: {
        id: true,
        name: true,
        variant: true,
        sku: true,
        barcode: true,
        stock: true,
        costPrice: true,
        price: true,
        imageUrl: true,
        supplierId: true,
      },
      orderBy: (p, { asc }) => [asc(p.name)],
    });

    return {
      success: true,
      data: prods.map((p) => ({
        id: p.id,
        name: productName(p),
        sku: p.sku || `PROD-${p.id}`,
        barcode: p.barcode || "",
        stock: p.stock || 0,
        costPrice: parseFloat(p.costPrice) || 0,
        price: parseFloat(p.price) || 0,
        imageUrl: p.imageUrl || null,
        supplierId: p.supplierId || null,
      })),
    };
  } catch (error: any) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}

/**
 * Obtiene lista de proveedores activos para el selector de compras
 */
export async function getSuppliersForPurchaseAction() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const list = await db.query.suppliers.findMany({
      where: eq(schema.suppliers.isActive, true),
      columns: {
        id: true,
        name: true,
        taxId: true,
        contactName: true,
        phone: true,
      },
      orderBy: (s, { asc }) => [asc(s.name)],
    });

    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}

/**
 * Server Action: Registrar una orden de compra o entrada directa de stock
 */
export async function createPurchaseAction(input: PurchaseFormInput): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    const parsed = purchaseFormSchema.parse(input);

    const { rows: [newPurchase] } = await db.execute(createPurchaseQuery(
      parsed,
      currentUser.id,
      `COM-${businessDate().slice(0, 4)}-`
    ));
    if (!newPurchase) {
      return { success: false, error: "El proveedor o uno de los productos ya no está activo." };
    }

    safeRevalidatePath("/admin/compras");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/proveedores");

    return { success: true, data: newPurchase };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al procesar y registrar la orden de compra."),
    };
  }
}

/**
 * Server Action: Anular una compra recibida y revertir las existencias en Kardex
 */
export async function cancelPurchaseAction(
  purchaseId: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0 ||
        (reason !== undefined && (typeof reason !== "string" || reason.length > 500))) {
      return { success: false, error: "Revisa el identificador de compra y el motivo." };
    }

    const [, { rows }] = await db.batch([
      db.execute(lockPurchaseQuery(purchaseId)),
      db.execute(cancelPurchaseQuery(purchaseId, currentUser.id, reason?.trim() || "Cancelación de orden")),
    ]);
    if (!rows.length) {
      return { success: false, error: "La compra ya fue anulada, tiene devoluciones registradas o falta stock para revertirla." };
    }

    safeRevalidatePath("/admin/compras");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/proveedores");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al anular la orden de compra."),
    };
  }
}

export async function returnPurchaseAction(input: PurchaseReturnInput): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireRole(["admin", "manager", "warehouse"]);
    const parsed = purchaseReturnSchema.parse(input);
    const [, { rows }] = await db.batch([
      db.execute(lockPurchaseQuery(parsed.purchaseId)),
      db.execute(returnPurchaseQuery(parsed, actor.id)),
    ]);
    if (!rows.length) {
      return { success: false, error: "Verifica que la compra siga recibida y que las cantidades no superen lo pendiente por devolver ni el stock disponible." };
    }

    for (const path of ["/admin/compras", "/admin/inventario", "/admin", "/admin/ventas", "/catalogo"]) {
      safeRevalidatePath(path);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "No se pudo registrar la devolución al proveedor.") };
  }
}
