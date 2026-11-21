"use server";

import { productName } from "@/lib/product-name";

import { createHash } from "node:crypto";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cancelSaleQuery, createSaleQuery, refundSaleQuery } from "@/db/operations/sales";
import * as schema from "@/db/schema";
import { isNull, eq, desc, and, inArray, or } from "drizzle-orm";
import { saleFormSchema, refundSaleSchema, type SaleFormInput, type RefundSaleItemsInput } from "@/lib/validations/sale";
import { businessDate } from "@/lib/business-date";
import { refundUnitAmounts } from "@/lib/refund-amount";
import { demoSupervisorEmails, isDemoLoginEnabled } from "@/lib/auth/demo-login";
import { encodeSupervisorPin } from "@/lib/auth/supervisor-pin";
import { requireRole } from "@/lib/auth/session";

const POS_ROLES: ("admin" | "manager" | "cashier")[] = ["admin", "manager", "cashier"];

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
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
  cashRegisterId: number;
  cashRegisterName: string;
  cashRegisterCode: string;
  userId: number;
  cashierName: string;
  cashierRole: string;
  initialCash: number;
  openedAt: string;
};

export type PosUserItem = {
  id: number;
  name: string;
  role: string;
  email: string;
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
    await requireRole(POS_ROLES);
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
      const minStock = p.minStock || 5;

      const status: "in_stock" | "low_stock" | "out_of_stock" =
        stock <= 0 ? "out_of_stock" : stock <= minStock ? "low_stock" : "in_stock";

      return {
        id: p.id,
        name: productName(p),
        sku: p.sku || `SKU-${p.id}`,
        barcode: p.barcode || "",
        category: categoryName,
        price: parseFloat(p.price) || 0,
        costPrice: parseFloat(p.costPrice) || 0,
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

/**
 * 2. Obtiene el contexto completo de POS:
 * - Operador seleccionado y usuarios del sistema
 * - Turnos de caja activos y terminales
 * - Turno específico asignado al operador en curso
 */
export async function getPosContextAction(): Promise<{
  success: boolean;
  users: PosUserItem[];
  currentOperator: PosUserItem | null;
  allOpenShifts: PosShiftItem[];
  userShift: PosShiftItem | null;
  shiftPendingReview: boolean;
  error?: string;
}> {
  try {
    const currentOperator = await requireRole(POS_ROLES);
    const allUsers = await db.query.users.findMany({
      where: (users, { and, eq }) => and(
        eq(users.isActive, true),
        currentOperator.role === "cashier" ? eq(users.id, currentOperator.id) : undefined
      ),
      columns: { id: true, name: true, role: true, email: true },
      orderBy: (u, { asc }) => [asc(u.id)],
    });

    const activeUsers: PosUserItem[] = allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
    }));

    const openShifts = await db.query.cashShifts.findMany({
      where: eq(schema.cashShifts.status, "open"),
      with: {
        cashRegister: true,
        user: true,
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const formattedShifts: PosShiftItem[] = openShifts.filter(s => s.actualCash === null).map((s) => ({
      id: s.id,
      shiftNumber: s.shiftNumber,
      cashRegisterId: s.cashRegisterId,
      cashRegisterName: s.cashRegister?.name || `Caja #${s.cashRegisterId}`,
      cashRegisterCode: s.cashRegister?.code || "CAJA",
      userId: s.userId,
      cashierName: s.user?.name || "Operador",
      cashierRole: s.user?.role || "cashier",
      initialCash: parseFloat(s.initialCash) || 0,
      openedAt: s.openedAt.toISOString(),
    }));

    const userShift = formattedShifts.find((shift) => shift.userId === currentOperator.id) ?? null;

    return {
      success: true,
      users: activeUsers,
      currentOperator,
      allOpenShifts: formattedShifts,
      userShift,
      shiftPendingReview: openShifts.some(s => s.userId === currentOperator.id && s.actualCash !== null),
    };
  } catch (error) {
    return {
      success: false,
      users: [],
      currentOperator: null,
      allOpenShifts: [],
      userShift: null,
      shiftPendingReview: false,
      error: adminActionError(error, "Error al cargar contexto POS."),
    };
  }
}

/**
 * 3. Procesar y registrar una venta de mostrador (POS) o Venta Administrativa
 * Aplica reglas estrictas de control de caja y retail:
 * - Regla 1: Todo cobro de mostrador exige turno de caja abierto
 * - Regla 2: Exclusividad de caja (ningún usuario puede vender en la caja de otro operador)
 * - Regla 3: El Admin debe abrir su propia caja o emitir "Venta Administrativa Directa"
 * - Valida existencias físicas en tiempo real
 * - Descuenta stock y asienta Kardex
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
          createdAt: sale.createdAt.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
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

    // APLICACIÓN DE REGLAS DE NEGOCIO DE CAJA
    if (parsed.isAdministrativeSale) {
      // Regla 3b: Venta Administrativa Directa (fuera de caja)
      // Solo permitida para perfiles de Admin o Supervisor
      if (operatingUser.role !== "admin" && operatingUser.role !== "manager") {
        return await rejectSale("Acceso Denegado: Solo administradores y supervisores de tienda están facultados para emitir ventas administrativas directas fuera de caja.");
      }

      finalShiftId = null;
      const adminTag = "[Venta Administrativa Directa]";
      saleNotes = saleNotes ? `${adminTag} ${saleNotes}` : adminTag;
    } else {
      // Regla 1: Venta POS de mostrador exige turno de caja abierto asignado
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

      // Regla 2: Exclusividad de caja (Anti Cross-Cashier Selling)
      if (shift.userId !== operatingUser.id) {
        const assignedName = shift.user?.name || "otro operador";
        const registerTitle = shift.cashRegister?.name || `Caja #${shift.cashRegisterId}`;
        return await rejectSale(`Acceso Denegado: La terminal "${registerTitle}" está asignada exclusivamente a "${assignedName}". Por control de arqueo y responsabilidad de fondos, no puedes emitir ventas en la gaveta de otro operador.`);
      }

      finalShiftId = shift.id;
    }

    // 1. Validar existencias físicas en tiempo real para todos los ítems
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
        return await rejectSale(`El precio de "${prod.name}" cambió. Actualiza el catálogo.`);
      }
      item.unitPrice = Number(prod.price);
      if (prod.stock < item.quantity) {
        return await rejectSale(`Stock insuficiente para "${prod.name}". Solicitado: ${item.quantity}, Disponible: ${prod.stock}`);
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

    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/cajas");

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
        createdAt: new Date().toLocaleTimeString("es-BO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
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

    const now = new Date();
    const todayStr = businessDate(now);

    let totalRevenue = 0;
    let todayRevenue = 0;
    let completedCount = 0;
    let administrativeSalesCount = 0;
    let administrativeSalesRevenue = 0;
    let posShiftSalesCount = 0;
    let posShiftSalesRevenue = 0;

    const formatted: SaleHistoryItem[] = list.map((s) => {
      const totalNum = parseFloat(s.totalAmount) || 0;
      const sDate = new Date(s.createdAt);
      const isToday = businessDate(sDate) === todayStr;
      const isAdministrative =
        !s.cashShiftId || (s.notes?.includes("[Venta Administrativa Directa]") ?? false);

      const formattedDate = sDate.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const formattedItems: SaleTicketItem[] = (s.items || []).map((it) => {
        const returnedQty = (it as any).returnedQuantity || 0;
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
      const totalReturnedAmount = formattedItems.reduce(
        (acc, i) => acc + (i.returnedQuantity * i.unitPrice),
        0
      );
      const netAmount = Math.max(0, totalNum - totalReturnedAmount);

      if (s.status === "completed" || s.status === "refunded") {
        totalRevenue += netAmount;
        completedCount += 1;
        if (isToday) {
          todayRevenue += netAmount;
        }

        if (isAdministrative) {
          administrativeSalesCount += 1;
          administrativeSalesRevenue += netAmount;
        } else {
          posShiftSalesCount += 1;
          posShiftSalesRevenue += netAmount;
        }
      }

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customerName || "Público General",
        paymentMethod: s.paymentMethod as "cash" | "card" | "transfer" | "other",
        channel: s.channel as "pos" | "online",
        status: s.status as "completed" | "pending" | "cancelled" | "refunded",
        subtotal: parseFloat(s.subtotal) || 0,
        discountAmount: parseFloat(s.discountAmount) || 0,
        taxAmount: parseFloat(s.taxAmount) || 0,
        totalAmount: totalNum,
        refundedAmount: totalReturnedAmount,
        netAmount,
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

    const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

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
 * - Reintegra el stock al inventario
 * - Asienta Kardex (movementType: "return_in")
 * - Cambia estado a "cancelled"
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

    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/cajas");

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
 * - Valida PIN de autorización de Administrador o Supervisor
 * - Reintegra solo los ítems seleccionados al inventario físico
 * - Asienta en Kardex el movimiento inmutable tipo "return_in"
 * - Actualiza returnedQuantity en saleItems y estado de venta ("refunded")
 * - Si es reembolso en efectivo, descuenta de la gaveta activa (expectedCash)
 * - Emite comprobante / vale de devolución
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
    const supervisor = await db.query.users.findFirst({
      where: and(
        or(
          eq(schema.users.pin, encodeSupervisorPin(input.supervisorPin)),
          isDemoLoginEnabled()
            ? and(inArray(schema.users.email, demoSupervisorEmails), eq(schema.users.pin, input.supervisorPin))
            : undefined
        ),
        eq(schema.users.isActive, true),
        inArray(schema.users.role, ["admin", "manager"])
      ),
      columns: { id: true, name: true },
    });

    if (!supervisor) {
      return {
        success: false,
        error: "Acceso Denegado: PIN de autorización inválido o el usuario no posee rol de Administrador/Supervisor.",
      };
    }

    // 2. Obtener la venta original y sus productos
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

    const targetShift = input.refundMethod === "cash" && input.cashShiftId
      ? await db.query.cashShifts.findFirst({
          where: and(
            eq(schema.cashShifts.id, input.cashShiftId),
            eq(schema.cashShifts.status, "open"),
            isNull(schema.cashShifts.actualCash),
            eq(schema.cashShifts.userId, operator.id)
          ),
        })
      : null;
    if (input.refundMethod === "cash" && !targetShift) {
      return { success: false, error: "El reembolso en efectivo requiere un turno propio abierto." };
    }

    const returnedItemsList: RefundReceiptData["returnedItems"] = [];
    const plannedItems = [];
    let totalRefundCents = 0;
    const originalTotalCents = Math.round(Number(sale.totalAmount) * 100);
    const refundAmounts = refundUnitAmounts(sale.items, Number(sale.totalAmount));
    const previousRefundedCents = Math.round(Number(sale.refundedAmount ?? 0) * 100);

    for (const refundItem of input.items) {
      const originalItem = sale.items.find((item) => item.id === refundItem.saleItemId);
      if (!originalItem?.product) {
        return { success: false, error: "El renglón no corresponde a este ticket." };
      }

      const alreadyReturned = originalItem.returnedQuantity;
      const newReturned = alreadyReturned + refundItem.quantityToRefund;
      if (newReturned > originalItem.quantity) {
        return { success: false, error: `Cantidad disponible para devolver insuficiente: ${originalItem.product.name}.` };
      }

      const unitPrice = Number(originalItem.unitPrice);
      const refundCents = refundAmounts.get(originalItem.id)!(alreadyReturned, refundItem.quantityToRefund);
      totalRefundCents += refundCents;
      plannedItems.push({ refundItem, originalItem, newReturned, unitPrice, refundCents });
    }

    if (totalRefundCents + previousRefundedCents > originalTotalCents ||
        (targetShift && totalRefundCents > Math.round(Number(targetShift.expectedCash) * 100))) {
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
    const { rows } = await db.execute(refundSaleQuery({
      saleId: sale.id,
      operatorId: operator.id,
      supervisorId: supervisor.id,
      cashShiftId: targetShift?.id ?? null,
      amount: totalRefundAmount,
      note,
      items: plannedItems.map(({ originalItem, refundItem }) => ({
        id: originalItem.id,
        returnedQuantity: originalItem.returnedQuantity,
        quantity: refundItem.quantityToRefund,
      })),
    }));
    if (!rows.length) {
      return { success: false, error: "Cambió la venta o el saldo de caja. Actualiza el ticket." };
    }

    const refundNumber = `DEV-${new Date().getFullYear()}-${String(sale.id).padStart(4, "0")}`;

    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/cajas");

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
        createdAt: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
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
