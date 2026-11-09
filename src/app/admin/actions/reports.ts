"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, gte, lte, eq, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";

export interface ReporteZShiftItem {
  id: number;
  shiftNumber: string;
  cashRegisterName: string;
  cashierName: string;
  closedByName: string | null;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  initialCash: number;
  cashSales: number;
  transferSales: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  notes: string | null;
}

export interface ReporteZTopProduct {
  productId: number;
  productName: string;
  sku: string | null;
  unitsSold: number;
  unitsReturned: number;
  netUnits: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ReporteZReturnItem {
  saleId: number;
  saleNumber: string;
  customerName: string;
  time: string;
  refundedAmount: number;
  cashierName: string;
  notes: string | null;
}

export interface ReporteZSaleItem {
  id: number;
  saleNumber: string;
  time: string;
  customerName: string;
  cashierName: string;
  cashRegisterName: string;
  paymentMethod: string;
  channel: string;
  status: string;
  originalTotal: number;
  refundedAmount: number;
  netTotal: number;
  cost: number;
  profit: number;
}

export interface ReporteZData {
  reportDate: string;
  isToday: boolean;
  generatedAt: string;
  summary: {
    grossSales: number;
    refunds: number;
    netSales: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    totalSalesCount: number;
    completedSalesCount: number;
    refundedSalesCount: number;
    cancelledSalesCount: number;
    averageTicket: number;
  };
  payments: {
    cash: number;
    transfer: number;
    other: number;
  };
  channels: {
    posShiftRevenue: number;
    posShiftCount: number;
    administrativeRevenue: number;
    administrativeCount: number;
  };
  cashDrawerSummary: {
    totalInitialCash: number;
    totalExpectedCash: number;
    totalActualCash: number;
    totalDifference: number;
    openShiftsCount: number;
    closedShiftsCount: number;
  };
  shifts: ReporteZShiftItem[];
  topProducts: ReporteZTopProduct[];
  returns: ReporteZReturnItem[];
  sales: ReporteZSaleItem[];
}

/**
 * Genera el Reporte Z / Cierre Diario Consolidado
 * @param dateStr Fecha en formato YYYY-MM-DD (por defecto hoy en hora local)
 */
export async function getReporteZAction(
  dateStr?: string
): Promise<{ success: boolean; data?: ReporteZData; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);

    const now = new Date();
    // Default YYYY-MM-DD
    const targetDateStr = dateStr || now.toISOString().split("T")[0];

