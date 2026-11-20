"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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

// =========================================================================
// MOCK DATA DE PRODUCTOS
// =========================================================================
interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  image: string;
  isActive?: boolean;
  description?: string | null;
}

const initialProducts: Product[] = [
  {
    id: 1,
    name: "GadgetHub Watch X1 Pro",
    sku: "WAT-X1-PRO",
    barcode: "750100234501",
    category: "Smartwatches",
    price: 199.99,
    costPrice: 95.0,
    stock: 3,
    minStock: 8,
    status: "low_stock",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    barcode: "750100234502",
    category: "Audio",
    price: 129.9,
    costPrice: 55.0,
    stock: 24,
    minStock: 6,
    status: "in_stock",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Teclado Mecánico RGB Wireless",
    sku: "KEY-RGB-WL",
    barcode: "750100234503",
    category: "Gaming",
    price: 89.0,
    costPrice: 38.0,
    stock: 2,
    minStock: 10,
    status: "low_stock",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Base de Carga Rápida Qi 3 en 1",
    sku: "CHG-QI-03",
    barcode: "750100234504",
    category: "Accesorios",
    price: 49.99,
    costPrice: 19.0,
    stock: 0,
    minStock: 12,
    status: "out_of_stock",
    image: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    name: "Cámara Ultra 4K Creator Kit",
    sku: "CAM-4K-KIT",
    barcode: "750100234505",
    category: "Video",
    price: 349.0,
    costPrice: 180.0,
    stock: 15,
    minStock: 4,
    status: "in_stock",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=150&auto=format&fit=crop&q=80",
  },
];

// =========================================================================
// MOCK DATA DE KÁRDEX (LIBRO MAYOR INMUTABLE)
// =========================================================================
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

const kardexMovements: KardexMovement[] = [
  {
    id: 501,
    date: "Hoy, 11:20 AM",
    product: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    type: "sale_out",
    typeLabel: "Venta en Mostrador (POS)",
    quantity: -1,
    previousStock: 25,
    newStock: 24,
    unitCost: 55.0,
    reference: "Ticket VTA-2026-1001",
    user: "Sofía Cajera",
  },
  {
    id: 502,
    date: "Hoy, 09:45 AM",
    product: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    type: "damaged_out",
    typeLabel: "Baja por Daño Físico",
    quantity: -1,
    previousStock: 26,
    newStock: 25,
    unitCost: 55.0,
    reference: "Acta BAJA-2026-001",
    user: "Lucas Almacenero",
  },
  {
    id: 503,
    date: "Ayer, 04:30 PM",
    product: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    type: "purchase_in",
    typeLabel: "Recepción de Compra",
    quantity: 20,
    previousStock: 6,
    newStock: 26,
    unitCost: 55.0,
    reference: "Factura COM-2026-081",
    user: "Lucas Almacenero",
  },
  {
    id: 504,
    date: "Ayer, 02:15 PM",
    product: "Teclado Mecánico RGB Wireless",
    sku: "KEY-RGB-WL",
    type: "sale_out",
    typeLabel: "Venta en Mostrador (POS)",
    quantity: -2,
    previousStock: 4,
    newStock: 2,
    unitCost: 38.0,
    reference: "Ticket VTA-2026-0998",
    user: "Sofía Cajera",
  },
  {
    id: 505,
    date: "28 Oct, 10:00 AM",
    product: "GadgetHub Watch X1 Pro",
    sku: "WAT-X1-PRO",
    type: "sale_out",
    typeLabel: "Venta Tienda Online",
    quantity: -1,
    previousStock: 4,
    newStock: 3,
    unitCost: 95.0,
    reference: "Orden WEB-2026-442",
    user: "Sistema E-commerce",
  },
];

// =========================================================================
// MODELO Y DATOS DE BAJAS / MERMAS
// =========================================================================
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

