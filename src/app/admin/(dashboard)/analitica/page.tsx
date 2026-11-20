"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Receipt,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Package,
  Wallet,
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  Building2,
  SlidersHorizontal,
  BarChart2,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  getPeriodAnalyticsAction,
  type PeriodAnalyticsData,
  type AnalyticsDailyItem,
  type AnalyticsTopProduct,
  type AnalyticsCashierItem,
} from "@/app/admin/actions/analytics";

type PresetType = "week" | "month" | "last30" | "year" | "custom";

export default function AnaliticaPage() {
  const [preset, setPreset] = useState<PresetType>("month");

  // Rango de fechas por defecto: Mes en curso
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [data, setData] = useState<PeriodAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"evolucion" | "productos" | "cajeros" | "ventas">("evolucion");

  // Buscador para pestaña de ventas
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilterMethod, setSalesFilterMethod] = useState("all");

  const loadAnalytics = async (start: string, end: string) => {
    setIsLoading(true);
    try {
      const res = await getPeriodAnalyticsAction(start, end);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || "No se pudo cargar la analítica.");
      }
    } catch {
      toast.error("Error al conectar con la base de datos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(startDate, endDate);
  }, [startDate, endDate]);

  // Manejo de botones de acceso rápido
  const handlePresetChange = (type: PresetType) => {
    setPreset(type);
    const now = new Date();
    let s = "";
    let e = now.toISOString().split("T")[0];

    if (type === "week") {
      // Últimos 7 días
      const d = new Date();
      d.setDate(d.getDate() - 6);
      s = d.toISOString().split("T")[0];
    } else if (type === "month") {
      // 1 del mes actual al día de hoy
      s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    } else if (type === "last30") {
      // Últimos 30 días
      const d = new Date();
      d.setDate(d.getDate() - 29);
      s = d.toISOString().split("T")[0];
    } else if (type === "year") {
      // 1 de enero al día de hoy
      s = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    } else {
      return; // custom
    }

    setStartDate(s);
    setEndDate(e);
  };

  // Filtrado de ventas en la tabla
  const filteredSales = useMemo(() => {
    if (!data) return [];
    const q = salesSearch.toLowerCase().trim();
    return data.sales.filter((s) => {
      const matchQ =
        !q ||
        s.saleNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q);

      const matchMethod =
        salesFilterMethod === "all" || s.paymentMethod === salesFilterMethod;

      return matchQ && matchMethod;
    });
  }, [data, salesSearch, salesFilterMethod]);

  // Paginación (15 filas por página)
  const PAGE_SIZE = 15;
  const [productsPage, setProductsPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  useEffect(() => {
    setSalesPage(1);
  }, [salesSearch, salesFilterMethod, startDate, endDate]);

  useEffect(() => {
    setProductsPage(1);
  }, [startDate, endDate]);

  const totalProductsPages = Math.ceil((data?.topProducts.length || 0) / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    if (!data) return [];
    return data.topProducts.slice(
      (productsPage - 1) * PAGE_SIZE,
      productsPage * PAGE_SIZE
    );
  }, [data, productsPage]);

  const totalSalesPages = Math.ceil(filteredSales.length / PAGE_SIZE) || 1;
  const paginatedSales = useMemo(() => {
    return filteredSales.slice(
      (salesPage - 1) * PAGE_SIZE,
      salesPage * PAGE_SIZE
    );
  }, [filteredSales, salesPage]);

  // Exportar reporte consolidado a CSV
  const handleExportCsv = () => {
    if (!data) return;
    try {
      let csv = "\uFEFF"; // UTF-8 BOM
      csv += `REPORTE FINANCIERO CONSOLIDADO (${data.startDate} al ${data.endDate})\n\n`;

      csv += `RESUMEN EJECUTIVO\n`;
      csv += `Ventas Brutas;${data.summary.grossSales.toFixed(2)} Bs\n`;
      csv += `Devoluciones (-);${data.summary.refunds.toFixed(2)} Bs\n`;
      csv += `Ventas Netas;${data.summary.netSales.toFixed(2)} Bs\n`;
      csv += `Costo Mercaderia Vendida;${data.summary.totalCost.toFixed(2)} Bs\n`;
      csv += `Ganancia Bruta Real;${data.summary.grossProfit.toFixed(2)} Bs\n`;
      csv += `Margen de Ganancia;${data.summary.profitMargin.toFixed(1)}%\n`;
      csv += `Tickets Emitidos;${data.summary.totalSalesCount}\n`;
      csv += `Ticket Promedio;${data.summary.averageTicket.toFixed(2)} Bs\n`;
      csv += `Venta Diaria Promedio;${data.summary.averageDailySales.toFixed(2)} Bs\n\n`;

      csv += `MEDIOS DE PAGO\n`;
      csv += `Efectivo en Gaveta;${data.payments.cashAmount.toFixed(2)} Bs (${data.payments.cashCount} tickets)\n`;
      csv += `QR Simple / Bancario;${data.payments.transferAmount.toFixed(2)} Bs (${data.payments.transferCount} tickets)\n\n`;

      csv += `EVOLUCION DIARIA\n`;
      csv += `Fecha;Dia;Venta Neta;Costo;Ganancia;Tickets\n`;
      data.dailyTrend.forEach((d) => {
        csv += `${d.date};${d.dayLabel};${d.netSales.toFixed(2)};${d.cost.toFixed(2)};${d.profit.toFixed(2)};${d.salesCount}\n`;
      });
      csv += `\n`;

      csv += `TOP PRODUCTOS DEL PERIODO\n`;
      csv += `Producto;SKU;Categoria;Vendidas;Devueltas;Netas;Recaudacion;Costo;Ganancia;Margen %\n`;
      data.topProducts.forEach((p) => {
        csv += `${p.productName};${p.sku || "N/A"};${p.categoryName};${p.unitsSold};${p.unitsReturned};${p.netUnits};${p.revenue.toFixed(2)};${p.cost.toFixed(2)};${p.profit.toFixed(2)};${p.marginPercent.toFixed(1)}%\n`;
      });
      csv += `\n`;

      csv += `DETALLE DE VENTAS\n`;
      csv += `Ticket;Fecha;Hora;Cliente;Cajero;Metodo;Total Neto;Ganancia;Estado\n`;
      data.sales.forEach((s) => {
        csv += `${s.saleNumber};${s.date};${s.time};${s.customerName};${s.cashierName};${s.paymentMethod};${s.netTotal.toFixed(2)};${s.profit.toFixed(2)};${s.status}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Reporte_Consolidado_${data.startDate}_al_${data.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Archivo Excel/CSV exportado exitosamente.");
    } catch {
      toast.error("Error al exportar los datos.");
    }
  };

  // Encontrar el día con mayor venta para escalar las barras del histograma
  const maxDaySales = useMemo(() => {
    if (!data) return 1;
    const max = Math.max(...data.dailyTrend.map((d) => d.netSales), 0);
    return max > 0 ? max : 1;
  }, [data]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          1. HEADER CON SELECTOR DE RANGO (SEMANA / MES / AÑO / PERSONALIZADO)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarRange className="h-6 w-6 text-[var(--admin-brand)]" />
              Analítica & Reportes Periódicos
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Rendimiento consolidado por rango de fechas: ingresos, costos, utilidades y top productos.
          </p>
        </div>

        {/* Acciones de exportación y presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones Presets Rápidos */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handlePresetChange("week")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                preset === "week"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("month")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                preset === "month"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("last30")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                preset === "last30"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              30 Días
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("year")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                preset === "year"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Año
            </button>
          </div>

          {/* Rango Personalizado: Desde - Hasta */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 shadow-xs text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Del:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPreset("custom");
                setStartDate(e.target.value);
              }}
              className="font-bold text-slate-900 dark:text-white bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Al:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset("custom");
                setEndDate(e.target.value);
              }}
              className="font-bold text-slate-900 dark:text-white bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(startDate, endDate)}
            disabled={isLoading}
            className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-700"
            title="Refrescar datos"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>

          {/* Exportar a CSV */}
          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={!data || isLoading}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md shadow-[#0284c7]/20 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. TARJETAS BENTO KPI DEL PERIODO CONSOLIDADO
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos Netos */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Venta Neta del Periodo
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(data?.summary.netSales || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Promedio Diario:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {formatCurrency(data?.summary.averageDailySales || 0)}/día
            </span>
          </div>
        </div>

        {/* Card 2: Ganancia Bruta Real */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ganancia Bruta Real
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data?.summary.grossProfit || 0)}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ({data?.summary.profitMargin.toFixed(1)}% margen)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Costo Total Mercancía:</span>
            <span className="font-bold">{formatCurrency(data?.summary.totalCost || 0)}</span>
          </div>
        </div>

        {/* Card 3: Tickets y Volumen */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Volumen de Operación
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[var(--admin-brand)] flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data?.summary.totalSalesCount || 0}
            </span>
            <span className="text-xs text-slate-500">tickets emitidos</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Ticket Promedio:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {formatCurrency(data?.summary.averageTicket || 0)}
            </span>
          </div>
        </div>

        {/* Card 4: Efectivo vs QR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Distribución de Medios
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Efectivo ({data?.payments.cashCount || 0}):</span>
              <span className="font-black text-slate-900 dark:text-white">
                {formatCurrency(data?.payments.cashAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">QR Bancario ({data?.payments.transferCount || 0}):</span>
              <span className="font-black text-[#0284c7]">
                {formatCurrency(data?.payments.transferAmount || 0)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Devoluciones:</span>
            <span className="font-bold text-amber-600">
              -{formatCurrency(data?.summary.refunds || 0)} ({data?.summary.refundedSalesCount || 0})
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. HISTOGRAMA / EVOLUCIÓN VISUAL POR DÍA
          ========================================================================= */}
      {data && data.dailyTrend.length > 0 && data.dailyTrend.length <= 60 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-[#0284c7]" />
                Tendencia Diaria de Ventas en el Periodo
              </h3>
              <p className="text-xs text-slate-400">
                Picos de facturación día por día en {data.periodLabel}
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Pico Máximo: <strong>{formatCurrency(maxDaySales)}</strong>
            </span>
          </div>

          {/* Gráfico de barras responsivo CSS */}
          <div className="pt-4 flex items-end gap-1.5 sm:gap-2 h-44 overflow-x-auto pb-2">
            {data.dailyTrend.map((d) => {
              const heightPercent = Math.max(4, Math.round((d.netSales / maxDaySales) * 100));

              return (
                <div key={d.date} className="flex-1 min-w-[28px] max-w-[50px] flex flex-col items-center gap-1 group">
                  {/* Tooltip flotante al pasar el mouse */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-slate-900 text-white py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap mb-1 shadow-md">
                    {formatCurrency(d.netSales)}
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-28 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        "w-full rounded-t-md transition-all duration-300 group-hover:brightness-110",
                        d.netSales > 0 ? "bg-[#0284c7]" : "bg-transparent"
                      )}
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold truncate">
                    {d.formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. PESTAÑAS DE TABLAS DE DETALLE
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("evolucion")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "evolucion"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Evolución Diaria ({data?.dailyTrend.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("productos")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "productos"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Top Productos ({data?.topProducts.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cajeros")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "cajeros"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Rendimiento por Operador ({data?.cashiers.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ventas")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "ventas"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Todas las Ventas ({data?.sales.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: EVOLUCIÓN DÍA POR DÍA */}
        {activeTab === "evolucion" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Día</th>
                    <th className="py-3 px-4 text-center">Tickets</th>
                    <th className="py-3 px-4 text-right">Venta Bruta</th>
                    <th className="py-3 px-4 text-right">Devoluciones</th>
                    <th className="py-3 px-4 text-right">Venta Neta</th>
                    <th className="py-3 px-4 text-right">Costo Mercadería</th>
                    <th className="py-3 px-4 text-right">Ganancia Bruta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data?.dailyTrend.filter((d) => d.salesCount > 0).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No hay ventas registradas en el rango de fechas seleccionado.
                      </td>
                    </tr>
                  ) : (
                    data?.dailyTrend
                      .filter((d) => d.salesCount > 0)
                      .map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {d.date}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-semibold">
                            {d.dayLabel}
                          </td>
                          <td className="py-3 px-4 text-center font-bold">
                            {d.salesCount}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {formatCurrency(d.grossSales)}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-600">
                            {d.refunds > 0 ? `-${formatCurrency(d.refunds)}` : "0.00 Bs"}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                            {formatCurrency(d.netSales)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {formatCurrency(d.cost)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600">
                            {formatCurrency(d.profit)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TOP PRODUCTOS */}
        {activeTab === "productos" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-center">Vendidas</th>
                    <th className="py-3 px-4 text-center">Devueltas</th>
                    <th className="py-3 px-4 text-center">Netas</th>
                    <th className="py-3 px-4 text-right">Recaudación Neta</th>
                    <th className="py-3 px-4 text-right">Costo Total</th>
                    <th className="py-3 px-4 text-right">Ganancia Bruta</th>
                    <th className="py-3 px-4 text-center">Margen %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        No hay productos vendidos en este periodo.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold w-4">
                              #{(productsPage - 1) * PAGE_SIZE + idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                              {p.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {p.categoryName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {p.unitsSold}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          {p.unitsReturned > 0 ? `-${p.unitsReturned}` : "0"}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-900 dark:text-white">
                          {p.netUnits}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(p.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatCurrency(p.cost)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600">
                          {formatCurrency(p.profit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                            {p.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={productsPage}
              totalPages={totalProductsPages}
              totalItems={data?.topProducts.length || 0}
              pageSize={PAGE_SIZE}
              itemName="productos"
              onPageChange={setProductsPage}
            />
          </div>
        )}

        {/* TAB 3: RENDIMIENTO POR CAJERO / OPERADOR */}
        {activeTab === "cajeros" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Operador / Empleado</th>
                    <th className="py-3 px-4">Rol en el Sistema</th>
                    <th className="py-3 px-4 text-center">Tickets Cobrados</th>
                    <th className="py-3 px-4 text-right">Recaudación Neta</th>
                    <th className="py-3 px-4 text-right">Ganancia Generada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data?.cashiers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No hay ventas registradas por operadores en este periodo.
                      </td>
                    </tr>
                  ) : (
                    data?.cashiers.map((c) => (
                      <tr key={c.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {c.userName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-slate-500 font-medium">
                            {c.role === "admin"
                              ? "Administrador"
                              : c.role === "manager"
                              ? "Supervisor"
                              : "Cajero"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {c.salesCount}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(c.netRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600">
                          {formatCurrency(c.profitGenerated)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TODAS LAS VENTAS */}
        {activeTab === "ventas" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs space-y-3">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  placeholder="Buscar ticket, cliente o cajero..."
                  className="h-9 pl-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={salesFilterMethod}
                  onChange={(e) => setSalesFilterMethod(e.target.value)}
                  className="h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 font-medium text-slate-700"
                >
                  <option value="all">Todos los Métodos</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">QR / Transferencia</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Cajero</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4 text-right">Venta Neta</th>
                    <th className="py-3 px-4 text-right">Ganancia</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No se encontraron tickets con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          #{s.saleNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {s.date} {s.time}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {s.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.cashierName}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {s.paymentMethod === "cash" ? "Efectivo" : "QR / Transf."}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(s.netTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {formatCurrency(s.profit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                s.status === "completed"
                                  ? "bg-emerald-500"
                                  : s.status === "refunded"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <span
                              className={cn(
                                s.status === "completed"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : s.status === "refunded"
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-rose-700 dark:text-rose-400"
                              )}
                            >
                              {s.status === "completed"
                                ? "Completada"
                                : s.status === "refunded"
                                ? "Devolución"
                                : "Anulada"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={salesPage}
              totalPages={totalSalesPages}
              totalItems={filteredSales.length}
              pageSize={PAGE_SIZE}
              itemName="tickets"
              onPageChange={setSalesPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
