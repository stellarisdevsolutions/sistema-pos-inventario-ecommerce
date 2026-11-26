"use server";

import { productName } from "@/lib/product-name";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cancelPurchaseQuery, createPurchaseQuery, lockPurchaseQuery, receivePurchaseQuery, returnPurchaseQuery } from "@/db/operations/purchases";
import { businessDate, businessMonthEnd, businessMonthStart, formatBusinessDate } from "@/lib/business-date";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { purchaseFormSchema, purchaseReturnSchema, type PurchaseFormInput, type PurchaseReturnInput } from "@/lib/validations/purchase";
import { requireRole } from "@/lib/auth/session";
import { summarizePurchaseReturnAmounts } from "@/lib/purchase-return-math";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

function revalidatePurchasePaths() {
  for (const path of [
    "/admin/compras",
    "/admin/inventario",
    "/admin/proveedores",
    "/admin",
    "/admin/ventas",
    "/catalogo",
    "/",
  ]) {
    safeRevalidatePath(path);
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
  returnedAmount: number;
  returnedMerchandiseAmount: number;
  supplierPenaltyAmount: number;
  netMerchandiseAmount: number;
  netAmount: number;
  status: "pending" | "received" | "cancelled";
  paymentStatus: "paid" | "pending" | "partial";
  paymentMethod: "cash" | "card" | "transfer" | "qr" | "other";
  notes: string | null;
  createdAt: string;
  rawCreatedAt: string;
  itemsCount: number;
  returnedUnits: number;
  netUnits: number;
  linesCount: number;
  items: PurchaseItemDetail[];
  returns: {
    id: number;
    createdAt: string;
    userName: string;
    reason: string;
    creditNoteReference: string | null;
    expectedAmount: number;
    creditedAmount: number;
    adjustmentAmount: number;
    items: { purchaseItemId: number; quantity: number; originalUnitCost: number; inventoryUnitCost: number }[];
  }[];
};

export type PurchasesKpiSummary = {
  monthlyInvestment: number;
  monthlyMerchandiseInvestment: number;
  monthlySupplierPenalties: number;
  monthlyPurchasesCount: number;
  monthlyUnitsReceived: number;
  monthlySuppliersCount: number;
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
            product: {
              with: {
                model: true,
              },
            },
          },
        },
      },
      orderBy: (p, { desc }) => [desc(p.id)],
    });

    const startOfMonth = businessMonthStart();
    const endOfMonth = businessMonthEnd();

    let monthlyInvestment = 0;
    let monthlySupplierPenalties = 0;
    let monthlyPurchasesCount = 0;
    let monthlyUnitsReceived = 0;
    const monthlySupplierIds = new Set<number>();
    const allTimeSupplierIds = new Set<number>();

    const formatted: PurchaseListItem[] = list.map((p) => {
      const itemsList = p.items || [];
      const totalUnits = itemsList.reduce((acc, it) => acc + (it.quantity || 0), 0);
      const totalNum = parseFloat(p.totalAmount) || 0;
      const pDate = new Date(p.createdAt);

      if (p.supplierId && p.status === "received") {
        allTimeSupplierIds.add(p.supplierId);
      }

      const returnedByLine = new Map<number, number>();
      let totalReturnedUnits = 0;
      let totalReturnedValue = 0;
      let totalReturnedMerchandise = 0;
      let totalSupplierPenalties = 0;
      let monthReturnedUnits = 0;
      let monthReturnedValue = 0;
      let monthSupplierPenalties = 0;
      for (const receipt of p.returns) {
        const receiptDate = new Date(receipt.createdAt);
        const returnInMonth = receiptDate >= startOfMonth && receiptDate < endOfMonth;
        let receiptUnits = 0;
        for (const item of receipt.items) {
          returnedByLine.set(item.purchaseItemId, (returnedByLine.get(item.purchaseItemId) ?? 0) + item.quantity);
          receiptUnits += item.quantity;
        }
        const {
          expectedAmount: receiptExpectedValue,
          creditedAmount: receiptCreditedValue,
          penaltyAmount: receiptPenaltyValue,
        } = summarizePurchaseReturnAmounts(receipt.items, receipt.creditedAmount);
        totalReturnedUnits += receiptUnits;
        totalReturnedValue += receiptCreditedValue;
        totalReturnedMerchandise += receiptExpectedValue;
        totalSupplierPenalties += receiptPenaltyValue;
        if (returnInMonth) {
          monthReturnedUnits += receiptUnits;
          monthReturnedValue += receiptCreditedValue;
          monthSupplierPenalties += receiptPenaltyValue;
        }
      }

      if (p.status === "received") {
        if (pDate >= startOfMonth && pDate < endOfMonth) {
          monthlyInvestment += totalNum;
          monthlyPurchasesCount += 1;
          monthlyUnitsReceived += totalUnits;
          if (p.supplierId) {
            monthlySupplierIds.add(p.supplierId);
          }
        }
        monthlyInvestment -= monthReturnedValue;
        monthlyUnitsReceived -= monthReturnedUnits;
        monthlySupplierPenalties += monthSupplierPenalties;
      }

      const formattedDate = formatBusinessDate(p.createdAt);

      const formattedItems: PurchaseItemDetail[] = itemsList.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product ? productName(it.product) : "Producto no especificado",
        productSku: it.product?.sku || null,
        productImage: it.product?.imageUrl || it.product?.model?.imageUrl || null,
        quantity: it.quantity,
        returnedQuantity: returnedByLine.get(it.id) ?? 0,
        availableStock: it.product?.stock ?? 0,
        unitCost: parseFloat(it.unitCost) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
      }));

      const returnedAmount = Number(totalReturnedValue.toFixed(2));
      const returnedMerchandiseAmount = Number(totalReturnedMerchandise.toFixed(2));
      const supplierPenaltyAmount =
        p.status === "cancelled" ? 0 : Number(totalSupplierPenalties.toFixed(2));
      const netMerchandiseAmount =
        p.status === "cancelled"
          ? 0
          : Number(Math.max(0, totalNum - returnedMerchandiseAmount).toFixed(2));
      const netAmount =
        p.status === "cancelled"
          ? 0
          : Number(Math.max(0, totalNum - returnedAmount).toFixed(2));
      const netUnits = p.status === "cancelled" ? 0 : Math.max(0, totalUnits - totalReturnedUnits);

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
        returnedAmount,
        returnedMerchandiseAmount,
        supplierPenaltyAmount,
        netMerchandiseAmount,
        netAmount,
        status: p.status,
        paymentStatus: p.paymentStatus,
        paymentMethod: p.paymentMethod || "transfer",
        notes: p.notes || null,
        createdAt: formattedDate,
        rawCreatedAt: p.createdAt.toISOString(),
        itemsCount: totalUnits,
        returnedUnits: totalReturnedUnits,
        netUnits,
        linesCount: itemsList.length,
        items: formattedItems,
        returns: p.returns.map((receipt) => {
          const { expectedAmount, creditedAmount, penaltyAmount } =
            summarizePurchaseReturnAmounts(receipt.items, receipt.creditedAmount);
          return {
            id: receipt.id,
            createdAt: businessDate(receipt.createdAt),
            userName: receipt.user?.name ?? "Usuario",
            reason: receipt.reason,
            creditNoteReference: receipt.creditNoteReference,
            expectedAmount: Number(expectedAmount.toFixed(2)),
            creditedAmount: Number(creditedAmount.toFixed(2)),
            adjustmentAmount: Number(penaltyAmount.toFixed(2)),
            items: receipt.items.map(item => ({
              purchaseItemId: item.purchaseItemId,
              quantity: item.quantity,
              originalUnitCost: Number(item.originalUnitCost),
              inventoryUnitCost: Number(item.inventoryUnitCost),
            })),
          };
        }),
      };
    });

    return {
      success: true,
      data: formatted,
      kpis: {
        monthlyInvestment: Number(monthlyInvestment.toFixed(2)),
        monthlyMerchandiseInvestment: Number((monthlyInvestment - monthlySupplierPenalties).toFixed(2)),
        monthlySupplierPenalties: Number(monthlySupplierPenalties.toFixed(2)),
        monthlyPurchasesCount,
        monthlyUnitsReceived,
        monthlySuppliersCount: monthlySupplierIds.size,
        totalSuppliersCount: allTimeSupplierIds.size,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      kpis: {
        monthlyInvestment: 0,
        monthlyMerchandiseInvestment: 0,
        monthlySupplierPenalties: 0,
        monthlyPurchasesCount: 0,
        monthlyUnitsReceived: 0,
        monthlySuppliersCount: 0,
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
      where: and(eq(schema.products.isActive, true), eq(schema.products.isArchived, false)),
      columns: {
        id: true,
        name: true,
        modelCode: true,
        variant: true,
        sku: true,
        barcode: true,
        stock: true,
        costPrice: true,
        price: true,
        imageUrl: true,
        supplierId: true,
      },
      with: {
        model: {
          columns: {
            imageUrl: true,
          },
        },
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
        imageUrl: p.imageUrl || p.model?.imageUrl || null,
        supplierId: p.supplierId || null,
      })),
    };
  } catch (error) {
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
  } catch (error) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}

