"use server";

import { productName } from "@/lib/product-name";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { approveCashCountQuery, openShiftQuery, submitCashCountQuery } from "@/db/operations/cash-shifts";
import {
  addBusinessDays,
  businessDate,
  businessDayStart,
  formatBusinessShortDateTime,
  formatBusinessTime,
} from "@/lib/business-date";
import { eq, and, count, or, ne, isNotNull, gte, lt, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";
import {
  openShiftSchema,
  closeShiftSchema,
  submitCashCountSchema,
  type SubmitCashCountInput,
  createCashRegisterSchema,
  type OpenShiftInput,
  type CloseShiftInput,
  type CreateCashRegisterInput,
} from "@/lib/validations/cash-shift";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

export type ActiveShiftDetail = {
  id: number;
  shiftNumber: string;
  cashRegisterId: number;
  cashRegisterName: string;
  cashRegisterCode: string;
  userId: number;
  cashierName: string;
  pendingReview: boolean;
  totals: { initialCash: number; cashSales: number; electronicSales: number } | null;
  review: { expectedCash: number; actualCash: number; difference: number } | null;
  openedAt: string;
  rawOpenedAt: string;
  notes: string | null;
};

export type CashRegisterItem = {
  id: number;
  name: string;
  code: string;
  location: string | null;
  isActive: boolean;
  activeShift: ActiveShiftDetail | null;
};

export type ClosedShiftItem = {
  id: number;
  shiftNumber: string;
  registerName: string;
  registerCode: string;
  cashierName: string;
  supervisorName: string;
  openedAt: string;
  closedAt: string;
  initialCash: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  otherSales: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  status: "balanced" | "surplus" | "shortage";
  notes: string | null;
};

export type CashKpisSummary = {
  activeInitialCash: number;
  todayCashSales: number;
  todayCardTransferSales: number;
  auditPrecisionPercent: number;
  activeShiftsCount: number;
  totalRegistersCount: number;
};

export type UserOption = {
  id: number;
  name: string;
  role: string;
};

/**
 * 1. Obtiene las cajas físicas, sus turnos activos y métricas financieras de hoy
 */
export async function getCashRegistersAndShiftsAction(): Promise<{
  success: boolean;
  registers: CashRegisterItem[];
  kpis: CashKpisSummary;
  users: UserOption[];
  error?: string;
}> {
  try {
    const operator = await requireRole(["admin", "manager", "cashier"]);
    const canReview = operator.role !== "cashier";

    const todayStart = businessDayStart(businessDate());
    const tomorrowStart = addBusinessDays(todayStart, 1);

    const [registersList, activeShiftsList, usersList, closedCountResult, todaySales, todayRefunds] =
      await Promise.all([
        db.query.cashRegisters.findMany({
          orderBy: (r, { asc }) => [asc(r.id)],
        }),
        db.query.cashShifts.findMany({
          where: eq(schema.cashShifts.status, "open"),
          with: {
            user: true,
            cashRegister: true,
          },
        }),
        db.query.users.findMany({
          where: eq(schema.users.isActive, true),
          columns: { id: true, name: true, role: true },
          orderBy: (u, { asc }) => [asc(u.name)],
        }),
        db
          .select({ count: count() })
          .from(schema.cashShifts)
          .where(eq(schema.cashShifts.status, "closed")),
        db.query.sales.findMany({
          where: and(
            gte(schema.sales.createdAt, todayStart),
            lt(schema.sales.createdAt, tomorrowStart),
            inArray(schema.sales.status, ["completed", "refunded"])
          ),
          columns: {
            id: true,
            totalAmount: true,
            refundedAmount: true,
            paymentMethod: true,
            cashShiftId: true,
          },
          with: {
            refunds: {
              columns: { id: true },
            },
          },
        }),
        db.query.saleRefunds.findMany({
          where: and(
            gte(schema.saleRefunds.createdAt, todayStart),
            lt(schema.saleRefunds.createdAt, tomorrowStart)
          ),
          columns: {
            amount: true,
            refundMethod: true,
            cashShiftId: true,
          },
        }),
      ]);

    const activeShiftsMap = new Map<number, typeof activeShiftsList[0]>();
    const hiddenOpenShiftIds = new Set<number>();
    for (const s of activeShiftsList) {
      activeShiftsMap.set(s.cashRegisterId, s);
      if (!canReview || (s.userId === operator.id && s.actualCash === null)) {
        hiddenOpenShiftIds.add(s.id);
      }
    }

    let activeInitialCash = 0;

    const formattedRegisters: CashRegisterItem[] = registersList.map((r) => {
      const active = activeShiftsMap.get(r.id);
      if (!active) {
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          location: r.location,
          isActive: r.isActive,
          activeShift: null,
        };
      }

      const initialNum = parseFloat(active.initialCash) || 0;
      const cashNum = parseFloat(active.cashSales) || 0;
      const cardNum = parseFloat(active.cardSales) || 0;
      const transferNum = parseFloat(active.transferSales) || 0;
      const otherNum = parseFloat(active.otherSales) || 0;
      const pendingReview = active.actualCash !== null;
      const showTotals = canReview && (active.userId !== operator.id || pendingReview);
      const expectedCash = Number(active.expectedCash);
      const actualCash = Number(active.actualCash);

      if (showTotals) {
        activeInitialCash += initialNum;
      }

      return {
        id: r.id,
        name: r.name,
        code: r.code,
        location: r.location,
        isActive: r.isActive,
        activeShift: {
          id: active.id,
          shiftNumber: active.shiftNumber,
          cashRegisterId: active.cashRegisterId,
          cashRegisterName: r.name,
          cashRegisterCode: r.code,
          userId: active.userId,
          cashierName: active.user?.name || "Cajero",
          pendingReview,
          totals: showTotals
            ? { initialCash: initialNum, cashSales: cashNum, electronicSales: cardNum + transferNum + otherNum }
            : null,
          review: canReview && pendingReview
            ? {
                expectedCash,
                actualCash,
                difference: Number((actualCash - expectedCash).toFixed(2)),
              }
            : null,
          openedAt: formatBusinessShortDateTime(active.openedAt),
          rawOpenedAt: active.openedAt.toISOString(),
          notes: active.notes,
        },
      };
    });

    let todayCashSales = 0;
    let todayCardTransferSales = 0;

    if (canReview) {
      for (const s of todaySales) {
        if (s.cashShiftId && hiddenOpenShiftIds.has(s.cashShiftId)) continue;
        const gross = parseFloat(s.totalAmount) || 0;
        const legacyRef = s.refunds.length === 0 ? parseFloat(s.refundedAmount || "0") || 0 : 0;
        const contribution = Math.max(0, gross - legacyRef);
        if (s.paymentMethod === "cash") {
          todayCashSales += contribution;
        } else {
          todayCardTransferSales += contribution;
        }
      }
      for (const r of todayRefunds) {
        if (r.cashShiftId && hiddenOpenShiftIds.has(r.cashShiftId)) continue;
        const amount = parseFloat(r.amount) || 0;
        if (r.refundMethod === "cash") {
          todayCashSales -= amount;
        } else {
          todayCardTransferSales -= amount;
        }
      }
      todayCashSales = Math.max(0, todayCashSales);
      todayCardTransferSales = Math.max(0, todayCardTransferSales);
    }

    const totalClosed = closedCountResult[0]?.count || 0;
    let auditPrecisionPercent = 100;

    if (totalClosed > 0) {
      const balancedCountResult = await db
        .select({ count: count() })
        .from(schema.cashShifts)
        .where(
          and(
            eq(schema.cashShifts.status, "closed"),
            eq(schema.cashShifts.difference, "0.00")
          )
        );
      const balancedCount = balancedCountResult[0]?.count || 0;
      auditPrecisionPercent = Math.round((balancedCount / totalClosed) * 100);
    }

    return {
      success: true,
      registers: formattedRegisters,
      kpis: {
        activeInitialCash,
        todayCashSales,
        todayCardTransferSales,
        auditPrecisionPercent,
        activeShiftsCount: activeShiftsList.length,
        totalRegistersCount: registersList.length,
      },
      users: usersList,
    };
  } catch (error) {
    return {
      success: false,
      registers: [],
      kpis: {
        activeInitialCash: 0,
        todayCashSales: 0,
        todayCardTransferSales: 0,
        auditPrecisionPercent: 100,
        activeShiftsCount: 0,
        totalRegistersCount: 0,
      },
      users: [],
      error: adminActionError(error, "Error al cargar datos de cajas."),
    };
  }
}

