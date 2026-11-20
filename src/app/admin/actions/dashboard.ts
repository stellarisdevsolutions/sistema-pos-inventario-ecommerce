"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, gte, lt, lte as lessOrEqual, sql } from "drizzle-orm";
import { businessDate, businessDayStart } from "@/lib/business-date";
import { requireRole } from "@/lib/auth/session";

export interface DashboardSalesItem {
  id: string;
  dbId: number;
  saleNumber: string;
  time: string;
  rawDate: string;
  status: string;
  channel: "pos" | "online" | "administrative";
  channelLabel: string;
  customer: string;
  cashier: string;
  total: number;
  subtotal: number;
  tax: number;
  costTotal: number;
  grossProfit: number;
  paymentMethod: string;
  cashGiven: number;
  changeGiven: number;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
  }[];
}

export interface DashboardCriticalProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  supplier: string;
}

export interface DashboardAdjustmentItem {
  id: number;
  adjustmentNumber: string;
  productName: string;
  quantity: number;
  reason: string;
  reasonLabel: string;
  totalCost: number;
  authorizedBy: string;
  date: string;
}

export interface DashboardData {
  kpis: {
    dailySales: number[];
    dailyProfit: number[];
    dailyTickets: number[];
    monthSalesTotal: number;
    monthSalesCount: number;
    posPercentage: number;
    adminPercentage: number;
    grossProfit: number;
    profitMargin: number;
    averageTicket: number;
    cashInDrawers: number;
    activeDrawersCount: number;
    totalDrawersCount: number;
    cashAmount: number;
    qrAmount: number;
  };
  recentSales: DashboardSalesItem[];
  criticalStockProducts: DashboardCriticalProduct[];
  totalInventoryValue: number;
  recentAdjustments: DashboardAdjustmentItem[];
  monthLossesTotal: number;
}

