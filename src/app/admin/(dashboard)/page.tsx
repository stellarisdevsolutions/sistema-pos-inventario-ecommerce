"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrendingUp,
  Package,
  AlertCircle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Boxes,
  Truck,
  Receipt,
  User,
  Wallet,
  Printer,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import DashboardLoading from "./loading";
import {
  getDashboardSummaryAction,
  type DashboardData,
  type DashboardSalesItem,
} from "@/app/admin/actions/dashboard";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [activeChannelTab, setActiveChannelTab] = useState<"all" | "pos" | "administrative">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getDashboardSummaryAction();
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.recentSales.length > 0) {
          setSelectedSaleId(res.data.recentSales[0].id);
        }
      } else {
        toast.error("Error al cargar datos", {
          description: res.error || "No se pudieron obtener las métricas de la base de datos.",
        });
      }
    } catch {
      toast.error("Error de conexión", {
        description: "No se pudo comunicar con el servidor.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !data) {
    return <DashboardLoading />;
  }

  const {
    kpis,
    recentSales,
    criticalStockProducts,
    totalInventoryValue,
    recentAdjustments,
    monthLossesTotal,
  } = data;

  const filteredSales = recentSales.filter((s) => {
    if (activeChannelTab === "pos" && s.channel !== "pos") return false;
    if (activeChannelTab === "administrative" && s.channel !== "administrative") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        s.saleNumber.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.cashier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedSale: DashboardSalesItem | undefined =
    recentSales.find((s) => s.id === selectedSaleId) || recentSales[0];

  const handlePrintTicket = (sale: DashboardSalesItem) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      toast.error("Ventana de impresión bloqueada por el navegador");
      return;
    }

    const itemsHtml = sale.items
      .map(
        (it) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
          <span>${it.quantity}x ${it.name}</span>
          <span style="font-weight:bold;">${CURRENCY_SYMBOL} ${it.subtotal.toFixed(2)}</span>
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket #${sale.saleNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { font-family: monospace; font-size: 11px; margin: 0; padding: 10px; color: #000; }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; margin: 3px 0; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin:0; font-size:16px;">AURA STUDIO</h2>
            <p style="margin:2px 0; font-size:10px;">TIENDA & POS OFICIAL</p>
            <p style="margin:2px 0; font-size:10px;">La Paz, Bolivia</p>
          </div>
          <div class="divider"></div>
          <div>
            <div class="flex-between"><span>Ticket:</span><span class="bold">#${sale.saleNumber}</span></div>
            <div class="flex-between"><span>Fecha:</span><span>${sale.time}</span></div>
            <div class="flex-between"><span>Cajero:</span><span>${sale.cashier}</span></div>
            <div class="flex-between"><span>Cliente:</span><span>${sale.customer}</span></div>
          </div>
          <div class="divider"></div>
          <div style="font-size:10px; margin-bottom:4px; font-weight:bold;">DETALLE:</div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="flex-between"><span class="bold">TOTAL:</span><span class="bold" style="font-size:14px;">${CURRENCY_SYMBOL} ${sale.total.toFixed(2)}</span></div>
          <div class="flex-between"><span>Medio de Pago:</span><span class="bold">${sale.paymentMethod}</span></div>
          ${
            sale.paymentMethod === "Efectivo" && sale.cashGiven > 0
              ? `
            <div class="flex-between"><span>Recibido:</span><span>${CURRENCY_SYMBOL} ${sale.cashGiven.toFixed(2)}</span></div>
            <div class="flex-between"><span>Cambio/Vuelto:</span><span>${CURRENCY_SYMBOL} ${sale.changeGiven.toFixed(2)}</span></div>
          `
              : ""
          }
          <div class="divider"></div>
          <div class="text-center" style="margin-top:12px; font-size:10px;">
            <p style="margin:2px 0;">¡GRACIAS POR SU COMPRA!</p>
            <p style="margin:2px 0; font-size:8px;">Comprobante de Control Interno</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto select-none">
      {/* =========================================================================
          1. HEADER DEL PANEL EN VIVO
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Panel General
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
              En Vivo • Neon DB
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Métricas de facturación comercial, utilidad bruta real en tiempo real y arqueo de turnos.
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            title="Refrescar métricas en vivo"
            className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            <span>Actualizar</span>
          </Button>

          <Link href="/admin/cajas">
            <button className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>Turnos & Arqueos</span>
            </button>
          </Link>

          <Link href="/admin/ventas">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black gap-2 shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Cobrar en POS</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI PRINCIPALES (DATOS REALES EN BS)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VENTAS TOTALES DEL MES */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ventas del Mes</span>
              <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.monthSalesTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <span>{kpis.monthSalesCount} tickets cobrados</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span>Canales de venta</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {kpis.posPercentage}% POS • {kpis.adminPercentage}% Adm.
            </span>
          </div>
        </div>

        {/* KPI 2: UTILIDAD / GANANCIA BRUTA REAL */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Ganancia Bruta Real
              </span>
              <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.grossProfit.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-1">
              <span>{kpis.profitMargin.toFixed(1)}% margen</span>
              <span className="text-slate-400 font-medium">(PVP - Costo Kardex)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span>Rendimiento comercial</span>
            <span className="font-bold text-indigo-600">Utilidad auditada</span>
          </div>
        </div>

        {/* KPI 3: TICKET PROMEDIO */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Ticket Promedio
              </span>
              <div className="h-7 w-7 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.averageTicket.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600 mt-1">
              <span>Promedio por transacción</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span>Transacciones analizadas</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {kpis.monthSalesCount} ventas
            </span>
          </div>
        </div>

        {/* KPI 4: EFECTIVO EN CAJAS & MÉTODOS DE PAGO */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Efectivo en Gavetas
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.cashInDrawers.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
              {kpis.activeDrawersCount} de {kpis.totalDrawersCount} terminales activas
            </span>
          </div>

          {/* Desglose: Solo Efectivo y QR Simple */}
          <div className="pt-2 flex items-center gap-2 justify-between">
            <div className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-600 text-white text-center shadow-xs">
              <span className="block text-[8px] font-mono opacity-80 uppercase tracking-wider">Efectivo</span>
              <span className="block text-xs font-black">
                {CURRENCY_SYMBOL} {kpis.cashAmount.toFixed(0)}
              </span>
            </div>

            <div className="flex-1 py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">QR Simple</span>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {CURRENCY_SYMBOL} {kpis.qrAmount.toFixed(0)}
              </span>
            </div>

            <Link href="/admin/cajas">
              <button className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold shrink-0 hover:bg-black transition-colors cursor-pointer">
                Arqueo
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BARRA DE FILTROS EN PÍLDORA
          ========================================================================= */}
      <section className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-2xs">
          <span>Canal</span>
          <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
            {activeChannelTab === "all" ? "★" : activeChannelTab === "pos" ? "P" : "A"}
          </span>
        </span>

        <button
          onClick={() => setActiveChannelTab("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer",
            activeChannelTab === "all"
              ? "bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
        >
          Todos ({recentSales.length})
        </button>

        <button
          onClick={() => setActiveChannelTab("pos")}
          className={cn(
            "px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer",
            activeChannelTab === "pos"
              ? "bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
        >
          Mostrador POS
        </button>

        <button
          onClick={() => setActiveChannelTab("administrative")}
          className={cn(
            "px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer",
            activeChannelTab === "administrative"
              ? "bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
        >
          Venta Administrativa
        </button>

        <div className="relative ml-auto w-full sm:w-56 mt-2 sm:mt-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ticket, cliente..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
          />
        </div>
      </section>

      {/* =========================================================================
          4. CONTENEDOR SPLIT BENTO OSCURO - TICKETS REALES EN TIEMPO REAL
          ========================================================================= */}
      <section className="rounded-3xl bg-[#11162b] border border-[#1e2648] p-6 lg:p-7 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2648]">
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              Monitor de Ventas & Tickets en Tiempo Real
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier ticket para auditar su margen de ganancia y comprobante de cobro.
            </p>
          </div>

          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-bold w-fit">
            Sincronizado con Neon DB
          </Badge>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-slate-500 stroke-[1.5]" />
            <p className="text-sm font-medium">No se encontraron ventas para el filtro seleccionado.</p>
            <Link href="/admin/ventas">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                + Realizar Venta en POS
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA: LISTA INTERACTIVA DE TICKETS */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                Últimas Transacciones ({filteredSales.length})
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredSales.map((sale) => {
                  const isSelected = sale.id === selectedSaleId;

                  return (
                    <div
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer",
                        isSelected
                          ? "bg-[#28325a] border border-indigo-400/50 shadow-md scale-[1.01]"
                          : "bg-[#161c38]/60 hover:bg-[#1a2144] border border-[#222b52]/50 text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-900/60 border border-indigo-400/30 flex items-center justify-center font-black text-indigo-200 text-xs shrink-0">
                          {sale.customer.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            #{sale.saleNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sale.time} • {sale.cashier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                            sale.channel === "pos"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          )}
                        >
                          {sale.channel === "pos" ? "POS" : "Adm."}
                        </span>
                        <span className="text-sm font-black text-white">
                          {CURRENCY_SYMBOL} {sale.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA: TARJETA DE DETALLE AUDITADO */}
            {selectedSale && (
              <div className="lg:col-span-7">
                <div className="rounded-3xl bg-[#1c234a] border border-[#2b356c] p-6 lg:p-7 shadow-2xl space-y-6">
                  {/* Encabezado del Detalle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2b356c]">
                    <div>
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                        Ticket Auditado
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          #{selectedSale.saleNumber}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {selectedSale.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-900/60 border border-indigo-400/40 flex items-center justify-center font-bold text-indigo-200 text-xs">
                        {selectedSale.customer.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">
                          {selectedSale.customer}
                        </span>
                        <span className="text-[10px] text-indigo-300">
                          {selectedSale.channelLabel} • {selectedSale.cashier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Ítems Vendidos */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Productos Desglosados ({selectedSale.items.length})
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedSale.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-[#262f60]/80 border border-indigo-400/20 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-white text-xs">{item.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.quantity} ud x {CURRENCY_SYMBOL} {item.unitPrice.toFixed(2)} (Costo: {CURRENCY_SYMBOL} {item.unitCost.toFixed(2)})
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-white block">
                              {CURRENCY_SYMBOL} {item.subtotal.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">
                              +{CURRENCY_SYMBOL} {(item.unitPrice - item.unitCost).toFixed(2)} ganancia
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen Financiero y Métodos de Cobro */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-[#2b356c] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Subtotal</span>
                      <span className="text-sm font-bold text-slate-200">
                        {CURRENCY_SYMBOL} {selectedSale.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Costo Total</span>
                      <span className="text-sm font-bold text-slate-200">
                        {CURRENCY_SYMBOL} {selectedSale.costTotal.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Utilidad Neta</span>
                      <span className="text-sm font-black text-emerald-400">
                        +{CURRENCY_SYMBOL} {selectedSale.grossProfit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-300 block font-medium">Total Cobrado</span>
                      <span className="text-base font-black text-white">
                        {CURRENCY_SYMBOL} {selectedSale.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pie de Acción: Vuelto y Botón de Reimpresión */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-400">Medio: </span>
                      <span className="font-bold text-white">{selectedSale.paymentMethod}</span>
                      {selectedSale.changeGiven > 0 && (
                        <span className="ml-2 text-emerald-400 font-bold">
                          (Vuelto: {CURRENCY_SYMBOL} {selectedSale.changeGiven.toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href="/admin/inventario">
                        <button className="h-10 px-4 rounded-full bg-[#262f60] hover:bg-[#323d7a] text-indigo-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
                          <Boxes className="h-4 w-4" />
                          <span>Ver en Kardex</span>
                        </button>
                      </Link>

                      <button
                        onClick={() => handlePrintTicket(selectedSale)}
                        className="h-10 px-5 rounded-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Imprimir Ticket</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          5. FILA INFERIOR: CONTROL DE INVENTARIO CRÍTICO & MERMAS REALES
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bento A: Alertas de Quiebre de Stock */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Stock Crítico para Reposición
                  </h3>
                  <p className="text-[11px] text-slate-400">Productos que están por debajo de su stock mínimo</p>
                </div>
              </div>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                {criticalStockProducts.length} en alerta
              </Badge>
            </div>

            {criticalStockProducts.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                ✓ Todo el inventario se encuentra por encima del stock mínimo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {criticalStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        SKU: {p.sku} • {p.supplier}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-amber-600 text-sm">
                        {p.stock} uds restantes
                      </span>
                      <span className="block text-[10px] text-slate-400">mín. {p.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Valor almacén: {CURRENCY_SYMBOL} {totalInventoryValue.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </span>
            <Link href="/admin/compras">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-indigo-200 text-indigo-600 dark:border-indigo-800">
                <Truck className="h-3.5 w-3.5" />
                <span>Generar Orden de Compra</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento B: Mermas & Pérdidas por Producto Dañado (Bajas Reales) */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Auditoría de Mermas & Bajas
                  </h3>
                  <p className="text-[11px] text-slate-400">Pérdidas monetarias por productos defectuosos o rotos</p>
                </div>
              </div>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                {CURRENCY_SYMBOL} {monthLossesTotal.toFixed(2)} este mes
              </Badge>
            </div>

            {recentAdjustments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                ✓ No se han registrado actas de merma o baja este mes.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {recentAdjustments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-rose-800 dark:text-rose-300 block">
                        Acta #{a.adjustmentNumber}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {a.quantity}x {a.productName} • {a.reasonLabel} • Auth: {a.authorizedBy}
                      </p>
                    </div>
                    <span className="font-black text-rose-600 text-sm">
                      -{CURRENCY_SYMBOL} {a.totalCost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Control de pérdidas inmutable</span>
            <Link href="/admin/inventario">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-rose-200 text-rose-600 dark:border-rose-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Ver Actas de Baja</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