    // Rango del día completo en UTC/Local
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);
    const todayStr = now.toISOString().split("T")[0];
    const isToday = targetDateStr === todayStr;

    // 1. Obtener todas las ventas del día
    const daySales = await db.query.sales.findMany({
      where: and(
        gte(schema.sales.createdAt, startOfDay),
        lte(schema.sales.createdAt, endOfDay)
      ),
      with: {
        items: {
          with: {
            product: true,
          },
        },
        user: true,
        cashShift: {
          with: {
            cashRegister: true,
          },
        },
      },
      orderBy: [desc(schema.sales.createdAt)],
    });

    // 2. Obtener todos los turnos de caja del día
    const dayShifts = await db.query.cashShifts.findMany({
      where: and(
        gte(schema.cashShifts.openedAt, startOfDay),
        lte(schema.cashShifts.openedAt, endOfDay)
      ),
      with: {
        cashRegister: true,
        user: true,
        closedByUser: true,
      },
      orderBy: [desc(schema.cashShifts.openedAt)],
    });

    // Cálculos de resumen
    let grossSales = 0;
    let refunds = 0;
    let netSales = 0;
    let totalCost = 0;
    let cashPayments = 0;
    let transferPayments = 0;
    let otherPayments = 0;
    let posShiftRevenue = 0;
    let posShiftCount = 0;
    let administrativeRevenue = 0;
    let administrativeCount = 0;
    let completedCount = 0;
    let refundedCount = 0;
    let cancelledCount = 0;

    const productMap = new Map<number, ReporteZTopProduct>();
    const formattedSales: ReporteZSaleItem[] = [];
    const returnsList: ReporteZReturnItem[] = [];

    for (const sale of daySales) {
      const origTotal = parseFloat(sale.totalAmount) || 0;
      const refAmount = parseFloat(sale.refundedAmount || "0") || 0;
      const netTotal = parseFloat(sale.netAmount || (origTotal - refAmount).toString()) || 0;

      let saleCost = 0;
      for (const item of sale.items) {
        const qty = item.quantity;
        const returnedQty = item.returnedQuantity || 0;
        const netQty = Math.max(0, qty - returnedQty);
        const unitCost = parseFloat(item.unitCost) || 0;
        const itemCost = netQty * unitCost;
        saleCost += itemCost;

        // Acumular ranking de productos
        if (sale.status !== "cancelled") {
          const prev = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.product?.name || "Producto",
            sku: item.product?.sku || null,
            unitsSold: 0,
            unitsReturned: 0,
            netUnits: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };

          prev.unitsSold += qty;
          prev.unitsReturned += returnedQty;
          prev.netUnits += netQty;
          prev.revenue += netQty * (parseFloat(item.unitPrice) || 0);
          prev.cost += itemCost;
          prev.profit = prev.revenue - prev.cost;
          productMap.set(item.productId, prev);
        }
      }

      const saleProfit = sale.status === "cancelled" ? 0 : netTotal - saleCost;

      if (sale.status === "completed") {
        completedCount += 1;
        grossSales += origTotal;
        netSales += netTotal;
        totalCost += saleCost;
      } else if (sale.status === "refunded") {
        refundedCount += 1;
        grossSales += origTotal;
        refunds += refAmount;
        netSales += netTotal;
        totalCost += saleCost;

        returnsList.push({
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          customerName: sale.customerName,
          time: sale.createdAt.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
          refundedAmount: refAmount,
          cashierName: sale.user?.name || "Cajero",
          notes: sale.notes,
        });
      } else if (sale.status === "cancelled") {
        cancelledCount += 1;
      }

      // Desglose por método de pago (solo de ventas no canceladas)
      if (sale.status !== "cancelled") {
        if (sale.paymentMethod === "cash") {
          cashPayments += netTotal;
        } else if (sale.paymentMethod === "transfer") {
          transferPayments += netTotal;
        } else {
          otherPayments += netTotal;
        }

        // Desglose por canal
        const isAdm = !sale.cashShiftId || (sale.notes?.includes("[Venta Administrativa Directa]") ?? false);
        if (isAdm) {
          administrativeRevenue += netTotal;
          administrativeCount += 1;
        } else {
          posShiftRevenue += netTotal;
          posShiftCount += 1;
        }
      }

      formattedSales.push({
        id: sale.id,
        saleNumber: sale.saleNumber,
        time: sale.createdAt.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
        customerName: sale.customerName,
        cashierName: sale.user?.name || "Cajero",
        cashRegisterName: sale.cashShift?.cashRegister?.name || (sale.cashShiftId ? "Caja" : "Adm. Directa"),
        paymentMethod: sale.paymentMethod,
        channel: sale.channel,
        status: sale.status,
        originalTotal: origTotal,
        refundedAmount: refAmount,
        netTotal,
        cost: saleCost,
        profit: saleProfit,
      });
    }

    const grossProfit = Math.max(0, netSales - totalCost);
    const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
    const totalSalesCount = completedCount + refundedCount;
    const averageTicket = totalSalesCount > 0 ? netSales / totalSalesCount : 0;

    // Resumen de Arqueos de Caja
    let totalInitialCash = 0;
    let totalExpectedCash = 0;
    let totalActualCash = 0;
    let totalDifference = 0;
    let openShiftsCount = 0;
    let closedShiftsCount = 0;

    const formattedShifts: ReporteZShiftItem[] = dayShifts.map((s) => {
      const initCash = parseFloat(s.initialCash) || 0;
      const cSales = parseFloat(s.cashSales) || 0;
      const tSales = parseFloat(s.transferSales) || 0;
      const expCash = parseFloat(s.expectedCash) || 0;
      const actCash = s.actualCash !== null ? parseFloat(s.actualCash) : null;
      const diff = s.difference !== null ? parseFloat(s.difference) : null;

      totalInitialCash += initCash;
      totalExpectedCash += expCash;
      if (actCash !== null) {
        totalActualCash += actCash;
      }
      if (diff !== null) {
        totalDifference += diff;
      }

      if (s.status === "open") openShiftsCount += 1;
      if (s.status === "closed") closedShiftsCount += 1;

      return {
        id: s.id,
        shiftNumber: s.shiftNumber,
        cashRegisterName: s.cashRegister?.name || "Caja Mostrador",
        cashierName: s.user?.name || "Cajero",
        closedByName: s.closedByUser?.name || null,
        status: s.status as "open" | "closed",
        openedAt: s.openedAt.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
        closedAt: s.closedAt ? s.closedAt.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : null,
        initialCash: initCash,
        cashSales: cSales,
        transferSales: tSales,
        expectedCash: expCash,
        actualCash: actCash,
        difference: diff,
        notes: s.notes,
      };
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      success: true,
      data: {
        reportDate: targetDateStr,
        isToday,
        generatedAt: now.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        summary: {
          grossSales,
          refunds,
          netSales,
          totalCost,
          grossProfit,
          profitMargin,
          totalSalesCount,
          completedSalesCount: completedCount,
          refundedSalesCount: refundedCount,
          cancelledSalesCount: cancelledCount,
          averageTicket,
        },
        payments: {
          cash: cashPayments,
          transfer: transferPayments,
          other: otherPayments,
        },
        channels: {
          posShiftRevenue,
          posShiftCount,
          administrativeRevenue,
          administrativeCount,
        },
        cashDrawerSummary: {
          totalInitialCash,
          totalExpectedCash,
          totalActualCash,
          totalDifference,
          openShiftsCount,
          closedShiftsCount,
        },
        shifts: formattedShifts,
        topProducts,
        returns: returnsList,
        sales: formattedSales,
      },
    };
  } catch (error: any) {
    console.error("Error al generar Reporte Z:", error);
    return {
      success: false,
      error: error.message || "Error al calcular el Reporte Z diario.",
    };
  }
}