/**
 * Server Action: Registrar una orden de compra o entrada directa de stock
 */
export async function createPurchaseAction(input: PurchaseFormInput): Promise<{
  success: boolean;
  data?: { id: number; purchaseNumber: string };
  error?: string;
}> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    const parsed = purchaseFormSchema.parse(input);

    if (parsed.requestId) {
      const existing = await db.query.purchases.findFirst({
        where: eq(schema.purchases.requestId, parsed.requestId),
        columns: { id: true, purchaseNumber: true },
      });
      if (existing) {
        return { success: true, data: existing };
      }
    }

    const { rows: [newPurchase] } = await db.execute<{ id: number; purchaseNumber: string }>(
      createPurchaseQuery(
        parsed,
        currentUser.id,
        `COM-${businessDate().slice(0, 4)}-`
      )
    );
    if (!newPurchase) {
      if (parsed.requestId) {
        const recovered = await db.query.purchases.findFirst({
          where: eq(schema.purchases.requestId, parsed.requestId),
          columns: { id: true, purchaseNumber: true },
        });
        if (recovered) {
          return { success: true, data: recovered };
        }
      }
      return { success: false, error: "El proveedor o uno de los productos ya no está activo." };
    }

    revalidatePurchasePaths();

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
      return {
        success: false,
        error: "No se puede anular la compra completa: ya fue anulada, tiene devoluciones o algún producto ya no tiene stock suficiente. Registra una devolución parcial por el saldo disponible.",
      };
    }

    revalidatePurchasePaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al anular la orden de compra."),
    };
  }
}

/**
 * Server Action: Confirmar recepción en almacén de una compra pendiente
 */
export async function receivePurchaseAction(purchaseId: number): Promise<{
  success: boolean;
  data?: { id: number; purchaseNumber: string };
  error?: string;
}> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    if (!Number.isSafeInteger(purchaseId) || purchaseId <= 0) {
      return { success: false, error: "Identificador de compra inválido." };
    }

    const [, { rows }] = await db.batch([
      db.execute(lockPurchaseQuery(purchaseId)),
      db.execute(receivePurchaseQuery(purchaseId, currentUser.id)),
    ]);
    const received = rows[0] as { id: number; purchaseNumber: string } | undefined;
    if (!received) {
      return {
        success: false,
        error: "La compra ya fue recibida o anulada, o uno de sus productos ya no está activo.",
      };
    }

    revalidatePurchasePaths();
    return { success: true, data: received };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al confirmar la recepción de la compra."),
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
      return { success: false, error: "Verifica que la compra siga recibida, que las cantidades no superen lo disponible y que el monto reconocido no supere el valor de la mercadería devuelta." };
    }

    revalidatePurchasePaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "No se pudo registrar la devolución al proveedor.") };
  }
}
