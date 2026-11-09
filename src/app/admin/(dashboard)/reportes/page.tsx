"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ShieldCheck,
  Building2,
  RefreshCw,
  Search,
  Filter,
  Package,
  Layers,
  Clock,
  ArrowRight,
  Lock,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  getReporteZAction,
  type ReporteZData,
  type ReporteZShiftItem,
  type ReporteZTopProduct,
  type ReporteZSaleItem,
  type ReporteZReturnItem,
} from "@/app/admin/actions/reports";

export default function ReportesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [reportData, setReportData] = useState<ReporteZData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resumen" | "turnos" | "productos" | "devoluciones" | "ventas">("resumen");

  // Buscador para detalle de ventas
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilterMethod, setSalesFilterMethod] = useState("all");

  // Modal de Reporte Z Térmico 80mm
  const [thermalModalOpen, setThermalModalOpen] = useState(false);

  const loadReport = async (dateStr?: string) => {
    setIsLoading(true);
    try {
      const targetDate = dateStr || selectedDate;
      const res = await getReporteZAction(targetDate);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        toast.error(res.error || "No se pudo cargar el Reporte Z.");
      }
    } catch {
      toast.error("Error al conectar con la base de datos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate]);

  // Accesos rápidos de fecha
  const setQuickDate = (type: "today" | "yesterday") => {
    const d = new Date();
    if (type === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    const str = d.toISOString().split("T")[0];
    setSelectedDate(str);
  };

  // Filtrado de ventas en la pestaña de detalle
  const filteredSales = useMemo(() => {
    if (!reportData) return [];
    const q = salesSearch.toLowerCase().trim();
    return reportData.sales.filter((s) => {
      const matchQ =
        !q ||
        s.saleNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q);

      const matchMethod =
        salesFilterMethod === "all" || s.paymentMethod === salesFilterMethod;

      return matchQ && matchMethod;
    });
  }, [reportData, salesSearch, salesFilterMethod]);

  // Paginación de 15 filas por página
  const PAGE_SIZE = 15;
  const [productsPage, setProductsPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  useEffect(() => {
    setSalesPage(1);
  }, [salesSearch, salesFilterMethod, selectedDate]);

  useEffect(() => {
    setProductsPage(1);
  }, [selectedDate]);

  const totalProductsPages = Math.ceil((reportData?.topProducts.length || 0) / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    if (!reportData) return [];
    return reportData.topProducts.slice(
      (productsPage - 1) * PAGE_SIZE,
      productsPage * PAGE_SIZE
    );
  }, [reportData, productsPage]);

  const totalSalesPages = Math.ceil(filteredSales.length / PAGE_SIZE) || 1;
  const paginatedSales = useMemo(() => {
    return filteredSales.slice(
      (salesPage - 1) * PAGE_SIZE,
      salesPage * PAGE_SIZE
    );
  }, [filteredSales, salesPage]);

  // Exportar a CSV (Excel compatible con BOM UTF-8)
  const handleExportCsv = () => {
    if (!reportData) return;
    try {
      let csv = "\uFEFF"; // UTF-8 BOM
      csv += `REPORTE Z Y CIERRE FINANCIERO DIARIO - AURA COMMERCE\n`;
      csv += `Fecha del Reporte:;${reportData.reportDate}\n`;
      csv += `Generado el:;${reportData.generatedAt}\n\n`;

      csv += `RESUMEN FINANCIERO\n`;
      csv += `Ventas Brutas;${reportData.summary.grossSales.toFixed(2)} Bs\n`;
      csv += `Devoluciones (-);${reportData.summary.refunds.toFixed(2)} Bs\n`;
      csv += `Ventas Netas;${reportData.summary.netSales.toFixed(2)} Bs\n`;
      csv += `Costo Mercaderia Vendida;${reportData.summary.totalCost.toFixed(2)} Bs\n`;
      csv += `Utilidad Bruta;${reportData.summary.grossProfit.toFixed(2)} Bs\n`;
      csv += `Margen de Ganancia;${reportData.summary.profitMargin.toFixed(1)}%\n`;
      csv += `Tickets Emitidos;${reportData.summary.totalSalesCount}\n`;
      csv += `Ticket Promedio;${reportData.summary.averageTicket.toFixed(2)} Bs\n\n`;

      csv += `MEDIOS DE PAGO\n`;
      csv += `Efectivo en Gavetas;${reportData.payments.cash.toFixed(2)} Bs\n`;
      csv += `QR Simple / Bancario;${reportData.payments.transfer.toFixed(2)} Bs\n\n`;

      csv += `ARQUEOS DE CAJA\n`;
      csv += `Turno;Caja;Cajero;Apertura;Cierre;Fondo Inicial;Efectivo Esperado;Conteo Fisico;Diferencia;Estado\n`;
      reportData.shifts.forEach((s) => {
        csv += `${s.shiftNumber};${s.cashRegisterName};${s.cashierName};${s.openedAt};${s.closedAt || "En curso"};${s.initialCash.toFixed(2)};${s.expectedCash.toFixed(2)};${s.actualCash !== null ? s.actualCash.toFixed(2) : "Pendiente"};${s.difference !== null ? s.difference.toFixed(2) : "Pendiente"};${s.status}\n`;
      });
      csv += `\n`;

      csv += `DETALLE DE VENTAS DEL DIA\n`;
      csv += `Ticket;Hora;Cliente;Caja/Canal;Operador;Metodo;Total Original;Devuelto;Total Neto;Utilidad;Estado\n`;
      reportData.sales.forEach((s) => {
        csv += `${s.saleNumber};${s.time};${s.customerName};${s.cashRegisterName};${s.cashierName};${s.paymentMethod};${s.originalTotal.toFixed(2)};${s.refundedAmount.toFixed(2)};${s.netTotal.toFixed(2)};${s.profit.toFixed(2)};${s.status}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Reporte_Z_${reportData.reportDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Archivo CSV generado y descargado exitosamente.");
    } catch {
      toast.error("Error al exportar los datos.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          1. HEADER CON SELECTOR DE FECHA Y ACCIONES DE EXPORTACIÓN
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-[#0284c7]" />
              Reporte Z & Balance Diario
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-md",
                reportData?.isToday
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40"
                  : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800"
              )}
            >
              {reportData?.isToday ? "Corte del Día (En Vivo)" : "Cierre Histórico"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consolidación oficial de ventas brutas, devoluciones, arqueo de gavetas y utilidad real del negocio.
          </p>
        </div>

        {/* Barra de herramientas: Selector de Fecha + Botones de Reporte */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones de Acceso Rápido */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setQuickDate("today")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                reportData?.isToday
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("yesterday")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all"
            >
              Ayer
            </button>
          </div>

          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReport(selectedDate)}
            disabled={isLoading}
            className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-700"
            title="Refrescar datos"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>

          {/* Exportar a CSV / Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!reportData || isLoading}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Excel / CSV</span>
          </Button>

          {/* Imprimir Reporte Z Térmico (80mm) */}
          <Button
            size="sm"
            onClick={() => setThermalModalOpen(true)}
            disabled={!reportData || isLoading}
            className="h-9 rounded-xl text-xs font-black gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md shadow-[#0284c7]/20 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Reporte Z (80mm)</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          2. TARJETAS BENTO KPI DEL BALANCE DIARIO
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ventas Netas Reales */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Venta Neta Total
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(reportData?.summary.netSales || 0)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Bruto: {formatCurrency(reportData?.summary.grossSales || 0)}</span>
            {reportData && reportData.summary.refunds > 0 && (
              <span className="text-amber-600 font-bold">
                Dev: -{formatCurrency(reportData.summary.refunds)}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Utilidad Bruta & Margen */}
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
              {formatCurrency(reportData?.summary.grossProfit || 0)}
            </span>
            <Badge variant="outline" className="text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-200">
              {reportData?.summary.profitMargin.toFixed(1)}% Margen
            </Badge>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Costo Mercadería:</span>
            <span className="font-bold">{formatCurrency(reportData?.summary.totalCost || 0)}</span>
          </div>
        </div>

        {/* Card 3: Desglose de Medios de Pago */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Flujo de Cobro
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Efectivo en Gavetas:</span>
              <span className="font-black text-slate-900 dark:text-white">
                {formatCurrency(reportData?.payments.cash || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">QR / Banco:</span>
              <span className="font-black text-[#0284c7]">
                {formatCurrency(reportData?.payments.transfer || 0)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{reportData?.summary.totalSalesCount || 0} tickets emitidos</span>
            <span>Prom: {formatCurrency(reportData?.summary.averageTicket || 0)}</span>
          </div>
        </div>

        {/* Card 4: Auditoría de Cajas (Cuadre Ciego) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cuadre de Cajas Físicas
            </span>
            <div
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center",
                (reportData?.cashDrawerSummary.totalDifference || 0) === 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950"
                  : (reportData?.cashDrawerSummary.totalDifference || 0) < 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950"
              )}
            >
              {(reportData?.cashDrawerSummary.totalDifference || 0) === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-black",
                (reportData?.cashDrawerSummary.totalDifference || 0) === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : (reportData?.cashDrawerSummary.totalDifference || 0) < 0
                  ? "text-rose-600"
                  : "text-amber-600"
              )}
            >
              {reportData && reportData.cashDrawerSummary.totalDifference !== 0
                ? `${reportData.cashDrawerSummary.totalDifference > 0 ? "+" : ""}${formatCurrency(reportData.cashDrawerSummary.totalDifference)}`
                : "0.00 Bs"}
            </span>
            <span className="text-[10px] text-slate-400">
              {(reportData?.cashDrawerSummary.totalDifference || 0) === 0
                ? "Cuadre Exacto"
                : (reportData?.cashDrawerSummary.totalDifference || 0) < 0
                ? "Faltante en Gaveta"
                : "Sobrante"}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{reportData?.cashDrawerSummary.closedShiftsCount || 0} cajas arqueadas</span>
            {reportData && reportData.cashDrawerSummary.openShiftsCount > 0 && (
              <span className="text-amber-600 font-bold">
                {reportData.cashDrawerSummary.openShiftsCount} aún abierta(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. PESTAÑAS DE ANÁLISIS DETALLADO
          ========================================================================= */}
      <div className="space-y-4">
        {/* Navegación entre pestañas */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("resumen")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "resumen"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Balance Consolidado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("turnos")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "turnos"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Arqueo de Turnos ({reportData?.shifts.length || 0})</span>
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
            <span>Top Productos ({reportData?.topProducts.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("devoluciones")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "devoluciones"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Auditoría de Devoluciones ({reportData?.returns.length || 0})</span>
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
            <span>Detalle de Ventas ({reportData?.sales.length || 0})</span>
          </button>
        </div>

        {/* =========================================================================
            PESTAÑA 1: BALANCE CONSOLIDADO
            ========================================================================= */}
        {activeTab === "resumen" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Desglose de Ventas y Utilidades */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#0284c7]" />
                Estado de Resultados Diario
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Ventas Brutas Facturadas:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(reportData?.summary.grossSales || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-amber-600">
                  <span>(-) Devoluciones / Reintegros:</span>
                  <span className="font-bold">
                    -{formatCurrency(reportData?.summary.refunds || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700 font-black text-sm">
                  <span>(=) VENTAS NETAS:</span>
                  <span className="text-[#0284c7]">
                    {formatCurrency(reportData?.summary.netSales || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-500">
                  <span>(-) Costo de Mercancía Vendida (COGS):</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    -{formatCurrency(reportData?.summary.totalCost || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 text-emerald-800 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800">
                  <span>(=) GANANCIA BRUTA DEL DÍA:</span>
                  <span>{formatCurrency(reportData?.summary.grossProfit || 0)}</span>
                </div>
              </div>
            </div>

            {/* Desglose por Canales y Cajas */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                Segregación por Canal de Cobro
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                      Cajas Físicas Mostrador (POS)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white">
                      {reportData?.channels.posShiftCount || 0} tickets
                    </Badge>
                  </div>
                  <div className="flex justify-between text-slate-500 pt-1 text-xs">
                    <span>Recaudado en gavetas:</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      {formatCurrency(reportData?.channels.posShiftRevenue || 0)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-600" />
                      Ventas Administrativas Directas
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-purple-700">
                      {reportData?.channels.administrativeCount || 0} tickets
                    </Badge>
                  </div>
                  <div className="flex justify-between text-purple-700 dark:text-purple-400 pt-1 text-xs">
                    <span>Recaudado fuera de caja física:</span>
                    <span className="font-black text-purple-900 dark:text-purple-200 text-sm">
                      {formatCurrency(reportData?.channels.administrativeRevenue || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: ARQUEO DE TURNOS DE CAJA
            ========================================================================= */}
        {activeTab === "turnos" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Auditoría Individual de Gavetas Físicas
                </h3>
                <p className="text-xs text-slate-500">
                  Verificación de fondos iniciales, cobros en efectivo y cuadre de conteo ciego.
                </p>
              </div>
              <Link href="/admin/cajas">
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg gap-1">
                  <span>Ir a Control de Cajas</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Turno</th>
                    <th className="py-3 px-4">Caja</th>
                    <th className="py-3 px-4">Cajero</th>
                    <th className="py-3 px-4">Horario</th>
                    <th className="py-3 px-4">Fondo Inicial</th>
                    <th className="py-3 px-4">Efectivo Cobrado</th>
                    <th className="py-3 px-4">Saldo Esperado</th>
                    <th className="py-3 px-4">Conteo Físico</th>
                    <th className="py-3 px-4 text-center">Diferencia</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData?.shifts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400">
                        No se abrieron turnos de caja en esta fecha.
                      </td>
                    </tr>
                  ) : (
                    reportData?.shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {s.shiftNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {s.cashRegisterName}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {s.cashierName}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {s.openedAt} {s.closedAt ? `→ ${s.closedAt}` : "(Abierto)"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatCurrency(s.initialCash)}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-bold">
                          {formatCurrency(s.cashSales)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0284c7]">
                          {formatCurrency(s.expectedCash)}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {s.actualCash !== null ? formatCurrency(s.actualCash) : (
                            <span className="text-slate-400 italic">Pendiente</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.difference === null ? (
                            <span className="text-slate-400">-</span>
                          ) : s.difference === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              0.00 Bs
                            </span>
                          ) : s.difference < 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              {formatCurrency(s.difference)} (Faltante)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              +{formatCurrency(s.difference)} (Sobrante)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.status === "open" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                              Abierto
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              Cerrado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: TOP PRODUCTOS VENDIDOS
            ========================================================================= */}
        {activeTab === "productos" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Ranking de Productos por Recaudación y Margen
              </h3>
              <p className="text-xs text-slate-500">
                Detalle de unidades cobradas, unidades devueltas y ganancia neta generada.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Vendidas</th>
                    <th className="py-3 px-4 text-center">Devueltas</th>
                    <th className="py-3 px-4 text-center">Netas</th>
                    <th className="py-3 px-4 text-right">Recaudación Neta</th>
                    <th className="py-3 px-4 text-right">Costo Total</th>
                    <th className="py-3 px-4 text-right">Ganancia Bruta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No hay ventas registradas en esta fecha.
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
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {p.sku || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
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
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.profit)}
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
              totalItems={reportData?.topProducts.length || 0}
              pageSize={PAGE_SIZE}
              itemName="productos"
              onPageChange={setProductsPage}
            />
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 4: AUDITORÍA DE DEVOLUCIONES DEL DÍA
            ========================================================================= */}
        {activeTab === "devoluciones" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Registro Oficial de Devoluciones y Salidas de Gaveta
              </h3>
              <p className="text-xs text-slate-500">
                Trazabilidad de cada reingreso de mercancía autorizado por supervisión.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket Venta</th>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Cajero</th>
                    <th className="py-3 px-4 text-right">Monto Devuelto</th>
                    <th className="py-3 px-4">Motivo / Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData?.returns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No se registraron devoluciones en esta fecha.
                      </td>
                    </tr>
                  ) : (
                    reportData?.returns.map((r) => (
                      <tr key={r.saleId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          #{r.saleNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {r.time}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {r.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.cashierName}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-600">
                          -{formatCurrency(r.refundedAmount)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">
                          {r.notes || "Sin observaciones registradas"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 5: DETALLE DE TODAS LAS VENTAS DEL DÍA
            ========================================================================= */}
        {activeTab === "ventas" && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs space-y-3">
            {/* Filtros de búsqueda */}
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
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Terminal / Canal</th>
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
                      <td colSpan={9} className="text-center py-8 text-slate-400">
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
                          {s.time}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {s.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.cashRegisterName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.cashierName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-semibold text-slate-700">
                            {s.paymentMethod === "cash" ? "Efectivo" : "QR / Transf."}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {s.refundedAmount > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white">
                                {formatCurrency(s.netTotal)}
                              </span>
                              <span className="text-[10px] text-amber-600 line-through">
                                Orig: {formatCurrency(s.originalTotal)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-black text-slate-900 dark:text-white">
                              {formatCurrency(s.netTotal)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {formatCurrency(s.profit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.status === "completed" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completada
                            </span>
                          ) : s.status === "refunded" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Devolución
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Anulada
                            </span>
                          )}
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

      {/* =========================================================================
          4. MODAL DE TIRA TÉRMICA 80MM (REPORTE Z FISCAL DE CIERRE)
          ========================================================================= */}
      <Dialog open={thermalModalOpen} onOpenChange={setThermalModalOpen}>
        <DialogContent className="sm:max-w-xs p-6 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl print:p-0 print:border-none print:shadow-none max-h-[90vh] overflow-y-auto">
          <div id="thermal-reporte-z" className="space-y-3 font-mono text-xs">
            {/* Encabezado */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-black tracking-tight uppercase">
                Aura Commerce
              </h2>
              <p className="text-[10px] text-slate-500">Punto de Venta Central</p>
              <div className="my-1.5 py-1 px-2 rounded bg-slate-900 text-white font-black text-[11px] text-center">
                *** REPORTE Z - CIERRE DIARIO ***
              </div>
              <p className="text-[10px] text-slate-600">
                Fecha Contable: <strong>{reportData?.reportDate}</strong>
              </p>
              <p className="text-[9px] text-slate-400">
                Emitido: {reportData?.generatedAt}
              </p>
            </div>

            {/* Resumen de Ventas */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-200">
              <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                Ventas & Facturación
              </div>
              <div className="flex justify-between">
                <span>Venta Bruta:</span>
                <span className="font-bold">{formatCurrency(reportData?.summary.grossSales || 0)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Devoluciones (-):</span>
                <span>-{formatCurrency(reportData?.summary.refunds || 0)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                <span>VENTA NETA:</span>
                <span>{formatCurrency(reportData?.summary.netSales || 0)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Tickets Emitidos:</span>
                <span>{reportData?.summary.totalSalesCount || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Ticket Promedio:</span>
                <span>{formatCurrency(reportData?.summary.averageTicket || 0)}</span>
              </div>
            </div>

            {/* Medios de Pago */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-200">
              <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                Medios de Pago
              </div>
              <div className="flex justify-between">
                <span>Efectivo:</span>
                <span className="font-bold">{formatCurrency(reportData?.payments.cash || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>QR / Transf.:</span>
                <span className="font-bold">{formatCurrency(reportData?.payments.transfer || 0)}</span>
              </div>
            </div>

            {/* Arqueo de Cajas Físicas */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-200">
              <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                Control de Gavetas
              </div>
              <div className="flex justify-between">
                <span>Fondo Inicial:</span>
                <span>{formatCurrency(reportData?.cashDrawerSummary.totalInitialCash || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo Esperado:</span>
                <span className="font-bold">{formatCurrency(reportData?.cashDrawerSummary.totalExpectedCash || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Conteo Físico:</span>
                <span className="font-bold">{formatCurrency(reportData?.cashDrawerSummary.totalActualCash || 0)}</span>
              </div>
              <div className="flex justify-between font-black pt-1 border-t border-slate-200">
                <span>Diferencia Total:</span>
                <span
                  className={cn(
                    (reportData?.cashDrawerSummary.totalDifference || 0) === 0
                      ? "text-emerald-700"
                      : "text-rose-600"
                  )}
                >
                  {formatCurrency(reportData?.cashDrawerSummary.totalDifference || 0)}
                </span>
              </div>
            </div>

            {/* Utilidad y Rendimiento */}
            <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-200">
              <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                Rentabilidad
              </div>
              <div className="flex justify-between">
                <span>Costo Mercancía:</span>
                <span>{formatCurrency(reportData?.summary.totalCost || 0)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-700 text-xs">
                <span>Ganancia Bruta:</span>
                <span>{formatCurrency(reportData?.summary.grossProfit || 0)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Margen sobre Ventas:</span>
                <span className="font-bold">{reportData?.summary.profitMargin.toFixed(1)}%</span>
              </div>
            </div>

            {/* Firmas de Autorización */}
            <div className="pt-4 text-center space-y-6 text-[10px] text-slate-500">
              <div>
                <p className="border-t border-slate-400 pt-1 w-3/4 mx-auto font-bold text-slate-800">
                  Firma Supervisor de Caja
                </p>
                <p className="text-[9px]">Validación de Arqueo Físico</p>
              </div>
              <div>
                <p className="border-t border-slate-400 pt-1 w-3/4 mx-auto font-bold text-slate-800">
                  Firma Administrador General
                </p>
                <p className="text-[9px]">Cierre Fiscal y Contable</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setThermalModalOpen(false)}
              className="flex-1 text-xs h-9 rounded-xl border-slate-200"
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="flex-1 text-xs h-9 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold gap-1.5 shadow-md shadow-[#0284c7]/20"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir Tira</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
