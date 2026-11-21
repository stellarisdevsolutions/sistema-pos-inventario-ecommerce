"use client";

import { CatalogImportDialog } from "@/components/admin/catalog-import-dialog";

import { MetricCard } from "@/components/admin/metric-card";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { businessDate } from "@/lib/business-date";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  getInventoryProducts,
  getInventoryFormData,
  createCategoryAction,
  updateCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
  getProductKardexAction,
  getInventoryAdjustmentsAction,
  createInventoryAdjustmentAction,
  toggleProductActiveAction,
} from "@/app/admin/actions/products";
import { uploadCategoryPhotoAction } from "@/app/admin/actions/upload";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import { CURRENCY_SYMBOL, CURRENCY_NAME, formatCurrency, formatCurrencyLocale } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  DollarSign,
  Boxes,
  CheckCircle2,
  BookOpen,
  ShieldAlert,
  X,
  FolderTree,
  Pencil,
  Loader2,
  Camera,
  Tag,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import InventarioLoading from "./loading";

type Product = Awaited<ReturnType<typeof getInventoryProducts>>["data"][number];
type KardexMovement = Awaited<ReturnType<typeof getProductKardexAction>>["data"][number];
type AdjustmentItem = Awaited<ReturnType<typeof getInventoryAdjustmentsAction>>["data"][number];

const movementFilters = [
  ["all", "Todos"], ["in", "Entradas"], ["out", "Salidas"], ["damaged", "Bajas"],
] as const;