export async function getDashboardSummaryAction(): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager"]);

    const [year, month, day] = businessDate().split("-").map(Number);
    const monthDate = (offset: number) => new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
    const startOfMonth = businessDayStart(monthDate(0));
    const endOfMonth = businessDayStart(monthDate(1));

    // 1. Obtener ventas del mes en curso
    const monthSales = await db.query.sales.findMany({
      where: and(
        gte(schema.sales.createdAt, startOfMonth),
        lt(schema.sales.createdAt, endOfMonth)
      ),
      with: {
        customer: true,
        user: true,
        items: {
          with: {
            product: true,
          },
        },
        cashShift: {
          with: {
            cashRegister: true,
          },
        },
      },
      orderBy: [desc(schema.sales.createdAt)],
    });

    const dailySales = Array<number>(day).fill(0);
    const dailyProfit = Array<number>(day).fill(0);
    const dailyCount = Array<number>(day).fill(0);
    let monthSalesTotal = 0;
    let monthSalesCost = 0;
    let completedCount = 0;
    let posCount = 0;
    let adminCount = 0;
    let cashAmount = 0;
    let qrAmount = 0;

    for (const s of monthSales) {
      if (s.status === "completed" || s.status === "refunded") {
        const total = parseFloat(s.totalAmount) || 0;
        const refunded = parseFloat(s.refundedAmount || "0") || 0;
        const net = Math.max(0, total - refunded);
        const index = Number(businessDate(s.createdAt).slice(-2)) - 1;
        monthSalesTotal += net;
        let cost = 0;
        completedCount += 1;

        if (s.cashShiftId) {
          posCount += 1;
        } else {
          adminCount += 1;
        }

        if (s.paymentMethod === "cash") {
          cashAmount += net;
        } else {
          qrAmount += net;
        }

        // Costo de los productos vendidos
        for (const it of s.items || []) {
          const uCost = parseFloat(it.unitCost) || 0;
          const netQty = Math.max(0, it.quantity - (it.returnedQuantity || 0));
          cost += uCost * netQty;
        }
        monthSalesCost += cost;
        if (index < day) {
          dailySales[index] += net;
          dailyProfit[index] += net - cost;
          dailyCount[index]++;
        }
      }
    }

    const grossProfit = monthSalesTotal - monthSalesCost;
    const profitMargin = monthSalesTotal > 0 ? (grossProfit / monthSalesTotal) * 100 : 0;
    const averageTicket = completedCount > 0 ? monthSalesTotal / completedCount : 0;
    const totalCountValid = posCount + adminCount;
    const posPercentage = totalCountValid > 0 ? Math.round((posCount / totalCountValid) * 100) : 100;
    const adminPercentage = totalCountValid > 0 ? 100 - posPercentage : 0;

    // 2. Obtener cajas físicas y turnos activos
    const allRegisters = await db.query.cashRegisters.findMany();
    const openShifts = await db.query.cashShifts.findMany({
      where: eq(schema.cashShifts.status, "open"),
    });

    let cashInDrawers = 0;
    for (const sh of openShifts) {
      cashInDrawers += parseFloat(sh.expectedCash) || 0;
    }

    // 3. Formatear ventas recientes (hasta 15)
    const recentSalesFormatted: DashboardSalesItem[] = monthSales.slice(0, 15).map((s) => {
      const totalNum = parseFloat(s.totalAmount) || 0;
      const subtotalNum = parseFloat(s.subtotal) || 0;
      const taxNum = parseFloat(s.taxAmount || "0") || 0;
      const cashGivenNum = parseFloat(s.cashGiven || "0") || 0;
      const changeGivenNum = parseFloat(s.changeGiven || "0") || 0;

      let itemCostTotal = 0;
      const itemsFormatted = (s.items || []).map((it) => {
        const uPrice = parseFloat(it.unitPrice) || 0;
        const uCost = parseFloat(it.unitCost) || 0;
        const sub = parseFloat(it.subtotal) || uPrice * it.quantity;
        itemCostTotal += uCost * it.quantity;
        return {
          name: it.product?.name || "Producto general",
          quantity: it.quantity,
          unitPrice: uPrice,
          unitCost: uCost,
          subtotal: sub,
        };
      });

      const dateObj = new Date(s.createdAt);
      const timeStr = dateObj.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
      const dateStr = dateObj.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });

      const isPos = Boolean(s.cashShiftId);
      const channelLabel = isPos
        ? `POS (${s.cashShift?.cashRegister?.name || "Caja"})`
        : "Venta Administrativa";

      return {
        id: s.saleNumber,
        dbId: s.id,
        saleNumber: s.saleNumber,
        time: `${dateStr}, ${timeStr}`,
        rawDate: s.createdAt.toISOString(),
        status: s.status === "completed" ? "Cobrado" : s.status === "refunded" ? "Devuelto" : "Anulado",
        channel: isPos ? "pos" : "administrative",
        channelLabel,
        customer: s.customer?.name || "Cliente Mostrador",
        cashier: s.user?.name || "Cajero",
        total: totalNum,
        subtotal: subtotalNum,
        tax: taxNum,
        costTotal: itemCostTotal,
        grossProfit: Math.max(0, totalNum - itemCostTotal),
        paymentMethod: s.paymentMethod === "cash" ? "Efectivo" : "QR Simple",
        cashGiven: cashGivenNum,
        changeGiven: changeGivenNum,
        items: itemsFormatted,
      };
    });

    // 4. Productos con stock crítico (stock <= minStock)
    const allProducts = await db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      with: {
        supplier: true,
      },
    });

    const criticalStockProducts: DashboardCriticalProduct[] = [];
    let totalInventoryValue = 0;

    for (const p of allProducts) {
      const stock = p.stock || 0;
      const cost = parseFloat(p.costPrice) || 0;
      totalInventoryValue += stock * cost;

      if (stock <= (p.minStock || 5)) {
        criticalStockProducts.push({
          id: p.id,
          name: p.name,
          sku: p.sku || `PROD-${p.id}`,
          stock,
          minStock: p.minStock || 5,
          supplier: p.supplier?.name || "Proveedor no asignado",
        });
      }
    }

    // 5. Mermas y Bajas del mes
    const monthAdjustments = await db.query.inventoryAdjustments.findMany({
      where: and(
        gte(schema.inventoryAdjustments.createdAt, startOfMonth),
        lt(schema.inventoryAdjustments.createdAt, endOfMonth)
      ),
      with: {
        authorizedByUser: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(schema.inventoryAdjustments.createdAt)],
    });

    const reasonMap: Record<string, string> = {
      damaged: "Rotura física",
      defective: "Defecto de fábrica",
      expired: "Caducado / Vencido",
      loss_theft: "Merma / Pérdida",
      supplier_return: "Devolución proveedor",
      internal_use: "Uso interno / Muestra",
    };

    let monthLossesTotal = 0;
    const recentAdjustments: DashboardAdjustmentItem[] = monthAdjustments.slice(0, 5).map((a) => {
      const costNum = parseFloat(a.totalCost) || 0;
      monthLossesTotal += costNum;
      const firstItem = a.items[0];

      return {
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        productName: firstItem?.product?.name || "Producto general",
        quantity: firstItem?.quantity || 1,
        reason: a.reason,
        reasonLabel: reasonMap[a.reason] || a.reason,
        totalCost: costNum,
        authorizedBy: a.authorizedByUser?.name || "Administrador",
        date: new Date(a.createdAt).toLocaleDateString("es-BO"),
      };
    });

    return {
      success: true,
      data: {
        kpis: {
          dailySales,
          dailyProfit,
          dailyTickets: dailySales.map((amount, i) => dailyCount[i] ? amount / dailyCount[i] : 0),
          monthSalesTotal,
          monthSalesCount: completedCount,
          posPercentage,
          adminPercentage,
          grossProfit,
          profitMargin,
          averageTicket,
          cashInDrawers,
          activeDrawersCount: openShifts.length,
          totalDrawersCount: allRegisters.length,
          cashAmount,
          qrAmount,
        },
        recentSales: recentSalesFormatted,
        criticalStockProducts: criticalStockProducts.slice(0, 5),
        totalInventoryValue,
        recentAdjustments,
        monthLossesTotal,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al cargar las métricas en vivo."),
    };
  }
}
