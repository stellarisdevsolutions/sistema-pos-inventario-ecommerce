"use client";

import { MetricCard } from "@/components/admin/metric-card";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  Search,
  DollarSign,
  ShieldAlert,
  Truck,
  Receipt,
  Wallet,
  Printer,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { escapeHtml } from "@/lib/sanitize";
import { STORE_NAME } from "@/lib/store-config";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [activeChannelTab, setActiveChannelTab] = useState<"all" | "pos" | "administrative">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const applySummaryResult = (res: Awaited<ReturnType<typeof getDashboardSummaryAction>>) => {
    if (res.success && res.data) {
      setLoadError(null);
      setData(res.data);
      if (res.data.recentSales.length > 0) {
        setSelectedSaleId(res.data.recentSales[0].id);
      }
    } else {
      const message = res.error || "No se pudieron obtener las métricas de la base de datos.";
      setLoadError(message);
      toast.error("Error al cargar datos", { description: message });
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      applySummaryResult(await getDashboardSummaryAction());
    } catch {
      const message = "No se pudo comunicar con el servidor.";
      setLoadError(message);
      toast.error("Error de conexión", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getDashboardSummaryAction()
      .then((res) => {
        if (!cancelled) applySummaryResult(res);
      })
      .catch(() => {
        if (!cancelled) {
          const message = "No se pudo comunicar con el servidor.";
          setLoadError(message);
          toast.error("Error de conexión", { description: message });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (loadError || !data) {
    return (
      <div className="admin-panel p-8 max-w-xl mx-auto mt-10 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-admin-text">No se pudo cargar el resumen</h2>
          <p className="text-xs text-admin-muted">{loadError || "Error inesperado al consultar datos."}</p>
        </div>
        <Button onClick={loadData} className="h-9 px-4 rounded-xl bg-admin-brand text-admin-on-solid text-xs font-bold gap-2 cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  const {
    kpis,
    recentSales,
    criticalStockProducts,
    criticalStockCount,
    totalInventoryValue,
    recentAdjustments,
    monthAdjustmentsCount,
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
    filteredSales.find((s) => s.id === selectedSaleId) || filteredSales[0];

  const handlePrintTicket = (sale: DashboardSalesItem) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      toast.error("Ventana de impresión bloqueada por el navegador");
      return;
    }
    printWindow.opener = null;

    const itemsHtml = sale.items
      .filter((it) => it.quantity > 0 || sale.status === "Anulado")
      .map(
        (it) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
          <span>${escapeHtml(it.quantity > 0 ? it.quantity : it.originalQuantity)}x ${escapeHtml(it.name)}</span>
          <span style="font-weight:bold;">${escapeHtml(CURRENCY_SYMBOL)} ${it.subtotal.toFixed(2)}</span>
        </div>
      `
      )
      .join("");

    const safeStoreName = escapeHtml(STORE_NAME.toUpperCase());
    const safeSaleNumber = escapeHtml(sale.saleNumber);
    const safeTime = escapeHtml(sale.time);
    const safeCashier = escapeHtml(sale.cashier);
    const safeCustomer = escapeHtml(sale.customer);
    const safeMethod = escapeHtml(sale.paymentMethod);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket #${safeSaleNumber}</title>
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
            <h2 style="margin:0; font-size:16px;">${safeStoreName}</h2>
            <p style="margin:2px 0; font-size:10px;">TIENDA &amp; POS OFICIAL</p>
            <p style="margin:2px 0; font-size:10px;">La Paz, Bolivia</p>
          </div>
          <div class="divider"></div>
          <div>
            <div class="flex-between"><span>Ticket:</span><span class="bold">#${safeSaleNumber}</span></div>
            <div class="flex-between"><span>Fecha:</span><span>${safeTime}</span></div>
            <div class="flex-between"><span>Cajero:</span><span>${safeCashier}</span></div>
            <div class="flex-between"><span>Cliente:</span><span>${safeCustomer}</span></div>
          </div>
          <div class="divider"></div>
          <div style="font-size:10px; margin-bottom:4px; font-weight:bold;">DETALLE:</div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="flex-between"><span class="bold">TOTAL:</span><span class="bold" style="font-size:14px;">${escapeHtml(CURRENCY_SYMBOL)} ${sale.total.toFixed(2)}</span></div>
          <div class="flex-between"><span>Medio de Pago:</span><span class="bold">${safeMethod}</span></div>
          ${
            sale.paymentMethod === "Efectivo" && sale.cashGiven > 0
              ? `
            <div class="flex-between"><span>Recibido:</span><span>${escapeHtml(CURRENCY_SYMBOL)} ${sale.cashGiven.toFixed(2)}</span></div>
            <div class="flex-between"><span>Cambio/Vuelto:</span><span>${escapeHtml(CURRENCY_SYMBOL)} ${sale.changeGiven.toFixed(2)}</span></div>
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
          trend={kpis.dailySales}
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
        />
        <MetricCard
          label="Ganancia bruta"
          trend={kpis.dailyProfit}
          value={formatMetric(kpis.grossProfit)}
          detail={`${kpis.profitMargin.toFixed(1)}% de margen`}
          icon={DollarSign}
          tone="success"
        />
        <MetricCard
          label="Ticket promedio"
          trend={kpis.dailyTickets}
          value={formatMetric(kpis.averageTicket)}
          detail="Importe medio por venta"
          icon={Receipt}
        />
        <MetricCard
          label="Efectivo en cajas"
          value={formatMetric(kpis.cashInDrawers)}
          detail={
            <>
              {kpis.activeDrawersCount} de {kpis.totalDrawersCount} terminales activas
              <br />
              Efectivo {formatMetric(kpis.cashAmount)} · QR {formatMetric(kpis.qrAmount)}
              {kpis.cardAmount > 0 && ` · Tarjeta ${formatMetric(kpis.cardAmount)}`}
              {kpis.otherAmount > 0 && ` · Otros ${formatMetric(kpis.otherAmount)}`}
            </>
          }
          icon={Wallet}
        />
      </section>

      <section className="ticket-book" aria-labelledby="ticket-heading">
        <header className="ticket-toolbar">
          <h2 id="ticket-heading"><Receipt size={18} /> Últimas transacciones <small>{filteredSales.length}</small></h2>
          <div className="ticket-tabs" role="group" aria-label="Canal de venta">
            {([["all", "Todas"], ["pos", "Mostrador"], ["administrative", "Administración"]] as const).map(([channel, label]) => (
              <button key={channel} aria-pressed={activeChannelTab === channel} onClick={() => setActiveChannelTab(channel)}>{label}</button>
            ))}
          </div>
          <label className="ticket-search">
            <Search size={15} aria-hidden />
            <input type="search" aria-label="Buscar ticket, cliente o cajero" placeholder="Buscar transacción" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </label>
        </header>
        {selectedSale ? (
          <div className="ticket-columns">
            <div className="ticket-index" aria-label="Tickets">
              {filteredSales.map(sale => (
                <button key={sale.id} aria-pressed={sale.id === selectedSale.id} onClick={() => setSelectedSaleId(sale.id)}>
                  <span className="ticket-avatar" aria-hidden>{sale.customer.slice(0, 2).toUpperCase()}</span>
                  <span className="ticket-id"><strong>{sale.saleNumber}</strong><small>{sale.time}</small></span>
                  <span className="ticket-status">{sale.status}</span>
                  <strong>{formatMetric(sale.total)}</strong>
                </button>
              ))}
            </div>
            <article className="ticket-detail" aria-label="Comprobante seleccionado">
              <header className="ticket-parties">
                <div><small>Comprobante</small><h3>{selectedSale.saleNumber}</h3></div>
                <div><small>Cliente</small><strong>{selectedSale.customer}</strong></div>
                <div><small>Atendido por</small><strong>{selectedSale.cashier}</strong><small>{selectedSale.channelLabel}</small></div>
              </header>
              <ul className="ticket-products" aria-label="Productos del comprobante">
                {selectedSale.items.map((item, index) => {
                  const displayQty = item.quantity > 0 ? item.quantity : item.originalQuantity;
                  return (
                    <li key={index}>
                      <span className="ticket-product-qty">{displayQty}×</span>
                      <div className="ticket-product-main">
                        <span className="ticket-product-name">{item.name}</span>
                        <div className="ticket-product-meta">
                          <span>
                            {formatMetric(item.unitPrice)} c/u · Costo {formatMetric(item.unitCost)}
                          </span>
                          {item.returnedQuantity > 0 && (
                            <span className="ticket-product-tag">
                              Devueltas: {item.returnedQuantity}
                            </span>
                          )}
                          {selectedSale.status === "Anulado" && (
                            <span className="ticket-product-tag">Anulado</span>
                          )}
                        </div>
                      </div>
                      <strong className="ticket-product-subtotal">
                        {formatMetric(item.subtotal)}
                      </strong>
                    </li>
                  );
                })}
              </ul>
              <dl className="ticket-totals">
                <div>
                  <dt>{selectedSale.refundedAmount > 0 ? "Total neto" : "Total cobrado"}</dt>
                  <dd>{formatMetric(selectedSale.total)}</dd>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div>
                    <dt>Descuento</dt>
                    <dd>-{formatMetric(selectedSale.discountAmount)}</dd>
                  </div>
                )}
                {selectedSale.refundedAmount > 0 && (
                  <div>
                    <dt>Devuelto</dt>
                    <dd>-{formatMetric(selectedSale.refundedAmount)}</dd>
                  </div>
                )}
                <div>
                  <dt>Costo de adquisición</dt>
                  <dd>{formatMetric(selectedSale.costTotal)}</dd>
                </div>
                <div>
                  <dt>Utilidad</dt>
                  <dd>{formatMetric(selectedSale.grossProfit)}</dd>
                </div>
              </dl>
              <footer className="ticket-actions">
                <span>
                  {selectedSale.status} · {selectedSale.paymentMethod}
                  {selectedSale.changeGiven > 0 && ` · Cambio ${formatMetric(selectedSale.changeGiven)}`}
                </span>
                <Link href="/admin/inventario">Kárdex</Link>
                <button onClick={() => handlePrintTicket(selectedSale)}><Printer size={15} /> Imprimir ticket</button>
              </footer>
            </article>
          </div>
        ) : (
          <div className="ticket-empty">
            <p>{recentSales.length ? "Ninguna transacción coincide con los filtros." : "Aún no hay ventas registradas."}</p>
            {recentSales.length ? <button onClick={() => { setSearchQuery(""); setActiveChannelTab("all"); }}>Limpiar filtros</button> : <Link href="/admin/ventas">Cobrar en POS</Link>}
          </div>
        )}
      </section>

      {/* =========================================================================
          5. FILA INFERIOR BENTO: STOCK CRÍTICO & MERMAS
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bento A: Stock Crítico */}
        <div className="admin-panel overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-admin-card-border flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm text-admin-text">Stock Crítico</h3>
                <p className="text-[11px] text-admin-muted mt-0.5">
                  Productos activos en el mínimo o por debajo
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{criticalStockCount} en alerta</span>
              </div>
            </div>

            {criticalStockProducts.length === 0 ? (
              <div className="px-5 py-10 text-center text-admin-muted text-xs">
                Todo el inventario activo se encuentra en nivel óptimo.
              </div>
            ) : (
              <ul className="divide-y divide-admin-card-border/70">
                {criticalStockProducts.map((p) => {
                  const fillPercent = p.minStock > 0 ? Math.min(100, Math.round((p.stock / p.minStock) * 100)) : 0;
                  const isOut = p.stock === 0;
                  return (
                    <li
                      key={p.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-admin-raised/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            isOut ? "bg-rose-500" : "bg-amber-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-admin-text truncate">{p.name}</p>
                          <p className="text-[11px] text-admin-muted font-mono truncate mt-0.5">
                            {p.sku} · {p.supplier}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span
                          className={`text-xs font-semibold font-mono tabular-nums ${
                            isOut
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {p.stock} / {p.minStock} uds
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-admin-raised overflow-hidden">
                          <div
                            style={{ width: `${fillPercent}%` }}
                            className={`h-full rounded-full ${
                              isOut ? "bg-rose-500" : "bg-amber-500"
                            }`}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-admin-card-border bg-admin-raised/40 flex items-center justify-between gap-3">
            <span className="text-xs text-admin-muted font-medium">
              Valor en bodega:{" "}
              <strong className="text-admin-text font-mono tabular-nums">
                {formatMetric(totalInventoryValue)}
              </strong>
            </span>
            <Link href="/admin/compras">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-admin-card-border bg-admin-card-bg hover:bg-admin-raised cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5 text-admin-brand-text" />
                <span>Orden de compra</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento B: Mermas & Bajas */}
        <div className="admin-panel overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-admin-card-border flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm text-admin-text">Mermas &amp; Bajas</h3>
                <p className="text-[11px] text-admin-muted mt-0.5">
                  Pérdidas registradas por merma o daño
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0 tabular-nums">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>{formatMetric(monthLossesTotal)} este mes</span>
              </div>
            </div>

            {recentAdjustments.length === 0 ? (
              <div className="px-5 py-10 text-center text-admin-muted text-xs">
                No hay actas de baja registradas este mes.
              </div>
            ) : (
              <ul className="divide-y divide-admin-card-border/70">
                {recentAdjustments.map((a) => (
                  <li
                    key={a.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-admin-raised/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-admin-text truncate">
                          {a.productName}
                        </span>
                        <span className="text-[11px] font-mono text-admin-muted shrink-0">
                          ×{a.quantity}
                        </span>
                      </div>
                      <p className="text-[11px] text-admin-muted truncate mt-0.5">
                        {a.adjustmentNumber} · {a.reasonLabel} · {a.date}
                      </p>
                    </div>
                    <span className="text-xs font-semibold font-mono tabular-nums text-rose-600 dark:text-rose-400 shrink-0">
                      -{formatMetric(a.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-admin-card-border bg-admin-raised/40 flex items-center justify-between gap-3">
            <span className="text-xs text-admin-muted font-medium">
              {monthAdjustmentsCount} {monthAdjustmentsCount === 1 ? "acta" : "actas"} este mes
            </span>
            <Link href="/admin/inventario">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-admin-card-border bg-admin-card-bg hover:bg-admin-raised cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                <span>Ver en Inventario</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
