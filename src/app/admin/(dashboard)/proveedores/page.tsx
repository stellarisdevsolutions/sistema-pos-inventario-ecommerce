"use client";

import { MetricCard } from "@/components/admin/metric-card";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Truck,
  ExternalLink,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Boxes,
  Loader2,
  X,
  LayoutGrid,
  List,
  RotateCcw,
  Receipt,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL, CURRENCY_NAME, formatCurrency, formatCurrencyLocale } from "@/lib/currency";
import { useAuth } from "@/context/auth-context";
import {
  getSuppliersAction,
  createSupplierAction,
  updateSupplierAction,
  toggleSupplierActiveAction,
  deleteSupplierAction,
  type SupplierItem,
} from "@/app/admin/actions/suppliers";

// =========================================================================
// PAGINACIÓN WEB CON CUADRITOS
// =========================================================================
function getPaginationItems(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 6) {
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
                  ? "bg-admin-brand text-white border border-admin-brand scale-105"
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

export default function ProveedoresPage() {
  const { user } = useAuth();
  const canEditSuppliers = user?.role === "admin" || user?.role === "manager";
  const canDeleteSuppliers = user?.role === "admin";

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Búsqueda y Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Estados de Modales y Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<SupplierItem | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierItem | null>(null);
  const [togglingSupplierId, setTogglingSupplierId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos del Formulario
  const [formName, setFormName] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Cargar Proveedores desde PostgreSQL
  const loadSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getSuppliersAction();
      if (res.success && res.data) {
        setSuppliers(res.data);
      } else {
        toast.error("Error al cargar proveedores", { description: res.error });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error de conexión al cargar proveedores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getSuppliersAction();
        if (cancelled) return;
        if (res.success && res.data) {
          setSuppliers(res.data);
        } else {
          toast.error("Error al cargar proveedores", { description: res.error });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error(err);
          toast.error("Error de conexión al cargar proveedores");
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
  }, []);

  // Filtrado de Proveedores
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      // 1. Filtro por término de búsqueda
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        (s.contactName && s.contactName.toLowerCase().includes(term)) ||
        (s.taxId && s.taxId.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term));

      // 2. Filtro por estado
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.isActive) ||
        (statusFilter === "inactive" && !s.isActive);

      return matchSearch && matchStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  // KPIs Calculados
  const totalSuppliersCount = suppliers.length;
  const activeSuppliersCount = suppliers.filter((s) => s.isActive).length;
  const totalPurchasedSum = suppliers.reduce((acc, s) => acc + s.totalPurchased, 0);
  const totalMonthlyPurchasedSum = suppliers.reduce((acc, s) => acc + (s.monthlyPurchased || 0), 0);
  const totalPurchasesOrders = suppliers.reduce((acc, s) => acc + s.purchasesCount, 0);

  // Abrir Modal de Creación
  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormName("");
    setFormContactName("");
    setFormTaxId("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormNotes("");
    setFormIsActive(true);
    setIsFormModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (s: SupplierItem) => {
    setEditingSupplier(s);
    setFormName(s.name);
    setFormContactName(s.contactName || "");
    setFormTaxId(s.taxId || "");
    setFormEmail(s.email || "");
    setFormPhone(s.phone || "");
    setFormAddress(s.address || "");
    setFormNotes(s.notes || "");
    setFormIsActive(s.isActive);
    setIsFormModalOpen(true);
  };

  // Guardar Formulario (Crear o Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Razón social requerida", {
        description: "Ingresa el nombre comercial o razón social de la empresa proveedora.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formName.trim(),
        contactName: formContactName.trim() || null,
        taxId: formTaxId.trim() || null,
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
        isActive: formIsActive,
      };

      if (editingSupplier) {
        // Actualizar
        const res = await updateSupplierAction(editingSupplier.id, payload);
        if (res.success) {
          toast.success("Proveedor actualizado", {
            description: `Los datos de "${formName}" han sido guardados exitosamente.`,
          });
          setIsFormModalOpen(false);
          loadSuppliers();
        } else {
          toast.error("Error al actualizar", { description: res.error });
        }
      } else {
        // Crear
        const res = await createSupplierAction(payload);
        if (res.success) {
          toast.success("Proveedor registrado", {
            description: `"${formName}" se agregó al directorio comercial.`,
          });
          setIsFormModalOpen(false);
          loadSuppliers();
        } else {
          toast.error("Error al registrar", { description: res.error });
        }
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al guardar proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conmutar Estado Activo / Inactivo
  const handleToggleActive = async (s: SupplierItem) => {
    if (togglingSupplierId !== null) return;
    const newActive = !s.isActive;
    setTogglingSupplierId(s.id);
    const toastId = toast.loading(
      newActive ? `Activando a "${s.name}"...` : `Pausando a "${s.name}"...`
    );

    try {
      const res = await toggleSupplierActiveAction(s.id, newActive);
      if (res.success) {
        setSuppliers((prev) =>
          prev.map((item) => (item.id === s.id ? { ...item, isActive: newActive } : item))
        );
        toast.success(newActive ? "Proveedor habilitado" : "Proveedor pausado", {
          id: toastId,
          description: newActive
            ? `"${s.name}" ahora puede vincularse a nuevas compras y productos.`
            : `"${s.name}" se marcó como inactivo temporalmente.`,
        });
      } else {
        toast.error("Error al cambiar estado", {
          id: toastId,
          description: res.error || "No se pudo actualizar el estado del proveedor.",
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al conectar con el servidor", { id: toastId });
    } finally {
      setTogglingSupplierId(null);
    }
  };

  // Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const res = await deleteSupplierAction(supplierToDelete.id);
      if (res.success) {
        toast.success("Proveedor eliminado", {
          description: `"${supplierToDelete.name}" fue retirado del directorio.`,
        });
        setSupplierToDelete(null);
        loadSuppliers();
      } else {
        toast.error("No se pudo eliminar", { description: res.error });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al eliminar proveedor");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          1. HEADER CON TÍTULO, SUBTÍTULO Y BOTÓN REGISTRAR
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-page-title">Proveedores</h1>
          </div>
          <p className="admin-page-description">Contactos comerciales e historial de compras.</p>
        </div>

        {canEditSuppliers && (
          <Button
            onClick={handleOpenCreateModal}
            size="sm"
            className="h-10 px-4 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-bold gap-2 active:scale-95 transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Registrar Proveedor</span>
          </Button>
        )}
      </div>

      {/* =========================================================================
          2. METRIC KPIS CORPORATIVOS (4 TARJETAS)
          ========================================================================= */}
      <section className="admin-metrics" aria-label="Indicadores de proveedores">
        <MetricCard
          label="Proveedores"
          value={totalSuppliersCount}
          detail="Directorio comercial"
          icon={Building2}
        />
        <MetricCard
          label="Proveedores activos"
          value={activeSuppliersCount}
          detail="Disponibles para compras"
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label="Inversión del mes"
          value={formatCurrencyLocale(totalMonthlyPurchasedSum)}
          detail={`Compras del mes en curso (${CURRENCY_NAME})`}
          icon={DollarSign}
        />
        <MetricCard
          label="Órdenes de compra"
          value={totalPurchasesOrders}
          detail="Entradas y recepciones"
          icon={Truck}
        />
      </section>

      {/* =========================================================================
          3. BARRA DE HERRAMIENTAS: BUSCADOR, FILTROS Y SELECTOR DE VISTA
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
              placeholder="Buscar por empresa, contacto, NIT o correo..."
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

          {/* Selector de Modo: Cuadros vs Lista */}
          <div className="inline-flex items-center bg-admin-raised p-1 rounded-xl border border-admin-card-border shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Modo cuadros"
              className={cn(
                "p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center",
                viewMode === "grid"
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid className="h-4 w-4 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Modo lista"
              className={cn(
                "p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center",
                viewMode === "list"
                  ? "bg-admin-card-bg text-admin-text"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <List className="h-4 w-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Fila de Filtros de Estado */}
        <div className="flex items-center gap-2 pt-1 border-t border-admin-card-border">
          <div className="inline-flex items-center bg-admin-raised p-1 rounded-xl border border-admin-card-border">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-admin-card-bg text-admin-text font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
              )}
            >
              Todos ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                statusFilter === "active"
                  ? "bg-admin-card-bg text-admin-text font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
              )}
            >
              Activos ({suppliers.filter((s) => s.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                statusFilter === "inactive"
                  ? "bg-admin-card-bg text-admin-text font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
              )}
            >
              Inactivos ({suppliers.filter((s) => !s.isActive).length})
            </button>
          </div>

          {(searchTerm || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. CONTENIDO: MODO CUADROS O MODO LISTA
          ========================================================================= */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-admin-brand-text" />
          <p className="text-xs text-slate-500 font-medium">Cargando directorio de proveedores...</p>
        </div>
      ) : paginatedSuppliers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-card-border p-12 text-center bg-admin-card-bg">
          <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No se encontraron proveedores
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Prueba ajustando los términos de búsqueda o registra un nuevo proveedor en el botón superior.
          </p>
          {(searchTerm || statusFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="mt-4 h-8 text-xs rounded-xl"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Restablecer filtros
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* VISTA 1: MODO CUADROS (GRID) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedSuppliers.map((s) => {
            const isToggling = togglingSupplierId === s.id;

            return (
              <div
                key={s.id}
                onClick={() => setSelectedSupplierForDetails(s)}
                className={cn(
                  "admin-panel hover:border-admin-brand/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer group",
                  !s.isActive && "opacity-65 bg-admin-raised"
                )}
              >
                <div className="p-5 space-y-3.5">
                  {/* Encabezado del Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-admin-brand-subtle text-admin-brand-text border border-admin-brand-light flex items-center justify-center shrink-0 font-semibold text-sm">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-admin-text leading-snug line-clamp-1 group-hover:text-admin-brand-text transition-colors">
                          {s.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.contactName ? (
                            <span className="text-[11px] text-admin-muted font-medium">
                              {s.contactName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sin contacto</span>
                          )}
                          {s.taxId && (
                            <span className="text-[10px] font-mono font-bold bg-admin-raised text-admin-secondary px-1.5 py-0.5 rounded-md border border-admin-card-border">
                              NIT: {s.taxId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menú de 3 puntos */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg hover:bg-admin-raised cursor-pointer text-slate-400"
                            />
                          }
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 admin-panel"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => setSelectedSupplierForDetails(s)}
                              className="rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              Ver Ficha Comercial
                            </DropdownMenuItem>
                            {canEditSuppliers && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(s)}
                                  className="rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  Editar Proveedor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={isToggling}
                                  onClick={() => handleToggleActive(s)}
                                  className="rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  {isToggling ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-slate-500" />
                                  ) : s.isActive ? (
                                    <XCircle className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                  )}
                                  {s.isActive ? "Pausar Proveedor" : "Activar Proveedor"}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuGroup>
                          {canDeleteSuppliers && (
                            <>
                              <DropdownMenuSeparator className="my-1 bg-admin-raised" />
                              <DropdownMenuItem
                                onClick={() => setSupplierToDelete(s)}
                                className="rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/60 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Eliminar Proveedor
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Datos de Contacto Directo */}
                  <div className="space-y-2 text-xs pt-1 border-t border-admin-card-border">
                    <div className="flex items-center gap-2 text-admin-secondary">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[11px] font-semibold hover:text-admin-brand-text hover:underline"
                        >
                          {s.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-admin-secondary">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] truncate hover:text-admin-brand-text hover:underline"
                        >
                          {s.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin correo</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-admin-secondary">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] truncate text-admin-muted">
                        {s.address || "Dirección no registrada"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer del Card */}
                <div className="p-3.5 px-5 border-t border-admin-card-border bg-admin-raised flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Total Comprado
                    </span>
                    <span className="font-bold text-admin-text font-mono text-sm tracking-tight">
                      {CURRENCY_SYMBOL} {s.totalPurchased.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <span className={cn("h-2 w-2 rounded-full", s.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                      <span className={s.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}>
                        {s.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA 2: MODO LISTA (TABLA) */
        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-admin-card-border bg-admin-raised text-admin-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Empresa / Razón Social</th>
                  <th className="py-3.5 px-5">Contacto Directo</th>
                  <th className="py-3.5 px-5">Teléfono / Email</th>
                  <th className="py-3.5 px-5 text-right">Total Comprado</th>
                  <th className="py-3.5 px-5 text-center">Estado</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                {paginatedSuppliers.map((s) => {
                  const isToggling = togglingSupplierId === s.id;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSupplierForDetails(s)}
                      className={cn(
                        "hover:bg-admin-raised transition-colors cursor-pointer group",
                        !s.isActive && "opacity-60 bg-admin-raised"
                      )}
                    >
                      {/* 1. Empresa / Razón Social y NIT */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-admin-brand-subtle text-admin-brand-text border border-admin-brand-light flex items-center justify-center shrink-0 font-bold text-xs">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-admin-text group-hover:text-admin-brand-text transition-colors">
                              {s.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {s.taxId ? `NIT: ${s.taxId}` : "Sin NIT registrado"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contacto */}
                      <td className="py-4 px-5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {s.contactName || "-"}
                        </p>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px] block">
                          {s.address || "Sin dirección"}
                        </span>
                      </td>

                      {/* 3. Teléfono / Email */}
                      <td className="py-4 px-5">
                        <p className="font-mono text-[11px] font-semibold text-admin-secondary">
                          {s.phone || "-"}
                        </p>
                        <span className="text-[10px] text-slate-400 truncate max-w-[180px] block">
                          {s.email || "-"}
                        </span>
                      </td>

                      {/* 4. Total Comprado */}
                      <td className="py-4 px-5 text-right">
                        <span className="font-bold text-admin-text font-mono text-xs">
                          {CURRENCY_SYMBOL} {s.totalPurchased.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {s.purchasesCount} orden(es)
                        </span>
                      </td>

                      {/* 5. Estado con Switch y Loader */}
                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        {canEditSuppliers ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={s.isActive}
                            disabled={isToggling}
                            onClick={() => handleToggleActive(s)}
                            className="inline-flex items-center gap-2 cursor-pointer group disabled:cursor-wait"
                          >
                            <span
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none items-center",
                                s.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
                                isToggling && "opacity-80"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none flex items-center justify-center h-4 w-4 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out",
                                  s.isActive ? "translate-x-4" : "translate-x-0"
                                )}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin text-slate-600" />
                                ) : null}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-medium select-none min-w-[50px] text-left",
                                s.isActive
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-admin-muted"
                              )}
                            >
                              {isToggling ? "Cargando..." : s.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </button>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[11px] font-medium",
                              s.isActive
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-admin-muted"
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                s.isActive ? "bg-emerald-500" : "bg-slate-400"
                              )}
                            />
                            {s.isActive ? "Activo" : "Inactivo"}
                          </span>
                        )}
                      </td>

                      {/* 6. Acciones */}
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg hover:bg-admin-raised cursor-pointer"
                              />
                            }
                          >
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 admin-panel"
                          >
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => setSelectedSupplierForDetails(s)}
                                className="rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                Ver Ficha Comercial
                              </DropdownMenuItem>
                              {canEditSuppliers && (
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(s)}
                                  className="rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  Editar Proveedor
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                            {canDeleteSuppliers && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-admin-raised" />
                                <DropdownMenuItem
                                  onClick={() => setSupplierToDelete(s)}
                                  className="rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/60 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Eliminar Proveedor
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSuppliers.length}
        pageSize={pageSize}
        itemName="proveedores"
        onPageChange={setCurrentPage}
      />

      {/* =========================================================================
          5. DRAWER LATERAL: FICHA DETALLADA DEL PROVEEDOR
          ========================================================================= */}
      {selectedSupplierForDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setSelectedSupplierForDetails(null)}
        >
          <div
            className="w-full max-w-lg bg-admin-card-bg h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-admin-card-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header del Drawer */}
              <div className="p-5 border-b border-admin-card-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-admin-brand-subtle text-admin-brand-text border border-admin-brand-light flex items-center justify-center font-bold text-sm">
                    {selectedSupplierForDetails.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-admin-text text-base leading-tight">
                      {selectedSupplierForDetails.name}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Proveedor #{selectedSupplierForDetails.id}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSupplierForDetails(null)}
                  className="h-8 w-8 rounded-lg hover:bg-admin-raised flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Contenido del Drawer */}
              <div className="p-5 space-y-5 text-xs">
                {/* Resumen Financiero en Mini Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                    <span className="text-[10px] text-slate-400 font-medium block">Total Comprado</span>
                    <span className="text-sm font-bold text-admin-text font-mono mt-0.5 block">
                      {CURRENCY_SYMBOL} {selectedSupplierForDetails.totalPurchased.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                    <span className="text-[10px] text-slate-400 font-medium block">Órdenes</span>
                    <span className="text-sm font-bold text-admin-text font-mono mt-0.5 block">
                      {selectedSupplierForDetails.purchasesCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-admin-raised border border-admin-card-border">
                    <span className="text-[10px] text-slate-400 font-medium block">Artículos</span>
                    <span className="text-sm font-bold text-admin-brand-text font-mono mt-0.5 block">
                      {selectedSupplierForDetails.productsCount} vinculados
                    </span>
                  </div>
                </div>

                {/* Datos de Contacto y Fiscales */}
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block px-1">
                    Información de Contacto & Facturación
                  </span>

                  <div className="p-4 rounded-xl bg-admin-raised border border-admin-card-border space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-admin-card-border">
                      <span className="text-slate-500 font-medium">NIT / Registro Fiscal:</span>
                      <span className="font-mono font-bold text-admin-text">
                        {selectedSupplierForDetails.taxId || "No especificado"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-admin-card-border">
                      <span className="text-slate-500 font-medium">Persona de Contacto:</span>
                      <span className="font-bold text-admin-text">
                        {selectedSupplierForDetails.contactName || "No especificado"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-admin-card-border">
                      <span className="text-slate-500 font-medium">Teléfono / WhatsApp:</span>
                      {selectedSupplierForDetails.phone ? (
                        <a
                          href={`tel:${selectedSupplierForDetails.phone}`}
                          className="font-mono font-bold text-admin-brand-text hover:underline"
                        >
                          {selectedSupplierForDetails.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No registrado</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-admin-card-border">
                      <span className="text-slate-500 font-medium">Correo Electrónico:</span>
                      {selectedSupplierForDetails.email ? (
                        <a
                          href={`mailto:${selectedSupplierForDetails.email}`}
                          className="font-medium text-admin-brand-text hover:underline truncate max-w-[200px]"
                        >
                          {selectedSupplierForDetails.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No registrado</span>
                      )}
                    </div>

                    <div className="pt-1">
                      <span className="text-slate-500 font-medium block mb-1">
                        Dirección de Despacho / Bodega:
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        {selectedSupplierForDetails.address || "Sin dirección registrada"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Observaciones Comerciales */}
                {selectedSupplierForDetails.notes && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block px-1">
                      Notas & Condiciones Comerciales
                    </span>
                    <div className="p-3.5 rounded-xl bg-admin-raised border border-admin-card-border text-admin-secondary leading-relaxed">
                      {selectedSupplierForDetails.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-admin-card-border bg-admin-raised flex items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSupplierForDetails(null)}
                className="rounded-lg h-9 text-xs font-bold"
              >
                Cerrar
              </Button>

              {canEditSuppliers && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const sup = selectedSupplierForDetails;
                      setSelectedSupplierForDetails(null);
                      handleOpenEditModal(sup);
                    }}
                    className="rounded-lg h-9 text-xs font-bold gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Editar</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL: CREAR / EDITAR PROVEEDOR
          ========================================================================= */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl p-6 bg-admin-card-bg border border-admin-card-border">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-base font-bold text-admin-text flex items-center gap-2">
              <Building2 className="h-4 w-4 text-admin-brand-text" />
              <span>{editingSupplier ? "Editar Proveedor" : "Registrar Nuevo Proveedor"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingSupplier
                ? "Actualiza la razón social, contactos o datos fiscales del proveedor."
                : "Ingresa los datos comerciales de la empresa o distribuidor mayorista."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2 text-xs">
            {/* Razón Social */}
            <div className="space-y-1.5">
              <label className="font-bold text-admin-secondary">
                Razón Social / Empresa <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. Distribuciones Alfa S.A."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 text-xs rounded-lg font-medium placeholder:font-normal"
                required
              />
            </div>

            {/* Persona de Contacto y NIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  Persona de Contacto
                </label>
                <Input
                  placeholder="Ej. Roberto Gómez"
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                  className="h-10 text-xs rounded-lg font-medium placeholder:font-normal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  NIT / Identificación Fiscal
                </label>
                <Input
                  placeholder="Ej. 20485912341"
                  value={formTaxId}
                  onChange={(e) => setFormTaxId(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono font-medium placeholder:font-normal"
                />
              </div>
            </div>

            {/* Teléfono y Correo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  Teléfono / WhatsApp
                </label>
                <Input
                  placeholder="+591 7..."
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono font-medium placeholder:font-normal"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  placeholder="ventas@proveedor.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-10 text-xs rounded-lg font-medium placeholder:font-normal"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <label className="font-bold text-admin-secondary">
                Dirección Física / Almacén Central
              </label>
              <Input
                placeholder="Av. Industrial #402, Zona Logística"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="h-10 text-xs rounded-lg font-medium placeholder:font-normal"
              />
            </div>

            {/* Notas Comerciales */}
            <div className="space-y-1.5">
              <label className="font-bold text-admin-secondary">
                Condiciones Comerciales / Notas
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Descuento del 5% por pronto pago, entregas los martes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-admin-card-border bg-admin-card-bg text-admin-text placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-admin-brand/20 focus:border-admin-brand font-medium placeholder:font-normal"
              />
            </div>

            {/* Estado Operativo */}
            <div className="pt-2 border-t border-admin-card-border flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Estado del Proveedor</p>
                <p className="text-[11px] text-slate-400">
                  Los proveedores activos se muestran para seleccionar en inventario y compras.
                </p>
              </div>

              <div className="inline-flex items-center bg-admin-raised p-1 rounded-lg border border-admin-card-border">
                <button
                  type="button"
                  onClick={() => setFormIsActive(true)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    formIsActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  )}
                >
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsActive(false)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    !formIsActive
                      ? "bg-rose-600 text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  )}
                >
                  Inactivo
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-admin-card-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-lg h-9 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="rounded-lg h-9 px-4 text-xs font-bold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingSupplier ? "Guardar Cambios" : "Registrar Proveedor"}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          7. DIÁLOGO DE CONFIRMACIÓN PARA ELIMINAR PROVEEDOR
          ========================================================================= */}
      <Dialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-xl p-6 bg-admin-card-bg border border-admin-card-border">
          <DialogHeader className="pb-3 border-b border-admin-card-border">
            <DialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>¿Eliminar este proveedor?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Estás a punto de eliminar a{" "}
              <strong className="text-slate-800 dark:text-slate-200">{supplierToDelete?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-admin-secondary space-y-2">
            <p>
              Si este proveedor tiene productos asignados, estos pasarán a quedar sin proveedor asignado
              sin afectar su stock.
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 font-medium">
              Nota: Si el proveedor ya tiene órdenes de compra registradas, el sistema te solicitará
              pausarlo/desactivarlo en lugar de borrarlo para preservar la integridad contable.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-admin-card-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSupplierToDelete(null)}
              className="rounded-lg h-9 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              className="rounded-lg h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Confirmar Eliminación</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
