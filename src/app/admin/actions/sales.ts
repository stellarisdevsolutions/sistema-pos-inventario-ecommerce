"use server";

import { productName } from "@/lib/product-name";

import { createHash } from "node:crypto";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cancelSaleQuery, createSaleQuery, refundSaleQuery } from "@/db/operations/sales";
import * as schema from "@/db/schema";
import { isNull, eq, and, inArray } from "drizzle-orm";
import { saleFormSchema, refundSaleSchema, type SaleFormInput, type RefundSaleItemsInput } from "@/lib/validations/sale";
import { businessDate, formatBusinessDateTime, formatBusinessTime } from "@/lib/business-date";
import { refundUnitAmounts } from "@/lib/refund-amount";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limit";
import { encodeSupervisorPin } from "@/lib/auth/supervisor-pin";
import { requireRole, type SessionUser } from "@/lib/auth/session";

const POS_ROLES: ("admin" | "manager" | "cashier")[] = ["admin", "manager", "cashier"];
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

function revalidateSalesPaths() {
  for (const path of [
    "/admin/ventas",
    "/admin/inventario",
    "/admin",
    "/admin/cajas",
    "/admin/reportes",
    "/catalogo",
    "/",
  ]) {
    safeRevalidatePath(path);
  }
}

export type PosProductItem = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  image: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
};

export type SaleTicketItem = {
  id: number;
  productId: number;
  productName: string;
  productSku: string | null;
  quantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleHistoryItem = {
  id: number;
  saleNumber: string;
  customerName: string;
  paymentMethod: "cash" | "card" | "transfer" | "other";
  channel: "pos" | "online";
  status: "completed" | "pending" | "cancelled" | "refunded";
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  refundedAmount?: number;
  netAmount?: number;
  cashGiven: number | null;
  changeGiven: number | null;
  notes: string | null;
  cashierName: string;
  userId: number;
  userRole?: string;
  cashShiftId: number | null;
  cashRegisterName?: string | null;
  shiftNumber?: string | null;
  isAdministrativeSale: boolean;
  createdAt: string;
  rawCreatedAt: string;
  itemsCount: number;
  items: SaleTicketItem[];
};

export type SalesKpiSummary = {
  totalRevenue: number;
  todayRevenue: number;
  totalSalesCount: number;
  averageTicket: number;
  administrativeSalesCount: number;
  administrativeSalesRevenue: number;
  posShiftSalesCount: number;
  posShiftSalesRevenue: number;
};

export type PosShiftItem = {
  id: number;
  shiftNumber: string;
  cashRegisterName: string;
};

/**
 * 1. Obtiene el catálogo de productos activos para la terminal POS
 */
export async function getPosCatalogAction(): Promise<{
  success: boolean;
  data: PosProductItem[];
  categories: string[];
  error?: string;
}> {
  try {
    const operator = await requireRole(POS_ROLES);
    const prods = await db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      with: {
        category: true,
      },
      orderBy: (p, { asc }) => [asc(p.name)],
    });

    const categorySet = new Set<string>();

    const formatted: PosProductItem[] = prods.map((p) => {
      const categoryName = p.category?.name || "General";
      categorySet.add(categoryName);

      const stock = p.stock || 0;
      const minStock = p.minStock;

      const status: "in_stock" | "low_stock" | "out_of_stock" =
        stock <= 0 ? "out_of_stock" : stock <= minStock ? "low_stock" : "in_stock";

      return {
        id: p.id,
        name: productName(p),
        sku: p.sku || `SKU-${p.id}`,
        barcode: p.barcode || "",
        category: categoryName,
        price: parseFloat(p.price) || 0,
        costPrice: operator.role === "cashier" ? 0 : parseFloat(p.costPrice) || 0,
        stock,
        minStock,
        image:
          p.imageUrl ||
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
        status,
      };
    });

    return {
      success: true,
      data: formatted,
      categories: ["Todas", ...Array.from(categorySet).sort()],
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      categories: ["Todas"],
      error: adminActionError(error, "Error al cargar productos de la caja."),
    };
  }
}