/**
 * 2. Obtiene el historial de turnos cerrados (arqueos conciliados)
 */
export async function getClosedShiftsHistoryAction(): Promise<{
  success: boolean;
  data: ClosedShiftItem[];
  error?: string;
}> {
  try {
    const operator = await requireRole(["admin", "manager", "cashier"]);

    const list = await db.query.cashShifts.findMany({
      where: and(
        eq(schema.cashShifts.status, "closed"),
        operator.role === "cashier" ? eq(schema.cashShifts.userId, operator.id) : undefined
      ),
      with: {
        cashRegister: true,
        user: true,
        closedByUser: true,
      },
      orderBy: (s, { desc }) => [desc(s.closedAt)],
    });

    const formatted: ClosedShiftItem[] = list.map((s) => {
      const diffNum = parseFloat(s.difference || "0") || 0;
      let status: "balanced" | "surplus" | "shortage" = "balanced";
      if (Math.abs(diffNum) < 0.01) {
        status = "balanced";
      } else if (diffNum > 0) {
        status = "surplus";
      } else {
        status = "shortage";
      }

      return {
        id: s.id,
        shiftNumber: s.shiftNumber,
        registerName: s.cashRegister?.name || "Caja Desconocida",
        registerCode: s.cashRegister?.code || "POS",
        cashierName: s.user?.name || "Cajero",
        supervisorName: s.closedByUser?.name || "Administrador",
        openedAt: formatBusinessShortDateTime(s.openedAt),
        closedAt: s.closedAt ? formatBusinessShortDateTime(s.closedAt) : "Sin registrar",
        initialCash: parseFloat(s.initialCash) || 0,
        cashSales: parseFloat(s.cashSales) || 0,
        cardSales: parseFloat(s.cardSales) || 0,
        transferSales: parseFloat(s.transferSales) || 0,
        otherSales: parseFloat(s.otherSales) || 0,
        expectedCash: parseFloat(s.expectedCash) || 0,
        actualCash: parseFloat(s.actualCash || "0") || 0,
        difference: diffNum,
        status,
        notes: s.notes,
      };
    });

    return {
      success: true,
      data: formatted,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: adminActionError(error, "Error al cargar arqueos pasados."),
    };
  }
}

