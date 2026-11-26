"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { productName } from "@/lib/product-name";
import { periodRefundLinesQuery, groupRefundLines, saleDayQuantity, type RefundLine } from "@/db/operations/reporting";
import { refundUnitAmounts } from "@/lib/refund-amount";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, gte, lt, desc } from "drizzle-orm";
import {
  BUSINESS_TIME_ZONE,
  businessDate,
  businessDayStart,
  addBusinessDays,
  formatBusinessDate,
  formatBusinessTime,
} from "@/lib/business-date";
import { requireRole } from "@/lib/auth/session";
import { sumPurchaseReturnPenalties } from "@/lib/purchase-return-math";

export interface AnalyticsDailyItem {
  date: string;
  dayLabel: string;
  formattedDate: string;
  grossSales: number;
  refunds: number;
  netSales: number;
  cost: number;
  profit: number;
  salesCount: number;
}

export interface AnalyticsTopProduct {
  productId: number;
  productName: string;
  sku: string | null;
  categoryName: string;
  unitsSold: number;
  unitsReturned: number;
  netUnits: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

export interface AnalyticsCashierItem {
  userId: number;
  userName: string;
  role: string;
  salesCount: number;
  netRevenue: number;
  profitGenerated: number;
}

export interface PeriodAnalyticsData {
  startDate: string;
  endDate: string;
  periodLabel: string;
  summary: {
    grossSales: number;
    refunds: number;
    netSales: number;
    totalCost: number;
    grossProfit: number;
    inventoryLosses: number;
    supplierPenalties: number;
    netOperatingProfit: number;
    profitMargin: number;
    totalSalesCount: number;
    completedSalesCount: number;
    refundedSalesCount: number;
    cancelledSalesCount: number;
    averageTicket: number;
    averageDailySales: number;
  };
  dailyTrend: AnalyticsDailyItem[];
  payments: {
    cashAmount: number;
    cashCount: number;
    cardAmount: number;
    cardCount: number;
    transferAmount: number;
    transferCount: number;
    otherAmount: number;
    otherCount: number;
  };
  channels: {
    posRevenue: number;
    posCount: number;
    administrativeRevenue: number;
    administrativeCount: number;
  };
  topProducts: AnalyticsTopProduct[];
  cashiers: AnalyticsCashierItem[];
  sales: {
    id: number;
    saleNumber: string;
    date: string;
    time: string;
    customerName: string;
    cashierName: string;
    paymentMethod: string;
    isAdministrative: boolean;
    status: string;
    originalTotal: number;
    refundedAmount: number;
    netTotal: number;
    cost: number;
    profit: number;
  }[];
}

/**
 * Genera el reporte consolidado para cualquier rango de fechas (Semana, Mes, Año, Personalizado)
 */
export async function getPeriodAnalyticsAction(
  startDateStr: string,
  endDateStr: string
): Promise<{ success: boolean; data?: PeriodAnalyticsData; error?: string }> {
  try {
    await requireRole(["admin", "manager"]);

    const startOfDay = businessDayStart(startDateStr);
    const endOfDay = addBusinessDays(businessDayStart(endDateStr), 1);

    if (startOfDay >= endOfDay || endOfDay > addBusinessDays(startOfDay, 366)) {
      return { success: false, error: "Selecciona un rango de entre 1 y 366 días." };
    }

    const [sales, periodRefunds, periodAdjustments, periodPurchaseReturns, refundLines] = await Promise.all([
      db.query.sales.findMany({
        where: and(
          gte(schema.sales.createdAt, startOfDay),
          lt(schema.sales.createdAt, endOfDay)
        ),
        with: {
          items: {
            with: {
              product: {
                with: {
                  category: true,
                },
              },
            },
          },
          user: true,
          cashShift: {
            with: {
              cashRegister: true,
            },
          },
          refunds: {
            columns: { id: true, amount: true, createdAt: true },
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
            columns: { id: true, cashShiftId: true, userId: true },
            with: { user: { columns: { name: true, role: true } } },
          },
        },
      }),
      db.query.inventoryAdjustments.findMany({
        where: and(
          gte(schema.inventoryAdjustments.createdAt, startOfDay),
          lt(schema.inventoryAdjustments.createdAt, endOfDay)
        ),
        columns: { totalCost: true },
      }),
      db.query.purchaseReturns.findMany({
        where: and(
          gte(schema.purchaseReturns.createdAt, startOfDay),
          lt(schema.purchaseReturns.createdAt, endOfDay)
        ),
        columns: { creditedAmount: true },
        with: {
          items: {
            columns: { quantity: true, originalUnitCost: true },
          },
        },
      }),
      db.execute<RefundLine>(periodRefundLinesQuery(startOfDay, endOfDay)),
    ]);

    const linesByRefund = groupRefundLines(refundLines.rows);
    let grossSales = 0;
    let refunds = 0;
    let netSales = 0;
    let totalCost = 0;
    let completedCount = 0;
    let refundedCount = 0;
    let cancelledCount = 0;

    let cashAmount = 0;
    let cashCount = 0;
    let cardAmount = 0;
    let cardCount = 0;
    let transferAmount = 0;
    let transferCount = 0;
    let otherAmount = 0;
    let otherCount = 0;

    let posRevenue = 0;
    let posCount = 0;
    let administrativeRevenue = 0;
    let administrativeCount = 0;

    const dailyMap = new Map<string, AnalyticsDailyItem>();
    const productMap = new Map<number, AnalyticsTopProduct>();
    const cashierMap = new Map<number, AnalyticsCashierItem>();

    const formattedSalesList: PeriodAnalyticsData["sales"] = [];

    for (let curr = startOfDay; curr < endOfDay; curr = addBusinessDays(curr, 1)) {
      const dayKey = businessDate(curr);
      const dayLabel = curr.toLocaleDateString("es-BO", {
        weekday: "short",
        timeZone: BUSINESS_TIME_ZONE,
      });
      const formattedDate = curr.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        timeZone: BUSINESS_TIME_ZONE,
      });

      dailyMap.set(dayKey, {
        date: dayKey,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        formattedDate,
        grossSales: 0,
        refunds: 0,
        netSales: 0,
        cost: 0,
        profit: 0,
        salesCount: 0,
      });
    }

