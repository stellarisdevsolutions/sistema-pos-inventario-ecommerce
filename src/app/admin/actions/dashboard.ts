"use server";

import { productName } from "@/lib/product-name";

import { adminActionError } from "@/lib/admin-action-error";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, gte, lt } from "drizzle-orm";
import {
  businessDate,
  businessDayStart,
  businessMonthStart,
  formatBusinessDate,
  formatBusinessShortDateTime,
} from "@/lib/business-date";
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "QR / Transferencia",
  other: "Otro",
};

export async function getDashboardSummaryAction(): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    await requireRole(["admin", "manager"]);

    const [year, month, day] = businessDate().split("-").map(Number);
    const nextMonthStr =
      month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const startOfMonth = businessMonthStart();
    const endOfMonth = businessDayStart(nextMonthStr);

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
        const net =
          s.netAmount !== null && s.netAmount !== undefined
            ? parseFloat(s.netAmount) || 0
            : Math.max(0, total - refunded);
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

        for (const it of s.items || []) {
          const uCost = parseFloat(it.unitCost) || 0;
          const netQty = Math.max(0, it.quantity - (it.returnedQuantity || 0));
          cost += uCost * netQty;
        }
        monthSalesCost += cost;
        if (index >= 0 && index < day) {
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

    const [allRegisters, openShifts, allProducts, monthAdjustments] = await Promise.all([
      db.query.cashRegisters.findMany(),
      db.query.cashShifts.findMany({
        where: eq(schema.cashShifts.status, "open"),
      }),
      db.query.products.findMany({
        where: eq(schema.products.isActive, true),
        with: {
          supplier: true,
        },
      }),
      db.query.inventoryAdjustments.findMany({
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
      }),
    ]);

    let cashInDrawers = 0;
    for (const sh of openShifts) {
      cashInDrawers += parseFloat(sh.expectedCash) || 0;
    }

    const recentSalesFormatted: DashboardSalesItem[] = monthSales.slice(0, 15).map((s) => {
      const origTotal = parseFloat(s.totalAmount) || 0;
      const refundedNum = parseFloat(s.refundedAmount || "0") || 0;
      const isCancelled = s.status === "cancelled";
      const isPending = s.status === "pending";
      const netTotal =
        isCancelled || isPending
          ? 0
          : s.netAmount !== null && s.netAmount !== undefined
          ? parseFloat(s.netAmount) || 0
          : Math.max(0, origTotal - refundedNum);
      const subtotalNum = parseFloat(s.subtotal) || 0;
      const taxNum = parseFloat(s.taxAmount || "0") || 0;
      const cashGivenNum = parseFloat(s.cashGiven || "0") || 0;
      const changeGivenNum = parseFloat(s.changeGiven || "0") || 0;

      let itemCostTotal = 0;
      const itemsFormatted = (s.items || []).map((it) => {
        const uPrice = parseFloat(it.unitPrice) || 0;
        const uCost = parseFloat(it.unitCost) || 0;
        const netQty = Math.max(0, it.quantity - (it.returnedQuantity || 0));
        if (!isCancelled && !isPending) {
          itemCostTotal += uCost * netQty;
        }
        return {
          name: it.product ? productName(it.product) : "Producto general",
          quantity: netQty,
          unitPrice: uPrice,
          unitCost: uCost,
          subtotal: netQty * uPrice,
        };
      });

      const isPos = Boolean(s.cashShiftId);
      const channelLabel = isPos
        ? `POS (${s.cashShift?.cashRegister?.name || "Caja"})`
        : "Venta Administrativa";

      const statusLabel =
        s.status === "completed"
          ? "Cobrado"
          : s.status === "refunded"
          ? "Devuelta"
          : s.status === "pending"
          ? "Pendiente"
          : "Anulado";

      return {
        id: s.saleNumber,
        dbId: s.id,
        saleNumber: s.saleNumber,
        time: formatBusinessShortDateTime(s.createdAt),
        rawDate: s.createdAt.toISOString(),
        status: statusLabel,
        channel: isPos ? "pos" : "administrative",
        channelLabel,
        customer: s.customerName || s.customer?.name || "Cliente Mostrador",
        cashier: s.user?.name || "Cajero",
        total: netTotal,
        subtotal: subtotalNum,
        tax: taxNum,
        costTotal: itemCostTotal,
        grossProfit: isCancelled || isPending ? 0 : netTotal - itemCostTotal,
        paymentMethod: PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod,
        cashGiven: cashGivenNum,
        changeGiven: changeGivenNum,
        items: itemsFormatted,
      };
    });

    const criticalStockProducts: DashboardCriticalProduct[] = [];
    let totalInventoryValue = 0;

    for (const p of allProducts) {
      const stock = p.stock || 0;
      const cost = parseFloat(p.costPrice) || 0;
      totalInventoryValue += stock * cost;

      if (stock <= p.minStock) {
        criticalStockProducts.push({
          id: p.id,
          name: productName(p),
          sku: p.sku || `PROD-${p.id}`,
          stock,
          minStock: p.minStock,
          supplier: p.supplier?.name || "Proveedor no asignado",
        });
      }
    }

    const reasonMap: Record<string, string> = {
      damaged: "Rotura física",
      defective: "Defecto de fábrica",
      expired: "Caducado / Vencido",
      loss_theft: "Merma / Pérdida",
      supplier_return: "Devolución proveedor",
      internal_use: "Uso interno / Muestra",
    };

    const monthLossesTotal = monthAdjustments.reduce(
      (sum, a) => sum + (parseFloat(a.totalCost) || 0),
      0
    );

    const recentAdjustments: DashboardAdjustmentItem[] = monthAdjustments.slice(0, 5).map((a) => {
      const costNum = parseFloat(a.totalCost) || 0;
      const firstItem = a.items[0];

      return {
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        productName: firstItem?.product ? productName(firstItem.product) : "Producto general",
        quantity: firstItem?.quantity || 1,
        reason: a.reason,
        reasonLabel: reasonMap[a.reason] || a.reason,
        totalCost: costNum,
        authorizedBy: a.authorizedByUser?.name || "Pendiente de autorización",
        date: formatBusinessDate(a.createdAt),
      };
    });

    return {
      success: true,
      data: {
        kpis: {
          dailySales,
          dailyProfit,
          dailyTickets: dailySales.map((amount, i) => (dailyCount[i] ? amount / dailyCount[i] : 0)),
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
