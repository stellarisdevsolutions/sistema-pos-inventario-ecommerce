"use client";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

import { refundUnitAmounts } from "@/lib/refund-amount";

import { useState, useEffect, useMemo, useRef } from "react";
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
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Zap,
  Package,
  X,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Filter,
  ChevronRight,
  Ban,
  Check,
  DollarSign,
  Wallet,
  FileText,
  QrCode,
  Tag,
  Building2,
  Lock,
  Unlock,
  ShieldCheck,
  Store,
  RotateCcw,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, CURRENCY_NAME, formatCurrency, formatCurrencyLocale } from "@/lib/currency";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  getPosCatalogAction,
  getPosContextAction,
  createSaleAction,
  getSalesHistoryAction,
  cancelSaleAction,
  refundSaleItemsAction,
  type PosProductItem,
  type SaleTicketItem,
  type SaleHistoryItem,
  type SalesKpiSummary,
  type PosShiftItem,
  type PosUserItem,
  type RefundReceiptData,
} from "@/app/admin/actions/sales";

interface CartItem {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  quantity: number;
  maxStock: number;
  image: string;
}

export default function VentasPage() {

  // Pestaña activa: POS / Historial
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Contexto de operadores y exclusividad de caja
  const [users, setUsers] = useState<PosUserItem[]>([]);
  const [currentOperator, setCurrentOperator] = useState<PosUserItem | null>(null);
  const [allOpenShifts, setAllOpenShifts] = useState<PosShiftItem[]>([]);
  const [shiftPendingReview, setShiftPendingReview] = useState(false);
  const [isAdministrativeSale, setIsAdministrativeSale] = useState(false);

  // Estado del catálogo y turno de caja
  const [catalog, setCatalog] = useState<PosProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["Todas"]);
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [activeShift, setActiveShift] = useState<{
    id: number;
    shiftNumber: string;
    cashRegisterName: string;
    cashierName: string;
  } | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Estado del Carrito y Venta actual
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Público General");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashGivenInput, setCashGivenInput] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Comprobante / Ticket recién emitido
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastTicket, setLastTicket] = useState<{
    saleId: number;
    saleNumber: string;
    customerName: string;
    customerTaxId?: string;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    paymentMethod: string;
    cashGiven: number | null;
    changeGiven: number | null;
    createdAt: string;
    items: SaleTicketItem[];
    isAdministrativeSale?: boolean;
    cashRegisterName?: string | null;
    shiftNumber?: string | null;
    cashierName?: string;
  } | null>(null);

  // Estado de la pestaña Historial de Ventas
  const [salesHistory, setSalesHistory] = useState<SaleHistoryItem[]>([]);
  const [historyKpis, setHistoryKpis] = useState<SalesKpiSummary>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalSalesCount: 0,
    averageTicket: 0,
    administrativeSalesCount: 0,
    administrativeSalesRevenue: 0,
    posShiftSalesCount: 0,
    posShiftSalesRevenue: 0,
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyMethodFilter, setHistoryMethodFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyOriginFilter, setHistoryOriginFilter] = useState<"all" | "pos" | "administrative">("all");

  // Modal de Anulación de Venta
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<SaleHistoryItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal de Reimpresión de Ticket
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [ticketToReprint, setTicketToReprint] = useState<SaleHistoryItem | null>(null);

  // Modal de Devolución Parcial por Ítem (Con PIN de Supervisor)
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<SaleHistoryItem | null>(null);
  const [refundQuantities, setRefundQuantities] = useState<Record<number, number>>({});
  const [refundReason, setRefundReason] = useState("");
  const [supervisorPin, setSupervisorPin] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Modal de Vale / Comprobante de Devolución Térmico (80mm)
  const [refundReceiptOpen, setRefundReceiptOpen] = useState(false);
  const [refundReceiptData, setRefundReceiptData] = useState<RefundReceiptData | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar catálogo y contexto de caja real del operador autenticado
  const loadPosData = async () => {
    setIsLoadingCatalog(true);
    try {
      const [catRes, contextRes] = await Promise.all([
        getPosCatalogAction(),
        getPosContextAction(),
      ]);

      if (catRes.success) {
        setCatalog(catRes.data);
        setCategories(catRes.categories);
      } else {
        toast.error(catRes.error || "No se pudo cargar el catálogo.");
      }

      if (contextRes.success) {
        setShiftPendingReview(contextRes.shiftPendingReview);
        setUsers(contextRes.users);
        setAllOpenShifts(contextRes.allOpenShifts);
        setCurrentOperator(contextRes.currentOperator);

        if (contextRes.userShift) {
          setActiveShift({
            id: contextRes.userShift.id,
            shiftNumber: contextRes.userShift.shiftNumber,
            cashRegisterName: contextRes.userShift.cashRegisterName,
            cashierName: contextRes.userShift.cashierName,
          });
          setIsAdministrativeSale(false);
        } else {
          setActiveShift(null);
          // Si el operador es admin o supervisor y no tiene caja propia abierta, activar modo administrativo
          if (
            !contextRes.shiftPendingReview &&
            (contextRes.currentOperator?.role === "admin" || contextRes.currentOperator?.role === "manager")
          ) {
            setIsAdministrativeSale(true);
          } else {
            setIsAdministrativeSale(false);
          }
        }
      } else {
        toast.error(contextRes.error || "Error al cargar contexto de caja.");
      }
    } catch {
      toast.error("Error al conectar con la base de datos.");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Cargar historial de ventas
  const loadHistoryData = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getSalesHistoryAction();
      if (res.success) {
        setSalesHistory(res.data);
        setHistoryKpis(res.kpis);
      } else {
        toast.error(res.error || "Error al obtener historial de ventas.");
      }
    } catch {
      toast.error("Error al cargar ventas pasadas.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPosData();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistoryData();
    }
  }, [activeTab]);

  // Cálculos de Totales
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountInput) || 0;
    return Math.max(0, Math.min(val, subtotal));
  }, [discountInput, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Cálculo de Cambio / Vuelto
  const cashGivenNumeric = parseFloat(cashGivenInput) || 0;
  const changeAmount = useMemo(() => {
    if (paymentMethod !== "cash") return 0;
    return Math.max(0, cashGivenNumeric - total);
  }, [paymentMethod, cashGivenNumeric, total]);

  // Manejo de Carrito y Control de Stock en tiempo real
  const addToCart = (product: PosProductItem) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" está agotado y no puede venderse.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.warning(`Stock máximo alcanzado: solo hay ${product.stock} unidades disponibles.`);
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          quantity: 1,
          maxStock: product.stock,
          image: product.image,
        },
      ];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.maxStock) {
              toast.warning(`Límite de stock: ${item.maxStock} disponibles.`);
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCashGivenInput("");
    setDiscountInput("0");
    setNotes("");
  };

  // Soporte de pistola lectora de código de barras
  const handleBarcodeSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = searchTerm.trim().toLowerCase();
      if (!query) return;

      // Buscar coincidencia exacta por barcode o sku
      const match = catalog.find(
        (p) =>
          p.barcode.toLowerCase() === query ||
          p.sku.toLowerCase() === query ||
          p.name.toLowerCase() === query
      );

      if (match) {
        addToCart(match);
        toast.success(`Agregado al ticket: ${match.name}`);
        setSearchTerm("");
      } else {
        toast.info(`No se encontró ningún producto con código "${searchTerm}".`);
      }
    }
  };

  // Filtrado de Catálogo en vivo
  const filteredCatalog = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return catalog.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "Todas" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [catalog, searchTerm, selectedCategory]);

  // Procesar Cobro de Venta (Server Action con Reglas de Negocio Estrictas)
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío. Agrega productos para cobrar.");
      return;
    }

    if (!currentOperator) {
      toast.error("Debes seleccionar un operador para procesar la venta.");
      return;
    }

    // Regla 1 & 3: Validación de apertura de caja
    if (!isAdministrativeSale && !activeShift) {
      if (currentOperator.role === "admin" || currentOperator.role === "manager") {
        toast.error(
          "No tienes un turno de caja abierto asignado. Como administrador, puedes activar 'Venta Administrativa Directa' o abrir una caja en Control de Cajas."
        );
      } else {
        toast.error(
          "Terminal Bloqueada: No tienes un turno de caja abierto asignado a tu nombre. Abre una caja con tu fondo inicial antes de cobrar."
        );
      }
      return;
    }

    // Regla 3: Venta administrativa solo para perfiles autorizados
    if (
      isAdministrativeSale &&
      currentOperator.role !== "admin" &&
      currentOperator.role !== "manager"
    ) {
      toast.error(
        "Acceso Denegado: Solo administradores y supervisores pueden emitir ventas administrativas directas fuera de caja."
      );
      return;
    }

    if (paymentMethod === "cash" && cashGivenNumeric < total && cashGivenInput.trim() !== "") {
      toast.error(
        `El monto recibido (${formatCurrency(cashGivenNumeric)}) es menor al total (${formatCurrency(total)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const salePayload = {
        customerName: customerName.trim() || "Público General",
        customerTaxId: customerTaxId.trim() || null,
        paymentMethod,
        cashGiven: paymentMethod === "cash" ? (cashGivenNumeric || total) : null,
        changeGiven: paymentMethod === "cash" ? changeAmount : null,
        discountAmount,
        notes: notes.trim() || null,
        cashShiftId: isAdministrativeSale ? null : (activeShift?.id || null),
        isAdministrativeSale,
        userId: currentOperator.id,
        channel: "pos" as const,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
      };

      const result = await createSaleAction(salePayload);

      if (!result.success || !result.data) {
        toast.error(result.error || "No se pudo procesar la venta.");
        setIsSubmitting(false);
        return;
      }

      toast.success(
        isAdministrativeSale
          ? `Venta Administrativa ${result.data.saleNumber} registrada exitosamente (fuera de caja).`
          : `Venta ${result.data.saleNumber} cobrada en ${activeShift?.cashRegisterName}.`
      );

      // Guardar ticket y abrir comprobante
      setLastTicket({
        saleId: result.data.saleId,
        saleNumber: result.data.saleNumber,
        customerName: result.data.customerName,
        customerTaxId: customerTaxId.trim() || undefined,
        totalAmount: result.data.totalAmount,
        subtotal,
        discountAmount,
        paymentMethod: result.data.paymentMethod,
        cashGiven: result.data.cashGiven,
        changeGiven: result.data.changeGiven,
        createdAt: result.data.createdAt,
        items: result.data.items,
        isAdministrativeSale,
        cashRegisterName: isAdministrativeSale ? null : (activeShift?.cashRegisterName || null),
        shiftNumber: isAdministrativeSale ? null : (activeShift?.shiftNumber || null),
        cashierName: currentOperator.name,
      });

      setReceiptOpen(true);
      clearCart();

      // Recargar catálogo y contexto actualizado
      loadPosData();
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error inesperado al registrar el cobro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anular venta desde el Historial
  const handleConfirmCancelSale = async () => {
    if (!saleToCancel) return;
    setIsCancelling(true);
    try {
      const res = await cancelSaleAction(saleToCancel.id, cancelReason);
      if (res.success) {
        toast.success(`Venta ${saleToCancel.saleNumber} anulada. Stock repuesto en Kardex.`);
        setCancelModalOpen(false);
        setSaleToCancel(null);
        setCancelReason("");
        loadHistoryData();
        loadPosData();
      } else {
        toast.error(res.error || "No se pudo anular la venta.");
      }
    } catch {
      toast.error("Error al procesar la anulación.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Abrir modal de devolución parcial con inicialización de cantidades
  const handleOpenRefundModal = (sale: SaleHistoryItem) => {
    setSaleToRefund(sale);
    const initialQty: Record<number, number> = {};
    sale.items.forEach((item) => {
      initialQty[item.id] = 0;
    });
    setRefundQuantities(initialQty);
    setRefundReason("");
    setSupervisorPin("");
    const method = sale.paymentMethod === "cash" ? "cash" : "transfer";
    setRefundMethod(method);
    setRefundModalOpen(true);
  };

  const handleUpdateRefundQty = (saleItemId: number, delta: number, maxReturnable: number) => {
    setRefundQuantities((prev) => {
      const current = prev[saleItemId] || 0;
      const next = Math.max(0, Math.min(maxReturnable, current + delta));
      return { ...prev, [saleItemId]: next };
    });
  };

  const refundCalculation = useMemo(() => {
    if (!saleToRefund) return { totalAmount: 0, itemsCount: 0, itemsToRefund: [] };
    let totalAmount = 0;
    let itemsCount = 0;
    const itemsToRefund: {
      saleItemId: number;
      productId: number;
      quantityToRefund: number;
      unitPrice: number;
      productName: string;
      sku: string;
    }[] = [];

    const amounts = refundUnitAmounts(saleToRefund.items, saleToRefund.totalAmount);
    saleToRefund.items.forEach((item) => {
      const qty = refundQuantities[item.id] || 0;
      if (qty > 0) {
        totalAmount += amounts.get(item.id)!(item.returnedQuantity, qty) / 100;
        itemsCount += qty;
        itemsToRefund.push({
          saleItemId: item.id,
          productId: item.productId,
          quantityToRefund: qty,
          unitPrice: item.unitPrice,
          productName: item.productName,
          sku: item.productSku || "",
        });
      }
    });

    return { totalAmount, itemsCount, itemsToRefund };
  }, [saleToRefund, refundQuantities]);

  const handleProcessRefund = async () => {
    if (!saleToRefund) return;
    if (refundCalculation.itemsCount === 0) {
      toast.warning("Debes seleccionar al menos 1 unidad a devolver.");
      return;
    }
    if (!supervisorPin.trim() || supervisorPin.trim().length < 4) {
      toast.error("Ingresa el PIN de al menos 4 dígitos de un Administrador o Supervisor.");
      return;
    }
    if (!refundReason.trim()) {
      toast.warning("Por favor especifica el motivo de la devolución (producto defectuoso, talla errónea, etc).");
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const res = await refundSaleItemsAction({
        saleId: saleToRefund.id,
        items: refundCalculation.itemsToRefund.map((i) => ({
          saleItemId: i.saleItemId,
          quantityToRefund: i.quantityToRefund,
        })),
        reason: refundReason.trim(),
        supervisorPin: supervisorPin.trim(),
        refundMethod,
        cashShiftId: activeShift?.id || null,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo procesar la devolución.");
        return;
      }

      toast.success(
        `Devolución #${res.data.refundNumber} autorizada con éxito. Mercancía reingresada al inventario.`
      );
      setRefundReceiptData(res.data);
      setRefundModalOpen(false);
      setRefundReceiptOpen(true);
      loadHistoryData();
      loadPosData();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la devolución.");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  // Filtrado de Historial de Ventas (con filtro por Origen: Caja vs Administrativa)
  const filteredSalesHistory = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return salesHistory.filter((sale) => {
      const matchesQuery =
        !q ||
        sale.saleNumber.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.cashierName.toLowerCase().includes(q);

      const matchesMethod =
        historyMethodFilter === "all" || sale.paymentMethod === historyMethodFilter;

      const matchesStatus =
        historyStatusFilter === "all" || sale.status === historyStatusFilter;

      const matchesOrigin =
        historyOriginFilter === "all" ||
        (historyOriginFilter === "administrative" && sale.isAdministrativeSale) ||
        (historyOriginFilter === "pos" && !sale.isAdministrativeSale);

      return matchesQuery && matchesMethod && matchesStatus && matchesOrigin;
    });
  }, [salesHistory, historySearch, historyMethodFilter, historyStatusFilter, historyOriginFilter]);

  // Paginación del historial de ventas (15 registros por página)
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 15;

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyMethodFilter, historyStatusFilter, historyOriginFilter]);

  const totalHistoryPages = Math.ceil(filteredSalesHistory.length / HISTORY_PAGE_SIZE) || 1;
  const paginatedSalesHistory = useMemo(() => {
    return filteredSalesHistory.slice(
      (historyPage - 1) * HISTORY_PAGE_SIZE,
      historyPage * HISTORY_PAGE_SIZE
    );
  }, [filteredSalesHistory, historyPage]);

  // Botones de billetes rápidos para agilizar cobro en efectivo
  const quickBills = useMemo(() => {
    const t = Math.ceil(total);
    if (t <= 0) return [10, 20, 50, 100, 200];
    const roundedTen = Math.ceil(t / 10) * 10;
    const roundedFifty = Math.ceil(t / 50) * 50;
    const roundedHundred = Math.ceil(t / 100) * 100;
    const set = new Set([t, roundedTen, roundedFifty, roundedHundred, roundedHundred + 100]);
    return Array.from(set).sort((a, b) => a - b).slice(0, 5);
  }, [total]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* =========================================================================
          1. HEADER CON INDICADOR DE CAJA, SWITCHER DE OPERADOR Y SELECTOR DE PESTAÑAS
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="admin-page-title">Punto de venta</h1>

            {/* Estado del turno de caja del operador seleccionado */}
            {activeShift ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeShift.shiftNumber} · {activeShift.cashRegisterName}
              </span>
            ) : isAdministrativeSale ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-admin-brand-text bg-admin-brand-subtle border border-admin-brand-light px-2.5 py-1 rounded-xl">
                <Building2 className="h-3 w-3" />
                Venta administrativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl">
                <Lock className="h-3 w-3" />
                {shiftPendingReview ? "Arqueo pendiente" : "Sin turno abierto"}
              </span>
            )}
          </div>
          <p className="text-xs text-admin-muted mt-1">
            Cobra ventas y consulta los tickets del mostrador.
          </p>
        </div>

        {/* Pestañas Terminal POS vs Historial & Enlace a Control de Cajas */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/cajas"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-admin-secondary bg-admin-card-bg border border-admin-card-border hover:bg-admin-raised transition-colors"
          >
            <Wallet className="h-3.5 w-3.5 text-admin-brand-text" />
            <span>Control de Cajas</span>
          </Link>

          <div className="admin-segments">
            <button
              onClick={() => setActiveTab("pos")}
              aria-pressed={activeTab === "pos"}
              className="admin-segment"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Terminal POS</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              aria-pressed={activeTab === "history"}
              className="admin-segment"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Historial de Ventas</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "pos" ? (
        /* =========================================================================
            2. VISTA TERMINAL POS (GRID 12 COLUMNAS)
            ========================================================================= */
        <div className="space-y-4">
          {/* BANNER INFORMATIVO / BLOQUEO POR REGLAS DE NEGOCIO */}
          {!activeShift && !isAdministrativeSale && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Terminal Bloqueada para {currentOperator?.name || "este operador"}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed max-w-2xl">
                    {shiftPendingReview ? "Tu conteo está pendiente de aprobación. La caja se libera cuando un supervisor aprueba el cierre." : "Abre un turno a tu nombre para cobrar en mostrador."}
                  </p>
                </div>
              </div>
              <Link href="/admin/cajas">
                <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                  {shiftPendingReview ? "Ver estado en Cajas" : "Abrir mi caja"}
                </Button>
              </Link>
            </div>
          )}

          {isAdministrativeSale && (
            <div className="p-3.5 rounded-xl bg-admin-brand-subtle border border-admin-brand-light flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-admin-brand-text">
                      Modo: Venta Administrativa Directa ({currentOperator?.name})
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-brand-text">
                      <span className="h-1.5 w-1.5 rounded-full bg-admin-brand" />
                      <span>Directa</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-admin-brand-text leading-relaxed max-w-3xl">
                    {allOpenShifts.length > 0
                      ? `Exclusividad activa: Hay ${allOpenShifts.length} terminal(es) en uso por cajeros (${allOpenShifts.map((s) => s.cashRegisterName + ' por ' + s.cashierName).join(', ')}). Tus cobros no ingresarán a ninguna gaveta física de mostrador.`
                      : `Cobro administrativo habilitado. No afecta fondos ni arqueos de cajeros de mostrador.`}
                  </p>
                </div>
              </div>
              <Link href="/admin/cajas">
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl border-admin-brand-light text-admin-brand-text">
                  Abrir Caja Propia
                </Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LADO IZQUIERDO: CATÁLOGO DE PRODUCTOS (7 Columnas) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Buscador + Escáner de Códigos de Barra */}
              <div className="admin-panel p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleBarcodeSearchKeyDown}
                  placeholder="Escanear código de barras o escribir producto, SKU... (Enter para agregar)"
                  className="pl-9 pr-10 h-10 text-xs rounded-xl bg-admin-raised border-admin-card-border focus:ring-2 focus:ring-admin-brand/20 focus:border-admin-brand"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro por Categorías */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer",
                      selectedCategory === cat
                        ? "bg-admin-brand text-white font-bold"
                        : "bg-admin-raised text-admin-secondary hover:bg-slate-200/80 font-medium"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Productos en Caja */}
            {isLoadingCatalog ? (
              <div className="p-12 text-center bg-admin-card-bg rounded-xl border border-admin-card-border">
                <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Cargando catálogo del inventario...</p>
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="p-12 text-center bg-admin-card-bg rounded-xl border border-dashed border-admin-card-border">
                <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-admin-secondary">
                  No se encontraron productos disponibles
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Verifica el término de búsqueda o selecciona otra categoría.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCatalog.map((product) => {
                  const cartItem = cart.find((i) => i.id === product.id);
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={cn(
                        "group rounded-xl bg-admin-card-bg border p-3 transition-all flex flex-col justify-between select-none",
                        isOutOfStock
                          ? "opacity-55 border-admin-card-border cursor-not-allowed bg-admin-raised"
                          : "border-admin-card-border hover:border-admin-brand hover:shadow-md cursor-pointer"
                      )}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-admin-raised border border-slate-100 dark:border-slate-850 mb-2">
                        <ProductThumbnail
                          src={product.image}
                          alt={product.name}
                          className={cn(
                            "w-full h-full object-cover transition-transform",
                            !isOutOfStock && "group-hover:scale-105"
                          )}
                        />

                        {/* Badge de Stock en la imagen */}
                        <div className="absolute top-2 right-2">
                          {isOutOfStock ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-600 text-white">
                              Agotado
                            </span>
                          ) : product.status === "low_stock" ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                              {product.stock} disp.
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                              {product.stock} disp.
                            </span>
                          )}
                        </div>

                        {/* Indicador si ya está en el carrito */}
                        {cartItem && (
                          <div className="absolute bottom-2 left-2 bg-admin-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShoppingCart className="h-2.5 w-2.5" />
                            <span>{cartItem.quantity} en ticket</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                          {product.category}
                        </span>
                        <h3 className="text-xs font-bold text-admin-text line-clamp-1 group-hover:text-admin-brand-text transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {product.sku}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-admin-card-border">
                        <span className="text-sm font-semibold text-admin-text">
                          {formatCurrency(product.price)}
                        </span>
                        <Button
                          disabled={isOutOfStock}
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid disabled:bg-slate-300 dark:disabled:bg-slate-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LADO DERECHO: TICKET DE CAJA / REGISTRADORA (5 Columnas) */}
          <div id="pos-ticket-panel" className="lg:col-span-5">
            <div className="sticky top-20 admin-panel p-5 space-y-4">
              {/* Header del Ticket */}
              <div className="admin-ticket-head flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-admin-brand-subtle text-admin-brand-text flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-admin-text">Ticket en Curso</h2>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {cart.length} {cart.length === 1 ? "artículo" : "artículos"} seleccionados
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Selector de Cliente y NIT/CI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cliente
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Público General..."
                      className="pl-8 h-9 text-xs rounded-xl bg-admin-raised border-admin-card-border"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    NIT / CI (Opcional)
                  </label>
                  <Input
                    value={customerTaxId}
                    onChange={(e) => setCustomerTaxId(e.target.value)}
                    placeholder="Sin NIT"
                    className="h-9 text-xs rounded-xl bg-admin-raised border-admin-card-border"
                  />
                </div>
              </div>

              {/* Lista de Productos en Ticket */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    El carrito de venta está vacío.
                    <br />
                    Haz clic en los productos o escanea un código para agregarlos.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-admin-raised border border-admin-card-border"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-admin-text truncate">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatCurrency(item.price)} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Contador de Cantidad */}
                        <div className="flex items-center border border-admin-card-border rounded-lg bg-admin-card-bg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-6 w-6 flex items-center justify-center text-slate-500 hover:bg-admin-raised transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold text-admin-text">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-6 w-6 flex items-center justify-center text-slate-500 hover:bg-admin-raised transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-semibold text-admin-text min-w-[60px] text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selector de Método de Pago (Efectivo y QR para Bolivia) */}
              <div className="space-y-1.5 pt-2 border-t border-admin-card-border">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={cn(
                      "h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      paymentMethod === "cash"
                        ? "bg-admin-brand text-white font-semibold"
                        : "bg-admin-raised text-admin-secondary border border-admin-card-border hover:bg-slate-100"
                    )}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                    className={cn(
                      "h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      paymentMethod === "transfer"
                        ? "bg-admin-brand text-white font-semibold"
                        : "bg-admin-raised text-admin-secondary border border-admin-card-border hover:bg-slate-100"
                    )}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>QR Simple / Bancario</span>
                  </button>
                </div>
              </div>

              {/* Panel específico de Efectivo: Cálculo de Cambio y Billetes Rápidos */}
              {paymentMethod === "cash" && total > 0 && (
                <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-admin-secondary">
                      Monto Recibido ({CURRENCY_SYMBOL}):
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={cashGivenInput}
                      onChange={(e) => setCashGivenInput(e.target.value)}
                      placeholder={total.toFixed(2)}
                      className="w-28 h-8 text-right font-semibold text-xs rounded-lg bg-admin-card-bg border-slate-300 dark:border-slate-650"
                    />
                  </div>

                  {/* Billetes rápidos */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
                      Rápido:
                    </span>
                    {quickBills.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setCashGivenInput(amount.toString())}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer",
                          cashGivenNumeric === amount
                            ? "bg-admin-brand text-white border-admin-brand"
                            : "bg-admin-card-bg text-admin-secondary border-admin-card-border hover:border-slate-400"
                        )}
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>

                  {/* Cambio / Vuelto calculado */}
                  <div className="flex items-center justify-between pt-2 border-t border-admin-card-border text-xs">
                    <span className="font-bold text-admin-secondary">Cambio a entregar:</span>
                    <span
                      className={cn(
                        "font-semibold text-sm",
                        changeAmount > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500"
                      )}
                    >
                      {formatCurrency(changeAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Descuento opcional */}
              {cart.length > 0 && (currentOperator?.role === "admin" || currentOperator?.role === "manager") && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                    <Tag className="h-3 w-3" />
                    Descuento ({CURRENCY_SYMBOL}):
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={subtotal}
                    step="any"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-20 h-7 text-right text-xs rounded-lg bg-admin-raised border-admin-card-border"
                  />
                </div>
              )}

              {/* Selector de Destino de Fondos y Gobernanza de Caja */}
              <div className="space-y-2 pt-2 border-t border-admin-card-border">
                {/* Indicador de Destino de Fondos */}
                <div className="p-2.5 rounded-xl bg-admin-raised border border-admin-card-border flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Destino Fondos:
                  </span>
                  {isAdministrativeSale ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-admin-brand-text">
                      <Building2 className="h-3.5 w-3.5 text-admin-brand-text" />
                      Venta Adm. Directa
                    </span>
                  ) : activeShift ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                      {activeShift.cashRegisterName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <Lock className="h-3.5 w-3.5" />
                      Sin Gaveta (Bloqueado)
                    </span>
                  )}
                </div>

                {/* Si es Admin o Supervisor: Switch para alternar Venta Administrativa vs Caja */}
                {(currentOperator?.role === "admin" || currentOperator?.role === "manager") && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-admin-raised border border-admin-card-border">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-[11px] font-bold text-admin-text flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-admin-brand-text" />
                        Venta Administrativa Directa
                      </span>
                      <p className="text-[9px] text-slate-400">
                        Cobro fuera de caja física (no afecta arqueo de cajeros)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isAdministrativeSale}
                      onChange={(e) => {
                        if (!e.target.checked && !activeShift) {
                          toast.error(
                            "No puedes desactivar Venta Administrativa sin tener un turno abierto a tu nombre. Abre una caja primero."
                          );
                          return;
                        }
                        setIsAdministrativeSale(e.target.checked);
                      }}
                      className="h-4 w-4 rounded accent-purple-600 cursor-pointer shrink-0"
                    />
                  </div>
                )}
              </div>

              {/* Resumen Financiero y Botón Primario Cobrar */}
              <div className="pt-3 border-t border-admin-card-border space-y-3">
                <div className="space-y-1">
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-rose-500 font-semibold">
                      <span>Descuento aplicado:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs font-bold text-admin-muted uppercase tracking-wider">
                      TOTAL A COBRAR:
                    </span>
                    <span className="text-2xl font-semibold text-admin-text tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Button
                  disabled={
                    cart.length === 0 ||
                    isSubmitting ||
                    (!isAdministrativeSale && !activeShift)
                  }
                  onClick={handleProcessCheckout}
                  className={cn(
                    "w-full h-12 rounded-xl text-white text-sm font-semibold gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50",
                    !isAdministrativeSale && !activeShift
                      ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed"
                      : isAdministrativeSale
                      ? "bg-admin-brand hover:bg-admin-brand shadow-purple-600/25"
                      : "bg-admin-brand hover:bg-admin-brand-hover"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Procesando venta...</span>
                    </>
                  ) : !isAdministrativeSale && !activeShift ? (
                    <>
                      <Lock className="h-4 w-4 stroke-[2.5]" />
                      <span>Terminal Bloqueada · Requiere Caja</span>
                    </>
                  ) : isAdministrativeSale ? (
                    <>
                      <Building2 className="h-4 w-4 stroke-[2.5]" />
                      <span>Emitir Venta Administrativa ({formatCurrency(total)})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                      <span>Cobrar en {activeShift?.cashRegisterName} ({formatCurrency(total)})</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Barra Flotante de Acceso Rápido al Ticket en Móvil */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-admin-inverse text-white p-3 px-4 rounded-xl flex items-center justify-between border border-slate-750">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-admin-brand text-admin-brand-text flex items-center justify-center font-semibold text-xs">
                  {cart.length}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ticket en curso</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(total)}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  document.getElementById("pos-ticket-panel")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
              >
                <span>Cobrar Ticket</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
            3. HISTORIAL DE VENTAS Y TICKETS (CON AUDITORÍA DE CAJAS VS ADM. DIRECTA)
            ========================================================================= */
        <div className="space-y-4">
          {/* Tarjetas de Métricas Rápidas: Desglose Cajas vs Venta Administrativa */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="admin-panel p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Facturado
              </span>
              <p className="text-lg font-semibold text-admin-text mt-1">
                {formatCurrency(historyKpis.totalRevenue)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                {historyKpis.totalSalesCount} transacciones
              </span>
            </div>

            <div className="admin-panel p-4">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Cajas Mostrador
              </span>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(historyKpis.posShiftSalesRevenue)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                {historyKpis.posShiftSalesCount} ventas en gaveta
              </span>
            </div>

            <div className="admin-panel p-4">
              <span className="text-[10px] font-bold text-admin-brand-text uppercase tracking-wider flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Ventas Adm. Directas
              </span>
              <p className="text-lg font-semibold text-admin-brand-text mt-1">
                {formatCurrency(historyKpis.administrativeSalesRevenue)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                {historyKpis.administrativeSalesCount} ventas fuera de caja
              </span>
            </div>

            <div className="admin-panel p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ventas de Hoy
              </span>
              <p className="text-lg font-semibold text-admin-brand-text mt-1">
                {formatCurrency(historyKpis.todayRevenue)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Ingresos registrados hoy
              </span>
            </div>

            <div className="admin-panel p-4 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ticket Promedio
              </span>
              <p className="text-lg font-semibold text-admin-text mt-1">
                {formatCurrency(historyKpis.averageTicket)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Por comprobante emitido
              </span>
            </div>
          </div>

          {/* Filtros de Búsqueda del Historial */}
          <div className="admin-panel p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por N° Ticket, cliente u operador..."
                className="pl-9 h-10 text-xs rounded-xl bg-admin-raised border-admin-card-border"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Filtro por Origen de la Venta (Caja Mostrador vs Venta Administrativa) */}
              <select
                value={historyOriginFilter}
                onChange={(e) => setHistoryOriginFilter(e.target.value as any)}
                className="h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-admin-secondary font-medium cursor-pointer"
              >
                <option value="all">Todos los Orígenes</option>
                <option value="pos">Cajas Mostrador (Turnos)</option>
                <option value="administrative">Ventas Administrativas Directas</option>
              </select>

              {/* Filtro por método */}
              <select
                value={historyMethodFilter}
                onChange={(e) => setHistoryMethodFilter(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-admin-secondary font-medium cursor-pointer"
              >
                <option value="all">Todos los Métodos</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">QR / Transferencia</option>
              </select>

              {/* Filtro por estado */}
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl bg-admin-raised border border-admin-card-border text-admin-secondary font-medium cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completadas</option>
                <option value="refunded">Devoluciones</option>
                <option value="cancelled">Anuladas</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={loadHistoryData}
                disabled={isLoadingHistory}
                className="h-10 px-3 rounded-xl border-admin-card-border text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingHistory && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Tabla de Ventas */}
          <div className="admin-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-raised border-b border-admin-card-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Canal / Origen</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4 font-semibold">Monto Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border font-medium text-admin-secondary">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Cargando historial de ventas...
                      </td>
                    </tr>
                  ) : paginatedSalesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No se registraron ventas coincidentes.
                      </td>
                    </tr>
                  ) : (
                    paginatedSalesHistory.map((sale) => (
                      <tr key={sale.id} className="hover:bg-admin-raised transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-admin-text">
                          #{sale.saleNumber}
                        </td>
                        <td className="py-3.5 px-4 text-admin-muted whitespace-nowrap">
                          {sale.createdAt}
                        </td>
                        <td className="py-3.5 px-4">
                          {sale.isAdministrativeSale ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-brand-text">
                              <span className="h-1.5 w-1.5 rounded-full bg-admin-brand" />
                              <span>Adm. Directa</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-secondary">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{sale.cashRegisterName || "Caja"}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-admin-text block">{sale.cashierName}</span>
                          <span className="text-[10px] text-slate-400 capitalize">{sale.userRole || "Usuario"}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-admin-text">
                          {sale.customerName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-admin-raised text-admin-secondary capitalize">
                            {sale.paymentMethod === "cash"
                              ? "Efectivo"
                              : sale.paymentMethod === "transfer"
                              ? "QR / Transf."
                              : sale.paymentMethod === "card"
                              ? "Tarjeta"
                              : "Otro"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {sale.refundedAmount && sale.refundedAmount > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-admin-text">
                                {formatCurrency(sale.netAmount ?? (sale.totalAmount - sale.refundedAmount))}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-400 line-through">
                                  {formatCurrency(sale.totalAmount)}
                                </span>
                                <span className="font-bold text-amber-600">
                                  (-{formatCurrency(sale.refundedAmount)})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold text-admin-text">
                              {formatCurrency(sale.totalAmount)}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                sale.status === "completed"
                                  ? "bg-emerald-500"
                                  : sale.status === "refunded"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <span
                              className={cn(
                                sale.status === "completed"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : sale.status === "refunded"
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-rose-700 dark:text-rose-400"
                              )}
                            >
                              {sale.status === "completed"
                                ? "Completada"
                                : sale.status === "refunded"
                                ? (sale.netAmount !== undefined && sale.netAmount <= 0
                                    ? "Devolución Total"
                                    : "Devolución Parcial")
                                : "Anulada"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ver / Reimprimir ticket (Siempre disponible para consulta) */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTicketToReprint(sale);
                                setReprintModalOpen(true);
                              }}
                              className="h-8 rounded-lg text-xs gap-1 border-admin-card-border text-admin-secondary hover:text-slate-900 cursor-pointer"
                            >
                              <Printer className="h-3 w-3" />
                              <span>Ticket</span>
                            </Button>

                            {/* Validación de Aislamiento por Caja: Un cajero no puede operar ventas de otra caja */}
                            {(() => {
                              const canManageSale =
                                currentOperator?.role === "admin" ||
                                currentOperator?.role === "manager" ||
                                (activeShift && sale.cashShiftId === activeShift.id) ||
                                sale.userId === currentOperator?.id;

                              if (!canManageSale) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-admin-raised px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-750"
                                    title="Venta cobrada en otra caja · Solo lectura para este cajero"
                                  >
                                    <Lock className="h-3 w-3 text-slate-400" />
                                    <span>Otra caja</span>
                                  </span>
                                );
                              }

                              return (
                                <>
                                  {/* Devolución de productos (con PIN supervisor) */}
                                  {(sale.status === "completed" || sale.status === "refunded") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenRefundModal(sale)}
                                      className="h-8 rounded-lg text-xs gap-1 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                                      title="Devolución parcial de productos con reposición al Kardex"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span className="hidden sm:inline">Devolver</span>
                                    </Button>
                                  )}

                                  {/* Anular venta completa */}
                                  {(currentOperator?.role === "admin" || currentOperator?.role === "manager") && sale.status === "completed" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSaleToCancel(sale);
                                        setCancelModalOpen(true);
                                      }}
                                      className="h-8 rounded-lg text-xs gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                      title="Anulación completa del ticket"
                                    >
                                      <Ban className="h-3 w-3" />
                                      <span className="hidden sm:inline">Anular</span>
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={historyPage}
              totalPages={totalHistoryPages}
              totalItems={filteredSalesHistory.length}
              pageSize={HISTORY_PAGE_SIZE}
              itemName="tickets"
              onPageChange={setHistoryPage}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MODAL DE COMPROBANTE TÉRMICO / TICKET DE VENTA (80MM READY)
          ========================================================================= */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-xs p-6 rounded-xl bg-white text-slate-900 border border-slate-200 print:p-0 print:border-none print:shadow-none">
          <div id="thermal-receipt" className="space-y-3 font-mono text-xs">
            {/* Encabezado del ticket */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-semibold tracking-tight uppercase">
                Aura Commerce
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Punto de Venta Central
              </p>
              <div className="mt-2 text-[11px] font-bold text-slate-800">
                Ticket: <span>#{lastTicket?.saleNumber}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fecha: {lastTicket?.createdAt || "Hoy"}
              </p>
            </div>

            {/* Datos del Cliente, Operador y Caja */}
            <div className="space-y-0.5 text-[11px] text-slate-600 pb-2 border-b border-dashed border-slate-200">
              {lastTicket?.isAdministrativeSale ? (
                <div className="my-1 py-1 px-2 rounded bg-admin-brand-subtle text-admin-brand-text font-bold text-[10px] text-center border border-admin-brand-light">
                  *** VENTA ADMINISTRATIVA DIRECTA ***
                  <span className="block font-normal text-[9px] text-admin-brand-text">
                    Cobro directo sin afectación de gaveta física
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Terminal / Caja:</span>
                    <span className="font-bold text-slate-800">
                      {lastTicket?.cashRegisterName || activeShift?.cashRegisterName || "Caja Mostrador"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Turno:</span>
                    <span>{lastTicket?.shiftNumber || activeShift?.shiftNumber}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Operador:</span>
                <span className="font-bold text-slate-800">
                  {lastTicket?.cashierName || currentOperator?.name || "Operador"}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100">
                <span>Cliente:</span>
                <span className="font-bold text-slate-800 truncate max-w-[150px]">
                  {lastTicket?.customerName}
                </span>
              </div>
              {lastTicket?.customerTaxId && (
                <div className="flex justify-between">
                  <span>NIT / CI:</span>
                  <span className="font-bold text-slate-800">{lastTicket.customerTaxId}</span>
                </div>
              )}
            </div>

            {/* Detalle de ítems */}
            <div className="space-y-1.5 py-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Cant · Producto</span>
                <span>Subtotal</span>
              </div>
              {lastTicket?.items.map((item) => (
                <div key={item.id} className="flex justify-between text-[11px] items-baseline">
                  <div className="truncate pr-2">
                    <span className="font-bold">{item.quantity}x</span> {item.productName}
                  </div>
                  <span className="font-bold shrink-0">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Totales y Liquidación */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
              {lastTicket && lastTicket.discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastTicket.subtotal)}</span>
                </div>
              )}
              {lastTicket && lastTicket.discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-rose-600">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(lastTicket.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1 border-t border-slate-100">
                <span>TOTAL:</span>
                <span>{formatCurrency(lastTicket?.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>Método de pago:</span>
                <span className="font-bold uppercase text-slate-700">
                  {lastTicket?.paymentMethod === "cash"
                    ? "Efectivo"
                    : lastTicket?.paymentMethod === "card"
                    ? "Tarjeta"
                    : lastTicket?.paymentMethod === "transfer"
                    ? "QR / Transferencia"
                    : lastTicket?.paymentMethod}
                </span>
              </div>

              {lastTicket?.paymentMethod === "cash" && lastTicket.cashGiven !== null && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Monto Recibido:</span>
                    <span>{formatCurrency(lastTicket.cashGiven)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                    <span>Cambio / Vuelto:</span>
                    <span>{formatCurrency(lastTicket.changeGiven || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Pie del ticket */}
            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-300 space-y-1">
              <p className="font-bold text-slate-700">¡GRACIAS POR SU COMPRA!</p>
              <p>Conserve este ticket para cualquier reclamo o garantía.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptOpen(false)}
              className="flex-1 text-xs h-9 rounded-xl border-slate-200"
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.print();
              }}
              className="flex-1 text-xs h-9 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-bold gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          5. MODAL DE REIMPRESIÓN DE TICKET DESDE HISTORIAL
          ========================================================================= */}
      <Dialog open={reprintModalOpen} onOpenChange={setReprintModalOpen}>
        <DialogContent className="sm:max-w-xs p-6 rounded-xl bg-white text-slate-900 border border-slate-200 print:p-0 print:border-none print:shadow-none">
          <div id="thermal-receipt" className="space-y-3 font-mono text-xs">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-semibold tracking-tight uppercase">
                Aura Commerce
              </h2>
              <div className="mt-1 text-[11px] font-bold text-slate-800">
                Ticket: <span>#{ticketToReprint?.saleNumber}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fecha: {ticketToReprint?.createdAt}
              </p>
              {ticketToReprint?.status === "cancelled" && (
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                  TICKET ANULADO
                </span>
              )}
            </div>

            <div className="space-y-0.5 text-[11px] text-slate-600 pb-2 border-b border-dashed border-slate-200">
              {ticketToReprint?.isAdministrativeSale ? (
                <div className="my-1 py-1 px-2 rounded bg-admin-brand-subtle text-admin-brand-text font-bold text-[10px] text-center border border-admin-brand-light">
                  *** VENTA ADMINISTRATIVA DIRECTA ***
                </div>
              ) : (
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Caja / Turno:</span>
                  <span className="font-bold text-slate-800">
                    {ticketToReprint?.cashRegisterName || "Caja"} ({ticketToReprint?.shiftNumber || "Turno"})
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Operador:</span>
                <span className="font-bold text-slate-800">{ticketToReprint?.cashierName}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100">
                <span>Cliente:</span>
                <span className="font-bold text-slate-800">{ticketToReprint?.customerName}</span>
              </div>
            </div>

            <div className="space-y-1.5 py-1">
              {ticketToReprint?.items.map((item) => (
                <div key={item.id} className="flex justify-between text-[11px] items-baseline">
                  <div className="truncate pr-2">
                    <span className="font-bold">{item.quantity}x</span> {item.productName}
                    {item.returnedQuantity > 0 && (
                      <span className="block text-[10px] text-amber-700 font-semibold">
                        Devueltas: {item.returnedQuantity} unid. (-{formatCurrency(item.returnedQuantity * item.unitPrice)})
                      </span>
                    )}
                  </div>
                  <span className="font-bold shrink-0">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Total Venta Original:</span>
                <span>{formatCurrency(ticketToReprint?.totalAmount)}</span>
              </div>
              {(ticketToReprint?.refundedAmount || 0) > 0 && (
                <div className="flex justify-between text-[11px] text-amber-700 font-bold">
                  <span>Devolución de Productos:</span>
                  <span>-{formatCurrency(ticketToReprint?.refundedAmount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL NETO COBRADO:</span>
                <span>{formatCurrency(ticketToReprint?.netAmount ?? (ticketToReprint?.totalAmount || 0))}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>Método:</span>
                <span className="font-bold uppercase text-slate-700">
                  {ticketToReprint?.paymentMethod === "cash"
                    ? "Efectivo"
                    : "QR / Transf."}
                </span>
              </div>
              {ticketToReprint?.notes && (
                <div className="mt-2 p-2 rounded bg-slate-50 text-[10px] text-slate-600 border border-slate-200 leading-snug">
                  <span className="font-bold block text-slate-700">Auditoría / Devolución:</span>
                  <span>{ticketToReprint.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReprintModalOpen(false)}
              className="flex-1 text-xs h-9 rounded-xl border-slate-200"
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="flex-1 text-xs h-9 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-bold gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          6. MODAL DE CONFIRMACIÓN DE ANULACIÓN DE VENTA
          ========================================================================= */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md p-6 admin-panel">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-semibold text-admin-text">
              Anular Venta #{saleToCancel?.saleNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-admin-muted">
              Al anular esta venta, las existencias se reintegrarán automáticamente al inventario
              y se asentará un movimiento compensatorio de devolución en el Kardex.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-admin-raised border border-slate-200/80 dark:border-slate-750 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-admin-text">{saleToCancel?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto Cobrado:</span>
                <span className="font-semibold text-admin-text">
                  {formatCurrency(saleToCancel?.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Artículos a reponer:</span>
                <span className="font-bold text-admin-text">{saleToCancel?.itemsCount} unidades</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Motivo de la anulación (Obligatorio o recomendado)
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Devolución de cliente, error de cobro, producto dañado..."
                className="h-9 text-xs rounded-xl bg-admin-raised border-admin-card-border"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCancelling}
              onClick={() => setCancelModalOpen(false)}
              className="text-xs h-9 rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isCancelling}
              onClick={handleConfirmCancelSale}
              className="text-xs h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Anulando...</span>
                </>
              ) : (
                <>
                  <Ban className="h-3.5 w-3.5" />
                  <span>Confirmar Anulación</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          7. MODAL DE DEVOLUCIÓN PARCIAL / POR ÍTEM CON AUTORIZACIÓN PIN SUPERVISOR
          ========================================================================= */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-xl p-6 admin-panel max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-1">
              <RotateCcw className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-semibold text-admin-text">
              Devolución de Artículos · Ticket #{saleToRefund?.saleNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-admin-muted">
              Selecciona las unidades exactas a devolver. Los artículos regresarán al inventario físico
              con asiento en Kardex y se ajustará el saldo de la caja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Resumen del ticket original */}
            <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Cliente</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {saleToRefund?.customerName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Original</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {formatCurrency(saleToRefund?.totalAmount)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block uppercase">Canal / Caja</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {saleToRefund?.isAdministrativeSale
                    ? "Adm. Directa"
                    : saleToRefund?.cashRegisterName || "Caja Mostrador"}
                </span>
              </div>
            </div>

            {/* Selector de ítems para devolución con steppers */}
            <div className="space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Productos del Ticket (Elige unidades a reingresar):
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1.5 custom-scrollbar">
                {saleToRefund?.items.map((item) => {
                  const returned = item.returnedQuantity || 0;
                  const maxReturnable =
                    item.returnableQuantity ?? Math.max(0, item.quantity - returned);
                  const selectedQty = refundQuantities[item.id] || 0;
                  const itemRefundSubtotal = selectedQty * item.unitPrice;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                        selectedQty > 0
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60"
                          : "bg-admin-raised border-admin-card-border"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-admin-text truncate">
                            {item.productName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.productSku || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span>Compradas: <strong>{item.quantity}</strong></span>
                          {returned > 0 && (
                            <span className="text-amber-600 font-medium">
                              Ya devueltas: {returned}
                            </span>
                          )}
                          <span>Disponibles para devolución: <strong className="text-admin-secondary">{maxReturnable}</strong></span>
                        </div>
                      </div>

                      {/* Stepper de unidades a devolver */}
                      {maxReturnable <= 0 ? (
                        <span className="text-[10px] font-bold text-slate-400 bg-admin-raised px-2 py-1 rounded-lg">
                          Devuelto al 100%
                        </span>
                      ) : (
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <div className="flex items-center border border-admin-card-border rounded-lg bg-admin-card-bg overflow-hidden">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={selectedQty <= 0}
                              onClick={() => handleUpdateRefundQty(item.id, -1, maxReturnable)}
                              className="h-7 w-7 rounded-none text-slate-600 hover:bg-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-bold text-xs text-admin-text">
                              {selectedQty}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={selectedQty >= maxReturnable}
                              onClick={() => handleUpdateRefundQty(item.id, 1, maxReturnable)}
                              className="h-7 w-7 rounded-none text-slate-600 hover:bg-slate-100"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="w-20 text-right">
                            <span className="font-semibold text-admin-text block text-xs">
                              {formatCurrency(itemRefundSubtotal)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {formatCurrency(item.unitPrice)} c/u
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Configuración de Reintegro y Motivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-admin-card-border">
              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  Método de Reintegro
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-xl border border-admin-card-border bg-admin-card-bg px-3 font-medium text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-brand"
                >
                  <option value="cash">Efectivo (Resta de la Gaveta de Caja)</option>
                  <option value="transfer">QR / Transferencia Bancaria</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  {refundMethod === "cash"
                    ? "Se descontará del saldo esperado en gaveta para cuadre de arqueo."
                    : "No altera el saldo físico de efectivo en gaveta."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  Motivo de la Devolución *
                </label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ej. Talla incorrecta, producto fallado, cambio..."
                  className="h-9 text-xs rounded-xl bg-admin-raised border-admin-card-border"
                />
              </div>
            </div>

            {/* Doble Custodia: Validación de PIN de Supervisor */}
            <div className="p-3.5 rounded-xl bg-admin-brand-subtle border border-admin-brand-light space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-admin-brand-text">
                  <ShieldCheck className="h-4 w-4 text-admin-brand-text" />
                  <span>Autorización de Supervisor (PIN de Seguridad)</span>
                </div>
                <span className="text-xs font-semibold text-admin-brand-text">
                  Doble Custodia
                </span>
              </div>
              <p className="text-[11px] text-admin-brand-text">
                Para prevenir fraudes y cuadres inconsistentes, un Administrador o Supervisor debe ingresar su PIN (4 a 6 dígitos).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="password"
                    maxLength={6}
                    value={supervisorPin}
                    onChange={(e) => setSupervisorPin(e.target.value)}
                    placeholder="Ingresa PIN del supervisor (ej: 1234)..."
                    className="h-9 pl-8 text-xs font-mono tracking-widest rounded-xl bg-admin-card-bg border-admin-brand-light border-admin-brand text-admin-text"
                  />
                </div>
              </div>
            </div>

            {/* Total a reembolsar */}
            <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Total a Reintegrar al Cliente:</span>
                <span className="text-xs text-amber-400 font-semibold">
                  {refundCalculation.itemsCount} artículo(s) seleccionado(s)
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-white">
                  {formatCurrency(refundCalculation.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmittingRefund}
              onClick={() => setRefundModalOpen(false)}
              className="text-xs h-9 rounded-xl border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingRefund || refundCalculation.itemsCount === 0}
              onClick={handleProcessRefund}
              className="text-xs h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-amber-600/20"
            >
              {isSubmittingRefund ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Validando y Procesando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Autorizar y Emitir Vale</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          8. MODAL DE VALE TÉRMICO DE DEVOLUCIÓN (80MM READY)
          ========================================================================= */}
      <Dialog open={refundReceiptOpen} onOpenChange={setRefundReceiptOpen}>
        <DialogContent className="sm:max-w-xs p-6 rounded-xl bg-white text-slate-900 border border-slate-200 print:p-0 print:border-none print:shadow-none">
          <div id="thermal-refund-receipt" className="space-y-3 font-mono text-xs">
            {/* Encabezado */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-semibold tracking-tight uppercase">
                Aura Commerce
              </h2>
              <div className="my-1 py-1 px-2 rounded bg-amber-50 text-amber-800 font-semibold text-[11px] text-center border border-amber-200">
                *** VALE DE DEVOLUCIÓN ***
              </div>
              <div className="mt-1 text-[11px] font-bold text-slate-800">
                Comprobante: <span>#{refundReceiptData?.refundNumber}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Ticket Original: <span>#{refundReceiptData?.saleNumber}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Fecha: {refundReceiptData?.createdAt || "Hoy"}
              </p>
            </div>

            {/* Datos de auditoría */}
            <div className="space-y-0.5 text-[11px] text-slate-600 pb-2 border-b border-dashed border-slate-200">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Cliente:</span>
                <span className="font-bold text-slate-800">{refundReceiptData?.customerName}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Autorizado por:</span>
                <span className="font-bold text-emerald-700">{refundReceiptData?.supervisorName} (Supervisor)</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Atendido por:</span>
                <span className="font-bold text-slate-800">{refundReceiptData?.processedByName}</span>
              </div>
              <div className="pt-1 text-[10px] text-slate-500">
                <span>Motivo: </span>
                <span className="font-semibold text-slate-700 italic">{refundReceiptData?.reason}</span>
              </div>
            </div>

            {/* Artículos Devueltos */}
            <div className="space-y-1.5 py-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Cant · Reingreso</span>
                <span>Importe</span>
              </div>
              {refundReceiptData?.returnedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] items-baseline">
                  <div className="truncate pr-2">
                    <span className="font-bold">{item.quantity}x</span> {item.name}
                  </div>
                  <span className="font-bold shrink-0">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Liquidación de la Devolución */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1">
                <span>TOTAL DEVUELTO:</span>
                <span className="text-amber-700">{formatCurrency(refundReceiptData?.refundAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>Método de Reintegro:</span>
                <span className="font-bold uppercase text-slate-700">
                  {refundReceiptData?.refundMethod === "cash"
                    ? "Efectivo (Gaveta)"
                    : "Transferencia / QR"}
                </span>
              </div>
            </div>

            {/* Pie del vale */}
            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-300 space-y-1">
              <p className="font-bold text-slate-700">MERCANCÍA REINGRESADA AL STOCK</p>
              <p>Comprobante oficial para efectos de garantía, cambio o cuadre de caja.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundReceiptOpen(false)}
              className="flex-1 text-xs h-9 rounded-xl border-slate-200"
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="flex-1 text-xs h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-amber-600/20"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir Vale</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
