"use client";

import { CatalogImportDialog } from "@/components/admin/catalog-import-dialog";

import { MetricCard } from "@/components/admin/metric-card";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import {
  ProductDetailSheet,
  type InventoryProductDetail,
} from "@/components/admin/product-detail-sheet";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getInventoryProducts,
  getInventoryFormData,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  getProductKardexAction,
  getInventoryAdjustmentsAction,
  createInventoryAdjustmentAction,
  toggleProductActiveAction,
} from "@/app/admin/actions/products";
import { uploadCategoryPhotoAction } from "@/app/admin/actions/upload";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import { csvCell } from "@/lib/sanitize";
import { CURRENCY_SYMBOL, CURRENCY_NAME, formatCurrency, formatCurrencyLocale } from "@/lib/currency";
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
  DialogTrigger,
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
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Boxes,
  CheckCircle2,
  ArrowUpRight,
  BookOpen,
  FileSpreadsheet,
  ShieldAlert,
  ArrowDownRight,
  User,
  X,
  ExternalLink,
  Barcode,
  History,
  ArrowRight,
  Printer,
  Sparkles,
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

type Product = InventoryProductDetail;

interface KardexMovement {
  id: number;
  date: string;
  product: string;
  sku: string;
  type: string;
  typeLabel: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  reference: string;
  user: string;
  reason?: string;
}

interface AdjustmentItem {
  id: number;
  adjustmentNumber: string;
  date: string;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  reason: string;
  reasonLabel: string;
  totalLoss: number;
  reportedBy: string;
  authorizedBy: string;
  notes: string;
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
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados de Kárdex en vivo desde PostgreSQL
  const [realKardexMovements, setRealKardexMovements] = useState<KardexMovement[]>([]);
  const [productDrawerMovements, setProductDrawerMovements] = useState<KardexMovement[]>([]);
  const [loadingDrawerKardex, setLoadingDrawerKardex] = useState(false);
  const [loadingTabKardex, setLoadingTabKardex] = useState(false);