    for (const s of sales) {
      const origTotal = parseFloat(s.totalAmount) || 0;
      const ticketRefunds = s.refunds.filter(r => r.createdAt < endOfDay);
      const refAmount = s.refunds.length
        ? ticketRefunds.reduce((sum, r) => sum + Number(r.amount), 0)
        : Number(s.refundedAmount ?? 0);
      const isCountedSale = s.status === "completed" || s.status === "refunded";
      const reportStatus = s.status === "refunded" && s.refunds.length > 0 && !ticketRefunds.length
        ? "completed" : s.status;
      const persistedNet = isCountedSale ? origTotal - refAmount : 0;

      const lineAmounts = refundUnitAmounts(s.items, origTotal);
      let saleCost = 0;
      for (const item of s.items) {
        const qty = item.quantity;
        const netQty = saleDayQuantity(item, s.refunds.length > 0);
        const returnedQty = qty - netQty;
        const unitCost = parseFloat(item.unitCost) || 0;
        const itemCost = isCountedSale ? netQty * unitCost : 0;
        saleCost += itemCost;

        if (isCountedSale) {
          const prevP = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.product ? productName(item.product) : "Producto",
            sku: item.product?.sku || null,
            categoryName: item.product?.category?.name || "General",
            unitsSold: 0,
            unitsReturned: 0,
            netUnits: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            marginPercent: 0,
          };

          prevP.unitsSold += qty;
          prevP.unitsReturned += returnedQty;
          prevP.netUnits += netQty;
          prevP.revenue += lineAmounts.get(item.id)!(returnedQty, netQty) / 100;
          prevP.cost += itemCost;
          prevP.profit = prevP.revenue - prevP.cost;
          prevP.marginPercent = prevP.revenue > 0 ? (prevP.profit / prevP.revenue) * 100 : 0;
          productMap.set(item.productId, prevP);
        }
      }

