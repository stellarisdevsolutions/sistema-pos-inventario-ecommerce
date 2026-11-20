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
import { useAuth } from "@/context/auth-context";
import DashboardLoading from "./loading";
import {
  getDashboardSummaryAction,
  type DashboardData,
  type DashboardSalesItem,
} from "@/app/admin/actions/dashboard";

export default function AdminDashboardPage() {
  const { user } = useAuth();
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
          1. HERO GREETING: LIMPIO & AL GRANO (ESTILO QUIXOTIC / DRIBBLE)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Hola, {user?.name?.split(" ")[0] || "Administrador"} 👋
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Resumen comercial y control de caja
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            title="Refrescar métricas"
            className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Actualizar</span>
          </Button>

          <Link href="/admin/cajas">
            <button className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
              <Clock className="h-4 w-4 text-[var(--admin-brand)]" />
              <span>Turnos & Arqueos</span>
            </button>
          </Link>

          <Link href="/admin/ventas">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white text-xs font-black gap-2 shadow-md shadow-[var(--admin-brand)]/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Cobrar en POS</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI BENTO (VALORES EN BS - TEXTO CONCISO)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VENTAS TOTALES DEL MES */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ventas del Mes</span>
              <div className="h-8 w-8 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-[var(--admin-brand)]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.monthSalesTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--admin-brand)] mt-1">
              <span>{kpis.monthSalesCount} tickets cobrados</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            <span>Canales</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {kpis.posPercentage}% POS • {kpis.adminPercentage}% Adm
            </span>
          </div>
        </div>

        {/* KPI 2: GANANCIA BRUTA REAL */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Ganancia Bruta
              </span>
              <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.grossProfit.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1">
              <span>{kpis.profitMargin.toFixed(1)}% margen neto</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            <span>Base</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">PVP vs Costo Kardex</span>
          </div>
        </div>

        {/* KPI 3: TICKET PROMEDIO */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Ticket Promedio
              </span>
              <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.averageTicket.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-purple-600 mt-1">
              <span>Por transacción</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            <span>Muestra</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {kpis.monthSalesCount} ventas
            </span>
          </div>
        </div>

        {/* KPI 4: EFECTIVO EN CAJAS */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Efectivo en Gavetas
              </span>
              <div className="h-8 w-8 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-[var(--admin-brand)]">
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              {CURRENCY_SYMBOL} {kpis.cashInDrawers.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>

            <span className="text-xs text-[var(--admin-brand)] font-bold mt-1 block">
              {kpis.activeDrawersCount} de {kpis.totalDrawersCount} terminales activas
            </span>
          </div>

          {/* Desglose: Efectivo y QR */}
          <div className="pt-3 flex items-center gap-2 justify-between">
            <div className="flex-1 py-1.5 px-2 rounded-2xl bg-[var(--admin-brand)] text-white text-center shadow-2xs">
              <span className="block text-[8px] font-mono opacity-80 uppercase tracking-wider">Efectivo</span>
              <span className="block text-xs font-black">
                {CURRENCY_SYMBOL} {kpis.cashAmount.toFixed(0)}
              </span>
            </div>

            <div className="flex-1 py-1.5 px-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">QR Simple</span>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {CURRENCY_SYMBOL} {kpis.qrAmount.toFixed(0)}
              </span>
            </div>

            <Link href="/admin/cajas">
              <button className="h-9 px-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold shrink-0 hover:bg-black transition-colors cursor-pointer">
                Arqueo
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BARRA DE FILTROS SEGMENTADA (ESTILO MODERNO BENTO)
          ========================================================================= */}
      <section className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setActiveChannelTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeChannelTab === "all"
                ? "bg-white dark:bg-slate-900 text-[var(--admin-brand)] shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Todos ({recentSales.length})
          </button>

          <button
            onClick={() => setActiveChannelTab("pos")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeChannelTab === "pos"
                ? "bg-white dark:bg-slate-900 text-[var(--admin-brand)] shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Mostrador POS
          </button>

          <button
            onClick={() => setActiveChannelTab("administrative")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeChannelTab === "administrative"
                ? "bg-white dark:bg-slate-900 text-[var(--admin-brand)] shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Venta Administrativa
          </button>
        </div>

        <div className="relative ml-auto w-full sm:w-64 mt-2 sm:mt-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ticket, cliente..."
            className="w-full h-9 pl-9 pr-4 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[var(--admin-brand)]/20 focus:border-[var(--admin-brand)] shadow-2xs"
          />
        </div>
      </section>

      {/* =========================================================================
          4. CONTENEDOR BENTO - TICKETS EN TIEMPO REAL CON CELESTE/AZUL
          ========================================================================= */}
      <section className="rounded-3xl bg-slate-900 dark:bg-slate-950 border border-slate-800 p-6 lg:p-7 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              Últimas Transacciones
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoría directa de tickets y comprobantes
            </p>
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-medium">No se encontraron ventas para el filtro seleccionado.</p>
            <Link href="/admin/ventas">
              <Button size="sm" className="bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white text-xs font-bold rounded-xl">
                + Realizar Venta en POS
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA: LISTA INTERACTIVA DE TICKETS */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                Últimos Tickets ({filteredSales.length})
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                {filteredSales.map((sale) => {
                  const isSelected = sale.id === selectedSaleId;

                  return (
                    <div
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer",
                        isSelected
                          ? "bg-sky-950/80 border border-sky-400/60 shadow-md scale-[1.01]"
                          : "bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-sky-900/60 border border-sky-400/30 flex items-center justify-center font-black text-sky-200 text-xs shrink-0">
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
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              sale.channel === "pos" ? "bg-sky-400" : "bg-emerald-400"
                            )}
                          />
                          <span className={sale.channel === "pos" ? "text-sky-300" : "text-emerald-300"}>
                            {sale.channel === "pos" ? "POS" : "Adm"}
                          </span>
                        </div>
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
                <div className="rounded-3xl bg-slate-800/90 border border-slate-700/80 p-6 lg:p-7 shadow-2xl space-y-6">
                  {/* Encabezado del Detalle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
                    <div>
                      <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                        Detalle del Comprobante
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          #{selectedSale.saleNumber}
                        </h3>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span>{selectedSale.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-sky-900/60 border border-sky-400/40 flex items-center justify-center font-bold text-sky-200 text-xs">
                        {selectedSale.customer.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">
                          {selectedSale.customer}
                        </span>
                        <span className="text-[10px] text-sky-300">
                          {selectedSale.channelLabel} • {selectedSale.cashier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Ítems Vendidos */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Productos ({selectedSale.items.length})
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {selectedSale.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between"
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
                              +{CURRENCY_SYMBOL} {(item.unitPrice - item.unitCost).toFixed(2)} margen
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen Financiero */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                      <span className="text-[10px] text-slate-400 block font-medium">Utilidad</span>
                      <span className="text-sm font-black text-emerald-400">
                        +{CURRENCY_SYMBOL} {selectedSale.grossProfit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-sky-400 block font-medium">Total Cobrado</span>
                      <span className="text-base font-black text-white">
                        {CURRENCY_SYMBOL} {selectedSale.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pie de Acción: Vuelto e Impresión */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-400">Medio: </span>
                      <span className="font-bold text-white">{selectedSale.paymentMethod}</span>
                      {selectedSale.changeGiven > 0 && (
                        <span className="ml-2 text-emerald-400 font-bold">
                          (Cambio: {CURRENCY_SYMBOL} {selectedSale.changeGiven.toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href="/admin/inventario">
                        <button className="h-10 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-sky-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
                          <Boxes className="h-4 w-4" />
                          <span>Kardex</span>
                        </button>
                      </Link>

                      <button
                        onClick={() => handlePrintTicket(selectedSale)}
                        className="h-10 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
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
          5. FILA INFERIOR BENTO: STOCK CRÍTICO & MERMAS
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bento A: Stock Crítico */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Stock Crítico
                  </h3>
                  <p className="text-[11px] text-slate-400">Por debajo del stock mínimo</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{criticalStockProducts.length} en alerta</span>
              </div>
            </div>

            {criticalStockProducts.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                ✓ Todo el inventario se encuentra en nivel óptimo.
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
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-[var(--admin-brand)]/30 text-[var(--admin-brand)]">
                <Truck className="h-3.5 w-3.5" />
                <span>Orden de Compra</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento B: Mermas & Bajas */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Mermas & Bajas
                  </h3>
                  <p className="text-[11px] text-slate-400">Pérdidas registradas por merma o daño</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>{CURRENCY_SYMBOL} {monthLossesTotal.toFixed(2)} este mes</span>
              </div>
            </div>

            {recentAdjustments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                ✓ No hay actas de baja este mes.
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
                        {a.quantity}x {a.productName} • {a.reasonLabel}
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
            <span className="text-xs text-slate-500 font-medium">Control de pérdidas</span>
            <Link href="/admin/inventario">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-rose-200 text-rose-600 dark:border-rose-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Ver Actas</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
