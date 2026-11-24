"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { productName } from "@/lib/product-name";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, gte, lt, eq, desc, or, isNotNull } from "drizzle-orm";
import {
  businessDate,
  businessDayStart,
  addBusinessDays,
  formatBusinessTime,
} from "@/lib/business-date";
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
  cardSales: number;
  transferSales: number;
  otherSales: number;
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
  id?: number;
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
    card: number;
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
 * @param dateStr Fecha en formato YYYY-MM-DD (por defecto hoy en hora Bolivia)
 */
export async function getReporteZAction(
  dateStr?: string
): Promise<{ success: boolean; data?: ReporteZData; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);

    const now = new Date();
    const todayStr = businessDate(now);
    const targetDateStr = dateStr || todayStr;
    const startOfDay = businessDayStart(targetDateStr);
    const endOfDay = addBusinessDays(startOfDay, 1);
    const isToday = targetDateStr === todayStr;

    const [daySales, periodRefunds, dayShifts] = await Promise.all([
      db.query.sales.findMany({
        where: and(
          gte(schema.sales.createdAt, startOfDay),
          lt(schema.sales.createdAt, endOfDay)
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
          refunds: {
            columns: { id: true },
          },
        },
        orderBy: [desc(schema.sales.createdAt)],
      }),
      db.query.saleRefunds.findMany({
        where: and(
          gte(schema.saleRefunds.createdAt, startOfDay),
          lt(schema.saleRefunds.createdAt, endOfDay)
        ),
        with: {
          sale: {
            columns: {
              id: true,
              saleNumber: true,
              customerName: true,
              cashShiftId: true,
            },
          },
          user: { columns: { id: true, name: true } },
          authorizedByUser: { columns: { id: true, name: true } },
        },
        orderBy: [desc(schema.saleRefunds.createdAt)],
      }),
      db.query.cashShifts.findMany({
        where: or(
          and(gte(schema.cashShifts.openedAt, startOfDay), lt(schema.cashShifts.openedAt, endOfDay)),
          and(
            isNotNull(schema.cashShifts.closedAt),
            gte(schema.cashShifts.closedAt, startOfDay),
            lt(schema.cashShifts.closedAt, endOfDay)
          ),
          and(eq(schema.cashShifts.status, "open"), lt(schema.cashShifts.openedAt, endOfDay))
        ),
        with: {
          cashRegister: true,
          user: true,
          closedByUser: true,
        },
        orderBy: [desc(schema.cashShifts.openedAt)],
      }),
    ]);

    let grossSales = 0;
    let refunds = 0;
    let netSales = 0;
    let totalCost = 0;
    let cashPayments = 0;
    let cardPayments = 0;
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
      const isCountedSale = sale.status === "completed" || sale.status === "refunded";
      const persistedNet =
        !isCountedSale
          ? 0
          : sale.netAmount !== null && sale.netAmount !== undefined
          ? parseFloat(sale.netAmount) || 0
          : Math.max(0, origTotal - refAmount);

      const saleSubtotal = parseFloat(sale.subtotal) || 0;
      const saleDiscount = parseFloat(sale.discountAmount) || 0;
      const discountRatio =
        saleSubtotal > 0 ? Math.max(0, (saleSubtotal - saleDiscount) / saleSubtotal) : 1;

      let saleCost = 0;
      for (const item of sale.items) {
        const qty = item.quantity;
        const returnedQty = item.returnedQuantity || 0;
        const netQty = Math.max(0, qty - returnedQty);
        const unitCost = parseFloat(item.unitCost) || 0;
        const itemCost = isCountedSale ? netQty * unitCost : 0;
        saleCost += itemCost;

        if (isCountedSale) {
          const prev = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.product ? productName(item.product) : "Producto",
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
          prev.revenue += netQty * (parseFloat(item.unitPrice) || 0) * discountRatio;
          prev.cost += itemCost;
          prev.profit = prev.revenue - prev.cost;
          productMap.set(item.productId, prev);
        }
      }

      const saleProfit = isCountedSale ? persistedNet - saleCost : 0;

      if (sale.status === "completed") {
        completedCount += 1;
        grossSales += origTotal;
        netSales += origTotal;
        totalCost += saleCost;
      } else if (sale.status === "refunded") {
        refundedCount += 1;
        grossSales += origTotal;
        netSales += origTotal;
        totalCost += saleCost;

        // Respaldo solo para ventas históricas devueltas antes de existir sale_refunds
        if (sale.refunds.length === 0 && refAmount > 0) {
          refunds += refAmount;
          netSales -= refAmount;

          if (sale.paymentMethod === "cash") {
            cashPayments -= refAmount;
          } else if (sale.paymentMethod === "card") {
            cardPayments -= refAmount;
          } else if (sale.paymentMethod === "transfer") {
            transferPayments -= refAmount;
          } else {
            otherPayments -= refAmount;
          }

          if (!sale.cashShiftId) {
            administrativeRevenue -= refAmount;
          } else {
            posShiftRevenue -= refAmount;
          }

          returnsList.push({
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            customerName: sale.customerName,
            time: formatBusinessTime(sale.createdAt),
            refundedAmount: refAmount,
            cashierName: sale.user?.name || "Cajero",
            notes: sale.notes,
          });
        }
      } else if (sale.status === "cancelled") {
        cancelledCount += 1;
      }

      if (isCountedSale) {
        if (sale.paymentMethod === "cash") {
          cashPayments += origTotal;
        } else if (sale.paymentMethod === "card") {
          cardPayments += origTotal;
        } else if (sale.paymentMethod === "transfer") {
          transferPayments += origTotal;
        } else {
          otherPayments += origTotal;
        }

        const isAdm = !sale.cashShiftId;
        if (isAdm) {
          administrativeRevenue += origTotal;
          administrativeCount += 1;
        } else {
          posShiftRevenue += origTotal;
          posShiftCount += 1;
        }
      }

      if (sale.status !== "pending") {
        formattedSales.push({
          id: sale.id,
          saleNumber: sale.saleNumber,
          time: formatBusinessTime(sale.createdAt),
          customerName: sale.customerName,
          cashierName: sale.user?.name || "Cajero",
          cashRegisterName:
            sale.cashShift?.cashRegister?.name || (sale.cashShiftId ? "Caja" : "Adm. Directa"),
          paymentMethod: sale.paymentMethod,
          channel: sale.channel,
          status: sale.status,
          originalTotal: origTotal,
          refundedAmount: isCountedSale ? refAmount : 0,
          netTotal: persistedNet,
          cost: isCountedSale ? saleCost : 0,
          profit: saleProfit,
        });
      }
    }

    for (const r of periodRefunds) {
      const amount = parseFloat(r.amount) || 0;
      refunds += amount;
      netSales -= amount;

      if (r.refundMethod === "cash") {
        cashPayments -= amount;
      } else if (r.refundMethod === "card") {
        cardPayments -= amount;
      } else if (r.refundMethod === "transfer") {
        transferPayments -= amount;
      } else {
        otherPayments -= amount;
      }

      if (r.sale && !r.sale.cashShiftId) {
        administrativeRevenue -= amount;
      } else {
        posShiftRevenue -= amount;
      }

      returnsList.push({
        id: r.id,
        saleId: r.saleId,
        saleNumber: r.sale?.saleNumber || `#${r.saleId}`,
        customerName: r.sale?.customerName || "Cliente",
        time: formatBusinessTime(r.createdAt),
        refundedAmount: amount,
        cashierName: r.user?.name || "Operador",
        notes: r.authorizedByUser
          ? `Autorizado por ${r.authorizedByUser.name}: ${r.reason}`
          : r.reason,
      });
    }

    const grossProfit = netSales - totalCost;
    const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
    const totalSalesCount = completedCount + refundedCount;
    const averageTicket = totalSalesCount > 0 ? netSales / totalSalesCount : 0;

    let totalInitialCash = 0;
    let totalExpectedCash = 0;
    let totalActualCash = 0;
    let totalDifference = 0;
    let openShiftsCount = 0;
    let closedShiftsCount = 0;

    const formattedShifts: ReporteZShiftItem[] = dayShifts.map((s) => {
      const initCash = parseFloat(s.initialCash) || 0;
      const cSales = parseFloat(s.cashSales) || 0;
      const cardS = parseFloat(s.cardSales) || 0;
      const tSales = parseFloat(s.transferSales) || 0;
      const oSales = parseFloat(s.otherSales) || 0;
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
        openedAt: formatBusinessTime(s.openedAt),
        closedAt: s.closedAt ? formatBusinessTime(s.closedAt) : null,
        initialCash: initCash,
        cashSales: cSales,
        cardSales: cardS,
        transferSales: tSales,
        otherSales: oSales,
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
        generatedAt: formatBusinessTime(now, true),
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
          card: cardPayments,
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
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al calcular el Reporte Z diario."),
    };
  }
}
