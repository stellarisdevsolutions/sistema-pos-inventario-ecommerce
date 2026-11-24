"use client";

import { ProductLifecycle } from "./product-lifecycle";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  Copy,
  Edit,
  ExternalLink,
  Maximize2,
  Minimize2,
  TrendingDown,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export interface InventoryProductDetail {
  id: number;
  name: string;
  slug?: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  image: string;
  images?: string[];
  canHardDelete?: boolean;
  isActive?: boolean;
  isVisibleWeb?: boolean;
  isFeatured?: boolean;
  description?: string | null;
  modelCode?: string | null;
  variant?: string | null;
  variantColor?: string | null;
  attributes?: Record<string, string> | null;
  brand?: string | null;
  supplier?: string | null;
}

interface ProductDetailSheetProps {
  onChanged: () => void;
  product: InventoryProductDetail | null;
  onClose: () => void;
  onOpenKardex: (product: InventoryProductDetail) => void;
  onOpenAdjustment: (product: InventoryProductDetail) => void;
}

function isValidHex(color?: string | null): color is string {
  return Boolean(color && /^#[0-9a-fA-F]{3,8}$/.test(color.trim()));
}

function ProductDetailSheetBody({
  product,
  onChanged,
  onOpenKardex,
  onOpenAdjustment,
}: {
  product: InventoryProductDetail;
  onChanged: () => void;
  onOpenKardex: (product: InventoryProductDetail) => void;
  onOpenAdjustment: (product: InventoryProductDetail) => void;
}) {
  const galleryImages = useMemo(() => {
    const provided = (product.images ?? []).filter((img) => Boolean(img && img.trim()));
    if (provided.length > 0) {
      return Array.from(new Set(provided));
    }
    return product.image ? [product.image] : [];
  }, [product.images, product.image]);

  const [selectedImage, setSelectedImage] = useState<string>(
    galleryImages[0] ?? product.image
  );
  const [expandedImage, setExpandedImage] = useState(false);
  const [copiedField, setCopiedField] = useState<"sku" | "barcode" | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async (field: "sku" | "barcode", value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(`${label} copiado al portapapeles`);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedField((curr) => (curr === field ? null : curr));
      }, 1500);
    } catch {
      toast.error(`No se pudo copiar el ${label.toLowerCase()}`);
    }
  };

  const activeImage = selectedImage || galleryImages[0] || product.image;
  const isOperational = product.isActive ?? true;
  const unitProfit = product.price - product.costPrice;
  const marginPercent = product.price > 0 ? (unitProfit / product.price) * 100 : 0;
  const stockGaugeMax = Math.max(product.minStock * 2, product.stock, 1);
  const stockGaugePercent = Math.min(100, Math.round((product.stock / stockGaugeMax) * 100));
  const warehouseCostValue = product.stock * product.costPrice;
  const potentialSaleValue = product.stock * product.price;

  const attributeChips = useMemo(() => {
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      return Object.entries(product.attributes).map(([key, rawValue]) => {
        const [valText, hexPart] = rawValue.includes("|")
          ? rawValue.split("|", 2)
          : [rawValue, undefined];
        const fallbackHex = key.toLowerCase().includes("color") ? product.variantColor : null;
        const swatch = isValidHex(hexPart)
          ? hexPart.trim()
          : isValidHex(fallbackHex)
          ? fallbackHex.trim()
          : null;
        return { key, value: valText, swatch };
      });
    }
    if (product.variant) {
      return [
        {
          key: "Variante",
          value: product.variant,
          swatch: isValidHex(product.variantColor) ? product.variantColor.trim() : null,
        },
      ];
    }
    return [];
  }, [product.attributes, product.variant, product.variantColor]);

  const stockTone =
    product.status === "in_stock"
      ? {
          dot: "bg-emerald-500",
          text: "text-emerald-700 dark:text-emerald-400",
          bar: "bg-emerald-500",
          label: "En stock",
        }
      : product.status === "low_stock"
      ? {
          dot: "bg-amber-500",
          text: "text-amber-700 dark:text-amber-400",
          bar: "bg-amber-500",
          label: "Bajo stock",
        }
      : {
          dot: "bg-rose-500",
          text: "text-rose-700 dark:text-rose-400",
          bar: "bg-rose-500",
          label: "Agotado",
        };

  const marginBadgeTone =
    marginPercent >= 20
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
      : marginPercent >= 0
      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25"
      : "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Barra superior compacta sin caja pesada */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-admin-card-border/70">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-admin-brand-text truncate">
            {product.category}
          </span>
          <span aria-hidden className="text-admin-muted/60">
            ·
          </span>
          <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0", stockTone.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", stockTone.dot)} />
            {stockTone.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {product.isVisibleWeb && isOperational && product.slug && (
            <Link
              href={`/producto/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver en tienda online"
              aria-label="Ver producto en tienda online"
              className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-admin-raised text-admin-muted hover:text-admin-brand-text transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
          <SheetClose
            render={
              <button
                type="button"
                aria-label="Cerrar ficha lateral"
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-admin-raised text-admin-muted hover:text-admin-text transition-colors cursor-pointer"
              />
            }
          >
            <X className="h-4 w-4" />
          </SheetClose>
        </div>
      </div>

      {/* Cuerpo scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
        {/* Bloque héroe: foto nítida 80x80 + identidad + SKU */}
        <div className="space-y-3">
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={() => setExpandedImage((v) => !v)}
              title={expandedImage ? "Contraer vista previa" : "Ampliar fotografía"}
              aria-label={expandedImage ? "Contraer fotografía" : "Ampliar fotografía"}
              className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-admin-raised ring-1 ring-inset ring-black/10 dark:ring-white/10 group relative cursor-pointer"
            >
              <ProductThumbnail
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span className="absolute right-1.5 bottom-1.5 h-5 w-5 rounded-md bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {expandedImage ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[17px] font-semibold tracking-tight text-admin-text leading-snug text-balance">
                {product.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Ficha lateral de {product.name}
              </SheetDescription>

              <button
                type="button"
                onClick={() => handleCopy("sku", product.sku, "SKU")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-admin-raised px-2 py-1 text-[11px] font-mono text-admin-secondary hover:text-admin-text border border-admin-card-border cursor-pointer transition-colors"
                title="Copiar código SKU"
              >
                <span className="text-admin-muted">SKU</span>
                <span className="font-semibold text-admin-text">{product.sku}</span>
                {copiedField === "sku" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 text-admin-muted" />
                )}
              </button>
            </div>
          </div>

          {/* Vista ampliada bajo demanda */}
          {expandedImage && (
            <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-admin-raised ring-1 ring-inset ring-black/10 dark:ring-white/10">
              <ProductThumbnail
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          {/* Miniaturas si hay más de 1 imagen */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-0.5 pb-1">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImage(imgUrl)}
                  aria-label={`Ver imagen ${idx + 1} de ${product.name}`}
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-admin-raised cursor-pointer transition-all",
                    activeImage === imgUrl
                      ? "ring-2 ring-admin-brand ring-offset-2 ring-offset-admin-card-bg"
                      : "ring-1 ring-inset ring-black/10 dark:ring-white/10 opacity-70 hover:opacity-100"
                  )}
                >
                  <ProductThumbnail
                    src={imgUrl}
                    alt={`${product.name} miniatura ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Chips de variantes / atributos JSONB */}
          {attributeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {attributeChips.map((chip) => (
                <span
                  key={`${chip.key}-${chip.value}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-admin-raised border border-admin-card-border px-2.5 py-1 text-[11px]"
                >
                  {chip.swatch && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15 shrink-0"
                      style={{ backgroundColor: chip.swatch }}
                    />
                  )}
                  <span className="text-admin-muted">{chip.key}:</span>
                  <span className="font-semibold text-admin-text">{chip.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Zona 1: Tarjeta financiera unificada */}
        <section
          aria-label="Resumen financiero"
          className="rounded-2xl bg-admin-raised border border-admin-card-border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium text-admin-muted block">
                Precio de venta
              </span>
              <span className="text-[26px] font-semibold tracking-tight tabular-nums leading-tight text-admin-text mt-0.5 block">
                {formatCurrency(product.price)}
              </span>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums",
                marginBadgeTone
              )}
            >
              {marginPercent.toFixed(1)}% margen
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-admin-card-border grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-admin-muted block">Costo unitario</span>
              <span className="text-sm font-semibold tabular-nums text-admin-secondary mt-0.5 block">
                {formatCurrency(product.costPrice)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-admin-muted block">Utilidad unitaria</span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums mt-0.5 block",
                  unitProfit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {unitProfit >= 0 ? "+" : ""}
                {formatCurrency(unitProfit)}
              </span>
            </div>
          </div>
        </section>

        {/* Zona 2: Salud de stock y valorización */}
        <section aria-label="Existencias y valorización" className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted">
            Existencias y valorización
          </h3>

          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-admin-text">
                {product.stock}
              </span>
              <span className="text-xs text-admin-muted">unidades en almacén</span>
            </div>
            <span className="text-xs text-admin-muted tabular-nums">
              Alerta mín. {product.minStock} u.
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-admin-raised overflow-hidden ring-1 ring-inset ring-black/5 dark:ring-white/5">
            <div
              style={{ width: `${stockGaugePercent}%` }}
              className={cn("h-full rounded-full transition-[width] duration-300", stockTone.bar)}
            />
          </div>

          <div className="pt-2.5 border-t border-admin-card-border/70 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-admin-muted block">
                Valor en bodega (costo)
              </span>
              <span className="text-sm font-semibold tabular-nums text-admin-text mt-0.5 block">
                {formatCurrency(warehouseCostValue)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-admin-muted block">
                Potencial de venta
              </span>
              <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {formatCurrency(potentialSaleValue)}
              </span>
            </div>
          </div>
        </section>

        {/* Zona 3: Ficha técnica limpia con divisores hairline */}
        <section aria-label="Especificaciones" className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted">
            Especificaciones
          </h3>

          <dl className="divide-y divide-admin-card-border/70 border-y border-admin-card-border/70 text-xs">
            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-admin-muted">Estado operativo</dt>
              <dd className="font-medium text-admin-text inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isOperational ? "bg-emerald-500" : "bg-slate-400"
                  )}
                />
                {isOperational ? "Habilitado para POS" : "Pausado"}
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-admin-muted">Tienda online</dt>
              <dd className="flex items-center gap-1.5">
                <span className="font-medium text-admin-text">
                  {product.isVisibleWeb ?? true ? "Visible en web" : "Solo POS interno"}
                </span>
                {product.isFeatured && (
                  <span className="rounded-md bg-admin-brand-light text-admin-brand-text px-1.5 py-0.5 text-[10px] font-semibold">
                    Destacado
                  </span>
                )}
              </dd>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-3">
              <dt className="text-admin-muted">Código de barras</dt>
              <dd className="flex items-center gap-1.5 font-mono text-admin-text">
                {product.barcode && product.barcode !== "-" ? (
                  <>
                    <span>{product.barcode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("barcode", product.barcode, "Código de barras")}
                      aria-label="Copiar código de barras"
                      className="p-1 rounded hover:bg-admin-raised text-admin-muted hover:text-admin-text cursor-pointer transition-colors"
                    >
                      {copiedField === "barcode" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-admin-muted">—</span>
                )}
              </dd>
            </div>

            {product.modelCode && (
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-admin-muted">Modelo</dt>
                <dd className="font-mono font-medium text-admin-text">{product.modelCode}</dd>
              </div>
            )}

            {product.brand && (
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-admin-muted">Marca</dt>
                <dd className="font-medium text-admin-text">{product.brand}</dd>
              </div>
            )}

            {product.supplier && (
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-admin-muted">Proveedor</dt>
                <dd className="font-medium text-admin-text text-right truncate max-w-[60%]">
                  {product.supplier}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Descripción editorial */}
        <section aria-label="Descripción" className="space-y-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-admin-muted">
            Descripción
          </h3>
          {product.description && product.description.trim() ? (
            <p className="text-xs text-admin-secondary leading-relaxed whitespace-pre-line text-pretty">
              {product.description}
            </p>
          ) : (
            <p className="text-xs text-admin-muted italic">
              Sin descripción registrada para este producto.
            </p>
          )}
        </section>
      </div>

      {/* Footer fijo de acciones */}
      <div className="px-5 py-3.5 border-t border-admin-card-border bg-admin-card-bg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenAdjustment(product)}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-admin-card-border text-admin-secondary hover:text-admin-text cursor-pointer"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Baja</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenKardex(product)}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-admin-card-border text-admin-brand-text cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Kárdex</span>
          </Button>
        </div>

        <ProductLifecycle product={product} name={product.name} onChange={onChanged} />
        <Link
          href={`/admin/inventario/${product.id}/editar`}
          className={cn(
            buttonVariants({ size: "sm" }),
            "h-9 px-4 rounded-xl text-xs font-semibold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid gap-1.5"
          )}
        >
          <Edit className="h-3.5 w-3.5" />
          <span>Editar producto</span>
        </Link>
      </div>
    </div>
  );
}

export function ProductDetailSheet({
  product,
  onClose,
  onChanged,
  onOpenKardex,
  onOpenAdjustment,
}: ProductDetailSheetProps) {
  return (
    <Sheet
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "p-0 gap-0 bg-admin-card-bg text-admin-text shadow-2xl overflow-hidden flex flex-col",
          "data-[side=right]:w-full data-[side=right]:sm:max-w-[460px]",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full",
          "data-[side=right]:sm:inset-y-3 data-[side=right]:sm:right-3 data-[side=right]:sm:h-[calc(100dvh-1.5rem)]",
          "data-[side=right]:border-l data-[side=right]:sm:border data-[side=right]:border-admin-card-border",
          "sm:rounded-[20px]"
        )}
      >
        {product && (
          <ProductDetailSheetBody
            onChanged={onChanged}
            key={product.id}
            product={product}
            onOpenKardex={onOpenKardex}
            onOpenAdjustment={onOpenAdjustment}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
