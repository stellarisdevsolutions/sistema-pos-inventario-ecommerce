"use client";

import { addBusinessDays, businessDate } from "@/lib/business-date";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Package,
  Wallet,
  Users,
  Search,
  RefreshCw,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { csvCell } from "@/lib/sanitize";
import { STORE_NAME } from "@/lib/store-config";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  getPeriodAnalyticsAction,
  type PeriodAnalyticsData,
} from "@/app/admin/actions/analytics";

type PresetType = "week" | "month" | "last30" | "year" | "custom";

export default function AnaliticaPage() {
  const [preset, setPreset] = useState<PresetType>("month");

  // Rango de fechas por defecto: Mes en curso
  const [startDate, setStartDate] = useState(() => businessDate().slice(0, 7) + "-01");
  const [endDate, setEndDate] = useState(() => businessDate());

  const [data, setData] = useState<PeriodAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"evolucion" | "productos" | "cajeros" | "ventas">("evolucion");

  // Buscador para pestaña de ventas
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilterMethod, setSalesFilterMethod] = useState("all");

  // Paginación (15 filas por página)
  const PAGE_SIZE = 15;
  const [productsPage, setProductsPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  const loadAnalytics = useCallback(async (start: string, end: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getPeriodAnalyticsAction(start, end);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        const msg = res.error || "No se pudieron cargar las ventas y ganancias.";
        setData(null);
        setLoadError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Error al conectar con la base de datos.";
      setData(null);
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPeriodAnalyticsAction(startDate, endDate);
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
          setLoadError(null);
        } else {
          const msg = res.error || "No se pudieron cargar las ventas y ganancias.";
          setData(null);
          setLoadError(msg);
          toast.error(msg);
        }
      } catch {
        if (!cancelled) {
          const msg = "Error al conectar con la base de datos.";
          setData(null);
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const applyDateRange = (s: string, e: string) => {
    setProductsPage(1);
    setSalesPage(1);
    if (s !== startDate || e !== endDate) {
      setIsLoading(true);
      setLoadError(null);
      setStartDate(s);
      setEndDate(e);
    } else {
      void loadAnalytics(s, e);
    }
  };

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

    applyDateRange(s, e);
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

  const periodResult = data ? [
    { label: "Ganancia bruta de ventas", amount: data.summary.grossProfit },
    { label: "Mermas y bajas", amount: -data.summary.inventoryLosses },
    { label: "Penalidades de proveedores", amount: -data.summary.supplierPenalties },
    { label: "Resultado después de mermas y penalidades", amount: data.summary.netOperatingProfit },
  ] : [];

  // Exportar reporte consolidado a CSV
  const handleExportCsv = () => {
    if (!data) return;
    try {
      let csv = "\uFEFF"; // UTF-8 BOM
      csv += `${csvCell(`VENTAS Y GANANCIAS - ${STORE_NAME.toUpperCase()} (${data.startDate} al ${data.endDate})`)}\n\n`;

      csv += `RESUMEN EJECUTIVO\n`;
      csv += `Ventas Brutas;${csvCell(`${data.summary.grossSales.toFixed(2)} Bs`)}\n`;
      csv += `Devoluciones (-);${csvCell(`${data.summary.refunds.toFixed(2)} Bs`)}\n`;
      csv += `Ventas Netas;${csvCell(`${data.summary.netSales.toFixed(2)} Bs`)}\n`;
      csv += `Costo Mercaderia Vendida;${csvCell(`${data.summary.totalCost.toFixed(2)} Bs`)}\n`;
      csv += `Ganancia bruta de ventas;${csvCell(`${data.summary.grossProfit.toFixed(2)} Bs`)}\n`;
      csv += `Margen de Ganancia;${csvCell(`${data.summary.profitMargin.toFixed(1)}%`)}\n`;
      csv += `Tickets Emitidos;${csvCell(data.summary.totalSalesCount)}\n`;
      csv += `Ticket Promedio;${csvCell(`${data.summary.averageTicket.toFixed(2)} Bs`)}\n`;
      csv += `Venta Diaria Promedio;${csvCell(`${data.summary.averageDailySales.toFixed(2)} Bs`)}\n\n`;

      csv += `MEDIOS DE PAGO\n`;
      csv += `Efectivo en Gaveta;${csvCell(`${data.payments.cashAmount.toFixed(2)} Bs (${data.payments.cashCount} tickets)`)}\n`;
      csv += `Tarjeta;${csvCell(`${data.payments.cardAmount.toFixed(2)} Bs (${data.payments.cardCount} tickets)`)}\n`;
      csv += `QR Simple / Bancario;${csvCell(`${data.payments.transferAmount.toFixed(2)} Bs (${data.payments.transferCount} tickets)`)}\n`;
      csv += `Otros Medios;${csvCell(`${data.payments.otherAmount.toFixed(2)} Bs (${data.payments.otherCount} tickets)`)}\n\n`;

      csv += `EVOLUCION DIARIA\n`;
      csv += `Fecha;Dia;Venta Neta;Costo;Ganancia;Tickets\n`;
      data.dailyTrend.forEach((d) => {
        csv += [
          d.date,
          d.dayLabel,
          d.netSales.toFixed(2),
          d.cost.toFixed(2),
          d.profit.toFixed(2),
          d.salesCount,
        ]
          .map(csvCell)
          .join(";") + "\n";
      });
      csv += `\n`;

      csv += `GANANCIA BRUTA POR PRODUCTO\n`;
      csv += `Producto;SKU;Categoria;Vendidas;Devueltas;Netas;Recaudacion;Costo;Ganancia bruta;Margen %\n`;
      data.topProducts.forEach((p) => {
        csv += [
          p.productName,
          p.sku || "N/A",
          p.categoryName,
          p.unitsSold,
          p.unitsReturned,
          p.netUnits,
          p.revenue.toFixed(2),
          p.cost.toFixed(2),
          p.profit.toFixed(2),
          `${p.marginPercent.toFixed(1)}%`,
        ]
          .map(csvCell)
          .join(";") + "\n";
      });
      csv += `\n`;

      csv += `DETALLE DE VENTAS\n`;
      csv += `Ticket;Fecha;Hora;Cliente;Cajero;Metodo;Total Neto;Ganancia;Estado\n`;
      data.sales.forEach((s) => {
        csv += [
          s.saleNumber,
          s.date,
          s.time,
          s.customerName,
          s.cashierName,
          s.paymentMethod,
          s.netTotal.toFixed(2),
          s.profit.toFixed(2),
          s.status,
        ]
          .map(csvCell)
          .join(";") + "\n";
      });

      csv += "\nRESULTADO DEL PERIODO\n";
      for (const row of periodResult) {
        csv += [row.label, row.amount.toFixed(2)].map(csvCell).join(";") + "\n";
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Ventas_y_ganancias_${data.startDate}_al_${data.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            <h1 className="admin-page-title">Ventas y ganancias</h1>
          </div>
          <p className="admin-page-description">Ventas, costos y margen para el período elegido.</p>
        </div>

        {/* Acciones de exportación y presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones Presets Rápidos */}
          <div className="admin-segments">
            <button
              type="button"
              onClick={() => handlePresetChange("week")}
              aria-pressed={preset === "week"}
              className="admin-segment"
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("month")}
              aria-pressed={preset === "month"}
              className="admin-segment"
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("last30")}
              aria-pressed={preset === "last30"}
              className="admin-segment"
            >
              30 Días
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("year")}
              aria-pressed={preset === "year"}
              className="admin-segment"
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
                applyDateRange(e.target.value, endDate);
              }}
              className="font-bold text-admin-text bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-admin-muted uppercase ml-1">Al:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset("custom");
                applyDateRange(startDate, e.target.value);
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

      {loadError && !isLoading && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(startDate, endDate)}
            className="h-8 rounded-lg text-xs font-bold gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reintentar</span>
          </Button>
        </div>
      )}

      {/* =========================================================================
          2. TARJETAS BENTO KPI DEL PERIODO CONSOLIDADO
          ========================================================================= */}
      <div className="admin-kpi-grid">
        {/* Card 1: Ingresos Netos */}
        <div className="admin-financial-card admin-panel p-4 relative overflow-hidden">
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

        {/* Card 2: Ganancia bruta de ventas */}
        <div className="admin-financial-card admin-panel p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">
              Ganancia bruta de ventas
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
              ({(data?.summary.profitMargin ?? 0).toFixed(1)}% margen)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-admin-card-border flex items-center justify-between text-[11px] text-admin-muted">
            <span>Costo Total Mercancía:</span>
            <span className="font-bold">{formatCurrency(data?.summary.totalCost || 0)}</span>
          </div>

        </div>

        {/* Card 3: Tickets y Volumen */}
        <div className="admin-financial-card admin-panel p-4 relative overflow-hidden">
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
        <div className="admin-financial-card admin-panel p-4 relative overflow-hidden">
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
              <span className="text-admin-muted">Tarjeta ({data?.payments.cardCount || 0}):</span>
              <span className="font-semibold text-admin-text">
                {formatCurrency(data?.payments.cardAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-muted">QR Bancario ({data?.payments.transferCount || 0}):</span>
              <span className="font-semibold text-admin-brand-text">
                {formatCurrency(data?.payments.transferAmount || 0)}
              </span>
            </div>
            {(data?.payments.otherAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-admin-muted">Otros ({data?.payments.otherCount || 0}):</span>
                <span className="font-semibold text-admin-text">
                  {formatCurrency(data?.payments.otherAmount || 0)}
                </span>
              </div>
            )}
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
        <div className="p-5 admin-panel space-y-3">
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
                        d.netSales > 0 ? "admin-chart-bar" : "bg-transparent"
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

      {data && data.dailyTrend.length > 60 && (
        <div className="p-4 admin-panel flex items-center gap-3 text-xs text-admin-muted">
          <BarChart2 className="h-4 w-4 text-admin-brand-text shrink-0" />
          <span>
            El gráfico de barras se omite para rangos mayores a 60 días ({data.dailyTrend.length} días consultados). El detalle completo permanece disponible en la tabla inferior y en la exportación CSV.
          </span>
        </div>
      )}

      {/* =========================================================================
          4. PESTAÑAS DE TABLAS DE DETALLE
          ========================================================================= */}
      <div className="space-y-4">
        <div className="admin-segments">
          <button
            type="button"
            onClick={() => setActiveTab("evolucion")}
            aria-pressed={activeTab === "evolucion"}
            className="admin-segment"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Evolución Diaria ({data?.dailyTrend.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("productos")}
            aria-pressed={activeTab === "productos"}
            className="admin-segment"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Productos vendidos ({data?.topProducts.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cajeros")}
            aria-pressed={activeTab === "cajeros"}
            className="admin-segment"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Rendimiento por Operador ({data?.cashiers.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ventas")}
            aria-pressed={activeTab === "ventas"}
            className="admin-segment"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Todas las Ventas ({data?.sales.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: EVOLUCIÓN DÍA POR DÍA */}
        {activeTab === "evolucion" && (
          <div className="admin-panel overflow-hidden">
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
                            {d.refunds > 0 ? `-${formatCurrency(d.refunds)}` : formatCurrency(0)}
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
          <div className="admin-panel overflow-hidden">
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
                            <div className="min-w-0">
                              <p className="font-bold text-admin-text">{p.productName}</p>
                              {p.sku && <p className="text-[11px] text-admin-muted">{p.sku}</p>}
                            </div>
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
          <div className="admin-panel overflow-hidden">
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
          <div className="admin-panel overflow-hidden space-y-3">
            <div className="p-4 border-b border-admin-card-border flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-admin-muted" />
                <Input
                  value={salesSearch}
                  onChange={(e) => {
                    setSalesSearch(e.target.value);
                    setSalesPage(1);
                  }}
                  placeholder="Buscar ticket, cliente o cajero..."
                  className="h-9 pl-8 text-xs rounded-xl bg-admin-raised border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={salesFilterMethod}
                  onChange={(e) => {
                    setSalesFilterMethod(e.target.value);
                    setSalesPage(1);
                  }}
                  className="h-9 px-3 text-xs rounded-xl bg-admin-raised border border-slate-200 font-medium text-slate-700"
                >
                  <option value="all">Todos los Métodos</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">QR / Transferencia</option>
                  <option value="other">Otro</option>
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
                          {s.paymentMethod === "cash"
                            ? "Efectivo"
                            : s.paymentMethod === "card"
                            ? "Tarjeta"
                            : s.paymentMethod === "other"
                            ? "Otro"
                            : "QR / Transf."}
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
      {data && (
        <section className="admin-panel p-5" aria-labelledby="period-result-title">
          <h2 id="period-result-title" className="font-semibold text-admin-text">Resultado del período</h2>
          <dl className="mt-3 divide-y divide-admin-card-border">
            {periodResult.map(row => (
              <div key={row.label} className="flex justify-between gap-4 py-2 text-sm last:font-bold">
                <dt>{row.label}</dt>
                <dd className="tabular-nums">{formatCurrency(row.amount || 0)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
