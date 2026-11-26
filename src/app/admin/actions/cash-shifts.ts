"use server";

import { productName } from "@/lib/product-name";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  approveCashCountQuery,
  archiveCashRegisterQuery,
  deleteUnusedCashRegisterQuery,
  directCloseShiftQuery,
  openShiftQuery,
  requestCashRecountQuery,
  submitCashCountQuery,
} from "@/db/operations/cash-shifts";
import {
  addBusinessDays,
  businessDate,
  businessDayStart,
  formatBusinessShortDateTime,
  formatBusinessTime,
} from "@/lib/business-date";
import { eq, and, count, ne, isNotNull, gte, lt, inArray, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";
import {
  openShiftSchema,
  closeShiftSchema,
  requestCashRecountSchema,
  submitCashCountSchema,
  createCashRegisterSchema,
  updateCashRegisterSchema,
  toggleCashRegisterArchiveSchema,
  deleteCashRegisterSchema,
  type RequestCashRecountInput,
  type SubmitCashCountInput,
  type OpenShiftInput,
  type CloseShiftInput,
  type CreateCashRegisterInput,
  type UpdateCashRegisterInput,
  type ToggleCashRegisterArchiveInput,
  type DeleteCashRegisterInput,
} from "@/lib/validations/cash-shift";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

function revalidateCashRegisterPaths() {
  for (const path of ["/admin/ajustes", "/admin/cajas", "/admin/ventas", "/admin", "/admin/reportes"]) {
    safeRevalidatePath(path);
  }
}

function pgErrorCode(error: unknown): string | undefined {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string") {
    return cause.code;
  }
  return undefined;
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
  recountRequired: boolean;
  recountReason: string | null;
  totals: {
    initialCash: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    otherSales: number;
    electronicSales: number;
    expectedCash: number;
  } | null;
  review: {
    expectedCash: number;
    actualCash: number;
    difference: number;
    expectedTransfer: number;
    expectedCard: number;
  } | null;
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
  actualTransfer: number | null;
  transferDifference: number | null;
  actualCard: number | null;
  cardDifference: number | null;
  status: "balanced" | "surplus" | "shortage" | "mixed";
  notes: string | null;
};

