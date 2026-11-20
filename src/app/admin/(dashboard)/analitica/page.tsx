"use client";

import { addBusinessDays, businessDate } from "@/lib/business-date";

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
  const [startDate, setStartDate] = useState(() => businessDate().slice(0, 7) + "-01");
  const [endDate, setEndDate] = useState(() => businessDate());

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
    const e = businessDate(now);
    if (type === "week") {
      s = businessDate(addBusinessDays(now, -6));
    } else if (type === "month") {
      s = e.slice(0, 7) + "-01";
    } else if (type === "last30") {
      s = businessDate(addBusinessDays(now, -29));
    } else if (type === "year") {
      s = e.slice(0, 4) + "-01-01";
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
      <div className="admin-page-header flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-admin-card-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="admin-page-title">Analítica</h1>
          </div>
          <p className="admin-page-description">Ventas, costos y margen para el período elegido.</p>
        </div>

        {/* Acciones de exportación y presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones Presets Rápidos */}
          <div className="flex items-center bg-admin-raised p-0.5 rounded-xl border border-admin-card-border">
            <button
              type="button"
              onClick={() => handlePresetChange("week")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                preset === "week"
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-admin-secondary hover:text-slate-900"
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
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-admin-secondary hover:text-slate-900"
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
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-admin-secondary hover:text-slate-900"
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
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-admin-secondary hover:text-slate-900"
              )}
            >
              Año
            </button>
          </div>

          {/* Rango Personalizado: Desde - Hasta */}
          <div className="flex items-center gap-1 bg-admin-card-bg border border-admin-card-border rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[10px] font-bold text-admin-muted uppercase">Del:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPreset("custom");
                setStartDate(e.target.value);
              }}
              className="font-bold text-admin-text bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-admin-muted uppercase ml-1">Al:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset("custom");
                setEndDate(e.target.value);
              }}
              className="font-bold text-admin-text bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(startDate, endDate)}
            disabled={isLoading}
            className="h-9 px-2.5 rounded-xl border-admin-card-border"
            title="Refrescar datos"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>

          {/* Exportar a CSV */}
          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={!data || isLoading}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. TARJETAS BENTO KPI DEL PERIODO CONSOLIDADO
          ========================================================================= */}
      <div className="admin-kpi-grid">
        {/* Card 1: Ingresos Netos */}
        <div className="p-4 rounded-xl bg-admin-card-bg border border-admin-card-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">
              Venta Neta del Periodo
            </span>
            <div className="h-8 w-8 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-semibold text-admin-text">
              {formatCurrency(data?.summary.netSales || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-admin-card-border flex items-center justify-between text-[11px] text-admin-muted">
            <span>Promedio Diario:</span>
            <span className="font-bold text-admin-secondary">
              {formatCurrency(data?.summary.averageDailySales || 0)}/día
            </span>
          </div>
        </div>

        {/* Card 2: Ganancia Bruta Real */}
        <div className="p-4 rounded-xl bg-admin-card-bg border border-admin-card-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">
              Ganancia Bruta Real
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data?.summary.grossProfit || 0)}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ({data?.summary.profitMargin.toFixed(1)}% margen)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-admin-card-border flex items-center justify-between text-[11px] text-admin-muted">
            <span>Costo Total Mercancía:</span>
            <span className="font-bold">{formatCurrency(data?.summary.totalCost || 0)}</span>
          </div>
        </div>

        {/* Card 3: Tickets y Volumen */}
        <div className="p-4 rounded-xl bg-admin-card-bg border border-admin-card-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">
              Volumen de Operación
            </span>
            <div className="h-8 w-8 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-admin-text">
              {data?.summary.totalSalesCount || 0}
            </span>
            <span className="text-xs text-admin-muted">tickets emitidos</span>
          </div>
          <div className="mt-2 pt-2 border-t border-admin-card-border flex items-center justify-between text-[11px] text-admin-muted">
            <span>Ticket Promedio:</span>
            <span className="font-bold text-admin-secondary">
              {formatCurrency(data?.summary.averageTicket || 0)}
            </span>
          </div>
        </div>

        {/* Card 4: Efectivo vs QR */}
        <div className="p-4 rounded-xl bg-admin-card-bg border border-admin-card-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">
              Distribución de Medios
            </span>
            <div className="h-8 w-8 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-admin-muted">Efectivo ({data?.payments.cashCount || 0}):</span>
              <span className="font-semibold text-admin-text">
                {formatCurrency(data?.payments.cashAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-muted">QR Bancario ({data?.payments.transferCount || 0}):</span>
              <span className="font-semibold text-admin-brand-text">
                {formatCurrency(data?.payments.transferAmount || 0)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-admin-card-border flex items-center justify-between text-[11px] text-admin-muted">
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
        <div className="p-5 rounded-xl bg-admin-card-bg border border-admin-card-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-admin-text flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-admin-brand-text" />
                Tendencia Diaria de Ventas en el Periodo
              </h3>
              <p className="text-xs text-admin-muted">
                Picos de facturación día por día en {data.periodLabel}
              </p>
            </div>
            <span className="text-xs text-admin-muted font-mono">
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
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-slate-900 text-white py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap mb-1">
                    {formatCurrency(d.netSales)}
                  </div>

                  <div className="w-full bg-admin-raised rounded-t-lg h-28 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        "w-full rounded-t-md transition-all duration-300 group-hover:brightness-110",
                        d.netSales > 0 ? "bg-admin-brand" : "bg-transparent"
                      )}
                    />
                  </div>

                  <span className="text-[10px] text-admin-muted font-bold truncate">
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
        <div className="flex items-center gap-1.5 border-b border-admin-card-border pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("evolucion")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "evolucion"
                ? "bg-admin-brand text-admin-on-solid"
                : "text-admin-secondary hover:bg-admin-raised"
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
                ? "bg-admin-brand text-admin-on-solid"
                : "text-admin-secondary hover:bg-admin-raised"
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
                ? "bg-admin-brand text-admin-on-solid"
                : "text-admin-secondary hover:bg-admin-raised"
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
                ? "bg-admin-brand text-admin-on-solid"
                : "text-admin-secondary hover:bg-admin-raised"
            )}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Todas las Ventas ({data?.sales.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: EVOLUCIÓN DÍA POR DÍA */}
        {activeTab === "evolucion" && (
          <div className="rounded-xl bg-admin-card-bg border border-admin-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-admin-muted uppercase tracking-wider">
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
                      <td colSpan={8} className="text-center py-8 text-admin-muted">
                        No hay ventas registradas en el rango de fechas seleccionado.
                      </td>
                    </tr>
                  ) : (
                    data?.dailyTrend
                      .filter((d) => d.salesCount > 0)
                      .map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-admin-text">
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
                          <td className="py-3 px-4 text-right font-semibold text-admin-text">
                            {formatCurrency(d.netSales)}
                          </td>
                          <td className="py-3 px-4 text-right text-admin-muted">
                            {formatCurrency(d.cost)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
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
          <div className="rounded-xl bg-admin-card-bg border border-admin-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-admin-muted uppercase tracking-wider">
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
                      <td colSpan={9} className="text-center py-8 text-admin-muted">
                        No hay productos vendidos en este periodo.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-admin-muted font-bold w-4">
                              #{(productsPage - 1) * PAGE_SIZE + idx + 1}
                            </span>
                            <span className="font-bold text-admin-text truncate max-w-xs">
                              {p.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-admin-muted">
                          {p.categoryName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {p.unitsSold}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          {p.unitsReturned > 0 ? `-${p.unitsReturned}` : "0"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-admin-text">
                          {p.netUnits}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-admin-text">
                          {formatCurrency(p.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-admin-muted">
                          {formatCurrency(p.cost)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
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
          <div className="rounded-xl bg-admin-card-bg border border-admin-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-admin-muted uppercase tracking-wider">
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
                      <td colSpan={5} className="text-center py-8 text-admin-muted">
                        No hay ventas registradas por operadores en este periodo.
                      </td>
                    </tr>
                  ) : (
                    data?.cashiers.map((c) => (
                      <tr key={c.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-admin-text">
                          {c.userName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-admin-muted font-medium">
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
                        <td className="py-3 px-4 text-right font-semibold text-admin-text">
                          {formatCurrency(c.netRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
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
          <div className="rounded-xl bg-admin-card-bg border border-admin-card-border overflow-hidden space-y-3">
            <div className="p-4 border-b border-admin-card-border flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-admin-muted" />
                <Input
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  placeholder="Buscar ticket, cliente o cajero..."
                  className="h-9 pl-8 text-xs rounded-xl bg-admin-raised border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={salesFilterMethod}
                  onChange={(e) => setSalesFilterMethod(e.target.value)}
                  className="h-9 px-3 text-xs rounded-xl bg-admin-raised border border-slate-200 font-medium text-slate-700"
                >
                  <option value="all">Todos los Métodos</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">QR / Transferencia</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-admin-muted uppercase tracking-wider">
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
                      <td colSpan={8} className="text-center py-8 text-admin-muted">
                        No se encontraron tickets con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-admin-text">
                          #{s.saleNumber}
                        </td>
                        <td className="py-3 px-4 text-admin-muted whitespace-nowrap">
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
                        <td className="py-3 px-4 text-right font-semibold text-admin-text">
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