function QuantityChange({ quantity }: { quantity: number }) {
  return <span className={cn("font-semibold tabular-nums", quantity > 0 && "text-admin-success", quantity < 0 && "text-admin-danger")}>
    {quantity > 0 ? "+" : ""}{quantity}
  </span>;
}

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
        {/* Botón Cuadrito Anterior */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Página anterior"
          className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised flex items-center justify-center text-admin-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Cuadritos de Páginas Web */}
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
                "h-8 w-8 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all",
                currentPage === item
                  ? "bg-admin-brand text-white border border-admin-brand scale-105"
                  : "border border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              {item}
            </button>
          )
        )}

        {/* Botón Cuadrito Siguiente */}
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

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string; imageUrl?: string | null }[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>(["Sin categoría"]);
  const [inventoryError, setInventoryError] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState<string | null>(null);
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);
  const newCatFileInputRef = useRef<HTMLInputElement>(null);
  const editCatFileInputRef = useRef<HTMLInputElement>(null);
  const [editingCategory, setEditingCategory] = useState<{ original: string; current: string; imageUrl?: string | null } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"catalog" | "kardex" | "adjustments">("catalog");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [kardexFilterType, setKardexFilterType] = useState<"all" | "in" | "out" | "damaged">("all");
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProductForKardex, setSelectedProductForKardex] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Estados de Kárdex en vivo desde PostgreSQL
  const [realKardexMovements, setRealKardexMovements] = useState<KardexMovement[]>([]);
  const [productDrawerMovements, setProductDrawerMovements] = useState<KardexMovement[]>([]);
  const [loadingDrawerKardex, setLoadingDrawerKardex] = useState(false);
  const [loadingTabKardex, setLoadingTabKardex] = useState(true);
  const [kardexError, setKardexError] = useState("");
  const [productKardexError, setProductKardexError] = useState("");

  // Estados de Bajas & Mermas en vivo desde PostgreSQL
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [adjustmentError, setAdjustmentError] = useState("");

  // Estados del Modal de Baja / Merma
  const [adjustmentProductId, setAdjustmentProductId] = useState<number | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<string>("1");
  const [adjustmentReason, setAdjustmentReason] = useState<
    "damaged" | "defective" | "expired" | "loss_theft" | "supplier_return" | "internal_use"
  >("damaged");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Estados de Paginación en las 3 vistas (10 ítems por página exactos)
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 10;

  const [kardexPage, setKardexPage] = useState(1);
  const kardexPageSize = 10;

  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const adjustmentsPageSize = 10;

  const [catalogImportOpen, setCatalogImportOpen] = useState(false);

  const loadProducts = async () => {
    try {
      const result = await getInventoryProducts();
      if (result.success) {
        setProducts(result.data);
        setInventoryError("");
      } else {
        setProducts([]);
        setInventoryError(result.error);
      }
    } catch {
      setProducts([]);
      setInventoryError("No se pudo cargar el inventario.");
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    void getInventoryFormData().then(({ categories }) => {
      setDbCategories(categories);
      setCategoriesList([...new Set(["Sin categoría", ...categories.map(category => category.name)])]);
    }).catch(() => toast.error("No se pudieron cargar las categorías."));
  }, []);

  useEffect(() => {
    if (!selectedProductForKardex) return;
    let current = true;
    setLoadingDrawerKardex(true);
    setProductKardexError("");
    setProductDrawerMovements([]);
    getProductKardexAction(selectedProductForKardex.id).then(result => {
      if (!current) return;
      if (result.success) setProductDrawerMovements(result.data);
      else setProductKardexError(result.error || "No se pudieron cargar los movimientos.");
    }).catch(() => {
      if (current) setProductKardexError("No se pudieron cargar los movimientos.");
    }).finally(() => { if (current) setLoadingDrawerKardex(false); });
    return () => { current = false; };
  }, [selectedProductForKardex]);

  useEffect(() => {
    if (activeTab !== "kardex") return;
    let current = true;
    setLoadingTabKardex(true);
    setKardexError("");
    getProductKardexAction().then(result => {
      if (!current) return;
      setRealKardexMovements(result.data);
      if (!result.success) setKardexError(result.error || "No se pudieron cargar los movimientos.");
    }).catch(() => {
      if (current) setKardexError("No se pudieron cargar los movimientos.");
    }).finally(() => { if (current) setLoadingTabKardex(false); });
    return () => { current = false; };
  }, [activeTab]);

  const loadAdjustments = async () => {
    setLoadingAdjustments(true);
    setAdjustmentError("");
    try {
      const result = await getInventoryAdjustmentsAction();
      setAdjustments(result.data);
      if (!result.success) setAdjustmentError(result.error || "No se pudieron cargar las bajas.");
    } catch {
      setAdjustmentError("No se pudieron cargar las bajas.");
    } finally {
      setLoadingAdjustments(false);
    }
  };

  useEffect(() => {
    void loadAdjustments();
  }, []);

  const handleCategoryPhotoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCatImage(true);
      // 1. Optimizar en navegador a WebP (800x800 máx, 82% calidad)
      const result = await optimizeImageToWebP(file, { maxWidthOrHeight: 800, quality: 0.82 });

      // 2. Preparar FormData para la acción del servidor
      const formData = new FormData();
      formData.append("file", result.file);

      // 3. Subir
      const res = await uploadCategoryPhotoAction(formData);
      if (res.success && res.url) {
        if (isEdit && editingCategory) {
          setEditingCategory({ ...editingCategory, imageUrl: res.url });
        } else {
          setNewCategoryImage(res.url);
        }
        toast.success("Foto de categoría optimizada", {
          description: "Convertida a WebP ligero en el navegador.",
        });
      } else {
        toast.error("Error al subir foto", { description: res.error });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al procesar foto de categoría");
    } finally {
      setIsUploadingCatImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Nombre requerido", { description: "Ingresa el nombre de la nueva categoría." });
      return;
    }
    if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning("Categoría existente", { description: `La categoría "${trimmed}" ya está en la lista.` });
      return;
    }

    const res = await createCategoryAction(trimmed, newCategoryImage);
    if (res.success && res.data) {
      const created = res.data as { id: number; name: string; imageUrl?: string | null };
      setDbCategories((prev) => [...prev, created]);
      setCategoriesList((prev) => [...prev, created.name]);
      setNewCategoryName("");
      setNewCategoryImage(null);
      toast.success("Categoría creada", { description: `"${created.name}" se guardó en la base de datos.` });
    } else {
      toast.error("Error al crear categoría", { description: res.error });
    }
  };

  const handleSaveEditCategory = async (original: string) => {
    if (!editingCategory) return;
    const trimmed = editingCategory.current.trim();
    if (!trimmed) {
      toast.error("Nombre requerido", { description: "Escribe el nombre corregido." });
      return;
    }
    if (
      trimmed.toLowerCase() !== original.toLowerCase() &&
      categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.warning("Nombre duplicado", { description: `Ya existe una categoría llamada "${trimmed}".` });
      return;
    }

    const dbCat = dbCategories.find((c) => c.name.toLowerCase() === original.toLowerCase());
    if (dbCat) {
      const res = await updateCategoryAction(dbCat.id, trimmed, editingCategory.imageUrl);
      if (!res.success) {
        toast.error("Error al actualizar categoría", { description: res.error });
        return;
      }
      setDbCategories((prev) =>
        prev.map((c) =>
          c.id === dbCat.id
            ? { ...c, name: trimmed, imageUrl: editingCategory.imageUrl !== undefined ? editingCategory.imageUrl : c.imageUrl }
            : c
        )
      );
    }

    setCategoriesList(categoriesList.map((c) => (c === original ? trimmed : c)));
    setProducts(products.map((p) => (p.category === original ? { ...p, category: trimmed } : p)));
    setEditingCategory(null);
    toast.success("Categoría actualizada", {
      description: `"${original}" fue actualizada exitosamente.`,
    });
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const cat = categoryToDelete;
    const affectedCount = products.filter((p) => p.category === cat).length;

    const dbCat = dbCategories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
    if (dbCat) {
      const res = await deleteCategoryAction(dbCat.id);
      if (!res.success) {
        toast.error("Error al eliminar categoría", { description: res.error });
        return;
      }
      setDbCategories((prev) => prev.filter((c) => c.id !== dbCat.id));
    }

    setCategoriesList(categoriesList.filter((c) => c !== cat));
    setProducts(products.map((p) => (p.category === cat ? { ...p, category: "Sin categoría" } : p)));
    setCategoryToDelete(null);
    toast.info("Categoría eliminada", {
      description: `"${cat}" fue eliminada. Sus ${affectedCount} producto(s) pasaron a "Sin categoría".`,
    });
  };

  const handleOpenAdjustmentForProduct = (p: Product) => {
    setAdjustmentProductId(p.id);
    setAdjustmentQuantity("1");
    setAdjustmentReason("damaged");
    setAdjustmentNotes("");
    setIsAdjustmentModalOpen(true);
  };

  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentProductId) {
      toast.error("Selecciona un producto", { description: "Debes elegir qué producto tiene merma." });
      return;
    }
    const qtyNum = parseInt(adjustmentQuantity, 10);
    if (!qtyNum || qtyNum <= 0) {
      toast.error("Cantidad no válida", { description: "Ingresa un número entero mayor a 0." });
      return;
    }

    const prod = products.find((p) => p.id === adjustmentProductId);
    if (prod && qtyNum > prod.stock) {
      toast.error("Stock insuficiente", {
        description: `Solo hay ${prod.stock} unidad(es) de "${prod.name}" en inventario.`,
      });
      return;
    }

    try {
      setIsSubmittingAdjustment(true);
      const res = await createInventoryAdjustmentAction({
        productId: adjustmentProductId,
        quantity: qtyNum,
        reason: adjustmentReason,
        notes: adjustmentNotes,
      });

      if (res.success) {
        toast.success("Baja asentada en Kárdex", {
          description: `Se descontaron ${qtyNum} uds de "${prod?.name || "producto"}".`,
        });
        setIsAdjustmentModalOpen(false);
        setAdjustmentProductId(null);
        setAdjustmentQuantity("1");
        setAdjustmentNotes("");

        // Refrescar productos, kárdex y bajas concurrentemente
        const [updatedProds, updatedKardex, updatedAdj] = await Promise.all([
          getInventoryProducts(),
          getProductKardexAction(),
          getInventoryAdjustmentsAction(),
        ]);
        if (updatedProds.success) setProducts(updatedProds.data);
        if (updatedKardex.success && updatedKardex.data) {
          setRealKardexMovements(updatedKardex.data);
        }
        if (updatedAdj.success && updatedAdj.data) {
          setAdjustments(updatedAdj.data);
        }
      } else {
        toast.error("Error al registrar baja", { description: res.error });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error al registrar la baja en el sistema");
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleToggleProductActive = async (p: Product) => {
    if (togglingProductId !== null) return;
    const currentActive = p.isActive ?? true;
    const newActive = !currentActive;

    setTogglingProductId(p.id);
    const toastId = toast.loading(
      newActive ? `Activando "${p.name}"...` : `Desactivando "${p.name}"...`
    );

    try {
      const res = await toggleProductActiveAction(p.id, newActive);
      if (res.success) {
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, isActive: newActive } : item))
        );
        if (newActive) {
          toast.success("Producto activado", {
            id: toastId,
            description: `"${p.name}" ahora está habilitado para la venta.`,
          });
        } else {
          toast.info("Producto desactivado", {
            id: toastId,
            description: `"${p.name}" se pausó y no se ofrecerá para la venta.`,
          });
        }
      } else {
        toast.error("Error al cambiar estado", {
          id: toastId,
          description: res.error || "No se pudo actualizar el estado del producto.",
        });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Error de conexión", {
        id: toastId,
        description: "Ocurrió un error inesperado al comunicarse con el servidor.",
      });
    } finally {
      setTogglingProductId(null);
    }
  };

  const selectedProdForAdjustment = products.find((p) => p.id === adjustmentProductId);

  // Filtrado de productos con soporte para estado y stock
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm);

    if (!matchesSearch) return false;
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;

    // Filtro por Estado (Todos / Activos / Inactivos)
    const isProdActive = p.isActive ?? true;
    if (statusFilter === "active" && !isProdActive) return false;
    if (statusFilter === "inactive" && isProdActive) return false;

    // Filtro por Stock
    if (filterStock === "low") {
      const isLow = (p.stock <= p.minStock && p.stock > 0) || p.status === "low_stock";
      if (!isLow) return false;
    }
    if (filterStock === "out") {
      const isOut = p.stock === 0 || p.status === "out_of_stock";
      if (!isOut) return false;
    }
    return true;
  });

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    filterStock !== "all" ||
    selectedCategory !== "all";

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setFilterStock("all");
    setSelectedCategory("all");
    setCatalogPage(1);
  };

  // Paginación de catálogo
  const firstAvailableProduct = products.find(product => product.stock > 0);
  const totalCatalogPages = Math.ceil(filteredProducts.length / catalogPageSize) || 1;
  const paginatedProducts = filteredProducts.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize
  );

  // Filtrado de kárdex
  const filteredKardex = realKardexMovements.filter((m) => {
    if (kardexFilterType === "in") return m.type === "purchase_in" || m.type === "return_in" || m.type === "adjustment_in";
    if (kardexFilterType === "out") return m.quantity < 0;
    if (kardexFilterType === "damaged") return m.type === "damaged_out";
    return true;
  });

  // Paginación de kárdex
  const totalKardexPages = Math.ceil(filteredKardex.length / kardexPageSize) || 1;
  const paginatedKardex = filteredKardex.slice(
    (kardexPage - 1) * kardexPageSize,
    kardexPage * kardexPageSize
  );

  // Fuente de Bajas & Mermas y Paginación
  const currentMonth = businessDate().slice(0, 7);
  const monthAdjustments = adjustments.filter(adjustment => adjustment.businessDate.startsWith(currentMonth));
  const totalAdjustmentsPages = Math.ceil(adjustments.length / adjustmentsPageSize) || 1;
  const paginatedAdjustments = adjustments.slice(
    (adjustmentsPage - 1) * adjustmentsPageSize,
    adjustmentsPage * adjustmentsPageSize
  );

  if (loadingInventory) {
    return <InventarioLoading />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HEADER DEL MÓDULO (ESTILO BENTO / QUIXOTIC)
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="admin-page-title">Inventario</h1>
          <p className="admin-page-description">Productos, existencias y movimientos de stock.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href="/admin/inventario/plantilla" download className="admin-return rounded-xl border border-admin-card-border bg-admin-card-bg px-3 py-2">
            Descargar plantilla Excel
          </a>
          <Button variant="outline" onClick={() => setCatalogImportOpen(true)}>Importar productos</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="h-10 px-4 rounded-xl border-admin-card-border text-admin-secondary font-bold text-xs gap-2 hover:bg-admin-raised cursor-pointer"
          >
            <FolderTree className="h-4 w-4 text-admin-brand-text" />
            <span>Categorías</span>
          </Button>

          <Link href="/admin/inventario/nuevo" className={buttonVariants({
            size: "sm",
            className: "inventory-primary-action h-10 gap-2 rounded-xl px-5",
          })}>
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo producto
          </Link>
        </div>
      </div>

      {catalogImportOpen && (
        <CatalogImportDialog
          onClose={() => setCatalogImportOpen(false)}
          onImported={loadProducts}
        />
      )}

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI DE INVENTARIO BENTO
          ========================================================================= */}
      {inventoryError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-admin-danger">
          {inventoryError}
          <Button variant="outline" onClick={() => { setLoadingInventory(true); void loadProducts(); }}>Reintentar</Button>
        </div>
      )}
      <section className="admin-metrics" aria-label="Indicadores de inventario">
        <MetricCard
          label="Valor en bodega"
          value={inventoryError ? "—" : formatCurrencyLocale(products.reduce((sum, p) => sum + p.stock * p.costPrice, 0))}
          detail="Stock a costo promedio"
          icon={DollarSign}
        />
        <MetricCard
          label="Unidades físicas"
          value={inventoryError ? "—" : products.reduce((sum, p) => sum + p.stock, 0)}
          detail={inventoryError ? "Datos no disponibles" : `${categoriesList.filter((c) => c !== "Sin categoría").length} categorías activas`}
          icon={Boxes}
        />
        <MetricCard
          label="Stock crítico"
          value={inventoryError ? "—" : products.filter((p) => p.stock <= p.minStock).length}
          detail="Productos en el mínimo o por debajo"
          icon={AlertTriangle}
          tone="warning"
        />
        <MetricCard
          label="Mermas del mes"
          value={loadingAdjustments || adjustmentError ? "—" : formatCurrencyLocale(monthAdjustments.reduce((sum, a) => sum + a.totalLoss, 0))}
          detail={loadingAdjustments ? "Cargando…" : adjustmentError ? "Datos no disponibles" : `${monthAdjustments.length} ${monthAdjustments.length === 1 ? "acta de baja" : "actas de baja"}`}
          icon={ShieldAlert}
          tone="danger"
        />
      </section>

      {/* =========================================================================
          3. SELECTOR DE PESTAÑAS (SEGMENTED CONTROL MODERNO)
          ========================================================================= */}
      <div className="admin-segments" role="group" aria-label="Vistas de inventario">
        <button
          onClick={() => setActiveTab("catalog")}
          aria-pressed={activeTab === "catalog"}
          className="admin-segment"
        >
          <Package className="h-4 w-4" />
          <span>Productos</span>
        </button>

        <button
          onClick={() => setActiveTab("kardex")}
          aria-pressed={activeTab === "kardex"}
          className="admin-segment"
        >
          <BookOpen className="h-4 w-4" />
          <span>Kárdex</span>
        </button>

        <button
          onClick={() => setActiveTab("adjustments")}
          aria-pressed={activeTab === "adjustments"}
          className="admin-segment"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Bajas y mermas</span>
        </button>
      </div>

      {/* =========================================================================
          4. CONTENIDO DE LAS PESTAÑAS
          ========================================================================= */}
      {activeTab === "catalog" ? (
        /* PESTAÑA 1: CATÁLOGO DE PRODUCTOS & STOCK ACTUAL */
        <div className="admin-panel overflow-hidden">
          {/* =========================================================================
              BARRA DE BÚSQUEDA, VISTA Y FILTROS SEGÚN ESPECIFICACIÓN
              ========================================================================= */}
          <div className="p-4 border-b border-admin-card-border space-y-3">
            {/* Fila 1: Buscador a la izquierda + Switcher de Vista a la derecha */}
            <div className="flex items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  aria-label="Buscar productos"
                  placeholder="Buscar por producto, SKU o código de barras"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCatalogPage(1);
                  }}
                  className="pl-9 h-11 text-xs rounded-xl bg-admin-raised border-admin-card-border focus:bg-admin-card-bg transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setCatalogPage(1);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Selector de Modo: Lista vs Cuadros */}
              <div className="inline-flex items-center bg-admin-raised p-1 rounded-xl border border-admin-card-border shrink-0">
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
              </div>
            </div>

            {/* Fila 2: Filtros de Estado, Stock, Categoría y Limpiar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {/* Segmented control 1: Estado (Todos / Activos / Inactivos) */}
              <div className="inline-flex items-center bg-admin-raised p-1 rounded-xl border border-admin-card-border">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    statusFilter === "all"
                      ? "bg-admin-card-bg text-admin-text font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("active");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    statusFilter === "active"
                      ? "bg-admin-card-bg text-admin-text font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("inactive");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    statusFilter === "inactive"
                      ? "bg-admin-card-bg text-admin-text font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  Inactivos
                </button>
              </div>

              {/* Segmented control 2: Stock (Todo stock / ⚠️ Bajo (< 10) / ✕ Agotado) */}
              <div className="inline-flex items-center bg-admin-raised p-1 rounded-xl border border-admin-card-border">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStock("all");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    filterStock === "all"
                      ? "bg-admin-card-bg text-admin-text font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  Todo stock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStock("low");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    filterStock === "low"
                      ? "bg-admin-card-bg text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  <span>Bajo stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStock("out");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    filterStock === "out"
                      ? "bg-admin-card-bg text-rose-600 dark:text-rose-400 font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  <span>Agotado</span>
                </button>
              </div>

              {/* Dropdown de Categoría */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCatalogPage(1);
                }}
                className="h-9 px-3.5 text-xs rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-secondary font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-admin-brand/20"
              >
                <option value="all">Categoría</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Botón condicional Limpiar filtros */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* =========================================================================
              CONTENIDO: MODO LISTA (TABLA) O MODO CUADROS (GRID)
              ========================================================================= */}
          {viewMode === "list" ? (
            /* VISTA 1: TABLA EN LISTA */
            <div className="overflow-x-auto" role="region" aria-label="Tabla de productos" tabIndex={0}>
              <table className="inventory-table inventory-catalog-table">
                <thead>
                  <tr className="border-b border-admin-card-border bg-admin-raised text-admin-muted font-bold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="py-3.5 px-5">Producto</th>
                    <th scope="col" className="py-3.5 px-5 text-right">Precio</th>
                    <th scope="col" className="py-3.5 px-5 text-center">Stock</th>
                    <th scope="col" className="py-3.5 px-5 text-center">Disponibilidad</th>
                    <th scope="col" className="py-3.5 px-5 text-center">Estado</th>
                    <th scope="col" className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-admin-secondary">
                            {inventoryError ? "Inventario no disponible" : hasActiveFilters ? "No hay productos para estos filtros" : "Aún no hay productos registrados"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {!inventoryError && (hasActiveFilters ? "Prueba con otra búsqueda." : "Agrega un producto o importa tu catálogo.")}
                          </p>
                          {hasActiveFilters && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearFilters}
                              className="mt-2 h-8 text-xs rounded-xl"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                              Limpiar filtros
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      const isLow = (p.stock <= p.minStock && p.stock > 0) || p.status === "low_stock";
                      const isOut = p.stock === 0 || p.status === "out_of_stock";
                      const isProductActive = p.isActive ?? true;
                      const isToggling = togglingProductId === p.id;

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProductForDetails(p)}
                          className={cn(
                            "hover:bg-admin-raised transition-colors group cursor-pointer",
                            !isProductActive && "opacity-60 bg-admin-raised"
                          )}
                        >
                          {/* 1. Producto (Nombre arriba + Categoría debajito) */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3.5">
                              <ProductThumbnail
                                src={p.image}
                                alt={p.name}
                                className="h-12 w-12 rounded-xl object-cover border border-admin-card-border shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <button type="button" onClick={event => { event.stopPropagation(); setSelectedProductForDetails(p); }}
                                  className="text-left text-sm font-semibold leading-snug text-admin-text hover:text-admin-brand-text hover:underline">
                                  {p.name}
                                </button>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-xs text-admin-muted font-medium">
                                    {p.category}
                                  </span>
                                  {p.sku && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600">•</span>
                                      <span className="text-[11px] font-mono text-slate-400">
                                        {p.sku}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Precio */}
                          <td className="py-4 px-5 text-right">
                            <span className="font-bold text-admin-text font-mono text-sm tracking-tight">
                              {CURRENCY_SYMBOL} {p.price.toFixed(2)}
                            </span>
                          </td>

                          {/* 3. Columna Stock (Solo cantidad física) */}
                          <td className="py-4 px-5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={cn(
                                  "font-bold text-sm font-mono",
                                  isOut
                                    ? "text-rose-600"
                                    : isLow
                                    ? "text-amber-600"
                                    : "text-admin-text"
                                )}
                              >
                                {p.stock}
                              </span>
                              {p.minStock > 0 && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  mín: {p.minStock}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Columna Disponibilidad (Indicador Dot limpio, sin cápsula) */}
                          <td className="py-4 px-5 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  p.status === "in_stock"
                                    ? "bg-emerald-500"
                                    : p.status === "low_stock"
                                    ? "bg-amber-500 animate-pulse"
                                    : "bg-rose-500"
                                )}
                              />
                              <span
                                className={cn(
                                  p.status === "in_stock"
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : p.status === "low_stock"
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-rose-700 dark:text-rose-400"
                                )}
                              >
                                {p.status === "in_stock"
                                  ? "En stock"
                                  : p.status === "low_stock"
                                  ? "Bajo stock"
                                  : "Agotado"}
                              </span>
                            </div>
                          </td>

                          {/* 5. Estado (Toggle Switch con Loader y Toast) */}
                          <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isProductActive}
                              disabled={isToggling}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleProductActive(p);
                              }}
                              title={
                                isProductActive
                                  ? "Habilitado para la venta (Pausar)"
                                  : "Pausado (Habilitar)"
                              }
                              className="inline-flex items-center gap-2 cursor-pointer group disabled:cursor-wait"
                            >
                              <span
                                className={cn(
                                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none items-center",
                                  isProductActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
                                  isToggling && "opacity-80"
                                )}
                              >
                                <span
                                  className={cn(
                                    "pointer-events-none flex items-center justify-center h-4 w-4 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out",
                                    isProductActive ? "translate-x-4" : "translate-x-0"
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
                                  isProductActive
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-admin-muted"
                                )}
                              >
                                {isToggling ? "Cargando..." : isProductActive ? "Activo" : "Inactivo"}
                              </span>
                            </button>
                          </td>

                          {/* 6. Acciones: Ver Información, Editar, Ver Kárdex, Dar de Baja */}
                          <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-xl hover:bg-admin-raised cursor-pointer"
                                  />
                                }
                              >
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-xl border border-admin-card-border p-1.5 bg-admin-card-bg text-xs min-w-[170px]"
                              >
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => setSelectedProductForDetails(p)}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-admin-secondary"
                                  >
                                    <Package className="h-4 w-4 mr-2 text-slate-500" />
                                    Ver ficha
                                  </DropdownMenuItem>
                                  <Link href={`/admin/inventario/${p.id}/editar`}>
                                    <DropdownMenuItem className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-admin-secondary">
                                      <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                      Editar Producto
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuItem
                                    onClick={() => setSelectedProductForKardex(p)}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-admin-brand-text focus:bg-admin-brand-subtle"
                                  >
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Ver Kárdex
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenAdjustmentForProduct(p)}
                                    className="rounded-xl px-2.5 py-2 font-semibold text-rose-600 dark:text-rose-400 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/60"
                                  >
                                    <ShieldAlert className="h-4 w-4 mr-2 text-rose-600" />
                                    Dar de Baja (Merma)
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* VISTA 2: MODO CUADROS (GRID) */
            <div className="p-4">
              {paginatedProducts.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-semibold text-admin-secondary">
                    {inventoryError ? "Inventario no disponible" : hasActiveFilters ? "No hay productos para estos filtros" : "Aún no hay productos registrados"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {!inventoryError && (hasActiveFilters ? "Prueba con otra búsqueda." : "Agrega un producto o importa tu catálogo.")}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="mt-2 h-8 text-xs rounded-xl"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {paginatedProducts.map((p) => {
                    const isLow = (p.stock <= p.minStock && p.stock > 0) || p.status === "low_stock";
                    const isOut = p.stock === 0 || p.status === "out_of_stock";
                    const isProductActive = p.isActive ?? true;
                    const isToggling = togglingProductId === p.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductForDetails(p)}
                        className={cn(
                          "rounded-xl border border-admin-card-border bg-admin-card-bg overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group relative cursor-pointer select-none",
                          !isProductActive && "opacity-60 bg-admin-raised"
                        )}
                      >
                        {/* Contenedor Superior de Imagen a Ancho Completo */}
                        <div className="relative aspect-square w-full bg-admin-raised">
                          <ProductThumbnail
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Badge Disponibilidad flotante en esquina superior izquierda */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-lg border backdrop-blur-md",
                                p.status === "in_stock"
                                  ? "bg-emerald-500/90 text-white border-emerald-400"
                                  : p.status === "low_stock"
                                  ? "bg-amber-500/90 text-white border-amber-400"
                                  : "bg-rose-500/90 text-white border-rose-400"
                              )}
                            >
                              {p.status === "in_stock"
                                ? "En stock"
                                : p.status === "low_stock"
                                ? "Bajo stock"
                                : "Agotado"}
                            </Badge>
                          </div>

                          {/* Menú de Acciones flotante en esquina superior derecha */}
                          <div
                            className="absolute top-2.5 right-2.5 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <button
                                    type="button"
                                    title="Acciones"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-7 w-7 rounded-xl bg-admin-card-bg hover:bg-white dark:hover:bg-slate-900 border border-admin-card-border backdrop-blur-md flex items-center justify-center text-admin-secondary cursor-pointer transition active:scale-95"
                                  />
                                }
                              >
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-xl border border-admin-card-border p-1.5 bg-admin-card-bg text-xs min-w-[175px]"
                              >
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProductForDetails(p);
                                    }}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-admin-secondary"
                                  >
                                    <Package className="h-4 w-4 mr-2 text-slate-500" />
                                    Ver ficha
                                  </DropdownMenuItem>
                                  <Link href={`/admin/inventario/${p.id}/editar`}>
                                    <DropdownMenuItem className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-admin-secondary">
                                      <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                      Editar Producto
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProductForKardex(p);
                                    }}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-admin-brand-text focus:bg-admin-brand-subtle"
                                  >
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Ver Kárdex
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAdjustmentForProduct(p);
                                    }}
                                    className="rounded-xl px-2.5 py-2 font-semibold text-rose-600 dark:text-rose-400 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/60"
                                  >
                                    <ShieldAlert className="h-4 w-4 mr-2 text-rose-600" />
                                    Dar de Baja (Merma)
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="my-1 bg-admin-raised" />

                                  {/* Acción de Estado dentro del menú de 3 puntos */}
                                  <DropdownMenuItem
                                    disabled={isToggling}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleProductActive(p);
                                    }}
                                    className={cn(
                                      "rounded-xl px-2.5 py-2 font-semibold cursor-pointer",
                                      isProductActive
                                        ? "text-admin-secondary"
                                        : "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-950/60"
                                    )}
                                  >
                                    {isToggling ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-500" />
                                    ) : isProductActive ? (
                                      <X className="h-4 w-4 mr-2 text-slate-400" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                    )}
                                    {isToggling
                                      ? "Actualizando..."
                                      : isProductActive
                                      ? "Desactivar Producto"
                                      : "Activar Producto"}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Datos del producto con padding */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-xs text-admin-muted font-medium block">
                              {p.category}
                            </span>
                            <h4
                              title={p.name}
                              className="font-bold text-sm text-admin-text leading-snug line-clamp-2 mt-1"
                            >
                              {p.name}
                            </h4>
                          </div>

                          {/* Fila de Precio y Stock (solo cantidad numérica) */}
                          <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-admin-card-border">
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block">Precio</span>
                              <span className="font-bold text-admin-text font-mono text-base tracking-tight">
                                {CURRENCY_SYMBOL} {p.price.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-medium block">Stock</span>
                              <span
                                className={cn(
                                  "font-semibold font-mono text-xs",
                                  isOut
                                    ? "text-rose-600"
                                    : isLow
                                    ? "text-amber-600"
                                    : "text-slate-800 dark:text-slate-200"
                                )}
                              >
                                {p.stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Paginación Catálogo de Productos con Cuadritos Web (Aplica tanto para Lista como para Cuadros) */}
          <PaginationBar
            currentPage={catalogPage}
            totalPages={totalCatalogPages}
            totalItems={filteredProducts.length}
            pageSize={catalogPageSize}
            itemName="productos"
            onPageChange={setCatalogPage}
          />
        </div>
      ) : activeTab === "kardex" ? (
        <section className="admin-panel overflow-hidden" aria-labelledby="inventory-movements-title">
          <header className="inventory-section-header">
            <h2 id="inventory-movements-title">Movimientos</h2>
            <div className="admin-segments" role="group" aria-label="Tipo de movimiento">
              {movementFilters.map(([value, label]) => (
                <button key={value} type="button" className="admin-segment" aria-pressed={kardexFilterType === value}
                  onClick={() => { setKardexFilterType(value); setKardexPage(1); }}>
                  {label}
                </button>
              ))}
            </div>
          </header>
          {loadingTabKardex ? (
            <p role="status" className="inventory-table-message">Cargando movimientos…</p>
          ) : kardexError ? (
            <p role="alert" className="inventory-table-message">{kardexError}</p>
          ) : paginatedKardex.length === 0 ? (
            <p className="inventory-table-message">No hay movimientos para este filtro.</p>
          ) : (
            <div className="overflow-x-auto" role="region" aria-label="Tabla de movimientos de inventario" tabIndex={0}>
              <table className="inventory-table inventory-movement-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Movimiento</th>
                    <th scope="col" className="inventory-number">Unidades</th>
                    <th scope="col" className="inventory-number">Saldo</th>
                    <th scope="col" className="inventory-number">Costo unitario</th>
                    <th scope="col">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedKardex.map(movement => (
                    <tr key={movement.id}>
                      <td className="inventory-date">{movement.date}</td>
                      <td><strong>{movement.product}</strong><small>{movement.sku}</small></td>
                      <td>{movement.typeLabel}</td>
                      <td className="inventory-number"><QuantityChange quantity={movement.quantity} /></td>
                      <td className="inventory-number whitespace-nowrap"><span className="text-admin-muted">{movement.previousStock} → </span><strong>{movement.newStock}</strong></td>
                      <td className="inventory-number whitespace-nowrap">{formatCurrencyLocale(movement.unitCost)}</td>
                      <td>
                        {(movement.reason || movement.user) ? (
                          <details className="inventory-reference">
                            <summary>{movement.reference}</summary>
                            {movement.reason && <p>{movement.reason}</p>}
                            {movement.user && <small>{movement.user}</small>}
                          </details>
                        ) : movement.reference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loadingTabKardex && !kardexError && (
            <PaginationBar currentPage={kardexPage} totalPages={totalKardexPages} totalItems={filteredKardex.length}
              pageSize={kardexPageSize} itemName="movimientos" onPageChange={setKardexPage} />
          )}
        </section>
      ) : (
        <section className="admin-panel overflow-hidden" aria-labelledby="inventory-losses-title">
          <header className="inventory-section-header">
            <h2 id="inventory-losses-title">Bajas registradas</h2>
            <Button size="sm" disabled={inventoryError !== "" || !firstAvailableProduct}
              onClick={() => { if (firstAvailableProduct) handleOpenAdjustmentForProduct(firstAvailableProduct); }}
              className="inventory-primary-action rounded-xl">
              <Plus size={16} aria-hidden /> Registrar baja
            </Button>
          </header>
          {loadingAdjustments ? (
            <p role="status" className="inventory-table-message">Cargando bajas…</p>
          ) : adjustmentError ? (
            <p role="alert" className="inventory-table-message">{adjustmentError}</p>
          ) : paginatedAdjustments.length === 0 ? (
            <p className="inventory-table-message">Aún no hay bajas registradas.</p>
          ) : (
            <div className="overflow-x-auto" role="region" aria-label="Tabla de bajas de inventario" tabIndex={0}>
              <table className="inventory-table inventory-movement-table">
                <thead>
                  <tr>
                    <th scope="col">Folio</th>
                    <th scope="col">Fecha</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Motivo</th>
                    <th scope="col" className="inventory-number">Unidades</th>
                    <th scope="col" className="inventory-number">Pérdida</th>
                    <th scope="col">Responsables</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdjustments.map(adjustment => (
                    <tr key={adjustment.id}>
                      <td className="whitespace-nowrap">{adjustment.adjustmentNumber}</td>
                      <td className="inventory-date">{adjustment.date}</td>
                      <td><strong>{adjustment.productName}</strong>{adjustment.sku && <small>{adjustment.sku}</small>}</td>
                      <td>
                        {adjustment.notes ? (
                          <details className="inventory-reference">
                            <summary>{adjustment.reasonLabel}</summary>
                            <p>{adjustment.notes}</p>
                          </details>
                        ) : adjustment.reasonLabel}
                      </td>
                      <td className="inventory-number">{adjustment.quantity}</td>
                      <td className="inventory-number whitespace-nowrap text-admin-danger">{formatCurrencyLocale(adjustment.totalLoss)}</td>
                      <td>
                        {adjustment.reportedBy || "—"}
                        {adjustment.authorizedBy && <small>Autorizó {adjustment.authorizedBy}</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loadingAdjustments && !adjustmentError && (
            <PaginationBar currentPage={adjustmentsPage} totalPages={totalAdjustmentsPages} totalItems={adjustments.length}
              pageSize={adjustmentsPageSize} itemName="bajas" onPageChange={setAdjustmentsPage} />
          )}
        </section>
      )}

      <Sheet open={!!selectedProductForDetails} onOpenChange={open => { if (!open) setSelectedProductForDetails(null); }}>
        {selectedProductForDetails && (
          <SheetContent className="inventory-sheet" showCloseButton={false}>
            <SheetHeader className="inventory-sheet-header">
              <div className="flex min-w-0 items-center gap-3">
                <ProductThumbnail src={selectedProductForDetails.image} alt="" className="size-14 shrink-0 rounded-lg border border-admin-card-border object-contain" />
                <div className="min-w-0">
                  <SheetTitle className="break-words text-lg font-semibold text-admin-text">{selectedProductForDetails.name}</SheetTitle>
                  <SheetDescription className="text-admin-muted">{selectedProductForDetails.category}</SheetDescription>
                </div>
              </div>
              <SheetClose render={<Button variant="ghost" size="icon" aria-label="Cerrar ficha" />}><X size={17} aria-hidden /></SheetClose>
            </SheetHeader>
            <div className="inventory-sheet-body space-y-5">
              <dl className="inventory-facts">
                <div><dt>Stock disponible</dt><dd>{selectedProductForDetails.stock}</dd></div>
                <div><dt>Precio de venta</dt><dd>{formatCurrencyLocale(selectedProductForDetails.price)}</dd></div>
                <div><dt>Costo promedio</dt><dd>{formatCurrencyLocale(selectedProductForDetails.costPrice)}</dd></div>
              </dl>
              <dl className="inventory-detail-list">
                <div><dt>SKU</dt><dd>{selectedProductForDetails.sku}</dd></div>
                {selectedProductForDetails.barcode !== "-" && <div><dt>Código de barras</dt><dd>{selectedProductForDetails.barcode}</dd></div>}
                <div><dt>Stock mínimo</dt><dd>{selectedProductForDetails.minStock}</dd></div>
                <div><dt>Estado</dt><dd>{selectedProductForDetails.isActive ? "Activo" : "Inactivo"}</dd></div>
              </dl>
              {selectedProductForDetails.description?.trim() && (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold">Descripción</h3>
                  <p className="whitespace-pre-line break-words text-sm text-admin-secondary">{selectedProductForDetails.description}</p>
                </section>
              )}
            </div>
            <SheetFooter className="inventory-sheet-footer">
              <Button variant="outline" onClick={() => {
                setSelectedProductForKardex(selectedProductForDetails);
                setSelectedProductForDetails(null);
              }}>Ver Kárdex</Button>
              <Link href={`/admin/inventario/${selectedProductForDetails.id}/editar`}
                className="inline-flex items-center justify-center rounded-lg bg-admin-brand px-3 py-1.5 text-sm font-medium text-admin-on-solid hover:bg-admin-brand-hover">
                Editar producto
              </Link>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={!!selectedProductForKardex} onOpenChange={open => { if (!open) setSelectedProductForKardex(null); }}>
        {selectedProductForKardex && (
          <SheetContent className="inventory-sheet" showCloseButton={false}>
            <SheetHeader className="inventory-sheet-header">
              <div className="min-w-0">
                <SheetTitle className="text-lg font-semibold text-admin-text">Kárdex del producto</SheetTitle>
                <SheetDescription className="break-words text-admin-muted">{selectedProductForKardex.name} · {selectedProductForKardex.sku}</SheetDescription>
              </div>
              <SheetClose render={<Button variant="ghost" size="icon" aria-label="Cerrar Kárdex" />}><X size={17} aria-hidden /></SheetClose>
            </SheetHeader>
            <div className="inventory-sheet-body">
              {loadingDrawerKardex ? (
                <p role="status" className="inventory-table-message">Cargando movimientos…</p>
              ) : productKardexError ? (
                <p role="alert" className="inventory-table-message">{productKardexError}</p>
              ) : productDrawerMovements.length === 0 ? (
                <p className="inventory-table-message">Aún no hay movimientos para este producto.</p>
              ) : (
                <div className="overflow-x-auto" role="region" aria-label="Movimientos del producto" tabIndex={0}>
                  <table className="inventory-table inventory-product-ledger">
                    <thead><tr>
                      <th scope="col">Movimiento</th>
                      <th scope="col" className="inventory-number">Unidades</th>
                      <th scope="col" className="inventory-number">Saldo</th>
                    </tr></thead>
                    <tbody>
                      {productDrawerMovements.map(movement => (
                        <tr key={movement.id}>
                          <td>
                            <strong>{movement.typeLabel}</strong><small>{movement.date}</small>
                            <details className="inventory-reference mt-1">
                              <summary>{movement.reference}</summary>
                              {movement.reason && <p>{movement.reason}</p>}
                              <small>{formatCurrencyLocale(movement.unitCost)} por unidad</small>
                              {movement.user && <small>{movement.user}</small>}
                            </details>
                          </td>
                          <td className="inventory-number"><QuantityChange quantity={movement.quantity} /></td>
                          <td className="inventory-number">{movement.newStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>

      {/* =========================================================================
          MODAL: GESTIÓN CENTRALIZADA DE CATEGORÍAS (OPCIÓN B)
          ========================================================================= */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl p-6 bg-admin-card-bg border border-admin-card-border">
          <input
            type="file"
            ref={newCatFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCategoryPhotoSelect(e, false)}
          />
          <input
            type="file"
            ref={editCatFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCategoryPhotoSelect(e, true)}
          />

          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-admin-brand-subtle border border-admin-brand-light flex items-center justify-center text-admin-brand-text">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-admin-text tracking-tight">
                  Gestión de Categorías
                </DialogTitle>
                <DialogDescription className="text-xs text-admin-muted">
                  Crea, renombra o añade fotos para la Tienda Online.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Formulario rápido para crear nueva categoría con imagen */}
          <form onSubmit={handleAddCategory} className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              {/* Selector / Previsualizador de foto WebP */}
              {newCategoryImage ? (
                <div className="relative group shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={newCategoryImage}
                    alt="Previsualización"
                    className="h-10 w-10 rounded-xl object-cover border-2 border-admin-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setNewCategoryImage(null)}
                    title="Quitar foto"
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => newCatFileInputRef.current?.click()}
                  disabled={isUploadingCatImage}
                  title="Subir foto para Tienda Online (se optimiza a WebP)"
                  className="h-10 px-2.5 rounded-xl border border-dashed border-admin-card-border hover:border-admin-brand hover:bg-admin-brand-subtle text-slate-500 hover:text-admin-brand-text flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isUploadingCatImage ? (
                    <Loader2 className="h-4 w-4 animate-spin text-admin-brand-text" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Foto</span>
                </button>
              )}

              <Input
                placeholder="Nueva categoría..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-10 text-xs rounded-xl flex-1"
              />

              <Button
                type="submit"
                size="sm"
                disabled={isUploadingCatImage}
                className="h-10 px-5 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Crear</span>
              </Button>
            </div>
          </form>

          {/* Diálogo de Confirmación para Eliminar Categoría */}
          {categoryToDelete && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5 animate-in fade-in-50 duration-150">
              <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold">
                    ¿Eliminar la categoría "{categoryToDelete}"?
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-tight">
                    Sus {products.filter((p) => p.category === categoryToDelete).length} producto(s) <strong>no se borrarán</strong>; pasarán automáticamente a <strong>"Sin categoría"</strong> para mantener intacto tu Kárdex contable.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryToDelete(null)}
                  className="h-8 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmDeleteCategory}
                  className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Confirmar Eliminación y Reasignar
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Categorías Existentes */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1.5 custom-scrollbar">
            {categoriesList.map((cat) => {
              const productCount = products.filter((p) => p.category === cat).length;
              const isDefault = cat === "Sin categoría";
              const isEditing = editingCategory?.original === cat;
              const catData = dbCategories.find(
                (c) => c.name.toLowerCase() === cat.toLowerCase()
              );
              const currentImageUrl = isEditing ? editingCategory.imageUrl : catData?.imageUrl;

              return (
                <div
                  key={cat}
                  className="p-3 rounded-xl border border-admin-card-border bg-admin-raised flex items-center justify-between gap-3"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      {/* Imagen en modo edición */}
                      <div className="relative group shrink-0">
                        {currentImageUrl ? (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={currentImageUrl}
                              alt={editingCategory.current}
                              className="h-9 w-9 rounded-xl object-cover border border-amber-400 cursor-pointer"
                              onClick={() => editCatFileInputRef.current?.click()}
                              title="Cambiar foto"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditingCategory({ ...editingCategory, imageUrl: null })
                              }
                              title="Quitar foto"
                              className="absolute -top-1 -right-1 h-4 w-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => editCatFileInputRef.current?.click()}
                            disabled={isUploadingCatImage}
                            title="Añadir foto"
                            className="h-9 w-9 rounded-xl border border-dashed border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors"
                          >
                            {isUploadingCatImage ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Camera className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <Input
                        value={editingCategory.current}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            current: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEditCategory(cat);
                          }
                        }}
                        className="h-8 text-xs rounded-lg bg-admin-card-bg font-bold"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEditCategory(cat)}
                        className="h-8 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0"
                      >
                        Guardar
                      </Button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        {/* Miniatura de la Categoría */}
                        {catData?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={catData.imageUrl}
                            alt={cat}
                            className="h-9 w-9 rounded-xl object-cover border border-admin-card-border shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-admin-raised border border-admin-card-border flex items-center justify-center text-admin-muted shrink-0">
                            <Tag className="h-4 w-4" />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-admin-text">
                            {cat}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono font-medium text-admin-muted border-admin-card-border"
                          >
                            {productCount} {productCount === 1 ? "artículo" : "artículos"}
                          </Badge>
                          {catData?.imageUrl && (
                            <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[9px] font-semibold">
                              Web
                            </Badge>
                          )}
                          {isDefault && (
                            <Badge className="bg-slate-200 dark:bg-slate-700 text-admin-secondary text-[9px] font-bold">
                              Por Defecto
                            </Badge>
                          )}
                        </div>
                      </div>

                      {!isDefault && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCategory({
                                original: cat,
                                current: cat,
                                imageUrl: catData?.imageUrl || null,
                              })
                            }
                            title="Editar nombre y foto"
                            className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-600 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            title="Eliminar categoría"
                            className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-rose-50 hover:border-rose-300 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-2 border-t border-admin-card-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCategoryModalOpen(false);
                setEditingCategory(null);
                setCategoryToDelete(null);
              }}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: REGISTRAR ACTA FORMAL DE BAJA & MERMA EN KÁRDEX
          ========================================================================= */}
      <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl p-6 bg-admin-card-bg border border-admin-card-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-admin-text tracking-tight">
                  Registrar baja
                </DialogTitle>
                <DialogDescription className="text-xs text-admin-muted">
                  La baja descuenta unidades y queda registrada en el Kárdex.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConfirmAdjustment} className="space-y-4 pt-2">
            {/* 1. Selector de Producto Afectado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Producto Afectado *
              </label>
              <select
                value={adjustmentProductId ?? ""}
                onChange={(e) => setAdjustmentProductId(Number(e.target.value) || null)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-admin-card-border bg-admin-card-bg text-admin-text font-bold cursor-pointer"
                required
              >
                <option value="">-- Selecciona el producto con merma --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} (Stock: {p.stock} uds | Costo: {CURRENCY_SYMBOL}{" "}
                    {p.costPrice.toFixed(2)}) {p.stock <= 0 ? "- [AGOTADO]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Ficha Resumen del Producto Seleccionado */}
            {selectedProdForAdjustment && (
              <div className="p-3.5 rounded-xl bg-admin-raised border border-admin-card-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-mono">SKU: {selectedProdForAdjustment.sku}</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Stock disponible: <span className="font-mono text-admin-brand-text font-bold">{selectedProdForAdjustment.stock} uds</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Pérdida monetaria</span>
                  <p className="font-mono font-semibold text-rose-600 dark:text-rose-400 text-sm">
                    {CURRENCY_SYMBOL} {(selectedProdForAdjustment.costPrice * (parseInt(adjustmentQuantity, 10) || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Cantidad y Causa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary">
                  Unidades a dar de baja *
                </label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProdForAdjustment?.stock || 9999}
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  className="h-10 text-xs rounded-lg font-bold font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary">
                  Causa / Justificación *
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) =>
                    setAdjustmentReason(
                      e.target.value as "damaged" | "defective" | "expired" | "loss_theft" | "supplier_return" | "internal_use"
                    )
                  }
                  className="w-full h-10 px-3 text-xs rounded-lg border border-admin-card-border bg-admin-card-bg text-admin-text font-bold cursor-pointer"
                >
                  <option value="damaged">Rotura física / Daño en bodega</option>
                  <option value="defective">Falla de fábrica (Garantía)</option>
                  <option value="expired">Vencimiento / Caducado</option>
                  <option value="loss_theft">Faltante o merma desconocida</option>
                  <option value="supplier_return">Devolución a proveedor (RMA)</option>
                  <option value="internal_use">Uso interno / Exhibición</option>
                </select>
              </div>
            </div>

            {/* 3. Observaciones / Detalle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Descripción del incidente *
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Auricular con caja rota por caída; no enciende al probarlo..."
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-admin-card-border bg-admin-card-bg text-admin-text placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t border-admin-card-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="rounded-lg h-9 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingAdjustment || !adjustmentProductId}
                className="rounded-lg h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAdjustment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Asentando en Kárdex...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    <span>Confirmar Baja & Asentar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
