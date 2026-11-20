"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, gte, lt, desc, eq } from "drizzle-orm";
import { businessDate, businessDayStart, addBusinessDays } from "@/lib/business-date";
import { requireRole } from "@/lib/auth/session";

export interface AnalyticsDailyItem {
  date: string;       // YYYY-MM-DD
  dayLabel: string;   // Lun, Mar, etc.
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
    transferAmount: number;
    transferCount: number;
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

    // Consultar todas las ventas del rango
    const sales = await db.query.sales.findMany({
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
      },
      orderBy: [desc(schema.sales.createdAt)],
    });

    let grossSales = 0;
    let refunds = 0;
    let netSales = 0;
    let totalCost = 0;
    let completedCount = 0;
    let refundedCount = 0;
    let cancelledCount = 0;

    let cashAmount = 0;
    let cashCount = 0;
    let transferAmount = 0;
    let transferCount = 0;

    let posRevenue = 0;
    let posCount = 0;
    let administrativeRevenue = 0;
    let administrativeCount = 0;

    const dailyMap = new Map<string, AnalyticsDailyItem>();
    const productMap = new Map<number, AnalyticsTopProduct>();
    const cashierMap = new Map<number, AnalyticsCashierItem>();

    const formattedSalesList: PeriodAnalyticsData["sales"] = [];

    // Inicializar mapa de días en el rango para que los días con 0 ventas aparezcan en el gráfico
    for (let curr = startOfDay; curr < endOfDay; curr = addBusinessDays(curr, 1)) {
      const dayKey = businessDate(curr);
      const dayLabel = curr.toLocaleDateString("es-BO", { weekday: "short", timeZone: "America/La_Paz" });
      const formattedDate = curr.toLocaleDateString("es-BO", { day: "2-digit", month: "short", timeZone: "America/La_Paz" });

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
      const refAmount = parseFloat(s.refundedAmount || "0") || 0;
      const netTotal = parseFloat(s.netAmount || (origTotal - refAmount).toString()) || 0;

      let saleCost = 0;
      for (const item of s.items) {
        const qty = item.quantity;
        const returnedQty = item.returnedQuantity || 0;
        const netQty = Math.max(0, qty - returnedQty);
        const unitCost = parseFloat(item.unitCost) || 0;
        const itemCost = netQty * unitCost;
        saleCost += itemCost;

        // Ranking de productos
        if (s.status !== "cancelled") {
          const prevP = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.product?.name || "Producto",
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
          prevP.revenue += netQty * (parseFloat(item.unitPrice) || 0);
          prevP.cost += itemCost;
          prevP.profit = prevP.revenue - prevP.cost;
          prevP.marginPercent = prevP.revenue > 0 ? (prevP.profit / prevP.revenue) * 100 : 0;
          productMap.set(item.productId, prevP);
        }
      }

      const saleProfit = s.status === "cancelled" ? 0 : netTotal - saleCost;

      if (s.status === "completed") {
        completedCount += 1;
        grossSales += origTotal;
        netSales += netTotal;
        totalCost += saleCost;
      } else if (s.status === "refunded") {
        refundedCount += 1;
        grossSales += origTotal;
        refunds += refAmount;
        netSales += netTotal;
        totalCost += saleCost;
      } else if (s.status === "cancelled") {
        cancelledCount += 1;
      }

      // Distribución diaria
      const saleDayKey = businessDate(s.createdAt);
      const dayRecord = dailyMap.get(saleDayKey);
      if (dayRecord && s.status !== "cancelled") {
        dayRecord.grossSales += origTotal;
        dayRecord.refunds += refAmount;
        dayRecord.netSales += netTotal;
        dayRecord.cost += saleCost;
        dayRecord.profit += saleProfit;
        dayRecord.salesCount += 1;
      }

      // Desglose por método de pago y cajero (no cancelados)
      if (s.status !== "cancelled") {
        if (s.paymentMethod === "cash") {
          cashAmount += netTotal;
          cashCount += 1;
        } else {
          transferAmount += netTotal;
          transferCount += 1;
        }

        const isAdm = !s.cashShiftId || (s.notes?.includes("[Venta Administrativa Directa]") ?? false);
        if (isAdm) {
          administrativeRevenue += netTotal;
          administrativeCount += 1;
        } else {
          posRevenue += netTotal;
          posCount += 1;
        }

        // Rendimiento por cajero
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
          prevC.netRevenue += netTotal;
          prevC.profitGenerated += saleProfit;
          cashierMap.set(s.user.id, prevC);
        }
      }

      formattedSalesList.push({
        id: s.id,
        saleNumber: s.saleNumber,
        date: s.createdAt.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" }),
        time: s.createdAt.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
        customerName: s.customerName,
        cashierName: s.user?.name || "Cajero",
        paymentMethod: s.paymentMethod,
        isAdministrative: !s.cashShiftId,
        status: s.status,
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
    const daysInPeriod = Math.max(1, dailyMap.size);
    const averageDailySales = netSales / daysInPeriod;

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    const cashiers = Array.from(cashierMap.values())
      .sort((a, b) => b.netRevenue - a.netRevenue);

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
          transferAmount,
          transferCount,
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