      const ticketCost = saleCost - ticketRefunds.reduce((sum, r) =>
        sum + (linesByRefund.get(r.id) ?? []).reduce((cost, line) => cost + Number(line.cost), 0), 0);
      const saleProfit = isCountedSale ? persistedNet - ticketCost : 0;
      const hasLegacyRefund = s.status === "refunded" && s.refunds.length === 0 && refAmount > 0;

      if (reportStatus === "completed") {
        completedCount += 1;
        grossSales += origTotal;
        netSales += origTotal;
        totalCost += saleCost;
      } else if (reportStatus === "refunded") {
        refundedCount += 1;
        grossSales += origTotal;
        netSales += origTotal;
        totalCost += saleCost;
        if (hasLegacyRefund) {
          refunds += refAmount;
          netSales -= refAmount;
        }
      } else if (s.status === "cancelled") {
        cancelledCount += 1;
      }

      const saleDayKey = businessDate(s.createdAt);
      const dayRecord = dailyMap.get(saleDayKey);
      if (dayRecord && isCountedSale) {
        dayRecord.grossSales += origTotal;
        if (hasLegacyRefund) {
          dayRecord.refunds += refAmount;
          dayRecord.netSales += origTotal - refAmount;
          dayRecord.profit += origTotal - refAmount - saleCost;
        } else {
          dayRecord.netSales += origTotal;
          dayRecord.profit += origTotal - saleCost;
        }
        dayRecord.cost += saleCost;
        dayRecord.salesCount += 1;
      }

      if (isCountedSale) {
        const legacyDeduction = hasLegacyRefund ? refAmount : 0;
        if (s.paymentMethod === "cash") {
          cashAmount += origTotal - legacyDeduction;
          cashCount += 1;
        } else if (s.paymentMethod === "card") {
          cardAmount += origTotal - legacyDeduction;
          cardCount += 1;
        } else if (s.paymentMethod === "transfer") {
          transferAmount += origTotal - legacyDeduction;
          transferCount += 1;
        } else {
          otherAmount += origTotal - legacyDeduction;
          otherCount += 1;
        }

        const isAdm = !s.cashShiftId;
        if (isAdm) {
          administrativeRevenue += origTotal - legacyDeduction;
          administrativeCount += 1;
        } else {
          posRevenue += origTotal - legacyDeduction;
          posCount += 1;
        }

        if (s.user) {
          const prevC = cashierMap.get(s.user.id) || {
            userId: s.user.id,
            userName: s.user.name,
            role: s.user.role,
            salesCount: 0,
            netRevenue: 0,
            profitGenerated: 0,
          };
          prevC.salesCount += 1;
          prevC.netRevenue += origTotal - legacyDeduction;
          prevC.profitGenerated += origTotal - legacyDeduction - saleCost;
          cashierMap.set(s.user.id, prevC);
        }
      }