  // Estados de Bajas & Mermas en vivo desde PostgreSQL
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  // Estados del Modal de Baja / Merma
  const [adjustmentProductId, setAdjustmentProductId] = useState<number | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<string>("1");
  const [adjustmentReason, setAdjustmentReason] = useState<
    "damaged" | "defective" | "expired" | "loss_theft" | "supplier_return" | "internal_use"
  >("damaged");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentRequestId, setAdjustmentRequestId] = useState<string | null>(null);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Estados de Paginación en las 3 vistas (10 ítems por página exactos)
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 10;

  const [kardexPage, setKardexPage] = useState(1);
  const kardexPageSize = 10;

  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const adjustmentsPageSize = 10;

  const [catalogImportOpen, setCatalogImportOpen] = useState(false);

  const applyInitialInventory = (
    dbProducts: Product[],
    formData: Awaited<ReturnType<typeof getInventoryFormData>>,
    adjRes: Awaited<ReturnType<typeof getInventoryAdjustmentsAction>>
  ) => {
    setLoadError(null);
    setProducts(dbProducts || []);
    setDbCategories(formData?.categories || []);
    const uniqueNames = Array.from(
      new Set(["Sin categoría", ...(formData?.categories || []).map((c) => c.name)])
    );
    setCategoriesList(uniqueNames);
    if (adjRes?.success && adjRes.data) {
      setAdjustments(adjRes.data as unknown as AdjustmentItem[]);
    }
  };

  const reloadInitialInventory = async () => {
    setShowSkeleton(true);
    setLoadError(null);
    try {
      const [dbProducts, formData, adjRes] = await Promise.all([
        getInventoryProducts(),
        getInventoryFormData(),
        getInventoryAdjustmentsAction(),
      ]);
      applyInitialInventory(dbProducts, formData, adjRes);
    } catch {
      const message = "No se pudo cargar el inventario desde el servidor.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setShowSkeleton(false);
    }
  };

  // Cargar productos, categorías y bajas vivos desde Neon DB
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getInventoryProducts(),
      getInventoryFormData(),
      getInventoryAdjustmentsAction(),
    ])
      .then(([dbProducts, formData, adjRes]) => {
        if (!cancelled) applyInitialInventory(dbProducts, formData, adjRes);
      })
      .catch(() => {
        if (!cancelled) {
          const message = "No se pudo cargar el inventario desde el servidor.";
          setLoadError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setShowSkeleton(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar movimientos de Kárdex reales desde PostgreSQL para el Drawer de producto
  useEffect(() => {
    if (!selectedProductForKardex) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoadingDrawerKardex(true);
        return getProductKardexAction(selectedProductForKardex.id);
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setProductDrawerMovements(res.data as unknown as KardexMovement[]);
        } else {
          setProductDrawerMovements([]);
          toast.error(res.error || "No se pudo cargar el Kárdex del producto.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProductDrawerMovements([]);
          toast.error("Error de conexión al cargar Kárdex.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDrawerKardex(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProductForKardex]);

  // Cargar movimientos de Kárdex reales para la pestaña de Libro Mayor General
  useEffect(() => {
    if (activeTab !== "kardex") return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoadingTabKardex(true);
        return getProductKardexAction();
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setRealKardexMovements(res.data as unknown as KardexMovement[]);
        } else {
          toast.error(res.error || "No se pudo cargar el libro mayor de Kárdex.");
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Error de conexión al cargar el Kárdex general.");
      })
      .finally(() => {
        if (!cancelled) setLoadingTabKardex(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Cargar bajas y mermas para la pestaña correspondiente
  useEffect(() => {
    if (activeTab !== "adjustments") return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoadingAdjustments(true);
        return getInventoryAdjustmentsAction();
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setAdjustments(res.data as unknown as AdjustmentItem[]);
        } else {
          toast.error(res.error || "No se pudieron cargar las actas de baja.");
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Error de conexión al cargar actas de baja.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAdjustments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

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
    setAdjustmentRequestId(crypto.randomUUID());
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

    const requestIdToSend = adjustmentRequestId || crypto.randomUUID();
    if (!adjustmentRequestId) setAdjustmentRequestId(requestIdToSend);

    try {
      setIsSubmittingAdjustment(true);
      const res = await createInventoryAdjustmentAction({
        productId: adjustmentProductId,
        quantity: qtyNum,
        reason: adjustmentReason,
        notes: adjustmentNotes,
        requestId: requestIdToSend,
      });

      if (res.success) {
        toast.success("Baja asentada en Kárdex", {
          description: `Se descontaron ${qtyNum} uds de "${prod?.name || "producto"}".`,
        });
        setAdjustmentRequestId(null);
        setIsAdjustmentModalOpen(false);
        setAdjustmentProductId(null);
        setAdjustmentQuantity("1");
        setAdjustmentNotes("");

        const [updatedProds, updatedKardex, updatedAdj] = await Promise.all([
          getInventoryProducts(),
          getProductKardexAction(),
          getInventoryAdjustmentsAction(),
        ]);
        setProducts(updatedProds || []);
        if (updatedKardex.success && updatedKardex.data) {
          setRealKardexMovements(updatedKardex.data as unknown as KardexMovement[]);
        }
        if (updatedAdj.success && updatedAdj.data) {
          setAdjustments(updatedAdj.data as unknown as AdjustmentItem[]);
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
  const totalCatalogPages = Math.ceil(filteredProducts.length / catalogPageSize) || 1;
  const paginatedProducts = filteredProducts.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize
  );

  // Filtrado de kárdex
  const activeKardexSource = realKardexMovements;
  const filteredKardex = activeKardexSource.filter((m) => {
    if (kardexFilterType === "in") return m.type === "purchase_in" || m.type === "return_in" || m.type === "adjustment_in";
    if (kardexFilterType === "out") return m.type === "sale_out" || m.type === "adjustment_out";
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
  const activeAdjustmentsSource = adjustments;
  const totalAdjustmentsPages = Math.ceil(activeAdjustmentsSource.length / adjustmentsPageSize) || 1;
  const paginatedAdjustments = activeAdjustmentsSource.slice(
    (adjustmentsPage - 1) * adjustmentsPageSize,
    adjustmentsPage * adjustmentsPageSize
  );

  // Movimientos de kárdex para el Drawer de producto específico
  const productSpecificKardex = selectedProductForKardex ? productDrawerMovements : [];

  const handleExportAuditCsv = () => {
    if (!selectedProductForKardex) return;
    const rows = [
      [
        "Fecha",
        "Producto",
        "SKU",
        "Tipo",
        "Variacion",
        "Stock Anterior",
        "Stock Nuevo",
        "Costo Unitario (Bs)",
        "Comprobante",
        "Responsable",
        "Motivo",
      ],
      ...productSpecificKardex.map((item) => [
        item.date,
        item.product,
        item.sku,
        item.typeLabel,
        item.quantity,
        item.previousStock,
        item.newStock,
        item.unitCost.toFixed(2),
        item.reference,
        item.user,
        item.reason || "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => csvCell(cell)).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kardex_${selectedProductForKardex.sku || selectedProductForKardex.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Ficha de Auditoría exportada", {
      description: "Se descargó el archivo CSV con el historial de Kárdex del producto.",
    });
  };

  if (showSkeleton) {
    return <InventarioLoading />;
  }

  if (loadError) {
    return (
      <div className="admin-panel p-8 max-w-xl mx-auto mt-10 text-center space-y-4">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-admin-text">No se pudo cargar el inventario</h2>
          <p className="text-xs text-admin-muted">{loadError}</p>
        </div>
        <Button onClick={reloadInitialInventory} className="h-9 px-4 rounded-xl bg-admin-brand text-admin-on-solid text-xs font-bold gap-2 cursor-pointer">
          <RotateCcw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* =========================================================================
          1. HEADER DEL MÓDULO (ESTILO BENTO / QUIXOTIC)
          ========================================================================= */}
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="admin-page-title">Inventario y Kárdex</h1>
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

          <Link href="/admin/inventario/nuevo">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-semibold gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nuevo Producto</span>
            </Button>
          </Link>
        </div>
      </div>

      {catalogImportOpen && (
        <CatalogImportDialog
          onClose={() => setCatalogImportOpen(false)}
          onImported={async () => setProducts(await getInventoryProducts())}
        />
      )}

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI DE INVENTARIO BENTO
          ========================================================================= */}
      <section className="admin-metrics" aria-label="Indicadores de inventario">
        <MetricCard
          label="Valor en bodega"
          value={formatCurrencyLocale(products.reduce((sum, p) => sum + p.stock * p.costPrice, 0))}
          detail="Costo de reposición"
          icon={DollarSign}
        />
        <MetricCard
          label="Unidades físicas"
          value={products.reduce((sum, p) => sum + p.stock, 0)}
          detail={`${categoriesList.filter((c) => c !== "Sin categoría").length} categorías activas`}
          icon={Boxes}
        />
        <MetricCard
          label="Stock crítico"
          value={products.filter((p) => p.stock <= p.minStock).length}
          detail="Productos en el mínimo o por debajo"
          icon={AlertTriangle}
          tone="warning"
        />
        <MetricCard
          label="Mermas del mes"
          value={formatCurrencyLocale(activeAdjustmentsSource.reduce((sum, a) => sum + a.totalLoss, 0))}
          detail={`${activeAdjustmentsSource.length} actas de baja`}
          icon={ShieldAlert}
          tone="danger"
        />
      </section>

      {/* =========================================================================
          3. SELECTOR DE PESTAÑAS (SEGMENTED CONTROL MODERNO)
          ========================================================================= */}
      <div className="admin-segments">
        <button
          onClick={() => setActiveTab("catalog")}
          aria-pressed={activeTab === "catalog"}
          className="admin-segment"
        >
          <Package className="h-4 w-4" />
          <span>Stock & Catálogo</span>
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
          <ShieldAlert className="h-4 w-4 text-rose-500" />
          <span>Bajas & Mermas</span>
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
                  placeholder="Buscar por nombre, variante, SKU, código de barras o categoría..."
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-admin-card-border bg-admin-raised text-admin-muted font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Producto</th>
                    <th className="py-3.5 px-5 text-right">Precio</th>
                    <th className="py-3.5 px-5 text-center">Stock</th>
                    <th className="py-3.5 px-5 text-center">Disponibilidad</th>
                    <th className="py-3.5 px-5 text-center">Estado</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-admin-secondary">
                            No se encontraron productos
                          </p>
                          <p className="text-xs text-slate-400">
                            Prueba cambiando el término de búsqueda o limpiando los filtros aplicados.
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
                                <p className="font-bold text-sm text-admin-text leading-snug line-clamp-1">
                                  {p.name}
                                </p>
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
                                    Ver Información
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
                    No se encontraron productos
                  </p>
                  <p className="text-xs text-slate-400">
                    Prueba cambiando el término de búsqueda o limpiando los filtros aplicados.
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
                                    Ver Información
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
        /* PESTAÑA 2: KÁRDEX AUDITORÍA GENERAL (LIBRO MAYOR) */
        <div className="admin-panel overflow-hidden">
          {/* Header de la auditoría */}
          <div className="p-4 border-b border-admin-card-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-admin-text">
                  Libro Mayor de Inventario (Kárdex General)
                </h3>
                <Badge className="bg-admin-raised text-admin-secondary font-mono text-[10px]">
                  Método Oficial: Costo Promedio Ponderado (CPP)
                </Badge>
              </div>
              <p className="text-xs text-admin-muted mt-0.5">
                Registro inmutable de entradas por compras, salidas por ventas (POS/Web) y actas de merma.
              </p>
            </div>

            {/* Filtros por tipo de movimiento */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={kardexFilterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setKardexFilterType("all");
                  setKardexPage(1);
                }}
                className={cn(
                  "rounded-xl text-xs font-bold h-8 cursor-pointer",
                  kardexFilterType === "all" ? "bg-admin-brand text-white hover:bg-admin-brand-hover" : ""
                )}
              >
                Todos ({activeKardexSource.length})
              </Button>
              <Button
                variant={kardexFilterType === "in" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setKardexFilterType("in");
                  setKardexPage(1);
                }}
                className={cn(
                  "rounded-xl text-xs font-bold h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer",
                  kardexFilterType === "in" ? "bg-emerald-600 text-white border-emerald-600" : ""
                )}
              >
                + Entradas (Compras)
              </Button>
              <Button
                variant={kardexFilterType === "out" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setKardexFilterType("out");
                  setKardexPage(1);
                }}
                className={cn(
                  "rounded-xl text-xs font-bold h-8 text-admin-brand-text border-admin-brand-light hover:bg-admin-brand-subtle cursor-pointer",
                  kardexFilterType === "out" ? "bg-admin-brand text-white border-admin-brand hover:bg-admin-brand-hover" : ""
                )}
              >
                - Salidas (Ventas)
              </Button>
              <Button
                variant={kardexFilterType === "damaged" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setKardexFilterType("damaged");
                  setKardexPage(1);
                }}
                className={cn(
                  "rounded-xl text-xs font-bold h-8 text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer",
                  kardexFilterType === "damaged" ? "bg-rose-600 text-white border-rose-600" : ""
                )}
              >
                - Bajas (Mermas)
              </Button>
            </div>
          </div>

          {/* Tabla de Kárdex */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-admin-card-border bg-admin-raised text-admin-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Producto Afectado</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4 text-center">Variación</th>
                  <th className="py-3 px-4 text-center">Saldo Físico (Ant ➜ Nuevo)</th>
                  <th className="py-3 px-4 text-right">Costo Unitario</th>
                  <th className="py-3 px-4">Comprobante de Respaldo</th>
                  <th className="py-3 px-4">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                {paginatedKardex.map((m) => (
                  <tr key={m.id} className="hover:bg-admin-raised transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-admin-muted">
                      {m.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-admin-text">{m.product}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.sku}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            m.type === "purchase_in"
                              ? "bg-emerald-500"
                              : m.type === "sale_out"
                              ? "bg-admin-brand"
                              : m.typeLabel.includes("Anulación")
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          )}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.typeLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-lg font-mono text-xs",
                          m.quantity > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : m.type === "damaged_out"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        )}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-slate-400">{m.previousStock}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">➜</span>
                      <span className="font-semibold text-admin-text">{m.newStock} uds</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {CURRENCY_SYMBOL} {m.unitCost.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {m.reference}
                      </span>
                      {m.reason && (
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs truncate" title={m.reason}>
                          {m.reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[11px] text-admin-secondary">
                      {m.user}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación Libro Mayor de Kárdex con Cuadritos Web */}
          <PaginationBar
            currentPage={kardexPage}
            totalPages={totalKardexPages}
            totalItems={filteredKardex.length}
            pageSize={kardexPageSize}
            itemName="movimientos"
            onPageChange={setKardexPage}
          />
        </div>
      ) : (
        /* PESTAÑA 3: BAJAS & MERMAS POR DAÑO */
        <div className="admin-panel overflow-hidden">
          <div className="p-4 border-b border-admin-card-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-admin-text">
                  Actas de Baja & Pérdidas por Merma
                </h3>
                <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                  Auditoría Financiera
                </Badge>
              </div>
              <p className="text-xs text-admin-muted mt-0.5">
                Control estricto de productos quebrados, averiados o defectuosos autorizados por supervisión.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setAdjustmentProductId(products[0]?.id || null);
                setAdjustmentQuantity("1");
                setAdjustmentReason("damaged");
                setAdjustmentNotes("");
                setAdjustmentRequestId(crypto.randomUUID());
                setIsAdjustmentModalOpen(true);
              }}
              className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Nueva Baja</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-admin-card-border bg-admin-raised text-admin-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Folio de Acta</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Producto Afectado</th>
                  <th className="py-3 px-4">Causa / Justificación</th>
                  <th className="py-3 px-4 text-center">Unidades</th>
                  <th className="py-3 px-4 text-right">Pérdida Monetaria</th>
                  <th className="py-3 px-4">Reportado Por</th>
                  <th className="py-3 px-4">Autorizado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-card-border text-admin-secondary">
                {paginatedAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-admin-raised transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {a.adjustmentNumber}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-admin-muted font-mono">
                      {a.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-admin-text">{a.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{a.sku}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                        {a.reasonLabel}
                      </Badge>
                      <p className="text-[10px] text-admin-muted mt-0.5">{a.notes}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-mono">
                        {a.quantity} ud
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 text-sm">
                      {CURRENCY_SYMBOL} {a.totalLoss.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-admin-secondary">
                      {a.reportedBy}
                    </td>
                    <td className="py-3.5 px-4 text-admin-brand-text font-semibold">
                      ✓ {a.authorizedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación Bajas & Mermas con Cuadritos Web */}
          <PaginationBar
            currentPage={adjustmentsPage}
            totalPages={totalAdjustmentsPages}
            totalItems={activeAdjustmentsSource.length}
            pageSize={adjustmentsPageSize}
            itemName="actas de baja"
            onPageChange={setAdjustmentsPage}
          />
        </div>
      )}

      {/* =========================================================================
          5. DRAWER LATERAL DE DETALLES E INFORMACIÓN DEL PRODUCTO (SOLO LECTURA)
          Se activa al hacer clic en cualquier fila de la lista o tarjeta de cuadros
          ========================================================================= */}
      <ProductDetailSheet
        product={selectedProductForDetails}
        onClose={() => setSelectedProductForDetails(null)}
        onOpenKardex={(prod) => {
          setSelectedProductForDetails(null);
          setSelectedProductForKardex(prod);
        }}
        onOpenAdjustment={(prod) => {
          setSelectedProductForDetails(null);
          handleOpenAdjustmentForProduct(prod);
        }}
      />

      {/* =========================================================================
          6. DRAWER LATERAL DE KÁRDEX ESPECÍFICO POR PRODUCTO (DRILL-DOWN)
          Se activa al pulsar "Ver Kárdex" en cualquier fila del catálogo
          ========================================================================= */}
      {selectedProductForKardex && (
        <div
          onClick={() => setSelectedProductForKardex(null)}
          className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-admin-card-bg border-l border-admin-card-border h-full flex flex-col justify-between animate-in slide-in-from-right duration-300 cursor-default"
          >
            {/* Header del Drawer */}
            <div className="p-5 border-b border-admin-card-border flex items-center justify-between bg-admin-raised">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-admin-brand text-white flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-admin-text">
                      Kárdex de Producto
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    SKU: {selectedProductForKardex.sku} • EAN: {selectedProductForKardex.barcode}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProductForKardex(null)}
                className="h-9 w-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Tarjeta Resumen del Producto */}
              <div className="p-4 rounded-xl bg-admin-raised border border-admin-card-border flex items-center gap-4">
                <ProductThumbnail
                  src={selectedProductForKardex.image}
                  alt={selectedProductForKardex.name}
                  className="h-16 w-16 rounded-xl object-cover border border-admin-card-border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-admin-text truncate">
                    {selectedProductForKardex.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">Categoría:</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {selectedProductForKardex.category}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-admin-card-border text-center">
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-slate-400">Stock Actual</span>
                      <span className="font-semibold text-sm text-admin-text">
                        {selectedProductForKardex.stock} uds
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-slate-400">Costo Adquisición</span>
                      <span className="font-semibold text-sm text-admin-secondary font-mono">
                        {CURRENCY_SYMBOL} {selectedProductForKardex.costPrice.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-slate-400">Precio Venta</span>
                      <span className="font-semibold text-sm text-emerald-600 font-mono">
                        {CURRENCY_SYMBOL} {selectedProductForKardex.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de Movimientos de este Producto */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Historial Cronológico de Movimientos
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {productSpecificKardex.length} registros encontrados
                  </span>
                </div>

                {loadingDrawerKardex ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-admin-card-border">
                    <Loader2 className="h-6 w-6 text-admin-brand-text animate-spin" />
                    <span className="text-xs text-slate-500 font-bold">Cargando movimientos...</span>
                  </div>
                ) : productSpecificKardex.length > 0 ? (
                  <div className="space-y-3">
                    {productSpecificKardex.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 admin-panel space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-slate-500">{item.date}</span>
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                item.type === "purchase_in" || item.typeLabel.includes("Apertura")
                                  ? "bg-emerald-500"
                                  : item.type === "sale_out"
                                  ? "bg-admin-brand"
                                  : item.typeLabel.includes("Anulación")
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                            />
                            <span
                              className={cn(
                                item.type === "purchase_in" || item.typeLabel.includes("Apertura")
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : item.type === "sale_out"
                                  ? "text-admin-brand-text"
                                  : item.typeLabel.includes("Anulación")
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-rose-700 dark:text-rose-300"
                              )}
                            >
                              {item.typeLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-xs text-slate-400">Comprobante:</span>
                            <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {item.reference}
                            </p>
                          </div>

                          <div className="text-center">
                            <span className="text-xs text-slate-400">Variación:</span>
                            <p
                              className={cn(
                                "font-mono font-semibold text-xs",
                                item.quantity > 0 ? "text-emerald-600" : "text-admin-text"
                              )}
                            >
                              {item.quantity > 0 ? `+${item.quantity}` : item.quantity} uds
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-slate-400">Saldo Resultante:</span>
                            <p className="font-mono font-semibold text-xs text-admin-brand-text">
                              {item.newStock} uds
                            </p>
                          </div>
                        </div>

                        {item.reason && (
                          <p className="text-[10px] text-admin-muted bg-admin-raised p-2 rounded-xl border border-admin-card-border leading-relaxed">
                            {item.reason}
                          </p>
                        )}

                        <div className="pt-2 border-t border-admin-card-border flex items-center justify-between text-[11px] text-slate-400">
                          <span>Operador: {item.user}</span>
                          <span>Costo Unit: {CURRENCY_SYMBOL} {item.unitCost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl border border-dashed border-admin-card-border text-slate-400 text-xs">
                    No se registran movimientos recientes de kárdex para este ítem.
                  </div>
                )}
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-admin-card-border bg-admin-raised flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductForKardex(null)}
                className="rounded-xl h-10 text-xs font-bold"
              >
                Cerrar Kárdex
              </Button>

              <Button
                size="sm"
                className="rounded-xl h-10 text-xs font-bold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-2 cursor-pointer"
                onClick={handleExportAuditCsv}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Exportar Ficha de Auditoría</span>
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    ¿Eliminar la categoría &ldquo;{categoryToDelete}&rdquo;?
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-tight">
                    Sus {products.filter((p) => p.category === categoryToDelete).length} producto(s) <strong>no se borrarán</strong>; pasarán automáticamente a <strong>&ldquo;Sin categoría&rdquo;</strong> para mantener intacto tu Kárdex contable.
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
                  Registrar Acta de Baja & Merma
                </DialogTitle>
                <DialogDescription className="text-xs text-admin-muted">
                  Descuenta existencias físicas y asienta la salida por daño en el Kárdex contable.
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
                Detalle del Incidente / Acta *
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

            {/* Alerta de Auditoría Contable */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-[11px] text-rose-800 dark:text-rose-300 leading-tight">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Esta acción generará un asiento formal <strong>inmutable</strong> en el Kárdex (tipo <code>damaged_out</code>) y restará el stock inmediatamente en la base de datos.
              </span>
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
