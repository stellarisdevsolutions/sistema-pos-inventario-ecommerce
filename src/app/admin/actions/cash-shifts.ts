"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import {
  openShiftSchema,
  closeShiftSchema,
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
  initialCash: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  expectedCash: number;
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
    await requireRole(["admin", "manager", "cashier"]);

    // 1. Obtener cajas físicas registradas
    const registersList = await db.query.cashRegisters.findMany({
      orderBy: (r, { asc }) => [asc(r.id)],
    });

    // 2. Obtener turnos abiertos actualmente
    const activeShiftsList = await db.query.cashShifts.findMany({
      where: eq(schema.cashShifts.status, "open"),
      with: {
        user: true,
        cashRegister: true,
      },
    });

    const activeShiftsMap = new Map<number, typeof activeShiftsList[0]>();
    for (const s of activeShiftsList) {
      activeShiftsMap.set(s.cashRegisterId, s);
    }

    let activeInitialCash = 0;
    let todayCashSales = 0;
    let todayCardTransferSales = 0;

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
      const expectedNum = parseFloat(active.expectedCash) || (initialNum + cashNum);

      activeInitialCash += initialNum;
      todayCashSales += cashNum;
      todayCardTransferSales += (cardNum + transferNum);

      const openedDate = new Date(active.openedAt);
      const formattedDate = openedDate.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

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
          initialCash: initialNum,
          cashSales: cashNum,
          cardSales: cardNum,
          transferSales: transferNum,
          expectedCash: expectedNum,
          openedAt: formattedDate,
          rawOpenedAt: active.openedAt.toISOString(),
          notes: active.notes,
        },
      };
    });

    // 3. Obtener lista de usuarios para asignar cajeros y supervisores
    const usersList = await db.query.users.findMany({
      where: eq(schema.users.isActive, true),
      columns: { id: true, name: true, role: true },
      orderBy: (u, { asc }) => [asc(u.name)],
    });

    // 4. Calcular precisión de arqueos cerrados históricos
    const closedCountResult = await db
      .select({ count: count() })
      .from(schema.cashShifts)
      .where(eq(schema.cashShifts.status, "closed"));

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
  } catch (error: any) {
    console.error("Error al obtener cajas y turnos:", error);
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
      error: error.message || "Error al cargar datos de cajas.",
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
    await requireRole(["admin", "manager", "cashier"]);

    const list = await db.query.cashShifts.findMany({
      where: eq(schema.cashShifts.status, "closed"),
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

      const openedDate = new Date(s.openedAt).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const closedDate = s.closedAt
        ? new Date(s.closedAt).toLocaleDateString("es-BO", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Sin registrar";

      return {
        id: s.id,
        shiftNumber: s.shiftNumber,
        registerName: s.cashRegister?.name || "Caja Desconocida",
        registerCode: s.cashRegister?.code || "POS",
        cashierName: s.user?.name || "Cajero",
        supervisorName: s.closedByUser?.name || "Administrador",
        openedAt: openedDate,
        closedAt: closedDate,
        initialCash: parseFloat(s.initialCash) || 0,
        cashSales: parseFloat(s.cashSales) || 0,
        cardSales: parseFloat(s.cardSales) || 0,
        transferSales: parseFloat(s.transferSales) || 0,
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
  } catch (error: any) {
    console.error("Error al obtener historial de arqueos:", error);
    return {
      success: false,
      data: [],
      error: error.message || "Error al cargar arqueos pasados.",
    };
  }
}

/**
 * 3. Apertura de un nuevo turno de caja con fondo inicial
 */
export async function openShiftAction(input: OpenShiftInput): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const parsed = openShiftSchema.parse(input);

    const sessionUser = await getCurrentUser();
    const effectiveUserId =
      sessionUser && sessionUser.role === "cashier"
        ? sessionUser.id
        : parsed.userId || sessionUser?.id || 1;

    // 1. Verificar si la caja ya cuenta con un turno abierto
    const existingOpen = await db.query.cashShifts.findFirst({
      where: and(
        eq(schema.cashShifts.cashRegisterId, parsed.cashRegisterId),
        eq(schema.cashShifts.status, "open")
      ),
    });

    if (existingOpen) {
      return {
        success: false,
        error: `La terminal ya tiene el turno "${existingOpen.shiftNumber}" abierto. Debes cerrarlo antes de iniciar otro.`,
      };
    }

    // 1b. Verificar si el operador ya tiene otra caja abierta asignada
    const userActiveShift = await db.query.cashShifts.findFirst({
      where: and(
        eq(schema.cashShifts.userId, effectiveUserId),
        eq(schema.cashShifts.status, "open")
      ),
    });

    if (userActiveShift) {
      return {
        success: false,
        error: `El operador ya tiene un turno abierto activo (${userActiveShift.shiftNumber}). Debe cerrarlo mediante arqueo antes de aperturar otra gaveta.`,
      };
    }

    // 2. Generar correlativo secuencial TURNO-YYYY-XXXX
    const countResult = await db.select({ total: count() }).from(schema.cashShifts);
    const nextNumber = (countResult[0]?.total || 0) + 1;
    const year = new Date().getFullYear();
    const shiftNumber = `TURNO-${year}-${String(nextNumber).padStart(3, "0")}`;

    // 3. Insertar el nuevo turno
    const [newShift] = await db
      .insert(schema.cashShifts)
      .values({
        shiftNumber,
        cashRegisterId: parsed.cashRegisterId,
        userId: effectiveUserId,
        initialCash: parsed.initialCash.toFixed(2),
        cashSales: "0.00",
        cardSales: "0.00",
        transferSales: "0.00",
        expectedCash: parsed.initialCash.toFixed(2), // Inicialmente el fondo esperado es el fondo inicial
        status: "open",
        notes: parsed.notes || null,
      })
      .returning();

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin");

    return { success: true, data: newShift };
  } catch (error: any) {
    console.error("Error al abrir turno de caja:", error);
    return {
      success: false,
      error: error.message || "Error al abrir turno de caja.",
    };
  }
}

/**
 * 4. Cierre de turno y arqueo ciego de caja
 * - Calcula diferencia exacta entre efectivo contado vs efectivo esperado (Fondo + Ventas efectivo)
 * - Registra la firma y observación del supervisor
 * - Archiva el turno como "closed"
 */
export async function closeShiftAction(input: CloseShiftInput): Promise<{
  success: boolean;
  data?: {
    shiftNumber: string;
    expectedCash: number;
    actualCash: number;
    difference: number;
    status: "balanced" | "surplus" | "shortage";
  };
  error?: string;
}> {
  try {
    const parsed = closeShiftSchema.parse(input);
    const sessionUser = await getCurrentUser();

    const shift = await db.query.cashShifts.findFirst({
      where: eq(schema.cashShifts.id, parsed.shiftId),
    });

    if (!shift) {
      return { success: false, error: "El turno especificado no existe." };
    }

    if (shift.status === "closed") {
      return { success: false, error: "Este turno ya se encuentra cerrado y arqueado." };
    }

    const expectedCashNum = parseFloat(shift.expectedCash) || 0;
    const actualCashNum = parsed.actualCash;
    const differenceNum = parseFloat((actualCashNum - expectedCashNum).toFixed(2));

    let status: "balanced" | "surplus" | "shortage" = "balanced";
    if (Math.abs(differenceNum) < 0.01) {
      status = "balanced";
    } else if (differenceNum > 0) {
      status = "surplus";
    } else {
      status = "shortage";
    }

    await db
      .update(schema.cashShifts)
      .set({
        actualCash: actualCashNum.toFixed(2),
        difference: differenceNum.toFixed(2),
        closedByUserId: sessionUser ? sessionUser.id : (parsed.closedByUserId || shift.userId),
        closedAt: new Date(),
        status: "closed",
        notes: parsed.notes || shift.notes,
      })
      .where(eq(schema.cashShifts.id, parsed.shiftId));

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin");

    return {
      success: true,
      data: {
        shiftNumber: shift.shiftNumber,
        expectedCash: expectedCashNum,
        actualCash: actualCashNum,
        difference: differenceNum,
        status,
      },
    };
  } catch (error: any) {
    console.error("Error al cerrar turno de caja:", error);
    return {
      success: false,
      error: error.message || "Error al procesar el arqueo y cierre de caja.",
    };
  }
}

/**
 * 5. Crear una nueva terminal / caja física
 */
export async function createCashRegisterAction(
  input: CreateCashRegisterInput
): Promise<{ success: boolean; data?: any; error?: string }> {
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
  } catch (error: any) {
    console.error("Error al crear caja registradora:", error);
    return {
      success: false,
      error: error.message || "Error al registrar la nueva caja física.",
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
  status: "completed" | "cancelled";
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
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
    await requireRole(["admin", "manager", "cashier"]);

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

    let totalRevenue = 0;
    let cashSalesTotal = 0;
    let electronicSalesTotal = 0;

    const formatted: ShiftSaleDetail[] = list.map((s) => {
      const totalNum = parseFloat(s.totalAmount) || 0;
      if (s.status === "completed") {
        totalRevenue += totalNum;
        if (s.paymentMethod === "cash") {
          cashSalesTotal += totalNum;
        } else {
          electronicSalesTotal += totalNum;
        }
      }

      const sDate = new Date(s.createdAt);
      const formattedDate = sDate.toLocaleTimeString("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const formattedItems: ShiftSaleTicketItem[] = (s.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.name || "Producto",
        quantity: it.quantity,
        unitPrice: parseFloat(it.unitPrice) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
      }));

      const itemsCount = formattedItems.reduce((acc, it) => acc + it.quantity, 0);

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customerName || "Público General",
        paymentMethod: s.paymentMethod as "cash" | "card" | "transfer" | "other",
        status: s.status as "completed" | "cancelled",
        subtotal: parseFloat(s.subtotal) || 0,
        discountAmount: parseFloat(s.discountAmount) || 0,
        totalAmount: totalNum,
        createdAt: formattedDate,
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
      ticketsCount: list.length,
    };
  } catch (error: any) {
    console.error("Error al obtener ventas del turno:", error);
    return {
      success: false,
      sales: [],
      totalRevenue: 0,
      cashSalesTotal: 0,
      electronicSalesTotal: 0,
      ticketsCount: 0,
      error: error.message || "Error al obtener las ventas de este turno.",
    };
  }
}

