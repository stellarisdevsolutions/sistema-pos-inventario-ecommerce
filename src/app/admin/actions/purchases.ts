"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { purchaseFormSchema, type PurchaseFormInput } from "@/lib/validations/purchase";
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

      const formattedItems: PurchaseItemDetail[] = itemsList.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.name || "Producto no especificado",
        productSku: it.product?.sku || null,
        productImage: it.product?.imageUrl || null,
        quantity: it.quantity,
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
  } catch (error: any) {
    console.error("Error al obtener compras:", error);
    return {
      success: false,
      data: [],
      kpis: {
        monthlyInvestment: 0,
        monthlyPurchasesCount: 0,
        monthlyUnitsReceived: 0,
        totalSuppliersCount: 0,
      },
      error: error.message || "Error al leer compras del sistema.",
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
        name: p.name,
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
    return { success: false, data: [], error: error.message };
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
    return { success: false, data: [], error: error.message };
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

    // 1. Generar número correlativo de compra
    const countResult = await db.select({ total: count() }).from(schema.purchases);
    const nextNumber = (countResult[0]?.total || 0) + 1;
    const year = new Date().getFullYear();
    const purchaseNumber = `COM-${year}-${String(nextNumber).padStart(4, "0")}`;

    // 2. Calcular montos
    const subtotal = parsed.items.reduce(
      (acc, it) => acc + it.quantity * it.unitCost,
      0
    );
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;

    // 3. Insertar orden de compra
    const [newPurchase] = await db
      .insert(schema.purchases)
      .values({
        purchaseNumber,
        invoiceNumber: parsed.invoiceNumber || null,
        supplierId: parsed.supplierId,
        userId: currentUser.id,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: parsed.status,
        paymentStatus: parsed.paymentStatus,
        paymentMethod: parsed.paymentMethod,
        notes: parsed.notes || null,
      })
      .returning();

    // 4. Insertar cada renglón de compra
    for (const item of parsed.items) {
      const itemSubtotal = item.quantity * item.unitCost;
      await db.insert(schema.purchaseItems).values({
        purchaseId: newPurchase.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost.toFixed(2),
        subtotal: itemSubtotal.toFixed(2),
      });

      // 5. Si la compra es recibida, sumamos existencias, recalculamos CPP e insertamos en Kardex
      if (parsed.status === "received") {
        const prod = await db.query.products.findFirst({
          where: eq(schema.products.id, item.productId),
        });

        if (prod) {
          const prevStock = prod.stock || 0;
          const prevCost = parseFloat(prod.costPrice) || 0;
          const newStock = prevStock + item.quantity;

          // Cálculo del Costo Promedio Ponderado (CPP)
          const newCost =
            prevStock > 0
              ? (prevStock * prevCost + item.quantity * item.unitCost) / newStock
              : item.unitCost;

          // Actualizar producto
          await db
            .update(schema.products)
            .set({
              stock: newStock,
              costPrice: newCost.toFixed(2),
            })
            .where(eq(schema.products.id, item.productId));

          // Registrar movimiento en el Kardex
          const invoiceTag = parsed.invoiceNumber ? ` - Factura ${parsed.invoiceNumber}` : "";
          await db.insert(schema.inventoryMovements).values({
            productId: item.productId,
            movementType: "purchase_in",
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: newStock,
            unitCost: item.unitCost.toFixed(2),
            referenceType: "purchase",
            referenceId: newPurchase.id,
            reason: `Ingreso por compra ${purchaseNumber}${invoiceTag}`,
            userId: currentUser.id,
          });
        }
      }
    }

    safeRevalidatePath("/admin/compras");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/proveedores");

    return { success: true, data: newPurchase };
  } catch (error: any) {
    console.error("Error al registrar compra:", error);
    return {
      success: false,
      error: error.message || "Error al procesar y registrar la orden de compra.",
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

    const purchase = await db.query.purchases.findFirst({
      where: eq(schema.purchases.id, purchaseId),
      with: {
        items: true,
      },
    });

    if (!purchase) {
      return { success: false, error: "La orden de compra no fue encontrada." };
    }

    if (purchase.status === "cancelled") {
      return { success: false, error: "Esta orden de compra ya se encuentra anulada." };
    }

    // Si ya fue recibida en almacén, revertir stock y registrar salida en Kardex
    if (purchase.status === "received") {
      for (const item of purchase.items || []) {
        const prod = await db.query.products.findFirst({
          where: eq(schema.products.id, item.productId),
        });

        if (prod) {
          const prevStock = prod.stock || 0;
          const newStock = Math.max(0, prevStock - item.quantity);

          await db
            .update(schema.products)
            .set({ stock: newStock })
            .where(eq(schema.products.id, item.productId));

          await db.insert(schema.inventoryMovements).values({
            productId: item.productId,
            movementType: "adjustment_out",
            quantity: -item.quantity,
            previousStock: prevStock,
            newStock: newStock,
            unitCost: item.unitCost,
            referenceType: "purchase",
            referenceId: purchase.id,
            reason: `Anulacion de compra ${purchase.purchaseNumber}: ${reason || "Cancelacion de orden"}`,
            userId: currentUser.id,
          });
        }
      }
    }

    // Actualizar estado de la compra a cancelled
    await db
      .update(schema.purchases)
      .set({ status: "cancelled" })
      .where(eq(schema.purchases.id, purchaseId));

    safeRevalidatePath("/admin/compras");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/proveedores");

    return { success: true };
  } catch (error: any) {
    console.error("Error al anular compra:", error);
    return {
      success: false,
      error: error.message || "Error al anular la orden de compra.",
    };
  }
}
