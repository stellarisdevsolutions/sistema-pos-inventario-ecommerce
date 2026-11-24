"use client";

import { modelDimensions } from "@/lib/model-variants";
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
  Pencil,
  Loader2,
  Truck,
  Lock,
  Layers,
  Link2,
  Star,
  Barcode,
  Award,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { cn } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/actions/products";
import { uploadProductImageAction } from "@/app/admin/actions/upload";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import type { ProductFormInput, ProductOptionConfig } from "@/lib/validations/product";
import { CURRENCY_SYMBOL, formatCurrency } from "@/lib/currency";
import {
  deriveOptionConfigsFromDrafts,
  ProductSkuField,
  ProductVariantFields,
  toProductOption,
  VariantColorField,
  type ProductOptionDraft,
} from "./product-variant-fields";

interface ProductFormProps {
  initialData?: {
    id?: number;
    name?: string;
    sku?: string | null;
    barcode?: string | null;
    modelCode?: string | null;
    variant?: string | null;
    variantSelector?: string | null;
    variantColor?: string | null;
    attributes?: Record<string, string> | null;
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
  models?: {
    code: string;
    name: string;
    variantSelector: string | null;
    options?: ProductOptionConfig[] | null;
  }[];
}

const MARKUP_PRESETS = [30, 50, 100] as const;

export function ProductForm({
  initialData,
  categories,
  brands = [],
  suppliers,
  isEdit = false,
  models = [],
}: ProductFormProps) {
  const router = useRouter();

  const [sku, setSku] = useState(initialData?.sku || "");
  const [barcode, setBarcode] = useState(initialData?.barcode || "");
  const [modelCode, setModelCode] = useState(initialData?.modelCode || "");
  const [variant, setVariant] = useState(initialData?.variant || "");
  const [variantSelector, setVariantSelector] = useState(initialData?.variantSelector || "");
  const [variantColor, setVariantColor] = useState(initialData?.variantColor || "");
  const [attributes, setAttributes] = useState<Record<string, string> | null>(
    initialData?.attributes && Object.keys(initialData.attributes).length > 0
      ? initialData.attributes
      : null
  );
  const [usesVariants, setUsesVariants] = useState(Boolean(initialData?.variant));
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const createWithVariants = !isEdit && usesVariants;
  const existingModel = createWithVariants
    ? models.find((model) => model.code === modelCode)
    : undefined;

  // 1. Información Básica
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  // 2. Imágenes
  const [mainImage, setMainImage] = useState<string | null>(initialData?.mainImage || null);
  const [imageLink, setImageLink] = useState(
    initialData?.mainImage?.startsWith("https://") ? initialData.mainImage : ""
  );
  const [showUrlInput, setShowUrlInput] = useState(
    Boolean(initialData?.mainImage?.startsWith("https://"))
  );
  const [additionalImages, setAdditionalImages] = useState<string[]>(
    initialData?.additionalImages || []
  );
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);

