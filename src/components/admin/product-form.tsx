"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  UploadCloud,
  Image as ImageIcon,
  Check,
  Sparkles,
  TrendingUp,
  Boxes,
  Store,
  Globe,
  Tag,
  Trash2,
  Plus,
  Camera,
  AlertTriangle,
  X,
  Pencil,
  Loader2,
  Truck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/actions/products";
import { uploadProductImageAction } from "@/app/admin/actions/upload";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import type { ProductFormInput } from "@/lib/validations/product";
import { CURRENCY_SYMBOL, CURRENCY_NAME } from "@/lib/currency";

interface ProductFormProps {
  initialData?: {
    id?: number;
    name?: string;
    description?: string | null;
    mainImage?: string | null;
    additionalImages?: string[];
    price?: string | number;
    costPrice?: string | number;
    categoryId?: number | null;
    brandId?: number | null;
    supplierId?: number | null;
    stock?: number;
    minStock?: number;
    isActive?: boolean;
    isVisibleWeb?: boolean;
    isFeatured?: boolean;
  };
  categories: { id: number; name: string }[];
  brands?: { id: number; name: string }[];
  suppliers: { id: number; name: string }[];
  isEdit?: boolean;
}

export function ProductForm({
  initialData,
  categories,
  suppliers,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();

  // 1. Información Básica
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  // 2. Imágenes
  const [mainImage, setMainImage] = useState<string | null>(initialData?.mainImage || null);
  const [additionalImages, setAdditionalImages] = useState<string[]>(
    initialData?.additionalImages || []
  );

  // 3. Precios y Rentabilidad (en Bolivianos / Bs)
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : "");
  const [cost, setCost] = useState(initialData?.costPrice ? String(initialData.costPrice) : "");

  // 4. Clasificación & Proveedor
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialData?.categoryId !== undefined ? initialData.categoryId : null
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    initialData?.supplierId !== undefined ? initialData.supplierId : null
  );

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);

  // 5. Stock y Alertas
  const [stock, setStock] = useState(initialData?.stock !== undefined ? String(initialData.stock) : "0");
  const [minStockAlert, setMinStockAlert] = useState(
    initialData?.minStock !== undefined ? String(initialData.minStock) : "5"
  );

  // 6. Estados Operativos y Visibilidad
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isVisibleWeb, setIsVisibleWeb] = useState(initialData?.isVisibleWeb ?? true);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  // Cálculos matemáticos en vivo
  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(cost) || 0;
  const profitPerUnit = priceNum - costNum;
  const isNegativeProfit = profitPerUnit < 0;
  const marginPercentage = priceNum > 0 ? ((profitPerUnit / priceNum) * 100).toFixed(1) : "0.0";

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    if (!name.trim()) {
      toast.error("Nombre comercial requerido");
      return;
    }

    if (priceNum <= 0) {
      toast.error(`El precio debe ser mayor a 0 ${CURRENCY_SYMBOL}`);
      return;
    }

    if (cost.trim() === "") {
      toast.error("Ingresa el costo de adquisición");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const toastId = toast.loading(isEdit ? "Guardando cambios..." : "Creando producto...");

    try {
      const payload: ProductFormInput = {
        name: name.trim(),
        description: description.trim(),
        mainImage: mainImage || null,
        additionalImages,
        price: priceNum,
        costPrice: costNum,
        categoryId: selectedCategoryId,
        brandId: initialData?.brandId ?? null,
        supplierId: selectedSupplierId,
        initialStock: parseInt(stock, 10) || 0,
        minStock: parseInt(minStockAlert, 10) || 5,
        isActive,
        isVisibleWeb,
        isFeatured,
      };

      let result;
      if (isEdit && initialData?.id) {
        result = await updateProductAction(initialData.id, payload);
      } else {
        result = await createProductAction(payload);
      }

      if (result.success) {
        toast.success(isEdit ? "Producto actualizado" : "Producto creado", { id: toastId });
        if (!isEdit) {
          setName("");
          setDescription("");
          setMainImage(null);
          setAdditionalImages([]);
          setPrice("");
          setCost("");
          setStock("0");
          setMinStockAlert("5");
          setSelectedCategoryId(null);
          setSelectedSupplierId(null);
        }
        router.push("/admin/inventario");
        router.refresh();
        setTimeout(() => {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }, 300);
      } else {
        toast.error("No se pudo guardar", { id: toastId, description: result.error });
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast.error("Error de conexión", { id: toastId, description: err.message });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleMainFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMain(true);
    const toastId = toast.loading("Optimizando imagen...");

    try {
      const { file: webpFile } = await optimizeImageToWebP(file, { maxWidthOrHeight: 1400, quality: 0.85 });
      const formData = new FormData();
      formData.append("file", webpFile);
      const res = await uploadProductImageAction(formData);

      if (res.success && res.url) {
        setMainImage(res.url);
        toast.success("Foto optimizada", { id: toastId });
      } else {
        toast.error("Error al subir", { id: toastId, description: res.error });
      }
    } catch (err: any) {
      toast.error("Falla al procesar foto", { id: toastId, description: err.message });
    } finally {
      setIsUploadingMain(false);
      if (mainFileInputRef.current) mainFileInputRef.current.value = "";
    }
  };

  const handleAdditionalFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 6 - additionalImages.length;
    if (remainingSlots <= 0) {
      toast.warning("Límite de 6 fotos alcanzado");
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setIsUploadingAdditional(true);
    const toastId = toast.loading("Optimizando fotos...");

    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToProcess) {
        const { file: webpFile } = await optimizeImageToWebP(file, { maxWidthOrHeight: 1200, quality: 0.82 });
        const formData = new FormData();
        formData.append("file", webpFile);
        const res = await uploadProductImageAction(formData);
        if (res.success && res.url) uploadedUrls.push(res.url);
      }
      setAdditionalImages((prev) => [...prev, ...uploadedUrls]);
      toast.success("Fotos agregadas", { id: toastId });
    } catch (err: any) {
      toast.error("Error al procesar", { id: toastId, description: err.message });
    } finally {
      setIsUploadingAdditional(false);
      if (additionalFileInputRef.current) additionalFileInputRef.current.value = "";
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
    toast.info("Foto retirada de la galería");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-20 select-none">
      {/* =========================================================================
          BARRA SUPERIOR (HEADER DE ACCIONES)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 admin-page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin/inventario">
            <button
              type="button"
              className="h-10 w-10 rounded-xl border border-admin-card-border bg-admin-card-bg hover:bg-admin-raised flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="admin-page-title">
                {isEdit ? `Editar Producto` : `Nuevo Producto`}
              </h1>
              {isEdit && initialData?.id && (
                <span className="text-xs font-mono font-bold text-slate-500 bg-admin-raised px-2 py-0.5 rounded-lg border border-admin-card-border">
                  #{initialData.id}
                </span>
              )}
            </div>
            <p className="text-xs text-admin-muted mt-0.5">
              Ficha comercial, precios y control de stock
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2.5">
          <Link href="/admin/inventario">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl font-bold text-xs cursor-pointer border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised transition-colors"
            >
              Descartar
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5 stroke-[3]" />
                <span>{isEdit ? "Guardar Cambios" : "Guardar Producto"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* =========================================================================
          FILA 1: INFORMACIÓN PRINCIPAL (FOTOS A LA IZQUIERDA + DATOS A LA DERECHA)
          ========================================================================= */}
      <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-admin-card-border pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-admin-brand" />
            <h2 className="text-base font-semibold text-admin-text tracking-tight">
              Información General
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* LADO IZQUIERDO: IMÁGENES */}
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-admin-brand-text" />
                Imagen Principal
              </label>

              <input
                ref={mainFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainFileSelect}
                className="hidden"
              />
              <input
                ref={additionalFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAdditionalFilesSelect}
                className="hidden"
              />

              {mainImage ? (
                <div className="relative group w-full aspect-square rounded-xl overflow-hidden border border-admin-card-border bg-admin-raised">
                  <img
                    src={mainImage}
                    alt="Foto Principal"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isUploadingMain && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-admin-brand-text" />
                      <span className="text-xs font-bold">Optimizando...</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3.5">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isUploadingMain}
                        onClick={() => mainFileInputRef.current?.click()}
                        className="h-9 px-4 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5 text-admin-brand-text" />
                        <span>Cambiar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !isUploadingMain && mainFileInputRef.current?.click()}
                  className="w-full aspect-square rounded-xl border-2 border-dashed border-admin-card-border hover:border-admin-brand bg-admin-raised flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
                >
                  {isUploadingMain ? (
                    <>
                      <Loader2 className="h-8 w-8 text-admin-brand-text animate-spin mb-2" />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Optimizando...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-xl bg-admin-brand-subtle border border-admin-brand-light text-admin-brand-text flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Subir Imagen
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Portada para POS y Web
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Galería Adicional */}
            <div className="space-y-2 pt-1 border-t border-admin-card-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-admin-secondary flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                  Galería Web
                </label>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {additionalImages.length} / 6
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                {additionalImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-admin-card-border bg-admin-raised"
                  >
                    <img
                      src={img}
                      alt={`Adicional ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(idx)}
                      title="Eliminar foto"
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </button>
                  </div>
                ))}

                {additionalImages.length < 6 && (
                  <button
                    type="button"
                    disabled={isUploadingAdditional}
                    onClick={() => additionalFileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-admin-card-border hover:border-admin-brand bg-admin-raised flex flex-col items-center justify-center text-slate-400 hover:text-admin-brand-text transition-colors cursor-pointer group"
                  >
                    {isUploadingAdditional ? (
                      <Loader2 className="h-4 w-4 animate-spin text-admin-brand-text" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        <span className="text-[9px] font-bold">Agregar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LADO DERECHO: NOMBRE, CATEGORÍA Y DESCRIPCIÓN */}
          <div className="md:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary">
                Nombre del Producto <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. Auriculares Inalámbricos Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl text-xs font-medium bg-admin-card-bg border border-admin-card-border focus-visible:border-admin-brand focus-visible:ring-2 focus-visible:ring-admin-brand/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-admin-brand-text" />
                Categoría
              </label>
              <select
                value={selectedCategoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryId(val ? parseInt(val, 10) : null);
                }}
                className="w-full h-11 px-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text font-medium cursor-pointer outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20 transition-all text-xs"
              >
                <option value="">Sin categoría asignada</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-admin-secondary">
                  Descripción
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {description.length} caracteres
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="Características y especificaciones..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-admin-card-border bg-admin-card-bg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20 resize-none transition-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILA 2: PRECIOS Y RENTABILIDAD COMERCIAL
          ========================================================================= */}
      <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-admin-card-border pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-admin-text tracking-tight">
              Precios & Rentabilidad ({CURRENCY_SYMBOL})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-admin-secondary">
              Precio de Venta al Público <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {CURRENCY_SYMBOL}
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-11 h-11 rounded-xl text-base font-semibold bg-admin-card-bg border border-admin-card-border text-admin-text"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-admin-secondary flex items-center gap-1.5">
                {isEdit && <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                {isEdit ? "Costo Promedio (CPP)" : "Costo de Adquisición"}{" "}
                <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {CURRENCY_SYMBOL}
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={cost}
                disabled={isEdit}
                onChange={(e) => setCost(e.target.value)}
                className={cn(
                  "pl-11 h-11 rounded-xl text-base font-bold font-mono border border-admin-card-border",
                  isEdit
                    ? "bg-admin-raised text-slate-400 cursor-not-allowed opacity-85"
                    : "bg-admin-card-bg text-admin-text"
                )}
                required
              />
            </div>
          </div>
        </div>

        {/* WIDGET FINANCIERO EN VIVO */}
        <div
          className={cn(
            "p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3",
            priceNum === 0 && costNum === 0
              ? "bg-admin-raised border-admin-card-border"
              : isNegativeProfit
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
              : "bg-admin-brand-subtle border-admin-brand-light"
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-bold",
                    isNegativeProfit
                      ? "text-rose-900 dark:text-rose-200"
                      : "text-slate-800 dark:text-slate-200"
                  )}
                >
                  {isNegativeProfit
                    ? "Alerta: Margen Negativo Detectado"
                    : "Rendimiento Estimado por Unidad"}
                </span>
                {isNegativeProfit && (
                  <Badge className="bg-rose-600 text-white border-0 text-[10px] font-semibold uppercase">
                    Pérdida
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">
                  {isNegativeProfit ? "Pérdida" : "Utilidad Bruta"}
                </span>
                <span
                  className={cn(
                    "text-base font-semibold font-mono transition-colors",
                    isNegativeProfit
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {isNegativeProfit
                    ? `- ${CURRENCY_SYMBOL} ${Math.abs(profitPerUnit).toFixed(2)}`
                    : `+ ${CURRENCY_SYMBOL} ${profitPerUnit.toFixed(2)}`}
                </span>
              </div>
              <div
                className={cn(
                  "h-8 w-px hidden sm:block",
                  isNegativeProfit
                    ? "bg-rose-200 dark:bg-rose-800"
                    : "bg-admin-brand-light"
                )}
              />
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">
                  Margen
                </span>
                <span
                  className={cn(
                    "text-base font-semibold font-mono transition-colors",
                    isNegativeProfit
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-admin-brand-text"
                  )}
                >
                  {marginPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILA 3: INVENTARIO (IZQ) + ESTADO Y CANALES (DER)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INVENTARIO */}
        <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-admin-card-border pb-3">
            <Boxes className="h-4 w-4 text-admin-brand-text" />
            <h2 className="text-sm font-semibold text-admin-text tracking-tight">
              Existencias & Proveedor
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary flex items-center gap-1">
                  {isEdit && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                  {isEdit ? "Stock en Mano" : "Stock Inicial"}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  disabled={isEdit}
                  onChange={(e) => setStock(e.target.value)}
                  className={cn(
                    "h-11 rounded-xl font-bold font-mono border border-admin-card-border",
                    isEdit
                      ? "bg-admin-raised text-slate-400 cursor-not-allowed opacity-85"
                      : "bg-admin-card-bg text-admin-text"
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-admin-secondary">
                  Alerta Stock Bajo
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="h-11 rounded-xl font-bold font-mono text-amber-600 dark:text-amber-400 bg-admin-card-bg border border-admin-card-border"
                  />
                  <span className="text-xs font-bold text-slate-400">uds</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-admin-card-border">
              <label className="font-bold text-admin-secondary flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-admin-brand-text" />
                Proveedor Habitual
              </label>
              <select
                value={selectedSupplierId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSupplierId(val ? parseInt(val, 10) : null);
                }}
                className="w-full h-11 px-3 rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text font-medium cursor-pointer text-xs outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20"
              >
                <option value="">Sin proveedor asignado</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CANALES DE VENTA */}
        <div className="rounded-xl bg-admin-card-bg border border-admin-card-border p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-admin-card-border pb-3">
            <Store className="h-4 w-4 text-admin-brand-text" />
            <h2 className="text-sm font-semibold text-admin-text tracking-tight">
              Canales & Visibilidad
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Estado Operativo */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-admin-secondary block">
                Disponibilidad Comercial
              </span>
              <div className="grid grid-cols-2 p-1 bg-admin-raised rounded-xl border border-admin-card-border gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Activo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                    !isActive
                      ? "bg-rose-600 text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Inactivo</span>
                </button>
              </div>
            </div>

            {/* Opciones Web */}
            <div className="space-y-2 pt-2 border-t border-admin-card-border">
              <div
                onClick={() => isActive && setIsVisibleWeb(!isVisibleWeb)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all select-none cursor-pointer",
                  !isActive && "opacity-40 pointer-events-none",
                  isVisibleWeb && isActive
                    ? "bg-admin-raised border-admin-card-border"
                    : "bg-admin-card-bg border-admin-card-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                      isVisibleWeb && isActive
                        ? "bg-admin-brand-subtle text-admin-brand-text"
                        : "bg-admin-raised text-slate-400"
                    )}
                  >
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-admin-text leading-tight">
                      Visible en Tienda Online
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5",
                    isVisibleWeb && isActive
                      ? "bg-admin-brand"
                      : "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out",
                      isVisibleWeb && isActive ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </div>
              </div>

              <div
                onClick={() => isActive && isVisibleWeb && setIsFeatured(!isFeatured)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all select-none cursor-pointer",
                  (!isActive || !isVisibleWeb) && "opacity-40 pointer-events-none",
                  isFeatured && isActive && isVisibleWeb
                    ? "bg-admin-raised border-admin-card-border"
                    : "bg-admin-card-bg border-admin-card-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                      isFeatured && isActive && isVisibleWeb
                        ? "bg-admin-brand-subtle text-admin-brand-text"
                        : "bg-admin-raised text-slate-400"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-admin-text leading-tight">
                      Destacado en Portada
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5",
                    isFeatured && isActive && isVisibleWeb
                      ? "bg-admin-brand"
                      : "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out",
                      isFeatured && isActive && isVisibleWeb ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-admin-card-border">
        <Link href="/admin/inventario">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl font-bold text-xs cursor-pointer border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
          >
            Descartar
          </Button>
        </Link>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="h-10 px-7 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1.5 stroke-[3]" />
              <span>{isEdit ? "Guardar Cambios" : "Guardar Producto"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
