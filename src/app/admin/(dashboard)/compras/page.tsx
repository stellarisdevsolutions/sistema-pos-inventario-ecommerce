"use client";

import { PurchaseReturnDialog, returnableQuantity } from "@/components/admin/purchase-return-dialog";
import { MetricCard } from "@/components/admin/metric-card";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Truck,
  Plus,
  Search,
  DollarSign,
  Calendar,
  CheckCircle2,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trash2,
  Eye,
  RefreshCw,
  Package,
  PackagePlus,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, CURRENCY_NAME, formatCurrencyLocale } from "@/lib/currency";
import {
  getPurchasesAction,
  cancelPurchaseAction,
  receivePurchaseAction,
  type PurchaseListItem,
  type PurchasesKpiSummary,
} from "@/app/admin/actions/purchases";

const PURCHASE_PAYMENT_METHOD_LABELS: Record<PurchaseListItem["paymentMethod"], string> = {
  transfer: "Transferencia bancaria",
  qr: "QR",
  cash: "Efectivo",
  card: "Tarjeta",
  other: "Otro medio",
};

function canCancelPurchase(purchase: PurchaseListItem): boolean {
  if (purchase.status === "cancelled" || purchase.returns.length > 0) return false;
  if (purchase.status !== "received") return true;
  const requiredByProduct = new Map<number, { required: number; available: number }>();
  for (const item of purchase.items) {
    const current = requiredByProduct.get(item.productId);
    requiredByProduct.set(item.productId, {
      required: (current?.required ?? 0) + item.quantity,
      available: item.availableStock,
    });
  }
  for (const { required, available } of requiredByProduct.values()) {
    if (available < required) return false;
  }
  return true;
}

// Helper de paginación
function getPaginationItems(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemName: string;
  onPageChange: (page: number) => void;
}