/**
 * 3. Apertura de un nuevo turno de caja con fondo inicial
 */
export async function openShiftAction(input: OpenShiftInput): Promise<{
  success: boolean;
  data?: typeof schema.cashShifts.$inferSelect;
  error?: string;
}> {
  try {
    const sessionUser = await requireRole(["admin", "manager", "cashier"]);
    const parsed = openShiftSchema.parse(input);
    const effectiveUserId =
      sessionUser.role === "cashier" ? sessionUser.id : parsed.userId || sessionUser.id;

    const { rows: [newShift] } = await db.execute<typeof schema.cashShifts.$inferSelect>(
      openShiftQuery({
        cashRegisterId: parsed.cashRegisterId,
        userId: effectiveUserId,
        initialCash: parsed.initialCash,
        notes: parsed.notes || null,
        prefix: `TURNO-${businessDate().slice(0, 4)}-`,
      })
    );

    if (!newShift) {
      const [existingOpen, userActiveShift] = await Promise.all([
        db.query.cashShifts.findFirst({
          where: and(
            eq(schema.cashShifts.cashRegisterId, parsed.cashRegisterId),
            eq(schema.cashShifts.status, "open")
          ),
        }),
        db.query.cashShifts.findFirst({
          where: and(
            eq(schema.cashShifts.userId, effectiveUserId),
            eq(schema.cashShifts.status, "open")
          ),
        }),
      ]);

      if (existingOpen) {
        return {
          success: false,
          error: `La terminal ya tiene el turno "${existingOpen.shiftNumber}" abierto. Debes cerrarlo antes de iniciar otro.`,
        };
      }
      if (userActiveShift) {
        return {
          success: false,
          error: `El operador ya tiene un turno abierto activo (${userActiveShift.shiftNumber}). Debe cerrarlo mediante arqueo antes de aperturar otra gaveta.`,
        };
      }
      return { success: false, error: "La caja o el operador no están habilitados." };
    }

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin");

    return { success: true, data: newShift };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      return {
        success: false,
        error: "La terminal o el operador ya tienen un turno abierto.",
      };
    }
    return {
      success: false,
      error: adminActionError(error, "Error al abrir turno de caja."),
    };
  }
}

/**
 * 4. Cierre de turno y arqueo ciego de caja
 */
export async function submitCashCountAction(input: SubmitCashCountInput) {
  try {
    const operator = await requireRole(["admin", "manager", "cashier"]);
    const { shiftId, actualCash } = submitCashCountSchema.parse(input);
    const result = await db.execute(submitCashCountQuery(shiftId, operator.id, actualCash.toFixed(2)));
    if (!result.rows.length) {
      return { success: false, error: "Solo puedes enviar una vez el conteo de tu turno abierto." };
    }

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al guardar el conteo físico.") };
  }
}

export async function closeShiftAction(input: CloseShiftInput) {
  try {
    const supervisor = await requireRole(["admin", "manager"]);
    const { shiftId, notes } = closeShiftSchema.parse(input);
    const result = await db.execute(approveCashCountQuery(shiftId, supervisor.id, notes || null));
    if (!result.rows.length) {
      return { success: false, error: "El turno ya no está pendiente de aprobación o falta explicar la diferencia." };
    }

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/reportes");
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al aprobar el cierre.") };
  }
}

/**
 * 5. Crear una nueva terminal / caja física
 */