const initialAdjustments: AdjustmentItem[] = [
  {
    id: 301,
    adjustmentNumber: "BAJA-2026-001",
    date: "Hoy, 09:45 AM",
    productId: 2,
    productName: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    quantity: 1,
    reason: "damaged",
    reasonLabel: "Rotura física en transporte",
    totalLoss: 55.0,
    reportedBy: "Lucas Almacenero",
    authorizedBy: "Martín Supervisor",
    notes: "Auricular izquierdo quebrado por golpe en descarga de camión",
  },
  {
    id: 300,
    adjustmentNumber: "BAJA-2026-000",
    date: "26 Oct, 03:00 PM",
    productId: 4,
    productName: "Base de Carga Rápida Qi 3 en 1",
    sku: "CHG-QI-03",
    quantity: 1,
    reason: "defective",
    reasonLabel: "Defecto de fábrica (No enciende)",
    totalLoss: 19.0,
    reportedBy: "Sofía Cajera",
    authorizedBy: "Administrador General",
    notes: "Cliente reportó falla al abrir caja; derivado a reclamo de garantía con proveedor",
  },
];

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
    <div className="p-3.5 px-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="font-medium">
        Mostrando <span className="font-bold text-slate-900 dark:text-white">{from}</span> a{" "}
        <span className="font-bold text-slate-900 dark:text-white">{to}</span> de{" "}
        <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Botón Cuadrito Anterior */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Página anterior"
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
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
                "h-8 w-8 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all shadow-2xs",
                currentPage === item
                  ? "bg-[var(--admin-brand)] text-white border border-[var(--admin-brand)] shadow-sm shadow-[var(--admin-brand)]/30 scale-105"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
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
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string; imageUrl?: string | null }[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([
    "Sin categoría",
    "Smartwatches",
    "Audio",
    "Gaming",
    "Accesorios",
    "Video",
  ]);
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProductForKardex, setSelectedProductForKardex] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

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
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Estados de Paginación en las 3 vistas (10 ítems por página exactos)
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 10;

  const [kardexPage, setKardexPage] = useState(1);
  const kardexPageSize = 10;

  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const adjustmentsPageSize = 10;

  // Estados del formulario nuevo producto
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("59.90");
  const [newProductCost, setNewProductCost] = useState("32.00");
  const [newProductStock, setNewProductStock] = useState("35");
  const [newProductMinStock, setNewProductMinStock] = useState("8");

  // Cálculo de margen bruto en vivo
  const priceNum = parseFloat(newProductPrice) || 0;
  const costNum = parseFloat(newProductCost) || 0;
  const marginGross = priceNum > 0 ? (((priceNum - costNum) / priceNum) * 100).toFixed(1) : "0.0";

  // Cargar productos, categorías y bajas vivos desde Neon DB
  useEffect(() => {
    Promise.all([
      getInventoryProducts(),
      getInventoryFormData(),
      getInventoryAdjustmentsAction(),
    ]).then(([dbProducts, formData, adjRes]) => {
      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts);
      }
      if (formData && formData.categories && formData.categories.length > 0) {
        setDbCategories(formData.categories);
        const uniqueNames = Array.from(
          new Set(["Sin categoría", ...formData.categories.map((c) => c.name)])
        );
        setCategoriesList(uniqueNames);
      }
      if (adjRes && adjRes.success && adjRes.data && adjRes.data.length > 0) {
        setAdjustments(adjRes.data as unknown as AdjustmentItem[]);
      }
    });
  }, []);

  // Cargar movimientos de Kárdex reales desde PostgreSQL para el Drawer de producto
  useEffect(() => {
    if (selectedProductForKardex) {
      setLoadingDrawerKardex(true);
      getProductKardexAction(selectedProductForKardex.id).then((res) => {
        if (res.success && res.data) {
          setProductDrawerMovements(res.data as unknown as KardexMovement[]);
        } else {
          setProductDrawerMovements([]);
        }
        setLoadingDrawerKardex(false);
      });
    } else {
      setProductDrawerMovements([]);
    }
  }, [selectedProductForKardex]);

  // Cargar movimientos de Kárdex reales para la pestaña de Libro Mayor General
  useEffect(() => {
    if (activeTab === "kardex") {
      setLoadingTabKardex(true);
      getProductKardexAction().then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setRealKardexMovements(res.data as unknown as KardexMovement[]);
        }
        setLoadingTabKardex(false);
      });
    }
  }, [activeTab]);

  // Cargar bajas y mermas para la pestaña correspondiente
  useEffect(() => {
    if (activeTab === "adjustments") {
      setLoadingAdjustments(true);
      getInventoryAdjustmentsAction().then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setAdjustments(res.data as unknown as AdjustmentItem[]);
        }
        setLoadingAdjustments(false);
      });
    }
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
        if (updatedProds && updatedProds.length > 0) setProducts(updatedProds);
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
  const activeKardexSource = realKardexMovements.length > 0 ? realKardexMovements : kardexMovements;
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
  const activeAdjustmentsSource = adjustments.length > 0 ? adjustments : initialAdjustments;
  const totalAdjustmentsPages = Math.ceil(activeAdjustmentsSource.length / adjustmentsPageSize) || 1;
  const paginatedAdjustments = activeAdjustmentsSource.slice(
    (adjustmentsPage - 1) * adjustmentsPageSize,
    adjustmentsPage * adjustmentsPageSize
  );

  // Movimientos de kárdex para el Drawer de producto específico
  const productSpecificKardex = productDrawerMovements;

  if (showSkeleton) {
    return <InventarioLoading />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* =========================================================================
          1. HEADER DEL MÓDULO (ESTILO BENTO / QUIXOTIC)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Inventario & Kárdex
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Existencias físicas, auditoría contable y control de mermas
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
          >
            <FolderTree className="h-4 w-4 text-[var(--admin-brand)]" />
            <span>Categorías</span>
          </Button>

          <Link href="/admin/inventario/nuevo">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white text-xs font-black gap-2 shadow-md shadow-[var(--admin-brand)]/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nuevo Producto</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI DE INVENTARIO BENTO
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VALORIZACIÓN TOTAL */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Valor en Bodega</span>
            <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
            {CURRENCY_SYMBOL}{" "}
            {products
              .reduce((acc, p) => acc + p.stock * p.costPrice, 0)
              .toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-emerald-600 font-bold mt-1 block">
            Costo de reposición
          </span>
        </div>

        {/* KPI 2: TOTAL EXISTENCIAS */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Unidades Físicas</span>
            <div className="h-8 w-8 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-[var(--admin-brand)]">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
            {products.reduce((acc, p) => acc + p.stock, 0)}{" "}
            <span className="text-sm font-bold text-slate-400">uds</span>
          </div>
          <span className="text-xs text-[var(--admin-brand)] font-bold mt-1 block">
            {categoriesList.filter((c) => c !== "Sin categoría").length} categorías activas
          </span>
        </div>

        {/* KPI 3: ALERTA STOCK CRÍTICO */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Stock Crítico</span>
            <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 tracking-tight mt-3">
            {products.filter((p) => p.stock <= p.minStock).length}{" "}
            <span className="text-sm font-bold text-amber-600/70">ítems</span>
          </div>
          <span className="text-xs text-amber-600 font-bold mt-1 block">
            Por debajo del umbral mínimo
          </span>
        </div>

        {/* KPI 4: MERMAS & PÉRDIDAS */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mermas del Mes</span>
            <div className="h-8 w-8 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 tracking-tight mt-3">
            {CURRENCY_SYMBOL}{" "}
            {activeAdjustmentsSource
              .reduce((acc, a) => acc + a.totalLoss, 0)
              .toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-rose-600 font-bold mt-1 block">
            {activeAdjustmentsSource.length} actas de baja
          </span>
        </div>
      </section>

      {/* =========================================================================
          3. SELECTOR DE PESTAÑAS (SEGMENTED CONTROL MODERNO)
          ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 w-fit">
        <button
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "catalog"
              ? "bg-white dark:bg-slate-900 text-[var(--admin-brand)] shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Package className="h-4 w-4" />
          <span>Stock & Catálogo</span>
        </button>

        <button
          onClick={() => setActiveTab("kardex")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "kardex"
              ? "bg-white dark:bg-slate-900 text-[var(--admin-brand)] shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>Kárdex</span>
        </button>

        <button
          onClick={() => setActiveTab("adjustments")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "adjustments"
              ? "bg-white dark:bg-slate-900 text-rose-600 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* =========================================================================
              BARRA DE BÚSQUEDA, VISTA Y FILTROS SEGÚN ESPECIFICACIÓN
              ========================================================================= */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            {/* Fila 1: Buscador a la izquierda + Switcher de Vista a la derecha */}
            <div className="flex items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o slug..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCatalogPage(1);
                  }}
                  className="pl-9 h-11 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-900 transition-colors"
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
              <div className="inline-flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="Modo lista"
                  className={cn(
                    "p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center",
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
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
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
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
              <div className="inline-flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    statusFilter === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
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
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
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
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
                  )}
                >
                  Inactivos
                </button>
              </div>

              {/* Segmented control 2: Stock (Todo stock / ⚠️ Bajo (< 10) / ✕ Agotado) */}
              <div className="inline-flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStock("all");
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer",
                    filterStock === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
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
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
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
                      ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold"
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
                className="h-9 px-3.5 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--admin-brand)]/20"
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
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 transition-all cursor-pointer shadow-2xs"
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
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Producto</th>
                    <th className="py-3.5 px-5 text-right">Precio</th>
                    <th className="py-3.5 px-5 text-center">Stock</th>
                    <th className="py-3.5 px-5 text-center">Disponibilidad</th>
                    <th className="py-3.5 px-5 text-center">Estado</th>
                    <th className="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                            "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer",
                            !isProductActive && "opacity-60 bg-slate-50/30 dark:bg-slate-900/40"
                          )}
                        >
                          {/* 1. Producto (Nombre arriba + Categoría debajito) */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                              />
                              <div className="flex flex-col min-w-0">
                                <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-1">
                                  {p.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
                            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm tracking-tight">
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
                                    : "text-slate-900 dark:text-white"
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
                                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-2xs items-center",
                                  isProductActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
                                  isToggling && "opacity-80"
                                )}
                              >
                                <span
                                  className={cn(
                                    "pointer-events-none flex items-center justify-center h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
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
                                    : "text-slate-400 dark:text-slate-500"
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
                                    className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  />
                                }
                              >
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-xl bg-white dark:bg-slate-900 text-xs min-w-[170px]"
                              >
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => setSelectedProductForDetails(p)}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
                                  >
                                    <Package className="h-4 w-4 mr-2 text-slate-500" />
                                    Ver Información
                                  </DropdownMenuItem>
                                  <Link href={`/admin/inventario/${p.id}/editar`}>
                                    <DropdownMenuItem className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                                      <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                      Editar Producto
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuItem
                                    onClick={() => setSelectedProductForKardex(p)}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-[var(--admin-brand)] focus:bg-sky-50 dark:focus:bg-sky-950/60"
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
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                          "rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group relative cursor-pointer select-none",
                          !isProductActive && "opacity-60 bg-slate-50/40 dark:bg-slate-900/40"
                        )}
                      >
                        {/* Contenedor Superior de Imagen a Ancho Completo */}
                        <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Badge Disponibilidad flotante en esquina superior izquierda */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-lg shadow-sm border backdrop-blur-md",
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
                                    className="h-7 w-7 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer transition active:scale-95"
                                  />
                                }
                              >
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-xl bg-white dark:bg-slate-900 text-xs min-w-[175px]"
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
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
                                  >
                                    <Package className="h-4 w-4 mr-2 text-slate-500" />
                                    Ver Información
                                  </DropdownMenuItem>
                                  <Link href={`/admin/inventario/${p.id}/editar`}>
                                    <DropdownMenuItem className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                                      <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                      Editar Producto
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProductForKardex(p);
                                    }}
                                    className="rounded-xl px-2.5 py-2 font-semibold cursor-pointer text-[var(--admin-brand)] focus:bg-sky-50 dark:focus:bg-sky-950/60"
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

                                  <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

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
                                        ? "text-slate-600 dark:text-slate-400"
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
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                              {p.category}
                            </span>
                            <h4
                              title={p.name}
                              className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2 mt-1"
                            >
                              {p.name}
                            </h4>
                          </div>

                          {/* Fila de Precio y Stock (solo cantidad numérica) */}
                          <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-400 font-medium block">Precio</span>
                              <span className="font-bold text-slate-900 dark:text-white font-mono text-base tracking-tight">
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Header de la auditoría */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Libro Mayor de Inventario (Kárdex General)
                </h3>
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                  Método Oficial: Costo Promedio Ponderado (CPP)
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                  kardexFilterType === "all" ? "bg-[var(--admin-brand)] text-white shadow-2xs hover:bg-[var(--admin-brand-hover)]" : ""
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
                  kardexFilterType === "in" ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs" : ""
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
                  "rounded-xl text-xs font-bold h-8 text-[var(--admin-brand)] border-sky-200 hover:bg-sky-50 cursor-pointer",
                  kardexFilterType === "out" ? "bg-[var(--admin-brand)] text-white border-[var(--admin-brand)] shadow-2xs hover:bg-[var(--admin-brand-hover)]" : ""
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
                  kardexFilterType === "damaged" ? "bg-rose-600 text-white border-rose-600 shadow-2xs" : ""
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
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedKardex.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {m.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{m.product}</p>
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
                              ? "bg-[var(--admin-brand)]"
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
                    <td className="py-3.5 px-4 text-center font-black">
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
                      <span className="font-black text-slate-900 dark:text-white">{m.newStock} uds</span>
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
                    <td className="py-3.5 px-4 font-bold text-[11px] text-slate-700 dark:text-slate-300">
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Actas de Baja & Pérdidas por Merma
                </h3>
                <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                  Auditoría Financiera
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                setIsAdjustmentModalOpen(true);
              }}
              className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Nueva Baja</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-rose-600 dark:text-rose-400">
                      {a.adjustmentNumber}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {a.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{a.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{a.sku}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                        {a.reasonLabel}
                      </Badge>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{a.notes}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black">
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-mono">
                        {a.quantity} ud
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                      {CURRENCY_SYMBOL} {a.totalLoss.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {a.reportedBy}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--admin-brand)] font-black">
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
      {selectedProductForDetails && (
        <div
          onClick={() => setSelectedProductForDetails(null)}
          className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg sm:max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col justify-between animate-in slide-in-from-right duration-300 cursor-default"
          >
            {/* Header del Drawer */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--admin-brand)] text-white flex items-center justify-center shadow-sm">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Detalles del Producto
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Ficha informativa y especificaciones
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForDetails(null)}
                className="h-9 w-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Fotografía e Identificación Principal con Formato 4:3 */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/60 shadow-xs">
                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProductForDetails.image}
                    alt={selectedProductForDetails.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-0.5 rounded-lg shadow-sm border backdrop-blur-md",
                        selectedProductForDetails.status === "in_stock"
                          ? "bg-emerald-500/90 text-white border-emerald-400"
                          : selectedProductForDetails.status === "low_stock"
                          ? "bg-amber-500/90 text-white border-amber-400"
                          : "bg-rose-500/90 text-white border-rose-400"
                      )}
                    >
                      {selectedProductForDetails.status === "in_stock"
                        ? "En stock"
                        : selectedProductForDetails.status === "low_stock"
                        ? "Bajo stock"
                        : "Agotado"}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-0.5 rounded-lg shadow-sm border backdrop-blur-md",
                        (selectedProductForDetails.isActive ?? true)
                          ? "bg-[var(--admin-brand)]/90 text-white border-sky-400"
                          : "bg-slate-600/90 text-white border-slate-500"
                      )}
                    >
                      {(selectedProductForDetails.isActive ?? true) ? "Habilitado" : "Pausado"}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <span className="text-xs font-bold text-[var(--admin-brand)] block uppercase tracking-wider">
                    {selectedProductForDetails.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                    {selectedProductForDetails.name}
                  </h3>
                </div>
              </div>

              {/* Bloque de Descripción del Producto */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block px-1">
                  Descripción del Producto
                </span>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedProductForDetails.description && selectedProductForDetails.description.trim() ? (
                    selectedProductForDetails.description
                  ) : (
                    <span className="text-slate-400 italic">Sin descripción registrada para este producto.</span>
                  )}
                </div>
              </div>

              {/* Bloque Financiero y Precios */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block px-1">
                  Valores Financieros
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Precio Venta</span>
                    <span className="text-base font-bold text-emerald-600 font-mono tracking-tight mt-0.5 block">
                      {CURRENCY_SYMBOL} {selectedProductForDetails.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Costo Adquisición</span>
                    <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tight mt-0.5 block">
                      {CURRENCY_SYMBOL} {selectedProductForDetails.costPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Margen Bruto</span>
                    <span className="text-base font-bold text-[var(--admin-brand)] font-mono tracking-tight mt-0.5 block">
                      {selectedProductForDetails.price > 0
                        ? (
                            ((selectedProductForDetails.price - selectedProductForDetails.costPrice) /
                              selectedProductForDetails.price) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque de Existencias Físicas */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block px-1">
                  Existencias en Almacén
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Stock Físico Actual</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {selectedProductForDetails.stock}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Alerta Stock Bajo</span>
                    <span className="text-xl font-bold text-amber-600 font-mono mt-0.5 block">
                      {selectedProductForDetails.minStock}
                    </span>
                  </div>
                </div>

                {/* Valorización en Bodega de este Producto */}
                <div className="p-3.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--admin-brand)] font-bold uppercase tracking-wider block">
                      Valor Total en Bodega (Costo)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {CURRENCY_SYMBOL}{" "}
                      {(
                        selectedProductForDetails.stock * selectedProductForDetails.costPrice
                      ).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--admin-brand)] font-bold uppercase tracking-wider block">
                      Potencial Venta
                    </span>
                    <span className="text-sm font-bold text-emerald-600 font-mono">
                      {CURRENCY_SYMBOL}{" "}
                      {(
                        selectedProductForDetails.stock * selectedProductForDetails.price
                      ).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductForDetails(null)}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prod = selectedProductForDetails;
                    setSelectedProductForDetails(null);
                    setSelectedProductForKardex(prod);
                  }}
                  className="rounded-xl text-xs font-semibold text-[var(--admin-brand)] gap-1.5 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Ver Kárdex</span>
                </Button>

                <Link href={`/admin/inventario/${selectedProductForDetails.id}/editar`}>
                  <Button
                    size="sm"
                    className="rounded-xl text-xs font-semibold bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col justify-between animate-in slide-in-from-right duration-300 cursor-default"
          >
            {/* Header del Drawer */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--admin-brand)] text-white flex items-center justify-center shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
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
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-4">
                <img
                  src={selectedProductForKardex.image}
                  alt={selectedProductForKardex.name}
                  className="h-16 w-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {selectedProductForKardex.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">Categoría:</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {selectedProductForKardex.category}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-slate-400">Stock Actual</span>
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {selectedProductForKardex.stock} uds
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-slate-400">Costo Adquisición</span>
                      <span className="font-black text-sm text-slate-700 dark:text-slate-300 font-mono">
                        {CURRENCY_SYMBOL} {selectedProductForKardex.costPrice.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-mono text-slate-400">Precio Venta</span>
                      <span className="font-black text-sm text-emerald-600 font-mono">
                        {CURRENCY_SYMBOL} {selectedProductForKardex.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de Movimientos de este Producto */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Historial Cronológico de Movimientos
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {productSpecificKardex.length} registros encontrados
                  </span>
                </div>

                {loadingDrawerKardex ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Loader2 className="h-6 w-6 text-[var(--admin-brand)] animate-spin" />
                    <span className="text-xs text-slate-500 font-bold">Cargando movimientos...</span>
                  </div>
                ) : productSpecificKardex.length > 0 ? (
                  <div className="space-y-3">
                    {productSpecificKardex.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2"
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
                                  ? "bg-[var(--admin-brand)]"
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
                                  ? "text-[var(--admin-brand)] dark:text-sky-300"
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
                                "font-mono font-black text-xs",
                                item.quantity > 0 ? "text-emerald-600" : "text-slate-900 dark:text-white"
                              )}
                            >
                              {item.quantity > 0 ? `+${item.quantity}` : item.quantity} uds
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-slate-400">Saldo Resultante:</span>
                            <p className="font-mono font-black text-xs text-[var(--admin-brand)]">
                              {item.newStock} uds
                            </p>
                          </div>
                        </div>

                        {item.reason && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                            {item.reason}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Operador: {item.user}</span>
                          <span>Costo Unit: {CURRENCY_SYMBOL} {item.unitCost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No se registran movimientos recientes de kárdex para este ítem.
                  </div>
                )}
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
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
                className="rounded-xl h-10 text-xs font-bold bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white gap-2 cursor-pointer shadow-md shadow-[var(--admin-brand)]/20"
                onClick={() =>
                  toast.success("Ficha de Auditoría exportada", {
                    description: "El reporte oficial del Kárdex CPP fue generado exitosamente.",
                  })
                }
              >
                <Printer className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
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
              <div className="h-10 w-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-[var(--admin-brand)]">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Gestión de Categorías
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
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
                    className="h-10 w-10 rounded-xl object-cover border-2 border-[var(--admin-brand)] shadow-sm"
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
                  className="h-10 px-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[var(--admin-brand)] hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-slate-500 hover:text-[var(--admin-brand)] flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isUploadingCatImage ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-brand)]" />
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
                className="h-10 px-5 rounded-xl bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white font-black text-xs gap-1.5 shrink-0 cursor-pointer shadow-md shadow-[var(--admin-brand)]/20"
              >
                <Plus className="h-4 w-4" />
                <span>Crear</span>
              </Button>
            </div>
          </form>

          {/* Diálogo de Confirmación para Eliminar Categoría */}
          {categoryToDelete && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5 animate-in fade-in-50 duration-150">
              <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black">
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
                  className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black"
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
                  className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
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
                        className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900 font-bold"
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
                            className="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                            <Tag className="h-4 w-4" />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {cat}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          >
                            {productCount} {productCount === 1 ? "artículo" : "artículos"}
                          </Badge>
                          {catData?.imageUrl && (
                            <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[9px] font-semibold">
                              Web
                            </Badge>
                          )}
                          {isDefault && (
                            <Badge className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold">
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
                            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-600 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            title="Eliminar categoría"
                            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 hover:border-rose-300 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
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

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
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
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Registrar Acta de Baja & Merma
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Descuenta existencias físicas y asienta la salida por daño en el Kárdex contable.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConfirmAdjustment} className="space-y-4 pt-2">
            {/* 1. Selector de Producto Afectado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Producto Afectado *
              </label>
              <select
                value={adjustmentProductId ?? ""}
                onChange={(e) => setAdjustmentProductId(Number(e.target.value) || null)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold cursor-pointer"
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
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-mono">SKU: {selectedProdForAdjustment.sku}</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Stock disponible: <span className="font-mono text-[var(--admin-brand)] font-bold">{selectedProdForAdjustment.stock} uds</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Pérdida monetaria</span>
                  <p className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                    {CURRENCY_SYMBOL} {(selectedProdForAdjustment.costPrice * (parseInt(adjustmentQuantity, 10) || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Cantidad y Causa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Causa / Justificación *
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) =>
                    setAdjustmentReason(
                      e.target.value as "damaged" | "defective" | "expired" | "loss_theft" | "supplier_return" | "internal_use"
                    )
                  }
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold cursor-pointer"
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
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Detalle del Incidente / Acta *
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Auricular con caja rota por caída; no enciende al probarlo..."
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            {/* Alerta de Auditoría Contable */}
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-[11px] text-rose-800 dark:text-rose-300 leading-tight">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Esta acción generará un asiento formal <strong>inmutable</strong> en el Kárdex (tipo <code>damaged_out</code>) y restará el stock inmediatamente en la base de datos.
              </span>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
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
                className="rounded-lg h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-sm cursor-pointer disabled:opacity-50"
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
