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

  // 2. Imágenes (Todo en limpio por defecto si es nuevo producto)
  const [mainImage, setMainImage] = useState<string | null>(initialData?.mainImage || null);
  const [additionalImages, setAdditionalImages] = useState<string[]>(
    initialData?.additionalImages || []
  );

  // 3. Precios y Rentabilidad (en Bolivianos / Bs) - en blanco por defecto
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : "");
  const [cost, setCost] = useState(initialData?.costPrice ? String(initialData.costPrice) : "");

  // 4. Clasificación & Proveedor
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialData?.categoryId !== undefined ? initialData.categoryId : null
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(
    initialData?.supplierId !== undefined ? initialData.supplierId : null
  );

  // Referencias a inputs de archivos y estados de carga/optimización en el cliente
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);

  // 5. Stock y Alertas
  const [stock, setStock] = useState(initialData?.stock !== undefined ? String(initialData.stock) : "0");
  const [minStockAlert, setMinStockAlert] = useState(
    initialData?.minStock !== undefined ? String(initialData.minStock) : "5"
  );

  // 6. Estados Operativos y Visibilidad (Estándar Retail)
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isVisibleWeb, setIsVisibleWeb] = useState(initialData?.isVisibleWeb ?? true);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);

  // Estado de envío y ref de bloqueo síncrono para evitar dobles clics / duplicados
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Garantizar que cada vez que el componente se monta, cualquier estado previo quede completamente limpio
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

  // Manejo de guardado con Server Actions y validación Zod
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Bloqueo inmediato síncrono para prevenir múltiples disparos instantáneos
    if (isSubmittingRef.current || isSubmitting) return;

    if (!name.trim()) {
      toast.error("Nombre comercial requerido", {
        description: "Por favor escribe el nombre comercial del producto para poder guardarlo.",
      });
      return;
    }

    if (priceNum <= 0) {
      toast.error("Precio de venta inválido", {
        description: `El precio de venta al público debe ser mayor a 0 ${CURRENCY_SYMBOL}.`,
      });
      return;
    }

    if (cost.trim() === "") {
      toast.error("Costo de adquisición requerido", {
        description: "Por favor ingresa el costo de adquisición (puedes ingresar 0 si no aplica).",
      });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const toastId = toast.loading(isEdit ? "Guardando cambios..." : "Registrando producto...");

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
        toast.success(
          isEdit ? "¡Producto actualizado con éxito!" : "¡Producto creado con éxito!",
          {
            id: toastId,
            description: `"${name}" fue guardado en la base de datos y su Kárdex quedó auditado.`,
          }
        );
        // Si fue una creación exitosa, resetear todos los campos a blanco
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
        // Redirigir y asegurar limpieza de estado
        router.push("/admin/inventario");
        router.refresh();
        setTimeout(() => {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }, 300);
      } else {
        toast.error("No se pudo guardar el producto", {
          id: toastId,
          description: result.error || "Ocurrió un error inesperado al procesar la solicitud.",
        });
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast.error("Error de conexión", {
        id: toastId,
        description: err.message || "No se pudo conectar con el servidor.",
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Procesamiento y optimización a WebP en el navegador (Recursos locales del dispositivo)
  const handleMainFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMain(true);
    const toastId = toast.loading("Optimizando y convirtiendo portada a WebP...", {
      description: `Procesando "${file.name}" usando los recursos de tu dispositivo...`,
    });

    try {
      // 1. Optimizar en el navegador a formato WebP ultraligero
      const { file: webpFile, originalSizeKB, compressedSizeKB, savingsPercent } =
        await optimizeImageToWebP(file, { maxWidthOrHeight: 1400, quality: 0.85 });

      // 2. Subir archivo físico
      const formData = new FormData();
      formData.append("file", webpFile);
      const res = await uploadProductImageAction(formData);

      if (res.success && res.url) {
        setMainImage(res.url);
        toast.success("Foto principal optimizada y guardada", {
          id: toastId,
          description: `WebP ultraligero: ${originalSizeKB} KB → ${compressedSizeKB} KB (${savingsPercent}% de ahorro).`,
        });
      } else {
        toast.error("Error al subir la imagen", {
          id: toastId,
          description: res.error || "No se pudo almacenar el archivo.",
        });
      }
    } catch (err: any) {
      toast.error("Error al procesar la imagen", {
        id: toastId,
        description: err.message || "Ocurrió una falla durante la optimización.",
      });
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
      toast.warning("Límite de galería alcanzado", {
        description: "Ya tienes las 6 fotos máximas permitidas para la tienda online.",
      });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setIsUploadingAdditional(true);
    const toastId = toast.loading("Optimizando imágenes adicionales a WebP...", {
      description: `Procesando ${filesToProcess.length} foto(s) en tu navegador...`,
    });

    try {
      const uploadedUrls: string[] = [];
      let totalOriginalKB = 0;
      let totalCompressedKB = 0;

      for (const file of filesToProcess) {
        const { file: webpFile, originalSizeKB, compressedSizeKB } =
          await optimizeImageToWebP(file, { maxWidthOrHeight: 1200, quality: 0.82 });

        totalOriginalKB += originalSizeKB;
        totalCompressedKB += compressedSizeKB;

        const formData = new FormData();
        formData.append("file", webpFile);
        const res = await uploadProductImageAction(formData);

        if (res.success && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setAdditionalImages((prev) => [...prev, ...uploadedUrls]);
        const savings =
          totalOriginalKB > 0
            ? Math.round(((totalOriginalKB - totalCompressedKB) / totalOriginalKB) * 100)
            : 0;

        toast.success(`${uploadedUrls.length} foto(s) agregadas a la galería web`, {
          id: toastId,
          description: `WebP optimizado: ${totalOriginalKB} KB → ${totalCompressedKB} KB (${savings}% más liviano).`,
        });
      } else {
        toast.error("No se pudo guardar ninguna foto", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Error al procesar imágenes de galería", {
        id: toastId,
        description: err.message || "Falla al optimizar archivos.",
      });
    } finally {
      setIsUploadingAdditional(false);
      if (additionalFileInputRef.current) additionalFileInputRef.current.value = "";
    }
  };

  const removeAdditionalImage = (indexToRemove: number) => {
    setAdditionalImages(additionalImages.filter((_, idx) => idx !== indexToRemove));
    toast.info("Foto eliminada", {
      description: "Se retiró la imagen de la galería web.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-20 select-none">
      {/* =========================================================================
          BARRA SUPERIOR (HEADER DE ACCIONES)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/inventario">
            <button
              type="button"
              className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEdit ? `Editar Producto` : `Crear Nuevo Producto`}
              </h1>
              {isEdit && initialData?.id && (
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  #{initialData.id}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEdit
                ? `Actualiza la información comercial, precios, inventario y canales de venta.`
                : `Completa los datos visuales, precios de venta y existencias de tu artículo.`}
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
              className="h-10 px-4 rounded-lg font-bold text-xs cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              Descartar
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
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
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Información Principal
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Imágenes del artículo y datos comerciales
          </span>
        </div>

        {/* CONTENEDOR SPLIT: IMÁGENES A LA IZQUIERDA / DATOS A LA DERECHA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------------------------
              LADO IZQUIERDO (COL 12 -> 5): IMAGEN PRINCIPAL + IMÁGENES ADICIONALES
              ------------------------------------------------------------------- */}
          <div className="md:col-span-5 space-y-4">
            {/* 1. CUADRADO GRANDE: IMAGEN PRINCIPAL (POS Y PORTADA WEB) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-indigo-600" />
                  Imagen Principal
                </label>
              </div>

              {/* Inputs ocultos de selección de archivo nativo del explorador */}
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
                <div className="relative group w-full aspect-square rounded-3xl overflow-hidden border-2 border-indigo-500/80 dark:border-indigo-600 shadow-sm bg-slate-100 dark:bg-slate-800">
                  <img
                    src={mainImage}
                    alt="Foto Principal"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isUploadingMain && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                      <span className="text-xs font-bold">Optimizando y convirtiendo a WebP...</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/60 px-2.5 py-1 rounded-lg w-fit backdrop-blur-xs">
                      Foto Principal
                    </span>
                    {/* Únicamente botón "Cambiar" (sin botón quitar, según requerimiento) */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isUploadingMain}
                        onClick={() => mainFileInputRef.current?.click()}
                        className="h-9 px-4 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Cambiar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !isUploadingMain && mainFileInputRef.current?.click()}
                  className="w-full aspect-square rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:scale-[1.01] group"
                >
                  {isUploadingMain ? (
                    <>
                      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Optimizando a WebP...
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Procesando en tu dispositivo...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-2xs">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                        Subir Imagen Principal
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-tight block">
                        Foto de portada en el catálogo y mostrador.
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 2. CUADRADITOS CHICOS DEBAJO: IMÁGENES ADICIONALES (PARA TIENDA WEB) */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    Imágenes Adicionales
                  </label>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Fotos adicionales para mostrar más ángulos.
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {additionalImages.length} / 6
                </span>
              </div>

              {/* Grid de Cuadraditos de Miniaturas */}
              <div className="grid grid-cols-4 gap-2.5 pt-1">
                {additionalImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
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

                {/* Botón para añadir foto adicional desde explorador de archivos */}
                {additionalImages.length < 6 && (
                  <button
                    type="button"
                    disabled={isUploadingAdditional}
                    onClick={() => additionalFileInputRef.current?.click()}
                    title="Seleccionar foto adicional desde tus archivos"
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer group"
                  >
                    {isUploadingAdditional ? (
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    ) : (
                      <>
                        <Plus className="h-5 w-5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold mt-0.5">Agregar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              LADO DERECHO (COL 12 -> 7): NOMBRE, CATEGORÍA Y DESCRIPCIÓN
              ------------------------------------------------------------------- */}
          <div className="md:col-span-7 space-y-4">
            {/* 1. Nombre del Producto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre del Producto <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. Reloj Inteligente Watch X1 Pro Resistente al Agua"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl text-sm font-medium bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal transition-all duration-150 focus-visible:border-indigo-500 dark:focus-visible:border-indigo-400 focus-visible:ring-3 focus-visible:ring-indigo-500/15 dark:focus-visible:ring-indigo-400/20 shadow-2xs"
                required
              />
              <span className="text-[11px] text-slate-400 block">
                Nombre con el que tus clientes identificarán el producto.
              </span>
            </div>

            {/* 2. Categoría del Producto (Ubicada debajo del Nombre) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Categoría del Producto
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {categories.length} categorías disponibles
                </span>
              </div>
              <select
                value={selectedCategoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryId(val ? parseInt(val, 10) : null);
                }}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white font-medium cursor-pointer outline-none focus:border-indigo-500 dark:focus-visible:border-indigo-400 focus:ring-3 focus:ring-indigo-500/15 dark:focus:ring-indigo-400/20 transition-all shadow-2xs text-xs"
              >
                <option value="">Sin categoría asignada</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 block">
                Clasifica este artículo dentro de tu catálogo y tienda online.
              </span>
            </div>

            {/* 3. Descripción del Producto */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Descripción del Producto
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {description.length} caracteres
                </span>
              </div>
              <textarea
                rows={5}
                placeholder="Escribe los detalles, características o especificaciones del producto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-3 focus:ring-indigo-500/15 dark:focus:ring-indigo-400/20 resize-none transition-all duration-150 leading-relaxed shadow-2xs"
              />
              <span className="text-[11px] text-slate-400 block">
                Detalles visibles para tus clientes en la tienda online.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILA 2: PRECIOS Y RENTABILIDAD COMERCIAL (EN BOLIVIANOS / BS)
          ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Precios & Rentabilidad Comercial
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Valores en {CURRENCY_NAME} ({CURRENCY_SYMBOL})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Precio de Venta al Público ({CURRENCY_SYMBOL}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                {CURRENCY_SYMBOL}
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-11 h-12 rounded-xl text-lg font-black bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xs"
                required
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Precio a cobrar en mostrador y en la web.
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {isEdit && <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                {isEdit ? "Costo Promedio Vigente (CPP)" : `Costo de Adquisición (${CURRENCY_SYMBOL})`}{" "}
                <span className="text-rose-500">*</span>
              </label>
              {isEdit && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/80">
                  Calculado por Kárdex
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
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
                  "pl-11 h-12 rounded-xl text-lg font-bold font-mono border border-slate-200 dark:border-slate-800 shadow-2xs",
                  isEdit
                    ? "bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85"
                    : "bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white"
                )}
                required
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              {isEdit
                ? "El costo unitario se actualiza automáticamente al registrar compras en el Kárdex."
                : "Lo que te cuesta comprar cada unidad (puedes poner 0)."}
            </span>
          </div>
        </div>

        {/* WIDGET FINANCIERO EN VIVO */}
        <div
          className={cn(
            "p-4.5 rounded-2xl border transition-all duration-200 flex flex-col gap-3",
            priceNum === 0 && costNum === 0
              ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
              : isNegativeProfit
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
              : "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/90 dark:border-indigo-800/80"
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-black",
                    isNegativeProfit
                      ? "text-rose-900 dark:text-rose-200"
                      : "text-indigo-900 dark:text-indigo-200"
                  )}
                >
                  {isNegativeProfit
                    ? "Alerta: Margen Negativo Detectado"
                    : "Ganancia Estimada por Unidad Vendida"}
                </span>
                {isNegativeProfit && (
                  <Badge className="bg-rose-600 text-white border-0 text-[10px] font-black uppercase">
                    Pérdida
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isNegativeProfit
                  ? "El precio de venta al público está por debajo del costo unitario de adquisición."
                  : "Cálculo automático de rendimiento comercial por artículo"}
              </span>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">
                  {isNegativeProfit ? "Pérdida por Unidad" : "Utilidad Bruta"}
                </span>
                <span
                  className={cn(
                    "text-lg font-black font-mono transition-colors",
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
                  "h-9 w-px hidden sm:block",
                  isNegativeProfit
                    ? "bg-rose-200 dark:bg-rose-800"
                    : "bg-indigo-200 dark:bg-indigo-800"
                )}
              />
              <div>
                <span className="block text-[10px] uppercase font-mono text-slate-400">
                  Margen Comercial
                </span>
                <span
                  className={cn(
                    "text-lg font-black font-mono transition-colors",
                    isNegativeProfit
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  {marginPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Banner de Advertencia en Rojo si hay pérdida */}
          {isNegativeProfit && (
            <div className="flex items-center gap-2 pt-2 border-t border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                Cuidado: Con este precio de venta perderás {CURRENCY_SYMBOL} {Math.abs(profitPerUnit).toFixed(2)} en cada unidad vendida. Ajusta el precio o renegocia con el proveedor.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FILA 3: INVENTARIO Y ABASTECIMIENTO (IZQ) + ESTADO Y CANALES (DER)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BLOQUE IZQUIERDO: INVENTARIO & ABASTECIMIENTO */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Boxes className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Inventario & Abastecimiento
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Stock Inicial y Alerta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {isEdit && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                    {isEdit ? "Stock en Mano:" : "Stock Inicial:"}
                  </label>
                  {isEdit && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800/80">
                      Auditado
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  disabled={isEdit}
                  onChange={(e) => setStock(e.target.value)}
                  className={cn(
                    "h-11 rounded-lg font-bold border border-slate-200 dark:border-slate-800 shadow-2xs",
                    isEdit
                      ? "bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none opacity-85"
                      : "bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white"
                  )}
                />
                <span className="text-[10px] text-slate-400 block leading-tight">
                  {isEdit
                    ? "Inmutable aquí. Para alterar stock registra compras o ajustes en el Kárdex."
                    : "Cantidad inicial para la venta."}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Alerta Stock Bajo:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="h-11 rounded-lg font-bold text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-2xs"
                  />
                  <span className="text-xs font-bold text-slate-400">uds</span>
                </div>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Aviso antes de agotar existencias.
                </span>
              </div>
            </div>

            {/* Proveedor Habitual (Asociado a Compras & Reabastecimiento) */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Proveedor Habitual:
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {suppliers.length} registrados
                </span>
              </div>
              <select
                value={selectedSupplierId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSupplierId(val ? parseInt(val, 10) : null);
                }}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white font-medium cursor-pointer shadow-2xs text-xs outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-3 focus:ring-indigo-500/15"
              >
                <option value="">Sin proveedor asignado</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block leading-tight">
                A quién le compras este artículo habitualmente para reponer stock.
              </span>
            </div>
          </div>
        </div>

        {/* BLOQUE DERECHO: OPERACIÓN & CANALES DE VENTA */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Operación & Canales de Venta
            </h2>
          </div>

          <div className="space-y-4 text-xs">

            {/* 1. SECCIÓN: ESTADO OPERATIVO */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Estado Operativo
                </span>
              </div>

              {/* Segmented Control Corporativo de Alto Contraste */}
              <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-slate-950/90 rounded-xl border border-slate-300/80 dark:border-slate-800 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-500 scale-[1.01]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <Check className={cn("h-4 w-4 stroke-[2.5]", isActive ? "text-white" : "opacity-40")} />
                  <span>Activo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActive(false);
                    toast.info("Producto marcado como Inactivo", {
                      description: "El producto no se podrá cobrar en caja ni se exhibirá en la tienda online.",
                    });
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
                    !isActive
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 border border-rose-500 scale-[1.01]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <X className={cn("h-4 w-4 stroke-[2.5]", !isActive ? "text-white" : "opacity-40")} />
                  <span>Inactivo</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400 block leading-tight">
                Los productos inactivos no se pueden cobrar en caja ni se exhiben en la tienda.
              </span>
            </div>

            {/* 2. SECCIÓN: VISUALIZACIÓN WEB (TIENDA ONLINE) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Visualización Web
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Canal Online
                </span>
              </div>

              {!isActive && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>El producto está Inactivo. Para publicarlo en la tienda, actívalo arriba.</span>
                </div>
              )}

              <div className="space-y-2">
                {/* Opción 1: Visible en Catálogo Web */}
                <div
                  onClick={() => isActive && setIsVisibleWeb(!isVisibleWeb)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-150 select-none cursor-pointer",
                    !isActive && "opacity-40 pointer-events-none",
                    isVisibleWeb && isActive
                      ? "bg-slate-50 dark:bg-slate-950/60 border-slate-300 dark:border-slate-700 shadow-2xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        isVisibleWeb && isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}
                    >
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        Visible en Catálogo
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {isVisibleWeb && isActive
                          ? "Público para los clientes en la tienda online"
                          : "Oculto para los compradores de la web"}
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <div
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5",
                      isVisibleWeb && isActive
                        ? "bg-indigo-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                        isVisibleWeb && isActive ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </div>
                </div>

                {/* Opción 2: Destacado en Portada Web */}
                <div
                  onClick={() => isActive && isVisibleWeb && setIsFeatured(!isFeatured)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-150 select-none cursor-pointer",
                    (!isActive || !isVisibleWeb) && "opacity-40 pointer-events-none",
                    isFeatured && isActive && isVisibleWeb
                      ? "bg-slate-50 dark:bg-slate-950/60 border-slate-300 dark:border-slate-700 shadow-2xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        isFeatured && isActive && isVisibleWeb
                          ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        Destacar en Portada
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {isFeatured && isActive && isVisibleWeb
                          ? "Prioridad en carrusel y sección principal de la web"
                          : "Posición normal en el listado del catálogo"}
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <div
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out p-0.5",
                      isFeatured && isActive && isVisibleWeb
                        ? "bg-indigo-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                        isFeatured && isActive && isVisibleWeb ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 block leading-tight">
                Controla la exhibición y promoción del producto en la tienda online.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA INFERIOR (ACCIONES Y GUARDADO)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <p className="text-xs text-slate-400 text-center sm:text-left">
          {isEdit
            ? "Los cambios se guardarán y sincronizarán de inmediato."
            : "El producto se registrará en tu catálogo e inventario."}
        </p>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Link href="/admin/inventario">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-lg font-bold text-xs cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              Descartar
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-10 px-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
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

    </form>
  );
}