export async function getPosContextAction(): Promise<{
  success: boolean;
  currentOperator: Pick<SessionUser, "id" | "name" | "role"> | null;
  userShift: PosShiftItem | null;
  shiftPendingReview: boolean;
  error?: string;
}> {
  try {
    const { id, name, role } = await requireRole(POS_ROLES);
    const shift = await db.query.cashShifts.findFirst({
      where: and(eq(schema.cashShifts.status, "open"), eq(schema.cashShifts.userId, id)),
      columns: { id: true, shiftNumber: true, cashRegisterId: true, actualCash: true },
      with: { cashRegister: { columns: { name: true } } },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const shiftPendingReview = !!shift && shift.actualCash !== null;
    return {
      success: true,
      currentOperator: { id, name, role },
      userShift: shift && !shiftPendingReview ? {
        id: shift.id,
        shiftNumber: shift.shiftNumber,
        cashRegisterName: shift.cashRegister?.name || `Caja #${shift.cashRegisterId}`,
      } : null,
      shiftPendingReview,
    };
  } catch (error) {
    return {
      success: false,
      currentOperator: null,
      userShift: null,
      shiftPendingReview: false,
      error: adminActionError(error, "No se pudo verificar tu turno de caja."),
    };
  }
}

/**
 * 3. Procesar y registrar una venta de mostrador (POS) o Venta Administrativa
 */
export async function createSaleAction(input: SaleFormInput): Promise<{
  success: boolean;
  data?: {
    saleId: number;
    saleNumber: string;
    customerName: string;
    totalAmount: number;
    paymentMethod: string;
    cashGiven: number | null;
    changeGiven: number | null;
    createdAt: string;
    items: SaleTicketItem[];
  };
  error?: string;
  confirmationPending?: boolean;
}> {
  try {
    const operatingUser = await requireRole(POS_ROLES);
    const validation = saleFormSchema.safeParse(input);
    if (!validation.success) return { success: false, error: validation.error.issues[0]?.message };
    const parsed = validation.data;

    const checkoutFingerprint = parsed.checkoutRequestId
      ? createHash("sha256").update(JSON.stringify(parsed)).digest("hex")
      : undefined;

    async function recoverTicket() {
      if (!parsed.checkoutRequestId) return null;
      const sale = await db.query.sales.findFirst({
        where: (s, { and, eq }) => and(eq(s.userId, operatingUser.id), eq(s.checkoutRequestId, parsed.checkoutRequestId!)),
        with: { items: { with: { product: true }, orderBy: (item, { asc }) => [asc(item.id)] } },
      });
      if (!sale) return null;
      if (sale.checkoutFingerprint !== checkoutFingerprint) {
        return { success: false, error: "Este intento ya fue usado con otros datos." };
      }
      return {
        success: true,
        data: {
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          customerName: sale.customerName,
          totalAmount: Number(sale.totalAmount),
          paymentMethod: sale.paymentMethod,
          cashGiven: sale.cashGiven === null ? null : Number(sale.cashGiven),
          changeGiven: sale.changeGiven === null ? null : Number(sale.changeGiven),
          createdAt: formatBusinessTime(sale.createdAt),
          items: sale.items.map(item => ({
            id: item.id, productId: item.productId, productName: item.product ? productName(item.product) : "Producto",
            productSku: item.product?.sku ?? null, quantity: item.quantity,
            returnedQuantity: item.returnedQuantity, returnableQuantity: item.quantity - item.returnedQuantity,
            unitPrice: Number(item.unitPrice), subtotal: Number(item.subtotal),
          })),
        },
      };
    }

    async function rejectSale(error: string) {
      return await recoverTicket() ?? { success: false, error };
    }

    const previous = await recoverTicket();
    if (previous) return previous;

    let finalShiftId: number | null = null;
    let saleNotes = parsed.notes ? parsed.notes.trim() : null;

    if (parsed.isAdministrativeSale) {
      if (operatingUser.role !== "admin" && operatingUser.role !== "manager") {
        return await rejectSale("Acceso Denegado: Solo administradores y supervisores de tienda están facultados para emitir ventas administrativas directas fuera de caja.");
      }

      finalShiftId = null;
      const adminTag = "[Venta Administrativa Directa]";
      saleNotes = saleNotes ? `${adminTag} ${saleNotes}` : adminTag;
    } else {
      if (!parsed.cashShiftId) {
        return await rejectSale("Control de Caja: No cuentas con un turno de caja abierto. Debes aperturar una caja con tu fondo inicial antes de cobrar en mostrador.");
      }

      const shift = await db.query.cashShifts.findFirst({
        where: eq(schema.cashShifts.id, parsed.cashShiftId),
        with: {
          user: true,
          cashRegister: true,
        },
      });

      if (!shift || shift.status !== "open" || shift.actualCash !== null) {
        return await rejectSale("El turno de caja no está disponible para cobrar. Puede estar pendiente de aprobación o cerrado.");
      }

      if (shift.userId !== operatingUser.id) {
        const assignedName = shift.user?.name || "otro operador";
        const registerTitle = shift.cashRegister?.name || `Caja #${shift.cashRegisterId}`;
        return await rejectSale(`Acceso Denegado: La terminal "${registerTitle}" está asignada exclusivamente a "${assignedName}". Por control de arqueo y responsabilidad de fondos, no puedes emitir ventas en la gaveta de otro operador.`);
      }

      finalShiftId = shift.id;
    }

    const productIds = parsed.items.map((i) => i.productId);
    const dbProducts = await db.query.products.findMany({
      where: (p, { inArray }) => inArray(p.id, productIds),
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    for (const item of parsed.items) {
      const prod = productsMap.get(item.productId);
      if (!prod?.isActive) {
        return await rejectSale(`El producto ID #${item.productId} no fue encontrado en la base de datos.`);
      }
      if (Math.round(item.unitPrice * 100) !== Math.round(Number(prod.price) * 100)) {
        return await rejectSale(`El precio de "${productName(prod)}" cambió. Actualiza el catálogo.`);
      }
      item.unitPrice = Number(prod.price);
      if (prod.stock < item.quantity) {
        return await rejectSale(`Stock insuficiente para "${productName(prod)}". Solicitado: ${item.quantity}, Disponible: ${prod.stock}`);
      }
    }

    const subtotal = parsed.items.reduce((sum, item) => sum + item.quantity * Math.round(item.unitPrice * 100), 0) / 100;
    const discountAmount = Math.round(parsed.discountAmount * 100) / 100;
    if (discountAmount > subtotal || (discountAmount > 0 && operatingUser.role === "cashier")) {
      return await rejectSale("El descuento requiere autorización de un supervisor.");
    }
    const taxAmount = 0;
    const totalAmount = Math.round((subtotal - discountAmount + taxAmount) * 100) / 100;

    let cashGiven: number | null = null;
    let changeGiven: number | null = null;

    if (parsed.paymentMethod === "cash") {
      const given = parsed.cashGiven;
      if (given == null || Math.round(given * 100) < Math.round(totalAmount * 100)) {
        return await rejectSale("El efectivo recibido es insuficiente.");
      }
      cashGiven = given;
      changeGiven = Math.max(0, given - totalAmount);
    }

    const { rows } = await db.execute<{
      saleId: number; saleNumber: string; customerName: string; itemId: number; productId: number;
      productName: string; productSku: string | null; quantity: number; unitPrice: string; subtotal: string;
    }>(createSaleQuery({
      sale: parsed,
      operatorId: operatingUser.id,
      shiftId: finalShiftId,
      prefix: `VTA-${businessDate().slice(0, 4)}-`,
      subtotal,
      discount: discountAmount,
      total: totalAmount,
      cashGiven,
      changeGiven,
      notes: saleNotes,
      checkoutFingerprint,
    }));
    const newSale = rows[0];
    if (!newSale) {
      return await rejectSale("Cambió el turno, el precio o el stock. Actualiza la venta y vuelve a intentar.");
    }

    const ticketItems: SaleTicketItem[] = rows.map((row) => ({
      id: row.itemId,
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      quantity: row.quantity,
      returnedQuantity: 0,
      returnableQuantity: row.quantity,
      unitPrice: Number(row.unitPrice),
      subtotal: Number(row.subtotal),
    }));

    revalidateSalesPaths();

    return {
      success: true,
      data: {
        saleId: newSale.saleId,
        saleNumber: newSale.saleNumber,
        customerName: newSale.customerName,
        totalAmount,
        paymentMethod: parsed.paymentMethod,
        cashGiven,
        changeGiven,
        createdAt: formatBusinessTime(new Date()),
        items: ticketItems,
      },
    };
  } catch (error) {
    return {
      success: false,
      confirmationPending: Boolean(input?.checkoutRequestId),
      error: adminActionError(error, "Error al procesar el cobro de la venta."),
    };
  }
}

/**
 * 4. Obtiene el historial de ventas con filtros y desglose de Cajas vs Ventas Administrativas
 */
export async function getSalesHistoryAction(): Promise<{
  success: boolean;
  data: SaleHistoryItem[];
  kpis: SalesKpiSummary;
  error?: string;
}> {
  try {
    const user = await requireRole(POS_ROLES);
    const list = await db.query.sales.findMany({
      where: user.role === "cashier" ? eq(schema.sales.userId, user.id) : undefined,
      with: {
        user: true,
        customer: true,
        cashShift: {
          with: {
            cashRegister: true,
          },
        },
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const todayStr = businessDate();

    let totalRevenue = 0;
    let todayRevenue = 0;
    let completedCount = 0;
    let ticketsWithNetAmount = 0;
    let administrativeSalesCount = 0;
    let administrativeSalesRevenue = 0;
    let posShiftSalesCount = 0;
    let posShiftSalesRevenue = 0;

    const formatted: SaleHistoryItem[] = list.map((s) => {
      const totalNum = parseFloat(s.totalAmount) || 0;
      const isToday = businessDate(s.createdAt) === todayStr;
      const isAdministrative = !s.cashShiftId;

      const formattedDate = formatBusinessDateTime(s.createdAt);

      const formattedItems: SaleTicketItem[] = (s.items || []).map((it) => {
        const returnedQty = it.returnedQuantity || 0;
        return {
          id: it.id,
          productId: it.productId,
          productName: it.product ? productName(it.product) : "Producto",
          productSku: it.product?.sku || null,
          quantity: it.quantity,
          returnedQuantity: returnedQty,
          returnableQuantity: Math.max(0, it.quantity - returnedQty),
          unitPrice: parseFloat(it.unitPrice) || 0,
          subtotal: parseFloat(it.subtotal) || 0,
        };
      });

      const totalItemsCount = formattedItems.reduce((acc, i) => acc + i.quantity, 0);
      const persistedRefunded = parseFloat(s.refundedAmount || "0") || 0;
      const persistedNet =
        s.status === "cancelled"
          ? 0
          : s.netAmount !== null && s.netAmount !== undefined
          ? parseFloat(s.netAmount) || 0
          : Math.max(0, totalNum - persistedRefunded);

      if (s.status === "completed" || s.status === "refunded") {
        totalRevenue += persistedNet;
        completedCount += 1;
        if (persistedNet > 0) {
          ticketsWithNetAmount += 1;
        }
        if (isToday) {
          todayRevenue += persistedNet;
        }

        if (isAdministrative) {
          administrativeSalesCount += 1;
          administrativeSalesRevenue += persistedNet;
        } else {
          posShiftSalesCount += 1;
          posShiftSalesRevenue += persistedNet;
        }
      }

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customerName || s.customer?.name || "Público General",
        paymentMethod: s.paymentMethod,
        channel: s.channel,
        status: s.status,
        subtotal: parseFloat(s.subtotal) || 0,
        discountAmount: parseFloat(s.discountAmount) || 0,
        taxAmount: parseFloat(s.taxAmount) || 0,
        totalAmount: totalNum,
        refundedAmount: persistedRefunded,
        netAmount: persistedNet,
        cashGiven: s.cashGiven ? parseFloat(s.cashGiven) : null,
        changeGiven: s.changeGiven ? parseFloat(s.changeGiven) : null,
        notes: s.notes,
        cashierName: s.user?.name || "Cajero",
        userId: s.userId,
        userRole: s.user?.role,
        cashShiftId: s.cashShiftId,
        cashRegisterName: s.cashShift?.cashRegister?.name || null,
        shiftNumber: s.cashShift?.shiftNumber || null,
        isAdministrativeSale: isAdministrative,
        createdAt: formattedDate,
        rawCreatedAt: s.createdAt.toISOString(),
        itemsCount: totalItemsCount,
        items: formattedItems,
      };
    });

    const averageTicket = ticketsWithNetAmount > 0 ? totalRevenue / ticketsWithNetAmount : 0;

    return {
      success: true,
      data: formatted,
      kpis: {
        totalRevenue,
        todayRevenue,
        totalSalesCount: completedCount,
        averageTicket,
        administrativeSalesCount,
        administrativeSalesRevenue,
        posShiftSalesCount,
        posShiftSalesRevenue,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      kpis: {
        totalRevenue: 0,
        todayRevenue: 0,
        totalSalesCount: 0,
        averageTicket: 0,
        administrativeSalesCount: 0,
        administrativeSalesRevenue: 0,
        posShiftSalesCount: 0,
        posShiftSalesRevenue: 0,
      },
      error: adminActionError(error, "Error al leer historial de ventas."),
    };
  }
}

/**
 * 5. Anular una venta emitida
 */
export async function cancelSaleAction(
  saleId: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const operator = await requireRole(["admin", "manager"]);

    if (!Number.isSafeInteger(saleId) || saleId <= 0 ||
        (reason !== undefined && (typeof reason !== "string" || reason.length > 500))) {
      return { success: false, error: "Revisa los datos de la anulación." };
    }
    const { rows } = await db.execute(cancelSaleQuery(
      saleId, operator.id, reason?.trim() ? `Anulada: ${reason.trim()}` : "Venta anulada"
    ));
    if (!rows.length) {
      return { success: false, error: "La venta no se puede anular. Revisa su estado, devoluciones y turno original." };
    }

    revalidateSalesPaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al anular la venta y reponer inventario."),
    };
  }
}

export type RefundReceiptData = {
  refundNumber: string;
  saleNumber: string;
  customerName: string;
  refundAmount: number;
  refundMethod: string;
  supervisorName: string;
  processedByName: string;
  reason: string;
  createdAt: string;
  returnedItems: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

/**
 * 6. Procesar Devolución Parcial o Total de Productos sobre una Venta
 */
export async function refundSaleItemsAction(
  input: RefundSaleItemsInput
): Promise<{
  success: boolean;
  data?: RefundReceiptData;
  error?: string;
}> {
  try {
    const operator = await requireRole(POS_ROLES);
    input = refundSaleSchema.parse(input);

    const pinRateKey = `pin:${operator.id}`;
    const pinLimit = checkRateLimit(pinRateKey, PIN_MAX_ATTEMPTS, PIN_WINDOW_MS);
    if (!pinLimit.allowed) {
      return {
        success: false,
        error: "Demasiados intentos de PIN fallidos. Espera unos minutos antes de volver a intentar.",
      };
    }

    const supervisor = await db.query.users.findFirst({
      where: and(
        eq(schema.users.pin, encodeSupervisorPin(input.supervisorPin)),
        eq(schema.users.isActive, true),
        inArray(schema.users.role, ["admin", "manager"])
      ),
      columns: { id: true, name: true },
    });

    if (!supervisor) {
      recordFailedAttempt(pinRateKey, PIN_WINDOW_MS);
      return {
        success: false,
        error: "Acceso Denegado: PIN de autorización inválido o el usuario no posee rol de Administrador/Supervisor.",
      };
    }
    resetRateLimit(pinRateKey);

    const sale = await db.query.sales.findFirst({
      where: eq(schema.sales.id, input.saleId),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return { success: false, error: "La venta especificada no existe en la base de datos." };
    }

    if (sale.status !== "completed" && sale.status !== "refunded") {
      return { success: false, error: "Solo se pueden devolver productos de ventas cobradas." };
    }
    if (operator.role === "cashier" && sale.userId !== operator.id) {
      return { success: false, error: "Solo puedes devolver productos de tus propias ventas." };
    }

    const refundAmounts = refundUnitAmounts(sale.items, Number(sale.totalAmount));

    if (input.requestId) {
      const existingRefund = await db.query.saleRefunds.findFirst({
        where: eq(schema.saleRefunds.requestId, input.requestId),
        with: { user: true, authorizedByUser: true },
      });
      if (existingRefund) {
        if (existingRefund.saleId !== sale.id) {
          return { success: false, error: "Este identificador de devolución pertenece a otra venta." };
        }
        return {
          success: true,
          data: {
            refundNumber: `DEV-${businessDate(existingRefund.createdAt).slice(0, 4)}-${String(existingRefund.id).padStart(4, "0")}`,
            saleNumber: sale.saleNumber,
            customerName: sale.customerName || "Público General",
            refundAmount: Number(existingRefund.amount),
            refundMethod: existingRefund.refundMethod,
            supervisorName: existingRefund.authorizedByUser?.name || supervisor.name,
            processedByName: existingRefund.user?.name || operator.name,
            reason: existingRefund.reason,
            createdAt: formatBusinessTime(existingRefund.createdAt),
            returnedItems: input.items.map((ri) => {
              const orig = sale.items.find((it) => it.id === ri.saleItemId);
              const unitPrice = orig ? Number(orig.unitPrice) : 0;
              const startReturned = orig ? Math.max(0, orig.returnedQuantity - ri.quantityToRefund) : 0;
              const lineSub = orig
                ? (refundAmounts.get(orig.id)?.(startReturned, ri.quantityToRefund) ?? 0) / 100
                : 0;
              return {
                name: orig?.product ? productName(orig.product) : "Producto",
                quantity: ri.quantityToRefund,
                unitPrice,
                subtotal: lineSub,
              };
            }),
          },
        };
      }
    }

    let refundShiftId: number | null = null;
    let targetCashBalanceCents: number | null = null;

    if (input.refundMethod === "cash") {
      const targetShift = input.cashShiftId
        ? await db.query.cashShifts.findFirst({
            where: and(
              eq(schema.cashShifts.id, input.cashShiftId),
              eq(schema.cashShifts.status, "open"),
              isNull(schema.cashShifts.actualCash),
              eq(schema.cashShifts.userId, operator.id)
            ),
          })
        : null;
      if (!targetShift) {
        return { success: false, error: "El reembolso en efectivo requiere un turno propio abierto." };
      }
      refundShiftId = targetShift.id;
      targetCashBalanceCents = Math.round(Number(targetShift.expectedCash) * 100);
    } else if (sale.cashShiftId) {
      const originalOpenShift = await db.query.cashShifts.findFirst({
        where: and(
          eq(schema.cashShifts.id, sale.cashShiftId),
          eq(schema.cashShifts.status, "open"),
          isNull(schema.cashShifts.actualCash)
        ),
        columns: { id: true },
      });
      refundShiftId = originalOpenShift?.id ?? null;
    }

    const returnedItemsList: RefundReceiptData["returnedItems"] = [];
    const plannedItems = [];
    let totalRefundCents = 0;
    const originalTotalCents = Math.round(Number(sale.totalAmount) * 100);
    const previousRefundedCents = Math.round(Number(sale.refundedAmount ?? 0) * 100);

    for (const refundItem of input.items) {
      const originalItem = sale.items.find((item) => item.id === refundItem.saleItemId);
      if (!originalItem?.product) {
        return { success: false, error: "El renglón no corresponde a este ticket." };
      }

      const alreadyReturned = originalItem.returnedQuantity;
      const newReturned = alreadyReturned + refundItem.quantityToRefund;
      if (newReturned > originalItem.quantity) {
        return { success: false, error: `Cantidad disponible para devolver insuficiente: ${productName(originalItem.product)}.` };
      }

      const unitPrice = Number(originalItem.unitPrice);
      const refundCents = refundAmounts.get(originalItem.id)!(alreadyReturned, refundItem.quantityToRefund);
      totalRefundCents += refundCents;
      plannedItems.push({ refundItem, originalItem, newReturned, unitPrice, refundCents });
    }

    if (
      totalRefundCents + previousRefundedCents > originalTotalCents ||
      (targetCashBalanceCents !== null && totalRefundCents > targetCashBalanceCents)
    ) {
      return { success: false, error: "El reembolso supera el saldo disponible." };
    }
    const totalRefundAmount = totalRefundCents / 100;

    for (const { refundItem, originalItem, unitPrice, refundCents } of plannedItems) {
      returnedItemsList.push({
        name: originalItem.product ? productName(originalItem.product) : "Producto",
        quantity: refundItem.quantityToRefund,
        unitPrice,
        subtotal: refundCents / 100,
      });
    }

    const note = `Devolución de ${totalRefundAmount.toFixed(2)} autorizada por ${supervisor.name}, procesada por ${operator.name}: ${input.reason}`;
    const { rows } = await db.execute<{ id: number; refundId: number | null }>(refundSaleQuery({
      saleId: sale.id,
      operatorId: operator.id,
      supervisorId: supervisor.id,
      cashShiftId: refundShiftId,
      amount: totalRefundAmount,
      note,
      refundMethod: input.refundMethod,
      requestId: input.requestId ?? null,
      reason: input.reason,
      items: plannedItems.map(({ originalItem, refundItem }) => ({
        id: originalItem.id,
        returnedQuantity: originalItem.returnedQuantity,
        quantity: refundItem.quantityToRefund,
      })),
    }));
    if (!rows.length) {
      return { success: false, error: "Cambió la venta o el saldo de caja. Actualiza el ticket." };
    }

    const folioId = rows[0].refundId ?? sale.id;
    const refundNumber = `DEV-${businessDate().slice(0, 4)}-${String(folioId).padStart(4, "0")}`;

    revalidateSalesPaths();

    return {
      success: true,
      data: {
        refundNumber,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName || "Público General",
        refundAmount: totalRefundAmount,
        refundMethod: input.refundMethod,
        supervisorName: supervisor.name,
        processedByName: operator.name,
        reason: input.reason,
        createdAt: formatBusinessTime(new Date()),
        returnedItems: returnedItemsList,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al procesar la devolución de productos."),
    };
  }
}
