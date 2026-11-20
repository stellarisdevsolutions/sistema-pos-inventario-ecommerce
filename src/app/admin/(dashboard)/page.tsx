"use client";

import { MetricCard } from "@/components/admin/metric-card";

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

function formatMetric(value: number) {
  return `${CURRENCY_SYMBOL} ${value.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
          1. HERO GREETING: LIMPIO & AL GRANO (ESTILO QUIXOTIC / DRIBBLE)
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="admin-page-title">Resumen del negocio</h1>
          <p className="admin-page-description">Ventas, inventario y efectivo en caja.</p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            title="Refrescar métricas"
            className="h-10 px-3.5 rounded-xl border-admin-card-border bg-admin-card-bg text-xs font-bold gap-1.5 hover:bg-admin-raised"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Actualizar</span>
          </Button>

          <Link href="/admin/cajas">
            <button className="h-10 px-4 rounded-xl border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised text-admin-secondary text-xs font-bold flex items-center gap-2 transition-all cursor-pointer">
              <Clock className="h-4 w-4 text-admin-brand-text" />
              <span>Turnos & Arqueos</span>
            </button>
          </Link>

          <Link href="/admin/ventas">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-semibold gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Cobrar en POS</span>
            </Button>
          </Link>
        </div>
      </div>

      <section className="admin-metrics" aria-label="Indicadores del negocio">
        <MetricCard
          label="Ventas del mes"
          value={formatMetric(kpis.monthSalesTotal)}
          detail={
            <>
              <span>{kpis.monthSalesCount} tickets · {kpis.posPercentage}% POS · {kpis.adminPercentage}% administración</span>
              {kpis.monthSalesCount > 0 && (
                <div className="admin-channel-mix" aria-hidden="true">
                  <span style={{ width: `${kpis.posPercentage}%` }} />
                </div>
              )}
            </>
          }
          icon={TrendingUp}
          appearance="lead"
        />
        <MetricCard
          label="Ganancia bruta"
          value={formatMetric(kpis.grossProfit)}
          detail={`${kpis.profitMargin.toFixed(1)}% de margen`}
          icon={DollarSign}
          tone="success"
        />
        <MetricCard
          label="Ticket promedio"
          value={formatMetric(kpis.averageTicket)}
          detail="Importe medio por venta"
          icon={Receipt}
          appearance="desk"
        />
        <MetricCard
          label="Efectivo en cajas"
          value={formatMetric(kpis.cashInDrawers)}
          detail={<>{kpis.activeDrawersCount} de {kpis.totalDrawersCount} terminales activas<br />Efectivo {formatMetric(kpis.cashAmount)} · QR {formatMetric(kpis.qrAmount)}</>}
          icon={Wallet}
        />
      </section>

      {/* =========================================================================
          3. BARRA DE FILTROS SEGMENTADA (ESTILO MODERNO BENTO)
          ========================================================================= */}
      <section className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <div className="admin-segments">
          <button
            onClick={() => setActiveChannelTab("all")}
            aria-pressed={activeChannelTab === "all"}
            className="admin-segment"
          >
            Todos ({recentSales.length})
          </button>

          <button
            onClick={() => setActiveChannelTab("pos")}
            aria-pressed={activeChannelTab === "pos"}
            className="admin-segment"
          >
            Mostrador POS
          </button>

          <button
            onClick={() => setActiveChannelTab("administrative")}
            aria-pressed={activeChannelTab === "administrative"}
            className="admin-segment"
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
            className="w-full h-9 pl-9 pr-4 text-xs admin-panel focus:outline-hidden focus:ring-2 focus:ring-admin-brand/20 focus:border-admin-brand"
          />
        </div>
      </section>

      <section className="admin-ledger p-4 sm:p-5 space-y-4">
        <div className="border-b border-admin-card-border pb-3">
          <h2 className="text-base font-semibold text-admin-text">Últimas transacciones</h2>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12 text-admin-muted space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-admin-muted stroke-[1.5]" />
            <p className="text-sm font-medium">No se encontraron ventas para el filtro seleccionado.</p>
            <Link href="/admin/ventas">
              <Button size="sm" className="bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold rounded-xl">
                + Realizar Venta en POS
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA: LISTA INTERACTIVA DE TICKETS */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-semibold text-admin-sidebar-text px-2">
                Últimos Tickets ({filteredSales.length})
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                {filteredSales.map((sale) => {
                  const isSelected = sale.id === selectedSaleId;

                  return (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className="admin-ledger-row"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-admin-brand-subtle border border-admin-brand flex items-center justify-center font-semibold text-admin-brand-text text-xs shrink-0">
                          {sale.customer.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-admin-text block truncate">
                            #{sale.saleNumber}
                          </span>
                          <span className="text-[10px] text-admin-muted">
                            {sale.time} • {sale.cashier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              sale.channel === "pos" ? "bg-admin-brand" : "bg-emerald-400"
                            )}
                          />
                          <span className={sale.channel === "pos" ? "text-admin-brand-text" : "text-admin-success"}>
                            {sale.channel === "pos" ? "POS" : "Adm"}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-admin-text">
                          {CURRENCY_SYMBOL} {sale.total.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA: TARJETA DE DETALLE AUDITADO */}
            {selectedSale && (
              <div className="lg:col-span-7">
                <div className="admin-receipt p-4 lg:p-6 space-y-5">
                  {/* Encabezado del Detalle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-admin-card-border">
                    <div>
                      <span className="text-[11px] font-bold text-admin-brand-text uppercase tracking-wider block">
                        Detalle del Comprobante
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <h3 className="text-2xl font-semibold text-admin-text tracking-tight">
                          #{selectedSale.saleNumber}
                        </h3>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-success">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span>{selectedSale.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-admin-brand-subtle border border-admin-brand flex items-center justify-center font-bold text-admin-brand-text text-xs">
                        {selectedSale.customer.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-admin-text block">
                          {selectedSale.customer}
                        </span>
                        <span className="text-[10px] text-admin-brand-text">
                          {selectedSale.channelLabel} • {selectedSale.cashier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Ítems Vendidos */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-admin-muted uppercase tracking-wider">
                      Productos ({selectedSale.items.length})
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {selectedSale.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 admin-panel flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-admin-text text-xs">{item.name}</p>
                            <p className="text-[11px] text-admin-muted mt-0.5">
                              {item.quantity} ud x {CURRENCY_SYMBOL} {item.unitPrice.toFixed(2)} (Costo: {CURRENCY_SYMBOL} {item.unitCost.toFixed(2)})
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-semibold text-admin-text block">
                              {CURRENCY_SYMBOL} {item.subtotal.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold text-admin-success">
                              +{CURRENCY_SYMBOL} {(item.unitPrice - item.unitCost).toFixed(2)} margen
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen Financiero */}
                  <div className="p-4 admin-panel grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-admin-muted block font-medium">Subtotal</span>
                      <span className="text-sm font-bold text-admin-muted">
                        {CURRENCY_SYMBOL} {selectedSale.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-admin-muted block font-medium">Costo Total</span>
                      <span className="text-sm font-bold text-admin-muted">
                        {CURRENCY_SYMBOL} {selectedSale.costTotal.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-admin-muted block font-medium">Utilidad</span>
                      <span className="text-sm font-semibold text-admin-success">
                        +{CURRENCY_SYMBOL} {selectedSale.grossProfit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-admin-brand-text block font-medium">Total Cobrado</span>
                      <span className="text-base font-semibold text-admin-text">
                        {CURRENCY_SYMBOL} {selectedSale.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pie de Acción: Vuelto e Impresión */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-admin-muted">
                      <span className="text-admin-muted">Medio: </span>
                      <span className="font-bold text-admin-text">{selectedSale.paymentMethod}</span>
                      {selectedSale.changeGiven > 0 && (
                        <span className="ml-2 text-admin-success font-bold">
                          (Cambio: {CURRENCY_SYMBOL} {selectedSale.changeGiven.toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href="/admin/inventario">
                        <button className="h-10 px-4 rounded-xl bg-admin-card-bg hover:bg-admin-card-bg text-admin-brand-text text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer">
                          <Boxes className="h-4 w-4" />
                          <span>Kardex</span>
                        </button>
                      </Link>

                      <button
                        onClick={() => handlePrintTicket(selectedSale)}
                        className="h-10 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center gap-2"
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
        <div className="admin-panel p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-admin-card-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-admin-text">
                    Stock Crítico
                  </h3>
                  <p className="text-[11px] text-admin-muted">Por debajo del stock mínimo</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{criticalStockProducts.length} en alerta</span>
              </div>
            </div>

            {criticalStockProducts.length === 0 ? (
              <div className="text-center py-6 text-admin-muted text-xs">
                ✓ Todo el inventario se encuentra en nivel óptimo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {criticalStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-admin-raised border border-admin-card-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-admin-text">{p.name}</p>
                      <p className="text-[10px] text-admin-muted font-mono mt-0.5">
                        SKU: {p.sku} • {p.supplier}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-amber-600 text-sm">
                        {p.stock} uds restantes
                      </span>
                      <span className="block text-[10px] text-admin-muted">mín. {p.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-admin-card-border flex items-center justify-between">
            <span className="text-xs text-admin-muted font-medium">
              Valor almacén: {CURRENCY_SYMBOL} {totalInventoryValue.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </span>
            <Link href="/admin/compras">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-admin-brand/30 text-admin-brand-text">
                <Truck className="h-3.5 w-3.5" />
                <span>Orden de Compra</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento B: Mermas & Bajas */}
        <div className="admin-panel p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-admin-card-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-admin-text">
                    Mermas & Bajas
                  </h3>
                  <p className="text-[11px] text-admin-muted">Pérdidas registradas por merma o daño</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>{CURRENCY_SYMBOL} {monthLossesTotal.toFixed(2)} este mes</span>
              </div>
            </div>

            {recentAdjustments.length === 0 ? (
              <div className="text-center py-6 text-admin-muted text-xs">
                ✓ No hay actas de baja este mes.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {recentAdjustments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-rose-800 dark:text-rose-300 block">
                        Acta #{a.adjustmentNumber}
                      </span>
                      <p className="text-[11px] text-admin-muted mt-0.5">
                        {a.quantity}x {a.productName} • {a.reasonLabel}
                      </p>
                    </div>
                    <span className="font-semibold text-rose-600 text-sm">
                      -{CURRENCY_SYMBOL} {a.totalCost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-admin-card-border flex items-center justify-between">
            <span className="text-xs text-admin-muted font-medium">Control de pérdidas</span>
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