function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemName,
  onPageChange,
}: PaginationBarProps) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);
  const pages = getPaginationItems(currentPage, totalPages);

  return (
    <div className="p-3.5 px-4 border-t border-admin-card-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-admin-muted bg-admin-raised">
      <div className="font-medium">
        Mostrando <span className="font-bold text-admin-text">{from}</span> a{" "}
        <span className="font-bold text-admin-text">{to}</span> de{" "}
        <span className="font-bold text-admin-text">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Página anterior"
          className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised flex items-center justify-center text-admin-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((item, idx) =>
          item === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="h-8 w-8 flex items-center justify-center text-slate-400 font-mono text-xs select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                "h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all",
                currentPage === item
                  ? "bg-admin-brand text-white border border-admin-brand shadow-indigo-600/30 scale-105"
                  : "border border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          title="Página siguiente"
          className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised flex items-center justify-center text-admin-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ComprasPage() {
  // Estado principal de compras y KPIs
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [kpis, setKpis] = useState<PurchasesKpiSummary>({
    monthlyInvestment: 0,
    monthlyMerchandiseInvestment: 0,
    monthlySupplierPenalties: 0,
    monthlyPurchasesCount: 0,
    monthlyUnitsReceived: 0,
    monthlySuppliersCount: 0,
    totalSuppliersCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "pending" | "cancelled">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer de Detalle / Factura
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseListItem | null>(null);
  const [returnRequestId, setReturnRequestId] = useState<string | null>(null);

  // Modal de Cancelación y Recepción
  const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [purchaseToReceive, setPurchaseToReceive] = useState<PurchaseListItem | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  const applyPurchasesResult = (res: Awaited<ReturnType<typeof getPurchasesAction>>) => {
    if (res.success) {
      setPurchases(res.data);
      setSelectedPurchase((previous) =>
        previous ? res.data.find((purchase) => purchase.id === previous.id) ?? null : null
      );
      setKpis(res.kpis);
    } else {
      toast.error("Error al cargar compras", { description: res.error });
    }
  };

  // Cargar lista de compras desde PostgreSQL
  const loadPurchases = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      applyPurchasesResult(await getPurchasesAction());
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error de conexión al cargar compras");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getPurchasesAction()
      .then((res) => {
        if (!cancelled) applyPurchasesResult(res);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) toast.error("Error de conexión al cargar compras");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPurchases(true);
    setIsRefreshing(false);
    toast.success("Listado actualizado");
  };

  // Confirmar anulación de compra
  const handleConfirmCancel = async () => {
    if (!purchaseToCancel) return;
    try {
      setIsCancelling(true);
      const res = await cancelPurchaseAction(purchaseToCancel.id, cancelReason);
      if (res.success) {
        toast.success("Orden de compra anulada", {
          description:
            purchaseToCancel.status === "received"
              ? "Se revirtió el stock ingresado y se registró la salida en Kárdex."
              : "La orden pendiente fue anulada sin afectar el stock ni el Kárdex.",
        });
        setPurchaseToCancel(null);
        setCancelReason("");
        if (selectedPurchase?.id === purchaseToCancel.id) {
          setSelectedPurchase(null);
        }
        await loadPurchases(true);
      } else {
        toast.error("No se pudo anular", { description: res.error });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error de conexión al anular la orden");
    } finally {
      setIsCancelling(false);
    }
  };

  // Confirmar recepción de orden pendiente
  const handleConfirmReceive = async () => {
    if (!purchaseToReceive || isReceiving) return;
    try {
      setIsReceiving(true);
      const res = await receivePurchaseAction(purchaseToReceive.id);
      if (res.success) {
        toast.success("Orden recibida en almacén", {
          description: "Se sumó el stock al inventario y se actualizó el Kárdex.",
        });
        setPurchaseToReceive(null);
        await loadPurchases(true);
      } else {
        toast.error("No se pudo confirmar la recepción", { description: res.error });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error de conexión al confirmar la recepción");
    } finally {
      setIsReceiving(false);
    }
  };

  // Filtrado de compras
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.purchaseNumber.toLowerCase().includes(term) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(term)) ||
        p.supplierName.toLowerCase().includes(term) ||
        (p.supplierTaxId && p.supplierTaxId.toLowerCase().includes(term)) ||
        p.items.some((it) => it.productName.toLowerCase().includes(term));

      const matchStatus = statusFilter === "all" || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchases, searchTerm, statusFilter]);

  // Paginación acotada
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPurchases = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* =========================================================================
          1. HEADER CON TITULO, METRICAS Y ACCIONES
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-page-title">Compras</h1>
          </div>
          <p className="admin-page-description">Órdenes y entradas de mercadería.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-10 px-3 rounded-xl border-admin-card-border text-xs text-admin-secondary hover:bg-admin-raised cursor-pointer gap-1.5"
            title="Recargar datos"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-admin-brand-text")} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Link href="/admin/compras/nueva">
            <Button
              size="sm"
              className="h-10 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-2 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Registrar Compra</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. METRIC KPIS CORPORATIVOS (4 TARJETAS)
          ========================================================================= */}
      <section className="admin-metrics" aria-label="Indicadores de compras">
        <MetricCard
          label="Inversión del mes"
          value={formatCurrencyLocale(kpis.monthlyInvestment)}
          detail={
            kpis.monthlySupplierPenalties > 0
              ? `Mercadería ${formatCurrencyLocale(kpis.monthlyMerchandiseInvestment)} · Penalidades ${formatCurrencyLocale(kpis.monthlySupplierPenalties)}`
              : `Neto recibido este mes (${CURRENCY_NAME})`
          }
          icon={DollarSign}
        />
        <MetricCard
          label="Facturas del mes"
          value={kpis.monthlyPurchasesCount}
          detail="Recepciones en almacén este mes"
          icon={Receipt}
        />
        <MetricCard
          label="Unidades ingresadas"
          value={kpis.monthlyUnitsReceived.toLocaleString("es-BO")}
          detail="Piezas netas sumadas este mes"
          icon={PackagePlus}
          tone="success"
        />
        <MetricCard
          label="Proveedores del mes"
          value={kpis.monthlySuppliersCount}
          detail={
            kpis.totalSuppliersCount > 0
              ? `${kpis.totalSuppliersCount} en historial total`
              : "Empresas con recepciones este mes"
          }
          icon={Building2}
        />
      </section>

      {/* =========================================================================
          3. BARRA DE HERRAMIENTAS: BUSCADOR Y FILTROS POR ESTADO
          ========================================================================= */}
      <div className="admin-panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por orden COM-..., factura, proveedor o producto..."
              className="pl-9 h-11 text-xs rounded-xl bg-admin-raised border-admin-card-border focus:bg-admin-card-bg transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtros Rápidos de Estado */}
          <div className="flex items-center gap-1 p-1 bg-admin-raised rounded-xl text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-admin-secondary hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Todas ({purchases.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("received");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                statusFilter === "received"
                  ? "bg-admin-card-bg text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-admin-secondary hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Recibidas ({purchases.filter((p) => p.status === "received").length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("pending");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                statusFilter === "pending"
                  ? "bg-admin-card-bg text-amber-600 dark:text-amber-400 font-bold"
                  : "text-admin-secondary hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Pendientes ({purchases.filter((p) => p.status === "pending").length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("cancelled");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                statusFilter === "cancelled"
                  ? "bg-admin-card-bg text-rose-600 dark:text-rose-400 font-bold"
                  : "text-admin-secondary hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Anuladas ({purchases.filter((p) => p.status === "cancelled").length})
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-admin-card-border text-xs text-slate-400">
          <span>Mostrando {filteredPurchases.length} de {purchases.length} compras registradas</span>
          <span>Todas las órdenes recibidas incrementan el stock en almacén</span>
        </div>
      </div>

      {/* =========================================================================
          4. TABLA PRINCIPAL DE COMPRAS Y RECEPCIONES
          ========================================================================= */}
      <div className="admin-panel overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="h-7 w-7 text-admin-brand-text animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Consultando registro de compras y almacén...
            </p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-admin-raised flex items-center justify-center mx-auto text-slate-400">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No se encontraron órdenes de compra
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay facturas o ingresos que coincidan con la búsqueda. Puedes registrar una nueva compra directamente.
            </p>
            <Link href="/admin/compras/nueva">
              <Button
                size="sm"
                className="h-9 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand text-white text-xs font-bold gap-1.5 shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Registrar Primera Compra</span>
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-admin-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Orden & Fecha</th>
                    <th className="py-3.5 px-4">Factura / Guía</th>
                    <th className="py-3.5 px-4">Proveedor</th>
                    <th className="py-3.5 px-4 text-center">Unidades</th>
                    <th className="py-3.5 px-4 text-right">Total ({CURRENCY_SYMBOL})</th>
                    <th className="py-3.5 px-4 text-center">Recepción</th>
                    <th className="py-3.5 px-4 text-center">Medio de Pago</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border font-medium text-admin-secondary">
                  {paginatedPurchases.map((p) => {
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPurchase(p)}
                        className="hover:bg-admin-raised transition-colors cursor-pointer group"
                      >
                        {/* 1. Orden & Fecha */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-admin-text group-hover:text-admin-brand-text transition-colors">
                              {p.purchaseNumber}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {p.createdAt}
                          </span>
                        </td>

                        {/* 2. Factura / Guía */}
                        <td className="py-4 px-4">
                          {p.invoiceNumber ? (
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 bg-admin-raised px-2 py-0.5 rounded-md">
                              {p.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin factura</span>
                          )}
                        </td>

                        {/* 3. Proveedor */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-admin-text truncate max-w-[200px]">
                            {p.supplierName}
                          </div>
                          {p.supplierTaxId && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              NIT: {p.supplierTaxId}
                            </span>
                          )}
                        </td>

                        {/* 4. Unidades e Ítems */}
                        <td className="py-4 px-4 text-center">
                          {p.status !== "cancelled" && p.returnedUnits > 0 ? (
                            <>
                              <span className="font-bold text-admin-text">
                                {p.netUnits}{" "}
                                <span className="text-[10px] font-normal text-slate-400">piezas</span>
                              </span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                                Orig. {p.itemsCount} · Dev. -{p.returnedUnits}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-admin-text">
                              {p.itemsCount}{" "}
                              <span className="text-[10px] font-normal text-slate-400">piezas</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block">
                            {p.linesCount} {p.linesCount === 1 ? "artículo" : "artículos"}
                          </span>
                        </td>

                        {/* 5. Total */}
                        <td className="py-4 px-4 text-right">
                          <div
                            className={cn(
                              "font-bold font-mono text-sm",
                              p.status === "cancelled"
                                ? "line-through text-slate-400"
                                : "text-admin-text"
                            )}
                          >
                            {CURRENCY_SYMBOL}{" "}
                            {(p.status !== "cancelled" && p.returnedAmount > 0
                              ? p.netAmount
                              : p.totalAmount
                            ).toLocaleString("es-BO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {p.status !== "cancelled" && p.returnedAmount > 0 && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block">
                              Orig. {CURRENCY_SYMBOL} {p.totalAmount.toFixed(2)} · Dev. -{CURRENCY_SYMBOL} {p.returnedAmount.toFixed(2)}
                            </span>
                          )}
                          {p.status !== "cancelled" && p.supplierPenaltyAmount > 0 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono block">
                              Mercadería {CURRENCY_SYMBOL} {p.netMerchandiseAmount.toFixed(2)} · Penalidad {CURRENCY_SYMBOL} {p.supplierPenaltyAmount.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* 6. Recepción en Almacén */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                p.status === "received"
                                  ? "bg-emerald-500"
                                  : p.status === "pending"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <span
                              className={
                                p.status === "received"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : p.status === "pending"
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-rose-700 dark:text-rose-400"
                              }
                            >
                              {p.status === "received" ? "Recibida" : p.status === "pending" ? "Pendiente" : "Anulada"}
                              {p.returns.length > 0 && <span className="ml-1 text-xs text-admin-muted"> · Con devoluciones</span>}
                            </span>
                          </div>
                        </td>

                        {/* 7. Medio de Pago */}
                        <td className="py-4 px-4 text-center">
                          <span className="text-[11px] font-medium text-admin-secondary">
                            {PURCHASE_PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                          </span>
                        </td>

                        {/* 8. Acciones */}
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPurchase(p)}
                              title="Ver Comprobante / Detalle"
                              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-admin-brand-text hover:bg-[var(--admin-brand-light)] dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {p.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPurchaseToReceive(p)}
                                title="Confirmar recepción en almacén"
                                className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}

                            {canCancelPurchase(p) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPurchaseToCancel(p)}
                                title="Anular orden de compra"
                                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Barra de Paginación */}
            <PaginationBar
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredPurchases.length}
              pageSize={pageSize}
              itemName="compras registradas"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* =========================================================================
          5. DRAWER LATERAL: COMPROBANTE Y DETALLE DE LA COMPRA
          ========================================================================= */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop con desenfoque suave */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedPurchase(null)}
          />

          {/* Panel Lateral */}
          <div className="relative w-full max-w-xl bg-admin-card-bg border-l border-admin-card-border z-10 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header del Drawer */}
            <div className="p-5 border-b border-admin-card-border flex items-center justify-between bg-admin-raised">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-admin-text">
                    {selectedPurchase.purchaseNumber}
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        selectedPurchase.status === "received"
                          ? "bg-emerald-500"
                          : selectedPurchase.status === "pending"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                    />
                    <span
                      className={
                        selectedPurchase.status === "received"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : selectedPurchase.status === "pending"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-700 dark:text-rose-400"
                      }
                    >
                      {selectedPurchase.status === "received" ? "Recibida" : selectedPurchase.status === "pending" ? "Pendiente" : "Anulada"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registrada el {selectedPurchase.createdAt} por {selectedPurchase.userName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="h-8 w-8 rounded-lg hover:bg-admin-raised flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Mini Tarjetas de Resumen Financiero */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    {selectedPurchase.status !== "cancelled" && selectedPurchase.returnedAmount > 0
                      ? "Total Neto"
                      : "Total Factura"}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold font-mono mt-0.5 block",
                      selectedPurchase.status === "cancelled"
                        ? "line-through text-slate-400"
                        : "text-admin-text"
                    )}
                  >
                    {CURRENCY_SYMBOL}{" "}
                    {(selectedPurchase.status !== "cancelled" && selectedPurchase.returnedAmount > 0
                      ? selectedPurchase.netAmount
                      : selectedPurchase.totalAmount
                    ).toFixed(2)}
                  </span>
                  {selectedPurchase.status !== "cancelled" && selectedPurchase.returnedAmount > 0 && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block mt-0.5">
                      Orig. {CURRENCY_SYMBOL} {selectedPurchase.totalAmount.toFixed(2)} · Dev. -{CURRENCY_SYMBOL} {selectedPurchase.returnedAmount.toFixed(2)}
                    </span>
                  )}
                  {selectedPurchase.status !== "cancelled" && selectedPurchase.supplierPenaltyAmount > 0 && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono block mt-0.5">
                      Mercadería {CURRENCY_SYMBOL} {selectedPurchase.netMerchandiseAmount.toFixed(2)} · Penalidad {CURRENCY_SYMBOL} {selectedPurchase.supplierPenaltyAmount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                  <span className="text-[10px] text-slate-400 font-medium block">Unidades</span>
                  <span className="text-sm font-bold text-admin-brand-text font-mono mt-0.5 block">
                    {selectedPurchase.status !== "cancelled" && selectedPurchase.returnedUnits > 0
                      ? selectedPurchase.netUnits
                      : selectedPurchase.itemsCount}{" "}
                    piezas
                  </span>
                  {selectedPurchase.status !== "cancelled" && selectedPurchase.returnedUnits > 0 && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block mt-0.5">
                      Orig. {selectedPurchase.itemsCount} · Dev. -{selectedPurchase.returnedUnits}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                  <span className="text-[10px] text-slate-400 font-medium block">Medio de Pago</span>
                  <span className="text-sm font-bold text-admin-text mt-0.5 block">
                    {PURCHASE_PAYMENT_METHOD_LABELS[selectedPurchase.paymentMethod] ?? selectedPurchase.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Datos del Proveedor y Factura */}
              <div className="p-4 rounded-xl bg-admin-raised border border-admin-card-border space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                  Datos de Facturación & Proveedor
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Proveedor:</span>
                  <span className="font-bold text-admin-text">
                    {selectedPurchase.supplierName}
                  </span>
                </div>
                {selectedPurchase.supplierTaxId && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">NIT / RUC:</span>
                    <span className="font-mono text-admin-secondary">
                      {selectedPurchase.supplierTaxId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">N° Factura / Guía:</span>
                  <span className="font-mono font-bold text-admin-text">
                    {selectedPurchase.invoiceNumber || "Sin factura formal"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Medio de Pago:</span>
                  <span className="font-medium text-admin-secondary">
                    {PURCHASE_PAYMENT_METHOD_LABELS[selectedPurchase.paymentMethod] ?? selectedPurchase.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Renglones / Ítems de la Compra */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Artículos Ingresados ({selectedPurchase.items.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Total:{" "}
                    {selectedPurchase.status !== "cancelled" && selectedPurchase.returnedUnits > 0
                      ? `${selectedPurchase.netUnits} u. netas (${selectedPurchase.itemsCount} orig.)`
                      : `${selectedPurchase.itemsCount} unidades`}
                  </span>
                </div>

                <div className="border border-admin-card-border rounded-xl overflow-hidden divide-y divide-admin-card-border">
                  {selectedPurchase.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-3 bg-admin-card-bg flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {it.productImage ? (
                          <ProductThumbnail
                            src={it.productImage}
                            alt={it.productName}
                            className="h-10 w-10 rounded-lg object-cover border border-admin-card-border shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-admin-raised border border-admin-card-border flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-admin-text truncate">
                            {it.productName}
                          </p>
                          {it.productSku && (
                            <p className="text-[11px] font-mono text-admin-muted truncate">
                              {it.productSku}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-admin-text">
                          {it.quantity} u. x {CURRENCY_SYMBOL} {it.unitCost.toFixed(2)}
                        </div>
                        {it.returnedQuantity > 0 && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Devueltas: {it.returnedQuantity} u. · Quedan: {it.quantity - it.returnedQuantity} u.
                          </p>
                        )}
                        <span className="text-[11px] font-bold text-admin-brand-text font-mono">
                          {CURRENCY_SYMBOL} {it.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPurchase.returns.length > 0 && (
                <section aria-label="Devoluciones al proveedor" className="space-y-2">
                  <h3 className="font-semibold text-admin-text">Devoluciones al proveedor</h3>
                  {selectedPurchase.returns.map(receipt => (
                    <details key={receipt.id} className="rounded-lg border border-admin-card-border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        DEV-{receipt.id} · {receipt.createdAt} · {receipt.items.reduce((sum, item) => sum + item.quantity, 0)} u. · {formatCurrencyLocale(receipt.creditedAmount)}
                      </summary>
                      <div className="mt-2 space-y-1 text-xs text-admin-secondary">
                        <p>{receipt.reason} · {receipt.userName}</p>
                        {receipt.creditNoteReference && <p>Nota de crédito: {receipt.creditNoteReference}</p>}
                        {receipt.adjustmentAmount > 0 && (
                          <p className="text-amber-700 dark:text-amber-400">
                            Valor de mercadería: {formatCurrencyLocale(receipt.expectedAmount)} · Reconocido: {formatCurrencyLocale(receipt.creditedAmount)} · Diferencia del proveedor: {formatCurrencyLocale(receipt.adjustmentAmount)}
                          </p>
                        )}
                        <ul className="divide-y divide-admin-card-border">
                          {receipt.items.map(item => (
                            <li key={item.purchaseItemId} className="py-2">
                              <strong className="block">{item.quantity} u. · {selectedPurchase.items.find(line => line.id === item.purchaseItemId)?.productName}</strong>
                              Compra {formatCurrencyLocale(item.originalUnitCost)} c/u · Subtotal {formatCurrencyLocale(item.quantity * item.originalUnitCost)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ))}
                </section>
              )}

              {/* Observaciones */}
              {selectedPurchase.notes && (
                <div className="p-3.5 rounded-xl bg-admin-raised border border-admin-card-border space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Notas y Observaciones
                  </span>
                  <p className="text-admin-secondary leading-relaxed">
                    {selectedPurchase.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-admin-card-border bg-admin-raised flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPurchase(null)}
                className="h-9 px-4 rounded-xl border-admin-card-border text-xs font-semibold cursor-pointer"
              >
                Cerrar Ficha
              </Button>

              {selectedPurchase.status === "pending" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPurchaseToReceive(selectedPurchase)}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar Recepción</span>
                </Button>
              )}

              {selectedPurchase.status === "received" && selectedPurchase.items.some(item => returnableQuantity(item) > 0) && (
                <Button
                  type="button"
                  onClick={() => setReturnRequestId(crypto.randomUUID())}
                  className="bg-admin-brand text-admin-on-solid hover:bg-admin-brand-hover"
                >
                  Devolver mercancía
                </Button>
              )}

              {canCancelPurchase(selectedPurchase) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPurchaseToCancel(selectedPurchase);
                  }}
                  className="h-9 px-4 rounded-xl border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Anular Compra</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPurchase && returnRequestId && (
        <PurchaseReturnDialog
          purchase={selectedPurchase}
          requestId={returnRequestId}
          onClose={() => setReturnRequestId(null)}
          onSaved={() => loadPurchases(true)}
        />
      )}

      {/* =========================================================================
          6. MODAL: ANULACIÓN DE ORDEN DE COMPRA
          ========================================================================= */}
      <Dialog
        open={!!purchaseToCancel}
        onOpenChange={(open) => !open && !isCancelling && setPurchaseToCancel(null)}
      >
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-2 border-b border-admin-card-border">
            <DialogTitle className="text-base font-semibold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Anular Orden de Compra</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-admin-muted">
              {purchaseToCancel?.status === "pending"
                ? "Esta orden pendiente se cancelará sin modificar existencias ni registrar salida en el Kárdex."
                : "Esta acción revertirá las existencias ingresadas al almacén y registrará un movimiento de salida en el Kárdex."}
            </DialogDescription>
          </DialogHeader>

          {purchaseToCancel && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold block">
                  Orden: {purchaseToCancel.purchaseNumber}
                </span>
                <span className="block">
                  Proveedor: {purchaseToCancel.supplierName}
                </span>
                <span className="block font-mono">
                  {purchaseToCancel.status === "pending" ? "Monto de la orden:" : "Monto a revertir:"}{" "}
                  {CURRENCY_SYMBOL} {purchaseToCancel.totalAmount.toFixed(2)} ({purchaseToCancel.itemsCount} piezas)
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-admin-secondary">
                  Motivo de la anulación (opcional):
                </label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Factura duplicada, error en precios, devolución..."
                  className="h-9 text-xs rounded-lg border-admin-card-border"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-3 gap-2 pt-3 border-t border-admin-card-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCancelling}
              onClick={() => setPurchaseToCancel(null)}
              className="h-9 rounded-lg border-admin-card-border text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-rose-600/20 cursor-pointer gap-1.5"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Anulando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Confirmar Anulación</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          7. MODAL: CONFIRMAR RECEPCIÓN DE ORDEN PENDIENTE
          ========================================================================= */}
      <Dialog
        open={!!purchaseToReceive}
        onOpenChange={(open) => !open && !isReceiving && setPurchaseToReceive(null)}
      >
        <DialogContent className="sm:max-w-md admin-panel p-6">
          <DialogHeader className="pb-2 border-b border-admin-card-border">
            <DialogTitle className="text-base font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Confirmar Recepción en Almacén</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-admin-muted">
              Al confirmar, la orden pasará a recibida, las unidades se sumarán a tu inventario y el ingreso quedará registrado en el historial.
            </DialogDescription>
          </DialogHeader>

          {purchaseToReceive && (
            <div className="space-y-2 py-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 space-y-1">
                <span className="font-bold block">
                  Orden: {purchaseToReceive.purchaseNumber}
                </span>
                <span className="block">
                  Proveedor: {purchaseToReceive.supplierName}
                </span>
                <span className="block font-mono">
                  Total a ingresar: {CURRENCY_SYMBOL} {purchaseToReceive.totalAmount.toFixed(2)} ({purchaseToReceive.itemsCount} piezas)
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-3 gap-2 pt-3 border-t border-admin-card-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isReceiving}
              onClick={() => setPurchaseToReceive(null)}
              className="h-9 rounded-lg border-admin-card-border text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmReceive}
              disabled={isReceiving}
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer gap-1.5"
            >
              {isReceiving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Confirmando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirmar Recepción</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