export async function createCashRegisterAction(
  input: CreateCashRegisterInput
): Promise<{
  success: boolean;
  data?: typeof schema.cashRegisters.$inferSelect;
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager"]);

    const parsed = createCashRegisterSchema.parse(input);

    const existingCode = await db.query.cashRegisters.findFirst({
      where: eq(schema.cashRegisters.code, parsed.code),
    });

    if (existingCode) {
      return {
        success: false,
        error: `Ya existe una caja con el código "${parsed.code}". Elige otro identificador.`,
      };
    }

    const [newReg] = await db
      .insert(schema.cashRegisters)
      .values({
        name: parsed.name,
        code: parsed.code,
        location: parsed.location || null,
        isActive: true,
      })
      .returning();

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");

    return { success: true, data: newReg };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al registrar la nueva caja física."),
    };
  }
}

export type ShiftSaleTicketItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ShiftSaleDetail = {
  id: number;
  saleNumber: string;
  customerName: string;
  paymentMethod: "cash" | "card" | "transfer" | "other";
  status: "completed" | "refunded" | "cancelled";
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  refundedAmount: number;
  netAmount: number;
  createdAt: string;
  cashierName: string;
  itemsCount: number;
  items: ShiftSaleTicketItem[];
};

/**
 * 6. Obtiene la lista completa de ventas y productos cobrados exclusivamente en un turno
 */
export async function getShiftSalesAction(shiftId: number): Promise<{
  success: boolean;
  sales: ShiftSaleDetail[];
  totalRevenue: number;
  cashSalesTotal: number;
  electronicSalesTotal: number;
  ticketsCount: number;
  error?: string;
}> {
  try {
    const user = await requireRole(["admin", "manager", "cashier"]);
    const shift = await db.query.cashShifts.findFirst({
      where: and(
        eq(schema.cashShifts.id, shiftId),
        user.role === "cashier"
          ? and(eq(schema.cashShifts.userId, user.id), eq(schema.cashShifts.status, "closed"))
          : or(
              ne(schema.cashShifts.userId, user.id),
              eq(schema.cashShifts.status, "closed"),
              isNotNull(schema.cashShifts.actualCash)
            )
      ),
      columns: {
        id: true,
        cashSales: true,
        cardSales: true,
        transferSales: true,
        otherSales: true,
      },
    });
    if (!shift) {
      return {
        success: false,
        sales: [],
        totalRevenue: 0,
        cashSalesTotal: 0,
        electronicSalesTotal: 0,
        ticketsCount: 0,
        error: "Los tickets del arqueo estarán disponibles cuando tengas permiso para revisar el turno.",
      };
    }

    const list = await db.query.sales.findMany({
      where: eq(schema.sales.cashShiftId, shiftId),
      with: {
        user: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const cashSalesTotal = parseFloat(shift.cashSales) || 0;
    const electronicSalesTotal =
      (parseFloat(shift.cardSales) || 0) +
      (parseFloat(shift.transferSales) || 0) +
      (parseFloat(shift.otherSales) || 0);
    const totalRevenue = cashSalesTotal + electronicSalesTotal;
    let ticketsCount = 0;

    const formatted: ShiftSaleDetail[] = list.map((s) => {
      const totalNum = parseFloat(s.totalAmount) || 0;
      const refundedNum = parseFloat(s.refundedAmount || "0") || 0;
      const netNum =
        s.status === "cancelled"
          ? 0
          : s.netAmount !== null && s.netAmount !== undefined
          ? parseFloat(s.netAmount) || 0
          : Math.max(0, totalNum - refundedNum);

      if (s.status === "completed" || s.status === "refunded") {
        ticketsCount += 1;
      }

      const formattedItems: ShiftSaleTicketItem[] = (s.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product ? productName(it.product) : "Producto",
        quantity: it.quantity,
        unitPrice: parseFloat(it.unitPrice) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
      }));

      const itemsCount = formattedItems.reduce((acc, it) => acc + it.quantity, 0);

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customerName || "Público General",
        paymentMethod: s.paymentMethod,
        status: s.status === "refunded" ? "refunded" : s.status === "cancelled" ? "cancelled" : "completed",
        subtotal: parseFloat(s.subtotal) || 0,
        discountAmount: parseFloat(s.discountAmount) || 0,
        totalAmount: totalNum,
        refundedAmount: refundedNum,
        netAmount: netNum,
        createdAt: formatBusinessTime(s.createdAt),
        cashierName: s.user?.name || "Cajero",
        itemsCount,
        items: formattedItems,
      };
    });

    return {
      success: true,
      sales: formatted,
      totalRevenue,
      cashSalesTotal,
      electronicSalesTotal,
      ticketsCount,
    };
  } catch (error) {
    return {
      success: false,
      sales: [],
      totalRevenue: 0,
      cashSalesTotal: 0,
      electronicSalesTotal: 0,
      ticketsCount: 0,
      error: adminActionError(error, "Error al obtener las ventas de este turno."),
    };
  }
}