      if (s.status !== "pending") {
        formattedSalesList.push({
          id: s.id,
          saleNumber: s.saleNumber,
          date: formatBusinessDate(s.createdAt),
          time: formatBusinessTime(s.createdAt),
          customerName: s.customerName,
          cashierName: s.user?.name || "Cajero",
          paymentMethod: s.paymentMethod,
          isAdministrative: !s.cashShiftId,
          status: reportStatus,
          originalTotal: origTotal,
          refundedAmount: isCountedSale ? refAmount : 0,
          netTotal: persistedNet,
          cost: isCountedSale ? ticketCost : 0,
          profit: saleProfit,
        });
      }
    }

    for (const r of periodRefunds) {
      const amount = parseFloat(r.amount) || 0;
      const lines = linesByRefund.get(r.id) ?? [];
      const restoredCost = lines.reduce((sum, line) => sum + Number(line.cost), 0);
      totalCost -= restoredCost;
      for (const line of lines) {
        const row = productMap.get(line.productId) ?? {
          productId: line.productId, productName: productName(line), sku: line.sku,
          unitsSold: 0, unitsReturned: 0, netUnits: 0, revenue: 0, cost: 0, profit: 0,
          categoryName: line.categoryName, marginPercent: 0,
        };
        row.unitsReturned += line.quantity;
        row.netUnits -= line.quantity;
        row.revenue -= Number(line.amount);
        row.cost -= Number(line.cost);
        row.profit = row.revenue - row.cost;
        row.marginPercent = row.revenue > 0 ? 100 * row.profit / row.revenue : 0;
        productMap.set(row.productId, row);
      }
      refunds += amount;
      netSales -= amount;

      if (r.refundMethod === "cash") {
        cashAmount -= amount;
      } else if (r.refundMethod === "card") {
        cardAmount -= amount;
      } else if (r.refundMethod === "transfer") {
        transferAmount -= amount;
      } else {
        otherAmount -= amount;
      }

      if (r.sale && !r.sale.cashShiftId) {
        administrativeRevenue -= amount;
      } else {
        posRevenue -= amount;
      }

      const refundDay = dailyMap.get(businessDate(r.createdAt));
      if (refundDay) {
        refundDay.refunds += amount;
        refundDay.netSales -= amount;
        refundDay.cost -= restoredCost;
        refundDay.profit += restoredCost - amount;
      }

      if (r.sale?.userId) {
        const prevC = cashierMap.get(r.sale.userId) ?? {
          userId: r.sale.userId, userName: r.sale.user.name, role: r.sale.user.role,
          salesCount: 0, netRevenue: 0, profitGenerated: 0,
        };
        prevC.netRevenue -= amount;
        prevC.profitGenerated += restoredCost - amount;
        cashierMap.set(r.sale.userId, prevC);
      }
    }

    const grossProfit = netSales - totalCost;
    const inventoryLosses = Number(
      periodAdjustments.reduce((sum, adj) => sum + (parseFloat(adj.totalCost) || 0), 0).toFixed(2)
    );
    const supplierPenalties = sumPurchaseReturnPenalties(periodPurchaseReturns);
    const netOperatingProfit = Number((grossProfit - inventoryLosses - supplierPenalties).toFixed(2));
    const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
    const totalSalesCount = completedCount + refundedCount;
    const averageTicket = totalSalesCount > 0 ? netSales / totalSalesCount : 0;
    const daysInPeriod = Math.max(1, dailyMap.size);
    const averageDailySales = netSales / daysInPeriod;

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    const cashiers = Array.from(cashierMap.values()).sort((a, b) => b.netRevenue - a.netRevenue);

    const dailyTrend = Array.from(dailyMap.values());

    return {
      success: true,
      data: {
        startDate: startDateStr,
        endDate: endDateStr,
        periodLabel: `${startDateStr} al ${endDateStr}`,
        summary: {
          grossSales,
          refunds,
          netSales,
          totalCost,
          grossProfit,
          inventoryLosses,
          supplierPenalties,
          netOperatingProfit,
          profitMargin,
          totalSalesCount,
          completedSalesCount: completedCount,
          refundedSalesCount: refundedCount,
          cancelledSalesCount: cancelledCount,
          averageTicket,
          averageDailySales,
        },
        dailyTrend,
        payments: {
          cashAmount,
          cashCount,
          cardAmount,
          cardCount,
          transferAmount,
          transferCount,
          otherAmount,
          otherCount,
        },
        channels: {
          posRevenue,
          posCount,
          administrativeRevenue,
          administrativeCount,
        },
        topProducts,
        cashiers,
        sales: formattedSalesList,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al calcular el reporte de periodo."),
    };
  }
}