  // 3. Precios y Rentabilidad (en Bolivianos / Bs)
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : "");
  const [cost, setCost] = useState(initialData?.costPrice ? String(initialData.costPrice) : "");

  // 4. Clasificación, Marca & Proveedor
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialData?.categoryId !== undefined ? initialData.categoryId : null
  );
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(
    initialData?.brandId !== undefined ? initialData.brandId : null
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    initialData?.supplierId !== undefined ? initialData.supplierId : null
  );

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);

  // 5. Stock y Alertas
  const [stock, setStock] = useState(
    initialData?.stock !== undefined ? String(initialData.stock) : "0"
  );
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
    return () => {
      isSubmittingRef.current = false;
    };
  }, []);

  // Cálculos matemáticos en vivo
  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(cost) || 0;
  const profitPerUnit = priceNum - costNum;
  const isNegativeProfit = profitPerUnit < 0;
  const marginNum = priceNum > 0 ? (profitPerUnit / priceNum) * 100 : 0;
  const marginPercentage = marginNum.toFixed(1);

  const trimmedLink = imageLink.trim();
  const previewSrc = (trimmedLink.startsWith("https://") ? trimmedLink : "") || mainImage;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    if (!name.trim()) {
      toast.error("Nombre comercial requerido");
      return;
    }

    if (createWithVariants) {
      if (options.length === 0) {
        toast.error("Añade al menos una variante a la lista antes de guardar.");
        return;
      }
      if (options.some((opt) => (parseFloat(opt.price) || 0) <= 0)) {
        toast.error(`Ingresa un precio de venta mayor a 0 ${CURRENCY_SYMBOL} en todas las variantes.`);
        return;
      }
    } else {
      if (priceNum <= 0) {
        toast.error(`El precio debe ser mayor a 0 ${CURRENCY_SYMBOL}`);
        return;
      }
      if (cost.trim() === "") {
        toast.error("Ingresa el costo de adquisición");
        return;
      }
    }

    isSubmittingRef.current = true;
    const imageUrl = imageLink.trim();
    if (imageUrl && (!URL.canParse(imageUrl) || new URL(imageUrl).protocol !== "https:")) {
      isSubmittingRef.current = false;
      toast.error("Ingresa una URL pública HTTPS válida para la imagen.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(isEdit ? "Guardando cambios..." : "Creando producto...");

    try {
      const activeOptionConfigs = createWithVariants
        ? deriveOptionConfigsFromDrafts(options)
        : undefined;
      const firstAttrs = options[0]?.attributes;
      const derivedAttrKeys =
        firstAttrs && Object.keys(firstAttrs).length > 0
          ? Object.keys(firstAttrs)
          : (activeOptionConfigs ?? []).map((c) => c.name.trim()).filter(Boolean);
      const derivedVariantSelector = usesVariants
        ? variantSelector || (derivedAttrKeys.length > 0 ? derivedAttrKeys.join(" y ") : "Variante")
        : null;

      const payload: ProductFormInput = {
        name: name.trim(),
        sku,
        barcode,
        modelCode: usesVariants ? modelCode : null,
        variant: usesVariants && isEdit ? variant : null,
        variantSelector: derivedVariantSelector,
        variantColor: usesVariants && isEdit ? variantColor : null,
        ...(isEdit && attributes ? { attributes } : {}),
        description: description.trim(),
        mainImage: imageUrl || mainImage || null,
        additionalImages,
        price: priceNum,
        costPrice: costNum,
        categoryId: selectedCategoryId,
        brandId: selectedBrandId,
        supplierId: selectedSupplierId,
        initialStock: parseInt(stock, 10) || 0,
        minStock: minStockAlert.trim() ? Number(minStockAlert) : 5,
        isActive,
        isVisibleWeb,
        isFeatured,
      };

      let result;
      if (isEdit && initialData?.id) {
        result = await updateProductAction(initialData.id, payload);
      } else {
        result = await createProductAction(
          payload,
          createWithVariants ? options.map(toProductOption) : undefined,
          activeOptionConfigs && activeOptionConfigs.length > 0 ? activeOptionConfigs : undefined
        );
      }

      if (result.success) {
        toast.success(isEdit ? "Producto actualizado" : "Producto creado", { id: toastId });
        if (!isEdit) {
          setName("");
          setSku("");
          setBarcode("");
          setModelCode("");
          setVariant("");
          setVariantSelector("");
          setVariantColor("");
          setUsesVariants(false);
          setOptions([]);
          setDescription("");
          setMainImage(null);
          setImageLink("");
          setShowUrlInput(false);
          setAdditionalImages([]);
          setPrice("");
          setCost("");
          setStock("0");
          setMinStockAlert("5");
          setSelectedCategoryId(null);
          setSelectedBrandId(null);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      toast.error("Error de conexión", { id: toastId, description: message });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const processMainFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Formato no válido", { description: "Selecciona un archivo de imagen." });
      return;
    }

    setIsUploadingMain(true);
    const toastId = toast.loading("Optimizando imagen...");

    try {
      const { file: webpFile } = await optimizeImageToWebP(file, {
        maxWidthOrHeight: 1400,
        quality: 0.85,
      });
      const formData = new FormData();
      formData.append("file", webpFile);
      const res = await uploadProductImageAction(formData);

      if (res.success && res.url) {
        setImageLink("");
        setMainImage(res.url);
        toast.success("Foto optimizada", { id: toastId });
      } else {
        toast.error("Error al subir", { id: toastId, description: res.error });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      toast.error("Falla al procesar foto", { id: toastId, description: message });
    } finally {
      setIsUploadingMain(false);
      if (mainFileInputRef.current) mainFileInputRef.current.value = "";
    }
  };

  const handleMainFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processMainFile(file);
  };

  const processAdditionalFiles = async (rawFiles: File[]) => {
    const imageFiles = rawFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const remainingSlots = 6 - additionalImages.length;
    if (remainingSlots <= 0) {
      toast.warning("Límite de 6 fotos alcanzado");
      return;
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots);
    setIsUploadingAdditional(true);
    const toastId = toast.loading("Optimizando fotos...");

    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToProcess) {
        const { file: webpFile } = await optimizeImageToWebP(file, {
          maxWidthOrHeight: 1200,
          quality: 0.82,
        });
        const formData = new FormData();
        formData.append("file", webpFile);
        const res = await uploadProductImageAction(formData);
        if (res.success && res.url) uploadedUrls.push(res.url);
      }
      if (uploadedUrls.length > 0) {
        setAdditionalImages((prev) => [...prev, ...uploadedUrls]);
        toast.success("Fotos agregadas a la galería", { id: toastId });
      } else {
        toast.error("No se pudieron subir las fotos", { id: toastId });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      toast.error("Error al procesar", { id: toastId, description: message });
    } finally {
      setIsUploadingAdditional(false);
      if (additionalFileInputRef.current) additionalFileInputRef.current.value = "";
    }
  };

  const handleAdditionalFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) await processAdditionalFiles(files);
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
    toast.info("Foto retirada de la galería");
  };

  const promoteGalleryImage = (index: number) => {
    const targetUrl = additionalImages[index];
    if (!targetUrl) return;
    const previousCover = previewSrc;
    const restGallery = additionalImages.filter((_, i) => i !== index);
    const nextGallery =
      previousCover &&
      previousCover !== targetUrl &&
      !restGallery.includes(previousCover) &&
      restGallery.length < 6
        ? [...restGallery, previousCover]
        : restGallery;

    setMainImage(targetUrl);
    if (targetUrl.startsWith("https://")) {
      setImageLink(targetUrl);
      setShowUrlInput(true);
    } else {
      setImageLink("");
    }
    setAdditionalImages(nextGallery);
    toast.success("Imagen establecida como portada principal");
  };

  const marginStatusTone =
    priceNum === 0 && costNum === 0
      ? "bg-admin-raised border-admin-card-border"
      : isNegativeProfit
      ? "bg-rose-500/10 border-rose-500/30"
      : marginNum < 15
      ? "bg-amber-500/10 border-amber-500/30"
      : "bg-emerald-500/10 border-emerald-500/25";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* =========================================================================
          CABECERA SUPERIOR
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 admin-page-header">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/inventario"
            aria-label="Volver al inventario"
            className="admin-return rounded-xl p-2 hover:bg-admin-raised transition-colors shrink-0"
          >
            <ArrowLeft size={18} aria-hidden />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="admin-page-title">
                {isEdit ? "Editar Producto" : "Nuevo Producto"}
              </h1>
              {isEdit && initialData?.id && (
                <span className="text-xs font-mono font-semibold text-admin-muted bg-admin-raised px-2 py-0.5 rounded-lg border border-admin-card-border">
                  #{initialData.id}
                </span>
              )}
            </div>
            <p className="admin-page-description">
              Ficha comercial, precios y control de stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/inventario"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-10 px-4 rounded-xl font-semibold text-xs border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
            )}
          >
            Descartar
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5 stroke-[2.5]" />
                <span>{isEdit ? "Guardar Cambios" : "Guardar Producto"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 1: INFORMACIÓN GENERAL (FOTOS A LA IZQUIERDA + DATOS A LA DERECHA)
          ========================================================================= */}
      <section className="admin-panel p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-2 border-b border-admin-card-border pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-admin-brand" />
            <h2 className="text-base font-semibold text-admin-text tracking-tight">
              Información General
            </h2>
          </div>
          {existingModel && (
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-admin-brand/40 bg-admin-brand-subtle text-admin-brand-text"
            >
              Vinculado a {existingModel.code}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* LADO IZQUIERDO: IMAGEN PRINCIPAL + GALERÍA ADICIONAL */}
          <div className="md:col-span-5 space-y-4">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-admin-secondary flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-admin-brand-text" />
                  Imagen Principal
                </span>
                <button
                  type="button"
                  onClick={() => setShowUrlInput((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-admin-brand-text hover:underline cursor-pointer"
                >
                  <Link2 className="h-3 w-3" />
                  <span>{showUrlInput ? "Ocultar enlace" : "Usar enlace HTTPS"}</span>
                </button>
              </div>

              {previewSrc ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingMain(true);
                  }}
                  onDragLeave={() => setIsDraggingMain(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingMain(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) void processMainFile(dropped);
                  }}
                  className={cn(
                    "relative group w-full aspect-square rounded-xl overflow-hidden border bg-admin-raised transition-colors",
                    isDraggingMain
                      ? "border-admin-brand ring-2 ring-admin-brand/30"
                      : "border-admin-card-border"
                  )}
                >
                  <ProductThumbnail
                    src={previewSrc}
                    alt={name || "Foto Principal"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isUploadingMain && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-10">
                      <Loader2 className="h-7 w-7 animate-spin text-white" />
                      <span className="text-xs font-semibold">Optimizando WebP...</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isUploadingMain}
                      onClick={() => {
                        setMainImage(null);
                        setImageLink("");
                      }}
                      className="h-8 px-2.5 rounded-lg bg-rose-600/95 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Quitar</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingMain}
                      onClick={() => mainFileInputRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-white/95 hover:bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-admin-brand-text" />
                      <span>Cambiar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploadingMain}
                  onClick={() => mainFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingMain(true);
                  }}
                  onDragLeave={() => setIsDraggingMain(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingMain(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) void processMainFile(dropped);
                  }}
                  className={cn(
                    "w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-colors group",
                    isDraggingMain
                      ? "border-admin-brand bg-admin-brand-subtle"
                      : "border-admin-card-border hover:border-admin-brand bg-admin-raised"
                  )}
                >
                  {isUploadingMain ? (
                    <>
                      <Loader2 className="h-7 w-7 text-admin-brand-text animate-spin mb-2" />
                      <span className="text-xs font-semibold text-admin-text">
                        Optimizando imagen...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-11 w-11 rounded-xl bg-admin-brand-subtle border border-admin-brand-light text-admin-brand-text flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold text-admin-text block">
                        Subir Imagen
                      </span>
                      <span className="text-[11px] text-admin-muted mt-0.5">
                        Arrastra aquí o haz clic (WebP)
                      </span>
                    </>
                  )}
                </button>
              )}

              {showUrlInput && (
                <div className="space-y-1 pt-1">
                  <label
                    htmlFor="product-image-url"
                    className="text-[11px] font-medium text-admin-muted block"
                  >
                    URL pública HTTPS (opcional)
                  </label>
                  <Input
                    id="product-image-url"
                    type="url"
                    placeholder="https://cdn.ejemplo.com/producto.webp"
                    value={imageLink}
                    maxLength={1500}
                    onChange={(event) => {
                      const next = event.target.value;
                      setImageLink(next);
                      if (!next.trim() && mainImage?.startsWith("https://")) {
                        setMainImage(null);
                      }
                    }}
                    className="h-9 rounded-xl text-xs bg-admin-card-bg border-admin-card-border"
                  />
                </div>
              )}
            </div>

            {/* Galería adicional */}
            <div className="space-y-2 pt-2 border-t border-admin-card-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-admin-secondary flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-admin-muted" />
                  Galería adicional
                </span>
                <span className="text-[11px] font-mono tabular-nums text-admin-muted">
                  {additionalImages.length} / 6
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingGallery(true);
                }}
                onDragLeave={() => setIsDraggingGallery(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingGallery(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  if (files.length > 0) void processAdditionalFiles(files);
                }}
                className={cn(
                  "grid grid-cols-4 gap-2 p-2 rounded-xl border transition-colors",
                  isDraggingGallery
                    ? "border-admin-brand bg-admin-brand-subtle"
                    : "border-admin-card-border bg-admin-raised/50"
                )}
              >
                {additionalImages.map((img, idx) => (
                  <div
                    key={`${img}-${idx}`}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-admin-card-border bg-admin-card-bg"
                  >
                    <ProductThumbnail
                      src={img}
                      alt={`Adicional ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/65 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => promoteGalleryImage(idx)}
                        title="Usar como portada principal"
                        aria-label={`Usar imagen ${idx + 1} como portada`}
                        className="h-6 w-6 rounded-md bg-white/95 hover:bg-white text-slate-900 flex items-center justify-center cursor-pointer"
                      >
                        <Star className="h-3 w-3 text-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAdditionalImage(idx)}
                        title="Quitar foto"
                        aria-label={`Quitar imagen adicional ${idx + 1}`}
                        className="h-6 w-6 rounded-md bg-rose-600/95 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {additionalImages.length < 6 && (
                  <button
                    type="button"
                    disabled={isUploadingAdditional}
                    onClick={() => additionalFileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-admin-card-border hover:border-admin-brand bg-admin-card-bg flex flex-col items-center justify-center text-admin-muted hover:text-admin-brand-text transition-colors cursor-pointer"
                  >
                    {isUploadingAdditional ? (
                      <Loader2 className="h-4 w-4 animate-spin text-admin-brand-text" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 stroke-[2.25]" />
                        <span className="text-[10px] font-semibold mt-0.5">Agregar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LADO DERECHO: NOMBRE, SKU, CATEGORÍA, MARCA Y DESCRIPCIÓN */}
          <div className="md:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="product-name-input"
                className="text-xs font-semibold text-admin-secondary block"
              >
                Nombre del Producto <span className="text-rose-500">*</span>
              </label>
              <Input
                id="product-name-input"
                placeholder="Ej. Auriculares Inalámbricos Studio Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={Boolean(existingModel)}
                className={cn(
                  "h-11 rounded-xl text-sm font-medium border-admin-card-border focus-visible:border-admin-brand focus-visible:ring-2 focus-visible:ring-admin-brand/20",
                  existingModel ? "bg-admin-raised text-admin-muted" : "bg-admin-card-bg text-admin-text"
                )}
                required
              />
              {existingModel && (
                <p className="text-[11px] text-admin-muted">
                  El nombre proviene del modelo base seleccionado para mantener consistencia en tienda.
                </p>
              )}
            </div>

            {!createWithVariants && (
              <div className="grid gap-3 sm:grid-cols-2">
                <ProductSkuField value={sku} onChange={setSku} />
                <div className="space-y-1.5">
                  <label
                    htmlFor="product-barcode-input"
                    className="text-xs font-semibold text-admin-secondary flex items-center gap-1.5"
                  >
                    <Barcode className="size-3.5 text-admin-muted" />
                    <span>Código de barras</span>
                  </label>
                  <Input
                    id="product-barcode-input"
                    placeholder="EAN / UPC (opcional)"
                    value={barcode}
                    maxLength={60}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono bg-admin-card-bg border-admin-card-border"
                  />
                </div>
              </div>
            )}

            <div className={cn("grid gap-3", brands.length > 0 ? "sm:grid-cols-2" : "grid-cols-1")}>
              <div className="space-y-1.5">
                <label
                  htmlFor="product-category-select"
                  className="text-xs font-semibold text-admin-secondary flex items-center gap-1.5"
                >
                  <Tag className="h-3.5 w-3.5 text-admin-brand-text" />
                  <span>Categoría</span>
                </label>
                <select
                  id="product-category-select"
                  value={selectedCategoryId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCategoryId(val ? parseInt(val, 10) : null);
                  }}
                  className="w-full h-11 px-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text font-medium cursor-pointer outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20 text-xs"
                >
                  <option value="">Sin categoría asignada</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {brands.length > 0 && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="product-brand-select"
                    className="text-xs font-semibold text-admin-secondary flex items-center gap-1.5"
                  >
                    <Award className="h-3.5 w-3.5 text-admin-brand-text" />
                    <span>Marca</span>
                  </label>
                  <select
                    id="product-brand-select"
                    value={selectedBrandId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedBrandId(val ? parseInt(val, 10) : null);
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text font-medium cursor-pointer outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20 text-xs"
                  >
                    <option value="">Sin marca asignada</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="product-description-input"
                  className="text-xs font-semibold text-admin-secondary"
                >
                  Descripción
                </label>
                <span className="text-[11px] text-admin-muted font-mono tabular-nums">
                  {description.length} caracteres
                </span>
              </div>
              <textarea
                id="product-description-input"
                rows={4}
                placeholder="Características y especificaciones relevantes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 text-xs rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text placeholder:text-admin-muted outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20 resize-y min-h-[104px] transition-colors leading-relaxed"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECCIÓN 2: VARIANTES DEL PRODUCTO
          ========================================================================= */}
      <section className="admin-panel p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-admin-card-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-admin-brand-light flex items-center justify-center text-admin-brand-text shrink-0">
              <Layers className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-admin-text tracking-tight flex items-center gap-2">
                <span>Variantes del Producto</span>
                {usesVariants && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold border-admin-brand/40 bg-admin-brand-subtle text-admin-brand-text"
                  >
                    {createWithVariants ? `${options.length} variantes` : "Variante activa"}
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-admin-muted mt-0.5">
                {isEdit
                  ? "Atributos asignados a esta variante del catálogo."
                  : "Elige si es un artículo único o si manejas variantes por color, texto o combinado."}
              </p>
            </div>
          </div>
        </div>

        {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isEdit && Boolean(initialData?.modelCode)}
              aria-pressed={!usesVariants}
              onClick={() => setUsesVariants(false)}
              className={cn(
                "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                !usesVariants
                  ? "border-admin-brand bg-admin-brand-subtle ring-1 ring-admin-brand/30"
                  : "border-admin-card-border bg-admin-raised/50 hover:bg-admin-raised"
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  !usesVariants
                    ? "bg-admin-brand text-admin-on-solid"
                    : "bg-admin-card-bg text-admin-muted border border-admin-card-border"
                )}
              >
                <Boxes className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-admin-text block">
                  Artículo único (simple)
                </span>
                <span className="text-[11px] text-admin-muted block mt-0.5">
                  Un solo SKU, precio de venta y stock global.
                </span>
              </div>
            </button>

            <button
              type="button"
              aria-pressed={usesVariants}
              onClick={() => setUsesVariants(true)}
              className={cn(
                "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                usesVariants
                  ? "border-admin-brand bg-admin-brand-subtle ring-1 ring-admin-brand/30"
                  : "border-admin-card-border bg-admin-raised/50 hover:bg-admin-raised"
              )}
            >
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  usesVariants
                    ? "bg-admin-brand text-admin-on-solid"
                    : "bg-admin-card-bg text-admin-muted border border-admin-card-border"
                )}
              >
                <Layers className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-admin-text block">
                  Con variantes (talla, color...)
                </span>
                <span className="text-[11px] text-admin-muted block mt-0.5">
                  Añade variantes por color, texto o combinado con stock propio.
                </span>
              </div>
            </button>
          </div>
        )}

        {usesVariants ? (
          <div className="space-y-5">
            {createWithVariants && (
              <>
                {models.length > 0 && (
                  <div className="bg-admin-raised p-4 rounded-xl border border-admin-card-border space-y-1.5">
                    <label
                      htmlFor="product-model-select"
                      className="text-xs font-semibold text-admin-secondary block"
                    >
                      Modelo base existente (opcional)
                    </label>
                    <select
                      id="product-model-select"
                      className="w-full h-10 rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text text-xs px-3 font-medium outline-none focus:border-admin-brand cursor-pointer"
                      value={modelCode}
                      onChange={(event) => {
                        const selected = models.find(
                          (model) => model.code === event.target.value
                        );
                        setModelCode(selected?.code ?? "");
                        setOptions([]);
                        if (selected) {
                          setName(selected.name);
                          setVariantSelector(selected.variantSelector ?? "");
                        }
                      }}
                    >
                      <option value="">Crear nuevo modelo base automáticamente</option>
                      {models.map((model) => (
                        <option key={model.code} value={model.code}>
                          {model.name} ({model.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-admin-muted">
                      Agrupa variantes bajo un mismo modelo de catálogo si ya existe.
                    </p>
                  </div>
                )}

                <ProductVariantFields
                  key={modelCode || "new"}
                  options={options}
                  onChange={setOptions}
                  onAddToGallery={(url) =>
                    setAdditionalImages((prev) => (prev.includes(url) ? prev : [...prev, url]))
                  }
                  basePrice={price}
                  baseCostPrice={cost}
                  locked={Boolean(existingModel)}
                  modelOptionsHint={existingModel ? modelDimensions({ options: existingModel.options ?? null, variantSelector: existingModel.variantSelector }) : null}
                />
              </>
            )}

            {isEdit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-admin-raised p-4 rounded-xl border border-admin-card-border">
                {modelCode && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-admin-muted block">
                      Código del modelo
                    </span>
                    <p className="font-mono text-xs font-semibold text-admin-brand-text">
                      {modelCode}
                    </p>
                  </div>
                )}
                {variantSelector && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-admin-muted block">
                      Selector de atributo
                    </span>
                    <p className="text-xs font-medium text-admin-text">{variantSelector}</p>
                  </div>
                )}

                {attributes && Object.keys(attributes).length > 0 ? (
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(attributes).map(([attrKey, attrVal]) => (
                      <div key={attrKey} className="space-y-1">
                        <label className="text-xs font-semibold text-admin-secondary">
                          {attrKey} <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          value={attrVal}
                          required
                          maxLength={100}
                          onChange={(e) => {
                            const nextAttrs = { ...attributes, [attrKey]: e.target.value };
                            setAttributes(nextAttrs);
                            const joined = Object.values(nextAttrs)
                              .map((v) => v.trim())
                              .filter(Boolean)
                              .join(" / ");
                            if (joined) setVariant(joined);
                          }}
                          className="h-10 rounded-xl text-xs font-medium bg-admin-card-bg border-admin-card-border"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-admin-secondary">
                      Valor de esta variante <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      placeholder="Ej. S, 41, Verde, S / Verde"
                      value={variant}
                      required
                      maxLength={100}
                      onChange={(e) => setVariant(e.target.value)}
                      className="h-10 rounded-xl text-xs font-medium bg-admin-card-bg border-admin-card-border"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <VariantColorField value={variantColor} onChange={setVariantColor} />
                </div>
              </div>
            )}
          </div>
        ) : isEdit ? (
          <p className="text-xs text-admin-muted">
            Este producto opera como artículo único sin variantes combinadas.
          </p>
        ) : null}
      </section>

      {/* =========================================================================
          SECCIÓN 3: PRECIOS & RENTABILIDAD (SOLO PRODUCTO SIMPLE O EDICIÓN)
          ========================================================================= */}
      {!createWithVariants && (
        <section className="admin-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-admin-card-border pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h2 className="text-base font-semibold text-admin-text tracking-tight">
                Precios &amp; Rentabilidad ({CURRENCY_SYMBOL})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label
                  htmlFor="product-price-input"
                  className="text-xs font-semibold text-admin-secondary"
                >
                  Precio de Venta <span className="text-rose-500">*</span>
                </label>
                {!isEdit && costNum > 0 && (
                  <div className="flex items-center gap-1">
                    {MARKUP_PRESETS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPrice((costNum * (1 + pct / 100)).toFixed(2))}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-admin-raised border border-admin-card-border text-admin-brand-text hover:bg-admin-brand-light transition-colors cursor-pointer"
                        title={`Calcular precio con +${pct}% sobre el costo`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-muted">
                  {CURRENCY_SYMBOL}
                </span>
                <Input
                  id="product-price-input"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-11 h-11 rounded-xl text-base font-semibold font-mono tabular-nums bg-admin-card-bg border-admin-card-border text-admin-text"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="product-cost-input"
                className="text-xs font-semibold text-admin-secondary flex items-center gap-1.5"
              >
                {isEdit && <Lock className="h-3.5 w-3.5 text-admin-muted shrink-0" />}
                <span>
                  {isEdit ? "Costo Promedio (CPP)" : "Costo de Adquisición"}{" "}
                  <span className="text-rose-500">*</span>
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-muted">
                  {CURRENCY_SYMBOL}
                </span>
                <Input
                  id="product-cost-input"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={cost}
                  disabled={isEdit}
                  onChange={(e) => setCost(e.target.value)}
                  className={cn(
                    "pl-11 h-11 rounded-xl text-base font-semibold font-mono tabular-nums border-admin-card-border",
                    isEdit
                      ? "bg-admin-raised text-admin-muted cursor-not-allowed opacity-85"
                      : "bg-admin-card-bg text-admin-text"
                  )}
                  required
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3",
              marginStatusTone
            )}
          >
            <span
              className={cn(
                "text-xs font-semibold",
                isNegativeProfit ? "text-rose-700 dark:text-rose-300" : "text-admin-text"
              )}
            >
              {isNegativeProfit
                ? "Alerta: el precio está por debajo del costo"
                : "Rendimiento estimado por unidad"}
            </span>

            <div className="flex items-center gap-6">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-admin-muted font-medium">
                  {isNegativeProfit ? "Pérdida" : "Utilidad"}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold font-mono tabular-nums",
                    isNegativeProfit
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {isNegativeProfit
                    ? `- ${formatCurrency(Math.abs(profitPerUnit))}`
                    : `+ ${formatCurrency(profitPerUnit)}`}
                </span>
              </div>
              <div className="h-7 w-px bg-admin-card-border" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-admin-muted font-medium">
                  Margen
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold font-mono tabular-nums",
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
        </section>
      )}

      {/* =========================================================================
          SECCIÓN 4: EXISTENCIAS & PROVEEDOR (IZQ) + CANALES & VISIBILIDAD (DER)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Existencias & Proveedor */}
        <section className="admin-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-admin-card-border pb-3">
            <Boxes className="h-4 w-4 text-admin-brand-text" />
            <h2 className="text-sm font-semibold text-admin-text tracking-tight">
              Existencias &amp; Proveedor
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className={cn("grid gap-3", !createWithVariants ? "grid-cols-2" : "grid-cols-1")}>
              {!createWithVariants && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="product-stock-input"
                    className="font-semibold text-admin-secondary flex items-center gap-1"
                  >
                    {isEdit && <Lock className="h-3 w-3 text-admin-muted shrink-0" />}
                    <span>{isEdit ? "Stock en Mano" : "Stock Inicial"}</span>
                  </label>
                  <Input
                    id="product-stock-input"
                    type="number"
                    min="0"
                    value={stock}
                    disabled={isEdit}
                    onChange={(e) => setStock(e.target.value)}
                    className={cn(
                      "h-10 rounded-xl font-semibold font-mono tabular-nums border-admin-card-border",
                      isEdit
                        ? "bg-admin-raised text-admin-muted cursor-not-allowed opacity-85"
                        : "bg-admin-card-bg text-admin-text"
                    )}
                  />
                  {isEdit && (
                    <p className="text-[11px] text-admin-muted">
                      Se actualiza con Compras, Ventas o Bajas.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="product-min-stock"
                  className="font-semibold text-admin-secondary block"
                >
                  Alerta Stock Bajo
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="product-min-stock"
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="h-10 rounded-xl font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400 bg-admin-card-bg border-admin-card-border"
                  />
                  <span className="text-xs font-semibold text-admin-muted">uds</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-admin-card-border">
              <label
                htmlFor="product-supplier-select"
                className="font-semibold text-admin-secondary flex items-center gap-1.5"
              >
                <Truck className="h-3.5 w-3.5 text-admin-brand-text" />
                <span>Proveedor Habitual</span>
              </label>
              <select
                id="product-supplier-select"
                value={selectedSupplierId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSupplierId(val ? parseInt(val, 10) : null);
                }}
                className="w-full h-10 px-3 rounded-xl border border-admin-card-border bg-admin-card-bg text-admin-text font-medium cursor-pointer text-xs outline-none focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20"
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
        </section>

        {/* Canales & Visibilidad */}
        <section className="admin-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-admin-card-border pb-3">
            <Store className="h-4 w-4 text-admin-brand-text" />
            <h2 className="text-sm font-semibold text-admin-text tracking-tight">
              Canales &amp; Visibilidad
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => {
                if (isEdit && isActive && !window.confirm(`Al guardar se archivará el producto. Quedan ${initialData?.stock ?? 0} unidades. Se conserva el historial de caja, reportes y Kárdex.`)) return;
                setIsActive(!isActive);
                if (isActive) { setIsVisibleWeb(false); setIsFeatured(false); }
              }}
              className={cn(
                "w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer",
                isActive
                  ? "bg-admin-raised border-admin-card-border"
                  : "bg-admin-card-bg border-admin-card-border"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-admin-raised text-admin-muted"
                  )}
                >
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-admin-text block">
                    Habilitado en POS
                  </span>
                  <span className="text-[11px] text-admin-muted block">
                    {isActive ? "Disponible para venta" : "Pausado temporalmente"}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 p-0.5",
                  isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                    isActive ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={isVisibleWeb && isActive}
              disabled={!isActive}
              onClick={() => setIsVisibleWeb(!isVisibleWeb)}
              className={cn(
                "w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed",
                isVisibleWeb && isActive
                  ? "bg-admin-raised border-admin-card-border"
                  : "bg-admin-card-bg border-admin-card-border"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isVisibleWeb && isActive
                      ? "bg-admin-brand-subtle text-admin-brand-text"
                      : "bg-admin-raised text-admin-muted"
                  )}
                >
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-admin-text block">
                    Visible en Tienda Online
                  </span>
                  <span className="text-[11px] text-admin-muted block">
                    Publica el producto en la web
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 p-0.5",
                  isVisibleWeb && isActive ? "bg-admin-brand" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                    isVisibleWeb && isActive ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={isFeatured && isActive && isVisibleWeb}
              disabled={!isActive || !isVisibleWeb}
              onClick={() => setIsFeatured(!isFeatured)}
              className={cn(
                "w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed",
                isFeatured && isActive && isVisibleWeb
                  ? "bg-admin-raised border-admin-card-border"
                  : "bg-admin-card-bg border-admin-card-border"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isFeatured && isActive && isVisibleWeb
                      ? "bg-admin-brand-subtle text-admin-brand-text"
                      : "bg-admin-raised text-admin-muted"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-admin-text block">
                    Destacado en Portada
                  </span>
                  <span className="text-[11px] text-admin-muted block">
                    Prioridad en sección principal
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 p-0.5",
                  isFeatured && isActive && isVisibleWeb
                    ? "bg-admin-brand"
                    : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                    isFeatured && isActive && isVisibleWeb ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* =========================================================================
          BARRA INFERIOR SIMPLE
          ========================================================================= */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-admin-card-border">
        <Link
          href="/admin/inventario"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-10 px-5 rounded-xl font-semibold text-xs border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
          )}
        >
          Descartar
        </Link>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="h-10 px-7 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1.5 stroke-[2.5]" />
              <span>{isEdit ? "Guardar Cambios" : "Guardar Producto"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
