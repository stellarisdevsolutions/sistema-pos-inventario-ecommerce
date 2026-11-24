"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { StoreCategory, StoreProduct } from "@/app/actions/store";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { StoreProductCard } from "@/components/store/product-card";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";
import { STORE_WHATSAPP_NUMBER } from "@/lib/store-config";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

interface ProductClientProps {
  product: StoreProduct;
  relatedProducts: StoreProduct[];
  variants: StoreProduct[];
  categories?: StoreCategory[];
}

const subscribeNoop = () => () => {};
const getOriginSnapshot = () => window.location.origin;
const getOriginServerSnapshot = () => "";

export function ProductDetailClient({
  product: initialProduct,
  variants,
  relatedProducts,
  categories = [],
}: ProductClientProps) {
  const [variantId, setVariantId] = useState(initialProduct.id);
  const product = variants.find((variant) => variant.id === variantId) ?? initialProduct;
  const origin = useSyncExternalStore(
    subscribeNoop,
    getOriginSnapshot,
    getOriginServerSnapshot
  );
  const saleName = product.variant ? product.name + " — " + product.variant : product.name;
  const images = product.images.length > 0 ? product.images : [product.imageUrl];
  const [selectedImage, setSelectedImage] = useState(images[0] || product.imageUrl);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"descripcion" | "especificaciones" | "envios">(
    "descripcion"
  );

  const { addToCart, toggleFavorite, isFavorite, setIsCartOpen } = useCart();
  const isFav = isFavorite(product.id);
  const inStock = product.stock > 0;
  const isLowStock = inStock && product.stock <= product.minStock;

  const switchToVariant = (next: StoreProduct) => {
    setVariantId(next.id);
    setSelectedImage(next.imageUrl);
    setQuantity(1);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/producto/${next.slug}`);
    }
  };

  // Extraer dimensiones de atributos estructurados si existen
  const hasStructuredAttrs = variants.some(
    (v) => v.attributes && Object.keys(v.attributes).length > 0
  );

  const attributeDimensions: {
    name: string;
    type: "text" | "color";
    options: { value: string; hex?: string; image?: string; available: boolean }[];
  }[] = [];

  if (hasStructuredAttrs) {
    const dimMap = new Map<
      string,
      { type: "text" | "color"; values: Map<string, string | undefined> }
    >();
    const modelOpts = product.modelOptions ?? [];
    for (const cfg of modelOpts) {
      const valMap = new Map<string, string | undefined>();
      for (const v of cfg.values) {
        valMap.set(v.name, v.hex);
      }
      dimMap.set(cfg.name, { type: cfg.type, values: valMap });
    }
    for (const v of variants) {
      if (!v.attributes) continue;
      for (const [k, rawVal] of Object.entries(v.attributes)) {
        const cleanVal = rawVal.includes("|") ? rawVal.split("|")[0] : rawVal;
        const hexFromVal = rawVal.includes("|")
          ? rawVal.split("|")[1]
          : v.variantColor || undefined;
        let dim = dimMap.get(k);
        if (!dim) {
          dim = {
            type:
              k.toLowerCase().includes("color") || Boolean(v.variantColor) ? "color" : "text",
            values: new Map(),
          };
          dimMap.set(k, dim);
        }
        if (!dim.values.has(cleanVal)) {
          dim.values.set(cleanVal, hexFromVal);
        } else if (!dim.values.get(cleanVal) && hexFromVal) {
          dim.values.set(cleanVal, hexFromVal);
        }
      }
    }

    for (const [dimName, info] of dimMap.entries()) {
      const currentAttrs = product.attributes ?? {};
      const opts = Array.from(info.values.entries())
        .filter(([val]) =>
          variants.some((v) => {
            const raw = v.attributes?.[dimName];
            return (raw?.includes("|") ? raw.split("|")[0] : raw) === val;
          })
        )
        .map(([val, hex]) => {
          const matchingVariant = variants.find((v) => {
            if (!v.attributes) return false;
            const raw = v.attributes[dimName];
            if ((raw?.includes("|") ? raw.split("|")[0] : raw) !== val) return false;
            return Object.entries(currentAttrs).every(([k, currVal]) => {
              if (k === dimName) return true;
              const otherRaw = v.attributes?.[k];
              const cleanOther = otherRaw?.includes("|")
                ? otherRaw.split("|")[0]
                : otherRaw;
              const cleanCurr = currVal.includes("|") ? currVal.split("|")[0] : currVal;
              return cleanOther === cleanCurr;
            });
          });
          const variantWithVal =
            matchingVariant ??
            variants.find((v) => {
              const raw = v.attributes?.[dimName];
              return (raw?.includes("|") ? raw.split("|")[0] : raw) === val;
            });
          const anyWithVal = variants.some((v) => {
            const raw = v.attributes?.[dimName];
            return (raw?.includes("|") ? raw.split("|")[0] : raw) === val && v.stock > 0;
          });
          return {
            value: val,
            hex,
            image: variantWithVal?.imageUrl,
            available: matchingVariant ? matchingVariant.stock > 0 : anyWithVal,
          };
        });
      if (opts.length > 0) {
        attributeDimensions.push({ name: dimName, type: info.type, options: opts });
      }
    }
  }

  const handleSelectAttribute = (dimName: string, val: string) => {
    const currentAttrs = product.attributes ?? {};
    const exact = variants.find((v) => {
      if (!v.attributes) return false;
      const raw = v.attributes[dimName];
      if ((raw?.includes("|") ? raw.split("|")[0] : raw) !== val) return false;
      return Object.entries(currentAttrs).every(([k, currVal]) => {
        if (k === dimName) return true;
        const otherRaw = v.attributes?.[k];
        const cleanOther = otherRaw?.includes("|") ? otherRaw.split("|")[0] : otherRaw;
        const cleanCurr = currVal.includes("|") ? currVal.split("|")[0] : currVal;
        return cleanOther === cleanCurr;
      });
    });
    const fallback =
      variants.find((v) => {
        const raw = v.attributes?.[dimName];
        return (raw?.includes("|") ? raw.split("|")[0] : raw) === val && v.stock > 0;
      }) ??
      variants.find((v) => {
        const raw = v.attributes?.[dimName];
        return (raw?.includes("|") ? raw.split("|")[0] : raw) === val;
      });
    const target = exact ?? fallback;
    if (target) switchToVariant(target);
  };

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart({
      id: product.id,
      name: saleName,
      price: product.price,
      image: selectedImage,
      quantity,
      selectedVariant: product.variant || undefined,
      selectedColor: product.variantColor || undefined,
      maxStock: product.stock,
    });
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    addToCart({
      id: product.id,
      name: saleName,
      price: product.price,
      image: selectedImage,
      quantity,
      selectedVariant: product.variant || undefined,
      selectedColor: product.variantColor || undefined,
      maxStock: product.stock,
    });
    setIsCartOpen(true);
  };

  const handleShare = async () => {
    const shareUrl = origin
      ? `${origin}/producto/${product.slug}`
      : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Mira ${saleName} en nuestra tienda online:`,
          url: shareUrl,
        });
        return;
      } catch {
        // usuario canceló o navegador no soportó
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace copiado al portapapeles", {
        description: "Puedes compartirlo por WhatsApp o redes sociales.",
      });
    } catch {
      toast.info("Copia el enlace desde tu navegador", { description: shareUrl });
    }
  };

  const totalCalculated = product.price * quantity;
  const totalBs = formatCurrency(totalCalculated);

  const productSharePath = origin
    ? `${origin}/producto/${product.slug}`
    : `/producto/${product.slug}`;
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Me interesa comprar en su tienda online:\n\n` +
      `📦 *${saleName}*\n` +
      `🔢 Cantidad: ${quantity} unidad(es)\n` +
      `💰 Subtotal: ${totalBs}\n` +
      (product.sku ? `🏷️ SKU: ${product.sku}\n` : "") +
      `🔗 Enlace: ${productSharePath}\n\n` +
      `¿Tienen entrega inmediata y cómo puedo realizar el pago por QR Simple?`
  );

  return (
    <div className="min-h-screen bg-store-bg text-store-ink font-store flex flex-col pb-24 md:pb-0 selection:bg-store-primary selection:text-store-on-primary">
      <StoreHeader
        categories={categories}
        activeCategory={product.category?.slug}
      />

      {/* Migas de Pan Desktop */}
      <nav
        aria-label="Migas de pan"
        className="hidden md:block border-b border-store-border py-3 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-[1380px] mx-auto flex items-center gap-2 text-xs text-store-muted overflow-x-auto whitespace-nowrap no-scrollbar">
          <Link href="/" className="hover:text-store-ink transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href="/catalogo" className="hover:text-store-ink transition-colors">
            Catálogo
          </Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <Link
                href={`/catalogo?cat=${product.category.slug}`}
                className="hover:text-store-ink transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-store-ink font-medium truncate max-w-sm" aria-current="page">
            {product.name}
          </span>
        </div>
      </nav>

      {/* Ficha principal */}
      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-10 flex-1 space-y-10 md:space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-12 items-start">
          {/* Izquierda: Escenario fotográfico con tinte acento suave */}
          <div className="lg:col-span-6 lg:sticky lg:top-32 space-y-3">
            <div
              className="bg-store-primary-tint rounded-2xl sm:rounded-3xl aspect-[4/3] sm:aspect-square p-5 sm:p-10 flex items-center justify-center relative overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(color-mix(in srgb, var(--store-accent) 14%, transparent) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            >
              {/* Controles flotantes arriba */}
              <div className="absolute top-3.5 left-3.5 right-3.5 sm:top-4 sm:left-4 sm:right-4 z-10 flex items-center justify-between">
                <Link
                  href="/catalogo"
                  aria-label="Volver al catálogo"
                  className="md:hidden h-9 w-9 rounded-full bg-store-bg text-store-ink flex items-center justify-center shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="h-9 w-9 rounded-full bg-store-bg hover:bg-store-surface text-store-ink flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                    title="Compartir producto"
                    aria-label="Compartir enlace"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(product.id)}
                    className="h-9 w-9 rounded-full bg-store-bg hover:bg-store-surface text-store-ink flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                    title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                    aria-label="Guardar en favoritos"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFav ? "fill-store-primary text-store-primary" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <img
                src={selectedImage}
                alt={product.name}
                className="max-h-full max-w-full rounded-xl object-contain transition-transform duration-500 ease-out hover:scale-[1.03]"
              />
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-store-surface p-2 border-2 flex items-center justify-center overflow-hidden transition-[border-color] duration-150 shrink-0 cursor-pointer ${
                      selectedImage === img
                        ? "border-store-primary"
                        : "border-transparent hover:border-store-border"
                    }`}
                    title={`Ver imagen ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - vista ${idx + 1}`}
                      className="max-h-full max-w-full rounded-md object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Derecha: Compra y variantes (6 cols) */}
          <div className="lg:col-span-6 space-y-4 md:space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  {product.category && (
                    <Link
                      href={`/catalogo?cat=${product.category.slug}`}
                      className="font-semibold text-store-primary hover:underline truncate"
                    >
                      {product.category.name}
                    </Link>
                  )}
                  {product.category && product.brand && (
                    <span className="text-store-border">/</span>
                  )}
                  {product.brand && (
                    <span className="text-store-muted truncate">{product.brand.name}</span>
                  )}
                </div>

                {product.sku && (
                  <span className="font-mono text-xs text-store-muted shrink-0">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-bold text-store-ink tracking-[-0.03em] leading-[1.1]">
                {product.name}
              </h1>

              {/* Precio destacado */}
              <div className="pt-1 space-y-1">
                <span className="text-3xl font-bold text-store-primary tabular-nums block">
                  {formatCurrency(product.price)}
                </span>
                <p className="text-xs text-store-muted">
                  Incluye factura legal en Bolivianos (Bs) válida para descargo fiscal.
                </p>
              </div>

              {/* Estado de stock usando tokens */}
              <div className="pt-1 flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    inStock
                      ? isLowStock
                        ? "bg-store-warning"
                        : "bg-store-success"
                      : "bg-store-muted"
                  }`}
                />
                {inStock ? (
                  <span className="text-store-ink font-medium tabular-nums">
                    {isLowStock
                      ? `Últimas ${product.stock} unidades disponibles`
                      : `En stock — ${product.stock} disponibles para despacho inmediato`}
                  </span>
                ) : (
                  <span className="text-store-muted">Temporalmente agotado</span>
                )}
              </div>
            </div>

            {/* Selectores visuales de variantes (Imagen 2) */}
            {variants.length > 0 && attributeDimensions.length > 0 ? (
              <div className="space-y-4 pt-4 border-t border-store-border">
                {attributeDimensions.map((dim) => {
                  const currentRaw = product.attributes?.[dim.name];
                  const currentVal = currentRaw?.includes("|")
                    ? currentRaw.split("|")[0]
                    : currentRaw;
                  const isColorDim =
                    dim.type === "color" || dim.options.every((o) => Boolean(o.hex));

                  return (
                    <fieldset key={dim.name} className="space-y-2.5">
                      <legend className="text-xs font-medium text-store-muted">
                        {dim.name}:{" "}
                        <span className="text-store-ink font-semibold">{currentVal}</span>
                      </legend>
                      <div className="flex flex-wrap gap-2.5">
                        {dim.options.map((opt) => {
                          const selected = currentVal === opt.value;
                          if (isColorDim) {
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                aria-pressed={selected}
                                aria-label={`${dim.name}: ${opt.value}${
                                  !opt.available ? " (sin stock)" : ""
                                }`}
                                title={opt.value}
                                onClick={() => handleSelectAttribute(dim.name, opt.value)}
                                className={`rounded-xl border-2 p-1.5 bg-store-bg flex items-center gap-2 transition-colors cursor-pointer ${
                                  selected
                                    ? "border-store-primary"
                                    : "border-store-border hover:border-store-ink"
                                } ${!opt.available ? "opacity-45" : ""}`}
                              >
                                {opt.image ? (
                                  <img
                                    src={opt.image}
                                    alt={opt.value}
                                    className="h-10 w-10 rounded-lg bg-store-surface object-contain p-1 shrink-0"
                                  />
                                ) : opt.hex ? (
                                  <span
                                    aria-hidden="true"
                                    className="h-7 w-7 rounded-lg border border-black/15 shrink-0"
                                    style={{ backgroundColor: opt.hex }}
                                  />
                                ) : null}
                                <span className="text-xs font-medium text-store-ink pr-1.5">
                                  {opt.value}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => handleSelectAttribute(dim.name, opt.value)}
                              className={`rounded-xl h-10 min-w-12 px-3.5 border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                selected
                                  ? "bg-store-primary-deep border-store-primary-deep text-store-on-primary font-semibold"
                                  : "bg-store-bg border-store-border text-store-ink hover:border-store-ink"
                              } ${!opt.available ? "opacity-50" : ""}`}
                            >
                              {opt.hex && (
                                <span
                                  aria-hidden="true"
                                  className="size-3.5 rounded-full border border-black/15 shrink-0"
                                  style={{ backgroundColor: opt.hex }}
                                />
                              )}
                              <span>{opt.value}</span>
                              {!opt.available && (
                                <span className="text-[11px] opacity-75">(Agotado)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            ) : variants.length > 0 ? (
              <fieldset className="space-y-2.5 pt-4 border-t border-store-border">
                <legend className="text-xs font-medium text-store-muted">
                  {product.variantSelector || "Opción"}:{" "}
                  <span className="text-store-ink font-semibold">{product.variant}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {variants.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={option.id === product.id}
                      className={`rounded-xl border-2 p-2 inline-flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${
                        option.id === product.id
                          ? "border-store-primary bg-store-primary-tint text-store-ink font-semibold"
                          : "border-store-border bg-store-bg text-store-ink hover:border-store-ink"
                      } ${option.stock === 0 ? "opacity-50" : ""}`}
                      onClick={() => switchToVariant(option)}
                    >
                      {option.variantColor && (
                        <span
                          aria-hidden="true"
                          className="size-4 rounded-full border border-black/15"
                          style={{ backgroundColor: option.variantColor }}
                        />
                      )}
                      <span>{option.variant}</span>
                      {option.stock === 0 && (
                        <span className="text-[11px] opacity-75">(Agotado)</span>
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {/* Cantidad + Subtotal */}
            <div className="pt-4 border-t border-store-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-store-muted">Cantidad</span>
                <div className="inline-flex items-center rounded-full bg-store-surface p-1">
                  <button
                    type="button"
                    disabled={quantity <= 1 || !inStock}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-store-ink hover:bg-store-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Disminuir cantidad"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-3.5 font-semibold text-sm text-store-ink tabular-nums select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= product.stock || !inStock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-store-ink hover:bg-store-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Aumentar cantidad"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-store-muted block">Subtotal</span>
                <span className="text-base font-bold text-store-ink tabular-nums">
                  {totalBs}
                </span>
              </div>
            </div>

            {/* Botones de compra (desktop) */}
            <div className="space-y-2.5 pt-1">
              <div className="hidden md:grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleBuyNow}
                  className="h-12 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-sm font-bold flex items-center justify-center transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Comprar ahora
                </button>

                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleAddToCart}
                  className="h-12 rounded-lg bg-store-ink hover:bg-store-primary text-store-on-ink text-sm font-bold flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Añadir al carrito</span>
                </button>
              </div>

              <a
                href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-lg border border-store-border hover:border-store-ink text-store-ink text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>

            {/* 3 garantías en lista limpia */}
            <ul className="pt-5 border-t border-store-border space-y-2.5 text-xs text-store-muted">
              <li className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-store-primary stroke-[1.6] shrink-0" />
                <span>Envíos asegurados a los 9 departamentos de Bolivia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-store-primary stroke-[1.6] shrink-0" />
                <span>Facturación electrónica autorizada con NIT o Carnet</span>
              </li>
              <li className="flex items-center gap-2.5">
                <QrCode className="h-4 w-4 text-store-primary stroke-[1.6] shrink-0" />
                <span>Pago rápido vía QR Simple sin comisiones adicionales</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pestañas de detalles */}
        <section className="border-t border-store-border pt-10 space-y-6">
          <div className="flex items-center gap-8 border-b border-store-border overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("descripcion")}
              className={`pb-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "descripcion"
                  ? "border-store-primary text-store-ink font-semibold"
                  : "border-transparent text-store-muted hover:text-store-ink"
              }`}
            >
              Descripción
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("especificaciones")}
              className={`pb-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "especificaciones"
                  ? "border-store-primary text-store-ink font-semibold"
                  : "border-transparent text-store-muted hover:text-store-ink"
              }`}
            >
              Especificaciones
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("envios")}
              className={`pb-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "envios"
                  ? "border-store-primary text-store-ink font-semibold"
                  : "border-transparent text-store-muted hover:text-store-ink"
              }`}
            >
              Envíos y pago
            </button>
          </div>

          <div className="text-store-ink text-sm leading-relaxed">
            {activeTab === "descripcion" && (
              <div className="space-y-6 max-w-3xl">
                {product.description ? (
                  <p className="whitespace-pre-line text-store-muted leading-relaxed">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-store-muted">
                    Este producto cuenta con especificaciones de fábrica y garantía oficial en Bolivia. Consulta detalles adicionales de compatibilidad mediante WhatsApp.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-store-surface space-y-1.5">
                    <h4 className="font-semibold text-xs text-store-ink flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-store-primary stroke-[1.75]" />
                      Garantía certificada
                    </h4>
                    <p className="text-xs text-store-muted leading-relaxed">
                      Cobertura contra defectos de fabricación con respaldo técnico local.
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-store-surface space-y-1.5">
                    <h4 className="font-semibold text-xs text-store-ink flex items-center gap-2">
                      <FileText className="h-4 w-4 text-store-primary stroke-[1.75]" />
                      Factura legal de venta
                    </h4>
                    <p className="text-xs text-store-muted leading-relaxed">
                      Emitimos factura con código QR fiscal para descargo de compras empresariales o personales.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "especificaciones" && (
              <div className="max-w-2xl">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-store-border">
                    <tr>
                      <td className="font-medium text-store-muted py-3">Nombre comercial</td>
                      <td className="font-semibold text-store-ink py-3 text-right">
                        {product.name}
                      </td>
                    </tr>
                    {product.brand && (
                      <tr>
                        <td className="font-medium text-store-muted py-3">Marca</td>
                        <td className="font-semibold text-store-ink py-3 text-right">
                          {product.brand.name}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="font-medium text-store-muted py-3">Código SKU</td>
                      <td className="font-mono text-store-ink py-3 text-right">
                        {product.sku || "No asignado"}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-store-muted py-3">Código de barras</td>
                      <td className="font-mono text-store-ink py-3 text-right">
                        {product.barcode || "No asignado"}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-store-muted py-3">Categoría</td>
                      <td className="font-semibold text-store-ink py-3 text-right">
                        {product.category?.name || "General"}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-store-muted py-3">Stock físico</td>
                      <td className="font-semibold text-store-ink py-3 text-right tabular-nums">
                        {product.stock} unidades
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-store-muted py-3">Moneda</td>
                      <td className="font-semibold text-store-ink py-3 text-right">
                        Bolivianos (Bs)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "envios" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl text-xs">
                <div className="p-5 rounded-2xl bg-store-surface space-y-2">
                  <Truck className="h-5 w-5 text-store-primary stroke-[1.6]" />
                  <h4 className="font-semibold text-store-ink text-xs">
                    Envíos departamentales
                  </h4>
                  <p className="text-store-muted leading-relaxed">
                    Despachos en 24 a 48 horas a La Paz, El Alto, Cochabamba, Santa Cruz, Oruro, Potosí, Sucre, Tarija, Beni y Pando.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-store-surface space-y-2">
                  <QrCode className="h-5 w-5 text-store-primary stroke-[1.6]" />
                  <h4 className="font-semibold text-store-ink text-xs">
                    Pago con QR Simple
                  </h4>
                  <p className="text-store-muted leading-relaxed">
                    Paga sin comisiones desde la aplicación móvil de cualquier banco del sistema financiero boliviano.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-store-surface space-y-2">
                  <CreditCard className="h-5 w-5 text-store-primary stroke-[1.6]" />
                  <h4 className="font-semibold text-store-ink text-xs">
                    Pago contra entrega
                  </h4>
                  <p className="text-store-muted leading-relaxed">
                    Disponible para entregas locales y retiro en sucursal con previa coordinación por WhatsApp.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <section className="space-y-6 pt-10 border-t border-store-border">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em] text-store-ink">
                  También te puede interesar
                </h2>
                <p className="text-xs text-store-muted mt-1">
                  Más artículos seleccionados de nuestro catálogo.
                </p>
              </div>

              <Link
                href="/catalogo"
                className="text-xs font-semibold text-store-primary hover:underline shrink-0"
              >
                Ver catálogo
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {relatedProducts.slice(0, 4).map((p) => (
                <StoreProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Barra fija inferior de compra en móvil */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-store-bg/95 backdrop-blur-md border-t border-store-border px-4 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
          className="h-11 w-11 rounded-xl border border-store-border bg-store-bg flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Heart
            className={`h-5 w-5 ${
              isFav ? "fill-store-primary text-store-primary" : "text-store-ink"
            }`}
          />
        </button>

        <div className="min-w-0 leading-tight">
          <span className="block text-[10px] text-store-muted">Subtotal</span>
          <span className="block text-sm font-extrabold text-store-ink tabular-nums">
            {totalBs}
          </span>
        </div>

        <button
          type="button"
          disabled={!inStock}
          onClick={handleAddToCart}
          className="flex-1 h-11 rounded-xl bg-store-primary hover:bg-store-primary-hover text-store-on-primary font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{inStock ? "Añadir al carrito" : "Agotado"}</span>
        </button>
      </div>

      <StoreCartSheet />
      <StoreTrustBadges />
      <StoreFooter />
    </div>
  );
}
