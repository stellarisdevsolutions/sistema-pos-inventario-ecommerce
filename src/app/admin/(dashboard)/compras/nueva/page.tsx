"use client";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  PackagePlus,
  Building2,
  Receipt,
  Package,
  Trash2,
  Check,
  RefreshCw,
  Info,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, CURRENCY_NAME } from "@/lib/currency";
import {
  getProductsForPurchaseAction,
  getSuppliersForPurchaseAction,
  createPurchaseAction,
} from "@/app/admin/actions/purchases";

// Helper de paginación para el modal
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

interface FormItem {
  tempId: string;
  productId: number;
  productName: string;
  productSku: string;
  productImage: string | null;
  currentStock: number;
  quantity: number;
  unitCost: number;
}

export default function NuevaCompraPage() {
  const router = useRouter();

  // Estados de catálogo
  const [availableProducts, setAvailableProducts] = useState<Awaited<ReturnType<typeof getProductsForPurchaseAction>>["data"]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos de cabecera
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash" | "card" | "other">("transfer");
  const [notes, setNotes] = useState("");

  // Renglones de productos agregados a la orden
  const [items, setItems] = useState<FormItem[]>([]);

  // Estado del Modal de Selección de Productos
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const modalPageSize = 5; // 5 productos por página para dar respiro visual al modal

  // Cargar productos y proveedores al montar
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingCatalogs(true);
        const [prodsRes, suppsRes] = await Promise.all([
          getProductsForPurchaseAction(),
          getSuppliersForPurchaseAction(),
        ]);

        if (prodsRes.success && prodsRes.data) {
          setAvailableProducts(prodsRes.data);
        }
        if (suppsRes.success && suppsRes.data) {
          setAvailableSuppliers(suppsRes.data);
          if (suppsRes.data.length > 0) {
            setSupplierId(suppsRes.data[0].id);
          }
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
        toast.error("Error de conexión al cargar catálogos");
      } finally {
        setIsLoadingCatalogs(false);
      }
    }
    loadData();
  }, []);

  // Agregar producto a la lista
  const handleAddItem = (productId: number) => {
    const prod = availableProducts.find((p) => p.id === productId);
    if (!prod) return;

    // Si ya existe en la lista, incrementamos su cantidad
    const existingIndex = items.findIndex((it) => it.productId === productId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
      toast.info(`"${prod.name}" incrementado a ${updated[existingIndex].quantity} unidades`);
      return;
    }

    const newItem: FormItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      productId: prod.id,
      productName: prod.name,
      productSku: prod.sku,
      productImage: prod.imageUrl || null,
      currentStock: prod.stock,
      quantity: 1,
      unitCost: prod.costPrice > 0 ? prod.costPrice : 0,
    };

    setItems((prev) => [...prev, newItem]);
    toast.success(`"${prod.name}" agregado a la orden`);
  };

  // Modificar cantidad o costo unitario
  const handleUpdateItem = (tempId: string, field: "quantity" | "unitCost", value: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.tempId === tempId) {
          return {
            ...it,
            [field]: isNaN(value) ? 0 : Math.max(0, value),
          };
        }
        return it;
      })
    );
  };

  // Quitar producto de la lista
  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  // Verificar cantidad de un producto ya añadida en la orden
  const getItemQuantityInOrder = (productId: number) => {
    const found = items.find((it) => it.productId === productId);
    return found ? found.quantity : 0;
  };

  // Totales calculados en vivo
  const totalUnits = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity || 0) * (it.unitCost || 0), 0);
  }, [items]);

  // Proveedor seleccionado
  const selectedSupplier = useMemo(() => {
    return availableSuppliers.find((s) => s.id === Number(supplierId));
  }, [availableSuppliers, supplierId]);

  const filteredModalProducts = useMemo(() => {
    const term = modalSearchTerm.toLowerCase().trim();
    if (!term) return availableProducts;
    return availableProducts.filter((product) =>
      [product.name, product.sku, product.barcode].some((value) => value.toLowerCase().includes(term))
    );
  }, [availableProducts, modalSearchTerm]);

  const modalTotalPages = Math.max(1, Math.ceil(filteredModalProducts.length / modalPageSize));

  const paginatedModalProducts = useMemo(() => {
    const start = (modalCurrentPage - 1) * modalPageSize;
    return filteredModalProducts.slice(start, start + modalPageSize);
  }, [filteredModalProducts, modalCurrentPage, modalPageSize]);

  // Guardar e ingresar mercadería
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("Selecciona un proveedor válido");
      return;
    }

    if (items.length === 0) {
      toast.error("Debes agregar al menos un producto a la compra");
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0) {
        toast.error(`La cantidad de "${it.productName}" debe ser mayor a 0`);
        return;
      }
      if (it.unitCost < 0) {
        toast.error(`El costo unitario de "${it.productName}" no puede ser negativo`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        supplierId: Number(supplierId),
        invoiceNumber: invoiceNumber.trim() || null,
        paymentMethod,
        paymentStatus: "paid" as const, // Pagada por defecto
        status: "received" as const,    // Recibida directamente en almacén
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitCost: it.unitCost,
        })),
      };

      const res = await createPurchaseAction(payload);
      if (res.success) {
        toast.success("Compra ingresada a almacén", {
          description: `Se sumaron ${totalUnits} piezas físicas al inventario y se actualizó el Kardex.`,
        });
        router.push("/admin/compras");
      } else {
        toast.error("Error al registrar compra", { description: res.error });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error inesperado al guardar la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          1. HEADER CON RETORNO Y TÍTULO
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <Link
            href="/admin/compras"
            className="admin-return"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a Compras & Entradas</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-page-title">Registrar compra</h1>
          </div>
          <p className="admin-page-description">Selecciona un proveedor y agrega los productos recibidos.</p>
        </div>
      </div>

      {isLoadingCatalogs ? (
        <div className="py-24 text-center space-y-3 bg-admin-card-bg rounded-xl border border-admin-card-border">
          <RefreshCw className="h-8 w-8 text-admin-brand-text animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Cargando proveedores y productos disponibles...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ===================================================================
                COLUMNA PRINCIPAL (8 COLS): DATOS DE CABECERA Y ARTÍCULOS
                =================================================================== */}
            <div className="lg:col-span-8 space-y-6">
              {/* Tarjeta 1: Datos de Factura y Proveedor */}
              <div className="admin-panel p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-admin-card-border">
                  <Building2 className="h-4 w-4 text-admin-brand-text" />
                  <h2 className="text-sm font-bold text-admin-text">
                    Datos del Proveedor & Factura
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Proveedor */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-admin-secondary flex items-center justify-between">
                      <span>Empresa Proveedora *</span>
                      {selectedSupplier?.taxId && (
                        <span className="font-mono text-slate-400 font-normal">
                          NIT / RUC: {selectedSupplier.taxId}
                        </span>
                      )}
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(Number(e.target.value))}
                      required
                      className="h-10 w-full rounded-xl border border-admin-card-border bg-admin-card-bg px-3.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-admin-brand/20"
                    >
                      {availableSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.taxId ? `(NIT: ${s.taxId})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Número de Factura */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-admin-secondary">
                      N° de Factura / Guía de Remisión
                    </label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. FAC-9842 o Guía #1024"
                      className="h-10 text-xs rounded-xl border-admin-card-border font-medium placeholder:font-normal"
                    />
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-admin-secondary">
                      Medio de Pago Utilizado
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="h-10 w-full rounded-xl border border-admin-card-border bg-admin-card-bg px-3.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-admin-brand/20"
                    >
                      <option value="transfer">Transferencia Bancaria</option>
                      <option value="cash">Efectivo de Caja</option>
                      <option value="card">Tarjeta de Débito / Crédito</option>
                      <option value="other">Otro medio</option>
                    </select>
                  </div>

                  {/* Notas */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-admin-secondary">
                      Notas u Observaciones de la Compra
                    </label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Condiciones de entrega, garantía del lote, detalles del transportista..."
                      className="h-10 text-xs rounded-xl border-admin-card-border font-medium placeholder:font-normal"
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Detalle de Productos a Ingresar */}
              <div className="admin-panel overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-admin-card-border">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-admin-brand-text" />
                    <div>
                      <h2 className="text-sm font-bold text-admin-text">
                        Artículos a Ingresar
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        {items.length} {items.length === 1 ? "artículo" : "artículos"} seleccionados ({totalUnits} piezas físicas)
                      </span>
                    </div>
                  </div>

                  {/* Botón que abre el modal del catálogo */}
                  <Button
                    type="button"
                    onClick={() => {
                      setModalSearchTerm("");
                      setModalCurrentPage(1);
                      setIsProductModalOpen(true);
                    }}
                    className="h-10 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Seleccionar Productos</span>
                  </Button>
                </div>

                {/* Listado dinámico de renglones a ancho completo */}
                {items.length === 0 ? (
                  <div className="py-16 px-5 text-center space-y-3 bg-admin-raised">
                    <Package className="h-9 w-9 text-slate-400 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-admin-secondary">
                        No has agregado ningún artículo a la compra
                      </h3>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Abre el catálogo para agregar artículos a la orden de compra.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setModalSearchTerm("");
                        setModalCurrentPage(1);
                        setIsProductModalOpen(true);
                      }}
                      className="h-9 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Abrir Catálogo de Productos</span>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 w-full">
                    {items.map((it, idx) => {
                      const lineSubtotal = it.quantity * it.unitCost;
                      return (
                        <div
                          key={it.tempId}
                          className="p-4 sm:px-5 bg-admin-card-bg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-admin-raised transition-colors"
                        >
                          {/* Info del producto con Imagen */}
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <span className="font-mono text-xs font-bold text-slate-400 w-5 shrink-0">
                              #{idx + 1}
                            </span>

                            {it.productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <ProductThumbnail
                                src={it.productImage}
                                alt={it.productName}
                                className="h-11 w-11 rounded-lg object-cover border border-admin-card-border shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-lg bg-admin-raised border border-admin-card-border flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-admin-text break-words">
                                {it.productName}
                              </h4>
                              <p className="text-[11px] text-admin-muted">{it.productSku}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>
                                  Stock actual: <strong className="text-admin-secondary font-mono">{it.currentStock}</strong> u.
                                </span>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Nuevo stock: <strong className="font-mono">{it.currentStock + it.quantity}</strong> u.
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Controles de Cantidad, Costo y Subtotal */}
                          <div className="flex items-center gap-3 justify-between md:justify-end shrink-0">
                            {/* Cantidad */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400 block">
                                Cantidad a Ingresar
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={it.quantity || ""}
                                onChange={(e) =>
                                  handleUpdateItem(it.tempId, "quantity", parseInt(e.target.value) || 0)
                                }
                                className="h-9 w-24 text-xs rounded-lg border-admin-card-border text-center font-bold font-mono"
                              />
                            </div>

                            {/* Costo Unitario */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400 block">
                                Costo Unit. ({CURRENCY_SYMBOL})
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.unitCost || ""}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    it.tempId,
                                    "unitCost",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-9 w-32 text-xs rounded-lg border-admin-card-border text-right font-bold font-mono"
                              />
                            </div>

                            {/* Subtotal */}
                            <div className="space-y-1 min-w-[90px] text-right">
                              <label className="text-[10px] font-semibold text-slate-400 block">
                                Subtotal
                              </label>
                              <span className="text-xs font-mono font-semibold text-admin-text block pt-1.5">
                                {CURRENCY_SYMBOL} {lineSubtotal.toFixed(2)}
                              </span>
                            </div>

                            {/* Botón Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.tempId)}
                              title="Quitar artículo"
                              className="h-9 w-9 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors mt-4 md:mt-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ===================================================================
                COLUMNA LATERAL (4 COLS): RESUMEN FINANCIERO Y AUDITORÍA
                =================================================================== */}
            <div className="lg:col-span-4 space-y-4">
              {/* Tarjeta de Resumen Financiero */}
              <div className="admin-panel p-5 space-y-4 sticky top-6">
                <div className="flex items-center gap-2 pb-3 border-b border-admin-card-border">
                  <Receipt className="h-4 w-4 text-admin-brand-text" />
                  <h3 className="text-sm font-bold text-admin-text">
                    Resumen de Liquidación
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Artículos distintos:</span>
                    <span className="font-bold text-admin-text font-mono">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500">
                    <span>Unidades físicas a ingresar:</span>
                    <span className="font-bold text-admin-brand-text font-mono">
                      {totalUnits} piezas
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500">
                    <span>Moneda de compra:</span>
                    <span className="font-semibold text-admin-secondary">
                      {CURRENCY_NAME} ({CURRENCY_SYMBOL})
                    </span>
                  </div>

                  <div className="pt-3 border-t border-admin-card-border flex justify-between items-baseline">
                    <span className="text-xs font-bold text-admin-text">
                      Total de la Factura:
                    </span>
                    <span className="text-2xl font-semibold text-admin-text font-mono tracking-tight">
                      {CURRENCY_SYMBOL}{" "}
                      {totalAmount.toLocaleString("es-BO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-3 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || items.length === 0}
                    className="h-11 w-full rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Procesando e ingresando stock...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>Guardar e Incrementar Stock</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/compras")}
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-xl border-admin-card-border text-xs text-admin-secondary hover:bg-admin-raised cursor-pointer"
                  >
                    Cancelar y Regresar
                  </Button>
                </div>

                {/* Nota de Auditoría de Almacén */}
                <div className="p-3.5 rounded-xl bg-admin-raised border border-admin-card-border space-y-1.5 text-[11px] text-admin-secondary leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-admin-text">
                    <Info className="h-3.5 w-3.5 text-admin-brand-text shrink-0" />
                    <span>Impacto en Almacén & Kardex</span>
                  </div>
                  <p>
                    Al confirmar, el stock disponible aumentará y se recalculará automáticamente el Costo Promedio Ponderado (CPP).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
          MODAL: LISTADO DE PRODUCTOS CON BUSCADOR, PAGINACIÓN Y BOTÓN AGREGAR
          ========================================================================= */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-3xl h-[85vh] sm:h-[620px] max-h-[90vh] flex flex-col admin-panel p-0 overflow-hidden">
          {/* Header del Modal */}
          <DialogHeader className="p-5 pb-4 border-b border-admin-card-border shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold text-admin-text flex items-center gap-2">
                  <Package className="h-5 w-5 text-admin-brand-text" />
                  <span>Catálogo de Productos para Compra</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-admin-muted mt-0.5">
                  Selecciona los artículos que deseas ingresar a la orden de compra.
                </DialogDescription>
              </div>
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline-flex">
                {items.length} en la orden
              </span>
            </div>

            {/* Buscador dentro del modal */}
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={modalSearchTerm}
                onChange={(e) => {
                  setModalSearchTerm(e.target.value);
                  setModalCurrentPage(1);
                }}
                aria-label="Buscar por producto, variante, SKU o código de barras"
                placeholder="Buscar producto, variante, SKU o código de barras"
                className="pl-9 h-10 text-xs rounded-xl bg-admin-raised border-admin-card-border focus:bg-admin-card-bg"
              />
              {modalSearchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setModalSearchTerm("");
                    setModalCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Tabla de Productos con Scroll */}
          <div className="flex-1 overflow-y-auto">
            {paginatedModalProducts.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Package className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-admin-secondary">
                  No se encontraron productos
                </p>
                <p className="text-[11px] text-slate-400">
                  Intenta con otro término de búsqueda.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-admin-muted uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="py-3 px-5">Producto</th>
                    <th className="py-3 px-4 text-center">Stock Actual</th>
                    <th className="py-3 px-4 text-right">Costo Catálogo</th>
                    <th className="py-3 px-4 text-right">Precio Venta</th>
                    <th className="py-3 px-5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border font-medium text-admin-secondary">
                  {paginatedModalProducts.map((p) => {
                    const inOrderQty = getItemQuantityInOrder(p.id);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-admin-raised transition-colors"
                      >
                        {/* 1. Producto con Imagen y Nombre */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <ProductThumbnail
                                src={p.imageUrl}
                                alt={p.name}
                                className="h-10 w-10 rounded-lg object-cover border border-admin-card-border shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-admin-raised border border-admin-card-border flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-admin-text break-words">{p.name}</div>
                              <p className="text-[11px] text-admin-muted">{p.sku}</p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Stock Actual */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-admin-text">
                            {p.stock}
                          </span>{" "}
                          <span className="text-[10px] text-slate-400">u.</span>
                        </td>

                        {/* 3. Costo Catálogo */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-admin-text">
                          {CURRENCY_SYMBOL} {p.costPrice.toFixed(2)}
                        </td>

                        {/* 4. Precio Venta */}
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {CURRENCY_SYMBOL} {p.price.toFixed(2)}
                        </td>

                        {/* 5. Botón Agregar */}
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inOrderQty > 0 && (
                              <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>{inOrderQty} u.</span>
                              </div>
                            )}

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddItem(p.id)}
                              className={cn(
                                "h-8 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer transition-all active:scale-95",
                                inOrderQty > 0
                                  ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                                  : "bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid"
                              )}
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Agregar</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer del Modal con Paginación Cómoda y Separada */}
          <DialogFooter className="p-4 px-6 pb-6 border-t border-admin-card-border bg-admin-raised shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-admin-muted font-medium">
              Mostrando página <span className="font-bold text-admin-text">{modalCurrentPage}</span> de{" "}
              <span className="font-bold text-admin-text">{modalTotalPages}</span> ({filteredModalProducts.length} productos)
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={modalCurrentPage <= 1}
                  onClick={() => setModalCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised flex items-center justify-center text-admin-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPaginationItems(modalCurrentPage, modalTotalPages).map((item, idx) =>
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
                      onClick={() => setModalCurrentPage(item)}
                      className={cn(
                        "h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-all",
                        modalCurrentPage === item
                          ? "bg-admin-brand text-white border border-admin-brand"
                          : "border border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
                      )}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={modalCurrentPage >= modalTotalPages}
                  onClick={() => setModalCurrentPage((prev) => Math.min(modalTotalPages, prev + 1))}
                  className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised flex items-center justify-center text-admin-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <Button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="h-8 px-4 rounded-lg bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold cursor-pointer"
              >
                Listo ({items.length} en orden)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