export type CashKpisSummary = {
  activeInitialCash: number;
  todayCashSales: number;
  todayCardTransferSales: number;
  auditPrecisionPercent: number;
  closedShiftsCount: number;
  balancedShiftsCount: number;
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
          where: and(eq(schema.users.isActive, true), ne(schema.users.role, "warehouse")),
          columns: { id: true, name: true, role: true },
          orderBy: (u, { asc }) => [asc(u.name)],
        }),
        canReview
          ? db
              .select({ count: count() })
              .from(schema.cashShifts)
              .where(eq(schema.cashShifts.status, "closed"))
          : Promise.resolve([{ count: 0 }]),
        db.query.sales.findMany({
          where: and(
            gte(schema.sales.createdAt, todayStart),
            lt(schema.sales.createdAt, tomorrowStart),
            isNotNull(schema.sales.cashShiftId),
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
            lt(schema.saleRefunds.createdAt, tomorrowStart),
            isNotNull(schema.saleRefunds.cashShiftId)
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
      if (!canReview) {
        hiddenOpenShiftIds.add(s.id);
      }
    }

    let activeInitialCash = 0;

    const visibleRegisters = registersList.filter((r) => r.isActive || activeShiftsMap.has(r.id));

    const formattedRegisters: CashRegisterItem[] = visibleRegisters.map((r) => {
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
      const recountRequired = !pendingReview && active.recountRequestedAt !== null;
      const recountReason = recountRequired ? active.recountReason : null;
      const showTotals = canReview;
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
          recountRequired,
          recountReason,
          totals: showTotals
            ? {
                initialCash: initialNum,
                cashSales: cashNum,
                cardSales: cardNum,
                transferSales: transferNum,
                otherSales: otherNum,
                electronicSales: cardNum + transferNum + otherNum,
                expectedCash,
              }
            : null,
          review: canReview && pendingReview
            ? {
                expectedCash,
                actualCash,
                difference: Number((actualCash - expectedCash).toFixed(2)),
                expectedTransfer: transferNum,
                expectedCard: cardNum,
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
      todayCashSales = Number(todayCashSales.toFixed(2));
      todayCardTransferSales = Number(todayCardTransferSales.toFixed(2));
    }

    const closedShiftsCount = canReview ? closedCountResult[0]?.count || 0 : 0;
    let balancedShiftsCount = 0;
    let auditPrecisionPercent = 100;

    if (canReview && closedShiftsCount > 0) {
      const balancedCountResult = await db
        .select({ count: count() })
        .from(schema.cashShifts)
        .where(
          and(
            eq(schema.cashShifts.status, "closed"),
            sql`abs(coalesce(${schema.cashShifts.difference}, 0)) < 0.01`,
            sql`abs(coalesce(${schema.cashShifts.transferDifference}, 0)) < 0.01`,
            sql`abs(coalesce(${schema.cashShifts.cardDifference}, 0)) < 0.01`
          )
        );
      balancedShiftsCount = balancedCountResult[0]?.count || 0;
      auditPrecisionPercent = Math.round((balancedShiftsCount / closedShiftsCount) * 100);
    }

    return {
      success: true,
      registers: formattedRegisters,
      kpis: {
        activeInitialCash: Number(activeInitialCash.toFixed(2)),
        todayCashSales,
        todayCardTransferSales,
        auditPrecisionPercent,
        closedShiftsCount,
        balancedShiftsCount,
        activeShiftsCount: activeShiftsList.length,
        totalRegistersCount: registersList.filter((r) => r.isActive).length,
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
        closedShiftsCount: 0,
        balancedShiftsCount: 0,
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
      const actualTransfer =
        s.actualTransfer !== null && s.actualTransfer !== undefined ? parseFloat(s.actualTransfer) : null;
      const transferDiff =
        s.transferDifference !== null && s.transferDifference !== undefined
          ? parseFloat(s.transferDifference)
          : null;
      const actualCard =
        s.actualCard !== null && s.actualCard !== undefined ? parseFloat(s.actualCard) : null;
      const cardDiff =
        s.cardDifference !== null && s.cardDifference !== undefined
          ? parseFloat(s.cardDifference)
          : null;

      const diffs = [diffNum, transferDiff ?? 0, cardDiff ?? 0];
      const hasSurplus = diffs.some((d) => d >= 0.01);
      const hasShortage = diffs.some((d) => d <= -0.01);

      let status: ClosedShiftItem["status"] = "balanced";
      if (hasSurplus && hasShortage) {
        status = "mixed";
      } else if (hasSurplus) {
        status = "surplus";
      } else if (hasShortage) {
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
        actualTransfer,
        transferDifference: transferDiff,
        actualCard,
        cardDifference: cardDiff,
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

export async function requestCashRecountAction(input: RequestCashRecountInput) {
  try {
    const supervisor = await requireRole(["admin", "manager"]);
    const { shiftId, reason } = requestCashRecountSchema.parse(input);
    const result = await db.execute(
      requestCashRecountQuery(shiftId, supervisor.id, reason, supervisor.name)
    );
    if (!result.rows.length) {
      const existing = await db.query.cashShifts.findFirst({
        where: eq(schema.cashShifts.id, shiftId),
        columns: { status: true, actualCash: true },
      });
      if (!existing || existing.status !== "open") {
        return { success: false, error: "Este turno ya fue cerrado." };
      }
      return {
        success: false,
        error: "El turno todavía no tiene un conteo pendiente de revisión.",
      };
    }

    safeRevalidatePath("/admin/cajas");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al solicitar el reconteo.") };
  }
}

export async function closeShiftAction(input: CloseShiftInput) {
  try {
    const supervisor = await requireRole(["admin", "manager"]);
    const parsed = closeShiftSchema.parse(input);
    const {
      shiftId,
      mode,
      actualCash,
      expectedCash,
      actualTransfer,
      expectedTransfer,
      actualCard,
      expectedCard,
      notes,
    } = parsed;
    const normalizedNotes = notes?.trim() || null;
    const effectiveMode = mode ?? (actualCash !== undefined ? "direct" : "approve");

    if (effectiveMode === "direct") {
      if (actualCash === undefined) {
        return { success: false, error: "Ingresa el efectivo contado para cerrar la caja." };
      }
      const result = await db.execute(
        directCloseShiftQuery(
          shiftId,
          supervisor.id,
          actualCash.toFixed(2),
          normalizedNotes,
          expectedCash !== undefined ? expectedCash.toFixed(2) : null,
          {
            actualTransfer: actualTransfer !== undefined ? actualTransfer.toFixed(2) : null,
            expectedTransfer: expectedTransfer !== undefined ? expectedTransfer.toFixed(2) : null,
            actualCard: actualCard !== undefined ? actualCard.toFixed(2) : null,
            expectedCard: expectedCard !== undefined ? expectedCard.toFixed(2) : null,
          }
        )
      );
      if (!result.rows.length) {
        const existing = await db.query.cashShifts.findFirst({
          where: eq(schema.cashShifts.id, shiftId),
          columns: {
            status: true,
            actualCash: true,
            expectedCash: true,
            transferSales: true,
            cardSales: true,
          },
        });
        if (!existing || existing.status !== "open") {
          return { success: false, error: "Este turno ya fue cerrado." };
        }
        if (existing.actualCash !== null) {
          return {
            success: false,
            error:
              "Este turno ya tiene un conteo físico enviado. Actualiza la pantalla para revisar y aprobar el arqueo.",
          };
        }
        if (
          (expectedCash !== undefined && Math.abs(Number(existing.expectedCash) - expectedCash) >= 0.005) ||
          (expectedTransfer !== undefined && Math.abs(Number(existing.transferSales) - expectedTransfer) >= 0.005) ||
          (expectedCard !== undefined && Math.abs(Number(existing.cardSales) - expectedCard) >= 0.005)
        ) {
          return {
            success: false,
            error:
              "Los totales esperados de la caja cambiaron por un movimiento reciente. Actualiza la pantalla y verifica el arqueo nuevamente.",
          };
        }
        return {
          success: false,
          error:
            "Existe una diferencia en efectivo o QR. Ingresa una observación obligatoria para cerrar la caja.",
        };
      }
    } else {
      const result = await db.execute(
        approveCashCountQuery(shiftId, supervisor.id, normalizedNotes, {
          adjustedActualCash: actualCash !== undefined ? actualCash.toFixed(2) : null,
          actualTransfer: actualTransfer !== undefined ? actualTransfer.toFixed(2) : null,
          actualCard: actualCard !== undefined ? actualCard.toFixed(2) : null,
          supervisorName: supervisor.name,
        })
      );
      if (!result.rows.length) {
        const existing = await db.query.cashShifts.findFirst({
          where: eq(schema.cashShifts.id, shiftId),
          columns: { status: true, actualCash: true },
        });
        if (!existing || existing.status !== "open") {
          return { success: false, error: "Este turno ya fue cerrado." };
        }
        if (existing.actualCash === null) {
          return {
            success: false,
            error: "El turno ya no tiene un conteo pendiente. Actualiza la pantalla para continuar.",
          };
        }
        return {
          success: false,
          error:
            "Falta la observación de cierre obligatoria (por diferencia en arqueo o por edición del conteo).",
        };
      }
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

export type CashRegisterManagementItem = {
  id: number;
  name: string;
  code: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  shiftsCount: number;
  hasOpenShift: boolean;
  openShiftNumber: string | null;
  openShiftCashier: string | null;
  canDelete: boolean;
  canArchive: boolean;
};

/**
 * 5. Administración completa de Cajas Físicas (módulo Ajustes)
 */
export async function getCashRegistersManagementAction(): Promise<{
  success: boolean;
  registers: CashRegisterManagementItem[];
  summary: {
    totalCount: number;
    activeCount: number;
    archivedCount: number;
    openShiftsCount: number;
  };
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager"]);

    const [registersList, shiftCounts, openShifts] = await Promise.all([
      db.query.cashRegisters.findMany({
        orderBy: (r, { desc, asc }) => [desc(r.isActive), asc(r.id)],
      }),
      db
        .select({
          cashRegisterId: schema.cashShifts.cashRegisterId,
          shiftsCount: count(),
        })
        .from(schema.cashShifts)
        .groupBy(schema.cashShifts.cashRegisterId),
      db.query.cashShifts.findMany({
        where: eq(schema.cashShifts.status, "open"),
        columns: {
          cashRegisterId: true,
          shiftNumber: true,
        },
        with: {
          user: {
            columns: { name: true },
          },
        },
      }),
    ]);

    const countByRegister = new Map<number, number>(
      shiftCounts.map((row) => [row.cashRegisterId, row.shiftsCount])
    );
    const openShiftByRegister = new Map(
      openShifts.map((shift) => [shift.cashRegisterId, shift])
    );

    const formatted: CashRegisterManagementItem[] = registersList.map((reg) => {
      const shiftsCount = countByRegister.get(reg.id) ?? 0;
      const openShift = openShiftByRegister.get(reg.id) ?? null;
      const hasOpenShift = openShift !== null;
      return {
        id: reg.id,
        name: reg.name,
        code: reg.code,
        location: reg.location,
        isActive: reg.isActive,
        createdAt: formatBusinessShortDateTime(reg.createdAt),
        shiftsCount,
        hasOpenShift,
        openShiftNumber: openShift?.shiftNumber ?? null,
        openShiftCashier: openShift?.user?.name ?? null,
        canDelete: shiftsCount === 0,
        canArchive: reg.isActive && !hasOpenShift,
      };
    });

    const activeCount = formatted.filter((reg) => reg.isActive).length;
    return {
      success: true,
      registers: formatted,
      summary: {
        totalCount: formatted.length,
        activeCount,
        archivedCount: formatted.length - activeCount,
        openShiftsCount: openShifts.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      registers: [],
      summary: { totalCount: 0, activeCount: 0, archivedCount: 0, openShiftsCount: 0 },
      error: adminActionError(error, "Error al cargar la administración de cajas."),
    };
  }
}

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
      where: sql`upper(${schema.cashRegisters.code}) = ${parsed.code}`,
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

    revalidateCashRegisterPaths();

    return { success: true, data: newReg };
  } catch (error) {
    if (pgErrorCode(error) === "23505") {
      return {
        success: false,
        error: "Ya existe otra caja con ese código identificador.",
      };
    }
    return {
      success: false,
      error: adminActionError(error, "Error al registrar la nueva caja física."),
    };
  }
}

export async function updateCashRegisterAction(
  input: UpdateCashRegisterInput
): Promise<{
  success: boolean;
  data?: typeof schema.cashRegisters.$inferSelect;
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager"]);
    const parsed = updateCashRegisterSchema.parse(input);

    const [existing, duplicateCode] = await Promise.all([
      db.query.cashRegisters.findFirst({
        where: eq(schema.cashRegisters.id, parsed.id),
      }),
      db.query.cashRegisters.findFirst({
        where: and(
          ne(schema.cashRegisters.id, parsed.id),
          sql`upper(${schema.cashRegisters.code}) = ${parsed.code}`
        ),
      }),
    ]);

    if (!existing) {
      return { success: false, error: "Caja no encontrada." };
    }
    if (duplicateCode) {
      return {
        success: false,
        error: `Ya existe otra caja con el código "${parsed.code}".`,
      };
    }

    const [updated] = await db
      .update(schema.cashRegisters)
      .set({
        name: parsed.name,
        code: parsed.code,
        location: parsed.location || null,
      })
      .where(eq(schema.cashRegisters.id, parsed.id))
      .returning();

    revalidateCashRegisterPaths();

    return { success: true, data: updated };
  } catch (error) {
    if (pgErrorCode(error) === "23505") {
      return { success: false, error: "Ya existe otra caja con ese código identificador." };
    }
    return {
      success: false,
      error: adminActionError(error, "Error al actualizar la caja física."),
    };
  }
}

export async function toggleCashRegisterArchiveAction(
  input: ToggleCashRegisterArchiveInput
): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);
    const parsed = toggleCashRegisterArchiveSchema.parse(input);

    const { rows } = await db.execute<{ id: number; isActive: boolean }>(
      archiveCashRegisterQuery(parsed.id, parsed.archive)
    );
    const updated = rows[0];

    if (!updated) {
      const existing = await db.query.cashRegisters.findFirst({
        where: eq(schema.cashRegisters.id, parsed.id),
        columns: { id: true },
      });
      if (!existing) {
        return { success: false, error: "Caja no encontrada." };
      }
      if (parsed.archive) {
        return {
          success: false,
          error: "No puedes archivar una caja con un turno abierto. Cierra el turno primero.",
        };
      }
      return { success: false, error: "No se pudo actualizar el estado de la caja." };
    }

    revalidateCashRegisterPaths();

    return { success: true, isActive: updated.isActive };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al cambiar el estado de archivo de la caja."),
    };
  }
}

export async function deleteCashRegisterAction(
  input: DeleteCashRegisterInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);
    const parsed = deleteCashRegisterSchema.parse(input);

    const { rows } = await db.execute<{ id: number }>(deleteUnusedCashRegisterQuery(parsed.id));
    if (!rows.length) {
      const existing = await db.query.cashRegisters.findFirst({
        where: eq(schema.cashRegisters.id, parsed.id),
        columns: { id: true },
      });
      if (!existing) {
        return { success: false, error: "Caja no encontrada." };
      }
      return {
        success: false,
        error:
          "Esta caja ya tiene turnos registrados y no se puede eliminar. Archívala para deshabilitarla sin perder el historial contable.",
      };
    }

    revalidateCashRegisterPaths();

    return { success: true };
  } catch (error) {
    if (pgErrorCode(error) === "23503") {
      return {
        success: false,
        error:
          "Esta caja ya tiene turnos registrados y no se puede eliminar. Archívala para deshabilitarla sin perder el historial contable.",
      };
    }
    return {
      success: false,
      error: adminActionError(error, "Error al eliminar la caja física."),
    };
  }
}

export type ShiftSaleTicketItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  returnedQuantity: number;
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

export type ShiftRefundDetail = {
  id: number;
  saleId: number;
  saleNumber: string;
  customerName: string;
  refundMethod: "cash" | "card" | "transfer" | "other";
  amount: number;
  reason: string;
  createdAt: string;
  operatorName: string;
  authorizedByName: string;
  isCrossShift: boolean;
};

/**
 * 6. Obtiene la lista completa de ventas y devoluciones registradas exclusivamente en un turno
 */
export async function getShiftSalesAction(shiftId: number): Promise<{
  success: boolean;
  sales: ShiftSaleDetail[];
  refunds: ShiftRefundDetail[];
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
          : undefined
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
        refunds: [],
        totalRevenue: 0,
        cashSalesTotal: 0,
        electronicSalesTotal: 0,
        ticketsCount: 0,
        error: "Los tickets del arqueo estarán disponibles cuando tengas permiso para revisar el turno.",
      };
    }

    const [list, shiftRefunds] = await Promise.all([
      db.query.sales.findMany({
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
      }),
      db.query.saleRefunds.findMany({
        where: eq(schema.saleRefunds.cashShiftId, shiftId),
        with: {
          sale: {
            columns: { id: true, saleNumber: true, cashShiftId: true, customerName: true },
          },
          user: { columns: { name: true } },
          authorizedByUser: { columns: { name: true } },
        },
        orderBy: (r, { desc }) => [desc(r.id)],
      }),
    ]);

    const cashSalesTotal = Number((parseFloat(shift.cashSales) || 0).toFixed(2));
    const electronicSalesTotal = Number(
      (
        (parseFloat(shift.cardSales) || 0) +
        (parseFloat(shift.transferSales) || 0) +
        (parseFloat(shift.otherSales) || 0)
      ).toFixed(2)
    );
    const totalRevenue = Number((cashSalesTotal + electronicSalesTotal).toFixed(2));
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
        returnedQuantity: it.returnedQuantity,
        unitPrice: parseFloat(it.unitPrice) || 0,
        subtotal: parseFloat(it.subtotal) || 0,
      }));

      const itemsCount = formattedItems.reduce((acc, it) => acc + it.quantity, 0);

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customerName || "Público General",
        paymentMethod: s.paymentMethod === "qr" ? "transfer" : s.paymentMethod,
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

    const formattedRefunds: ShiftRefundDetail[] = shiftRefunds.map((r) => ({
      id: r.id,
      saleId: r.saleId,
      saleNumber: r.sale?.saleNumber || `VTA-${r.saleId}`,
      customerName: r.sale?.customerName || "Público General",
      refundMethod: r.refundMethod === "qr" ? "transfer" : r.refundMethod,
      amount: Number((parseFloat(r.amount) || 0).toFixed(2)),
      reason: r.reason,
      createdAt: formatBusinessShortDateTime(r.createdAt),
      operatorName: r.user?.name || "Operador",
      authorizedByName: r.authorizedByUser?.name || "Supervisor",
      isCrossShift: r.sale?.cashShiftId !== shiftId,
    }));

    return {
      success: true,
      sales: formatted,
      refunds: formattedRefunds,
      totalRevenue,
      cashSalesTotal,
      electronicSalesTotal,
      ticketsCount,
    };
  } catch (error) {
    return {
      success: false,
      sales: [],
      refunds: [],
      totalRevenue: 0,
      cashSalesTotal: 0,
      electronicSalesTotal: 0,
      ticketsCount: 0,
      error: adminActionError(error, "Error al obtener las ventas de este turno."),
    };
  }
}
