"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Layers,
  ArrowRight,
  CheckCircle2,
  Building2,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  CreditCard,
  Package,
  PackagePlus,
  Receipt,
  User,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, CURRENCY_NAME } from "@/lib/currency";
import {
  getPurchasesAction,
  cancelPurchaseAction,
  type PurchaseListItem,
  type PurchasesKpiSummary,
} from "@/app/admin/actions/purchases";

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
    <div className="p-3.5 px-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="font-medium">
        Mostrando <span className="font-bold text-slate-900 dark:text-white">{from}</span> a{" "}
        <span className="font-bold text-slate-900 dark:text-white">{to}</span> de{" "}
        <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Página anterior"
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
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
                "h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all shadow-2xs",
                currentPage === item
                  ? "bg-indigo-600 text-white border border-indigo-600 shadow-sm shadow-indigo-600/30 scale-105"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
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
    monthlyPurchasesCount: 0,
    monthlyUnitsReceived: 0,
    totalSuppliersCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "cancelled">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer de Detalle / Factura
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseListItem | null>(null);

  // Modal de Cancelación
  const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Cargar lista de compras desde PostgreSQL
  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      const res = await getPurchasesAction();
      if (res.success) {
        setPurchases(res.data);
        setKpis(res.kpis);
      } else {
        toast.error("Error al cargar compras", { description: res.error });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error de conexión al cargar compras");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPurchases();
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
          description: "Se revirtió el stock ingresado y se registró la salida en Kardex.",
        });
        setPurchaseToCancel(null);
        setCancelReason("");
        if (selectedPurchase?.id === purchaseToCancel.id) {
          setSelectedPurchase(null);
        }
        loadPurchases();
      } else {
        toast.error("No se pudo anular", { description: res.error });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error de conexión al anular la orden");
    } finally {
      setIsCancelling(false);
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

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize));
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* =========================================================================
          1. HEADER CON TITULO, METRICAS Y ACCIONES
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Compras & Entradas de Stock
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-0.5 rounded-lg border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
            >
              Almacén & CPP
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Control de facturas de proveedores, recepción de existencias y Costo Promedio Ponderado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-10 px-3 rounded-xl border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs gap-1.5"
            title="Recargar datos"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-indigo-600")} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Link href="/admin/compras/nueva">
            <Button
              size="sm"
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inversión en Compras (Mes) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Inversión del Mes
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-3">
            {CURRENCY_SYMBOL}{" "}
            {kpis.monthlyInvestment.toLocaleString("es-BO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 block">
            Compras en el mes en curso ({CURRENCY_NAME})
          </span>
        </div>

        {/* KPI 2: Facturas Procesadas */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Facturas del Mes
            </span>
            <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight mt-3">
            {kpis.monthlyPurchasesCount}
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 block">
            Recepciones en almacén
          </span>
        </div>

        {/* KPI 3: Unidades Ingresadas */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Unidades Ingresadas
            </span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PackagePlus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight mt-3">
            {kpis.monthlyUnitsReceived.toLocaleString("es-BO")}{" "}
            <span className="text-sm font-semibold text-slate-500">piezas</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            Sumadas al stock disponible
          </span>
        </div>

        {/* KPI 4: Proveedores con Compras */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Proveedores Suministradores
            </span>
            <div className="h-7 w-7 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight mt-3">
            {kpis.totalSuppliersCount}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">
            Empresas con compras activas
          </span>
        </div>
      </section>

      {/* =========================================================================
          3. BARRA DE HERRAMIENTAS: BUSCADOR Y FILTROS POR ESTADO
          ========================================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
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
              className="pl-9 h-11 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-900 transition-colors"
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
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Recibidas ({purchases.filter((p) => p.status === "received").length})
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
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Anuladas ({purchases.filter((p) => p.status === "cancelled").length})
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          <span>Mostrando {filteredPurchases.length} de {purchases.length} compras registradas</span>
          <span>Todas las órdenes recibidas incrementan el stock en almacén</span>
        </div>
      </div>

      {/* =========================================================================
          4. TABLA PRINCIPAL DE COMPRAS Y RECEPCIONES
          ========================================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Consultando registro de compras y almacén...
            </p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
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
                className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
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
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {paginatedPurchases.map((p) => {
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPurchase(p)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. Orden & Fecha */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
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
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {p.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin factura</span>
                          )}
                        </td>

                        {/* 3. Proveedor */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
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
                          <span className="font-bold text-slate-900 dark:text-white">
                            {p.itemsCount}{" "}
                            <span className="text-[10px] font-normal text-slate-400">piezas</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {p.linesCount} {p.linesCount === 1 ? "artículo" : "artículos"}
                          </span>
                        </td>

                        {/* 5. Total */}
                        <td className="py-4 px-4 text-right">
                          <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                            {CURRENCY_SYMBOL}{" "}
                            {p.totalAmount.toLocaleString("es-BO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>

                        {/* 6. Recepción en Almacén */}
                        <td className="py-4 px-4 text-center">
                          {p.status === "received" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>En Almacén</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Anulada</span>
                            </Badge>
                          )}
                        </td>

                        {/* 7. Medio de Pago */}
                        <td className="py-4 px-4 text-center">
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 capitalize">
                            {p.paymentMethod === "transfer"
                              ? "Transferencia"
                              : p.paymentMethod === "cash"
                              ? "Efectivo"
                              : p.paymentMethod === "card"
                              ? "Tarjeta"
                              : "Otro medio"}
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
                              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {p.status !== "cancelled" && (
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
              currentPage={currentPage}
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
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header del Drawer */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {selectedPurchase.purchaseNumber}
                  </span>
                  {selectedPurchase.status === "received" ? (
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px] font-semibold">
                      En Almacén
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 text-[10px] font-semibold">
                      Anulada
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registrada el {selectedPurchase.createdAt} por {selectedPurchase.userName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Mini Tarjetas de Resumen Financiero */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Factura</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                    {CURRENCY_SYMBOL} {selectedPurchase.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium block">Unidades</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                    {selectedPurchase.itemsCount} piezas
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium block">Medio de Pago</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white capitalize mt-0.5 block">
                    {selectedPurchase.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Datos del Proveedor y Factura */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                  Datos de Facturación & Proveedor
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Proveedor:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedPurchase.supplierName}
                  </span>
                </div>
                {selectedPurchase.supplierTaxId && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">NIT / RUC:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedPurchase.supplierTaxId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">N° Factura / Guía:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedPurchase.invoiceNumber || "Sin factura formal"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Medio de Pago:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {selectedPurchase.paymentMethod}
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
                    Total: {selectedPurchase.itemsCount} unidades
                  </span>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPurchase.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {it.productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.productImage}
                            alt={it.productName}
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {it.productName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {it.quantity} u. x {CURRENCY_SYMBOL} {it.unitCost.toFixed(2)}
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                          {CURRENCY_SYMBOL} {it.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              {selectedPurchase.notes && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Notas y Observaciones
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedPurchase.notes}
                  </p>
                </div>
              )}

              {/* Nota de Auditoría de Almacén */}
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <div className="text-[11px] leading-relaxed">
                  Esta orden incrementó el stock disponible en almacén y recalculó el Costo Promedio Ponderado (CPP) en el Kardex.
                </div>
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPurchase(null)}
                className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cerrar Ficha
              </Button>

              {selectedPurchase.status !== "cancelled" && (
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

      {/* =========================================================================
          6. MODAL: ANULACIÓN DE ORDEN DE COMPRA
          ========================================================================= */}
      <Dialog
        open={!!purchaseToCancel}
        onOpenChange={(open) => !open && setPurchaseToCancel(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Anular Orden de Compra</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Esta acción revertirá las existencias ingresadas al almacén y registrará un movimiento de salida en el Kardex.
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
                  Monto a revertir: {CURRENCY_SYMBOL} {purchaseToCancel.totalAmount.toFixed(2)} ({purchaseToCancel.itemsCount} piezas)
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Motivo de la anulación (opcional):
                </label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Factura duplicada, error en precios, devolución..."
                  className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPurchaseToCancel(null)}
              className="h-9 rounded-lg border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer gap-1.5"
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
    </div>
  );
}
