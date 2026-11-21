"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreProduct } from "@/app/actions/store";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  ShoppingCart,
  Truck,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Plus,
  Minus,
  Check,
  ArrowRight,
  Share2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  Package,
  FileText,
  CreditCard,
  QrCode,
  Sparkles,
  Layers,
  Barcode,
} from "lucide-react";
import { toast } from "sonner";

interface ProductClientProps {
  product: StoreProduct;
  relatedProducts: StoreProduct[];
  variants: StoreProduct[];
}

export function ProductDetailClient({ product: initialProduct, variants, relatedProducts }: ProductClientProps) {
  const [variantId, setVariantId] = useState(initialProduct.id);
  const product = variants.find(variant => variant.id === variantId) ?? initialProduct;
  const saleName = product.variant ? product.name + " — " + product.variant : product.name;
  const images = product.images.length > 0 ? product.images : [product.imageUrl];
  const [selectedImage, setSelectedImage] = useState(images[0] || product.imageUrl);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"descripcion" | "especificaciones" | "envios">("descripcion");

  const { addToCart, toggleFavorite, isFavorite, setIsCartOpen } = useCart();
  const isFav = isFavorite(product.id);
  const inStock = product.stock > 0;
  const isLowStock = inStock && product.stock <= product.minStock;

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart({
      id: product.id,
      name: saleName,
      price: product.price,
      image: selectedImage,
      quantity,
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
    });
    setIsCartOpen(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Mira ${product.name} en nuestra tienda online:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado al portapapeles", {
        description: "Puedes compartirlo por WhatsApp o redes sociales.",
      });
    }
  };

  const totalCalculated = product.price * quantity;
  const totalBs = formatCurrency(totalCalculated);

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Me interesa comprar en su tienda online:\n\n` +
      `📦 *${saleName}*\n` +
      `🔢 Cantidad: ${quantity} unidad(es)\n` +
      `💰 Subtotal: ${totalBs}\n` +
      (product.sku ? `🏷️ SKU: ${product.sku}\n` : "") +
      `🔗 Enlace: ${typeof window !== "undefined" ? new URL("/producto/" + product.slug, window.location.origin).href : ""}\n\n` +
      `¿Tienen entrega inmediata y cómo puedo realizar el pago por QR Simple?`
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-white">
      {/* 0. Header Global de la Tienda */}
      <StoreHeader />

      {/* Migas de Pan / Breadcrumbs Accesibles */}
      <nav
        aria-label="Migas de pan"
        className="bg-white border-b border-slate-200/90 py-3.5 px-4 shadow-2xs"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link href="/" className="hover:text-store-primary transition-colors flex items-center gap-1">
            <span>Inicio</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <Link href="/catalogo" className="hover:text-store-primary transition-colors">
            Catálogo
          </Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
              <Link
                href={`/catalogo?cat=${product.category.slug}`}
                className="hover:text-store-primary transition-colors font-medium text-slate-700"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="text-slate-900 font-bold truncate max-w-sm" aria-current="page">
            {product.name}
          </span>
        </div>
      </nav>

      {/* Contenedor Principal de la Ficha Técnica */}
      <main className="max-w-7xl w-full mx-auto p-4 md:py-8 flex-1 space-y-10 md:space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: Galería Fotográfica y Vista Previa (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Visor Principal con Controles Flotantes */}
            <div className="relative w-full aspect-square rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-6 sm:p-8 flex items-center justify-center overflow-hidden group">
              {/* Badge de Stock Superior */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                {inStock ? (
                  isLowStock ? (
                    <span className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Últimas {product.stock} unidades
                    </span>
                  ) : (
                    <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Stock Disponible ({product.stock})
                    </span>
                  )
                ) : (
                  <span className="bg-slate-700 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Agotado
                  </span>
                )}
              </div>

              {/* Botones de Acción Rápida (Favorito + Compartir) */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handleShare}
                  className="h-10 w-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Compartir enlace del producto"
                  aria-label="Compartir enlace"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(product.id)}
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    isFav
                      ? "bg-rose-50 text-rose-500 border border-rose-200"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                  title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                  aria-label="Favorito"
                >
                  <Heart className={`h-4.5 w-4.5 ${isFav ? "fill-rose-500" : ""}`} />
                </button>
              </div>

              {/* Imagen en Resolución Completa */}
              <img
                src={selectedImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Selector de Miniaturas si hay múltiples tomas */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`h-20 w-20 rounded-2xl bg-white border-2 p-2 flex items-center justify-center overflow-hidden transition-all shrink-0 cursor-pointer ${
                      selectedImage === img
                        ? "border-store-primary shadow-xs scale-95 ring-2 ring-store-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    title={`Ver imagen ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - toma ${idx + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Ficha Rápida de Identificación de Almacén */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-xs space-y-2">
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Identificación de Inventario
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1.5 truncate">
                  <Package className="h-3.5 w-3.5 text-store-primary shrink-0" />
                  <span>ID Sistema: #{product.id}</span>
                </div>
                {product.sku && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Barcode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>SKU: {product.sku}</span>
                  </div>
                )}
                {product.category && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    <span className="truncate">{product.category.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Garantía Oficial</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Ficha de Compra, Precios y Acciones (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="space-y-3">
              {/* Categoría Real y SKU */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {product.category ? (
                  <Link
                    href={`/catalogo?cat=${product.category.slug}`}
                    className="text-xs font-black uppercase tracking-wider text-store-primary bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-full border border-orange-200/60 transition-colors"
                  >
                    {product.category.name}
                  </Link>
                ) : (
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    Tecnología
                  </span>
                )}

                {product.sku && (
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              {/* Título Oficial del Producto */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {product.name}
              </h1>

              {variants.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold">{product.variantSelector || "Variante"}</legend>
                  <div className="flex flex-wrap gap-2">
                    {variants.map(option => (
                      <button key={option.id} type="button" aria-pressed={option.id === product.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm aria-pressed:border-store-primary aria-pressed:bg-store-primary-light"
                        onClick={() => {
                          setVariantId(option.id);
                          setSelectedImage(option.imageUrl);
                          setQuantity(1);
                        }}>
                        {option.variantColor && <span aria-hidden className="size-4 rounded-full border border-slate-400" style={{ backgroundColor: option.variantColor }} />}
                        {option.variant}{option.stock === 0 && " · Sin stock"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {/* Estado de Inventario y Despacho */}
              <div className="flex items-center gap-2 text-xs font-bold">
                {inStock ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      {product.stock} {product.stock === 1 ? "unidad disponible" : "unidades disponibles"} en almacén para entrega inmediata
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/80">
                    <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Sin stock físico disponible actualmente en almacén</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fila de Precios Oficiales en Bolivianos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Precio Unitario Oficial
                </span>
                <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Moneda de facturación: <strong>Bolivianos (Bs)</strong>. Factura válida para descargo de impuestos.
                </span>
              </div>
            </div>

            {/* Selector de Cantidad y Cálculo Dinámico */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Cantidad:</span>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      disabled={quantity <= 1 || !inStock}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Disminuir cantidad"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-4 font-black text-sm text-slate-900 w-12 text-center select-none">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= product.stock || !inStock}
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Aumentar cantidad"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Subtotal Calculado</span>
                  <span className="text-lg font-black text-slate-900">{totalBs}</span>
                </div>
              </div>

              {/* Botones de Acción de Compra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Añadir al Carrito */}
                <Button
                  disabled={!inStock}
                  onClick={handleAddToCart}
                  className="h-13 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Añadir al Carrito</span>
                </Button>

                {/* Comprar Ahora */}
                <Button
                  disabled={!inStock}
                  onClick={handleBuyNow}
                  className="h-13 rounded-2xl bg-slate-950 hover:bg-store-primary text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Comprar Ahora</span>
                </Button>
              </div>

              {/* Botón WhatsApp de Consulta Directa */}
              <a
                href={`https://wa.me/59170000000?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Pedir o Consultar por WhatsApp</span>
              </a>
            </div>

            {/* Garantías y Beneficios de Compra */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <Truck className="h-4 w-4 text-store-primary shrink-0" />
                <span className="font-semibold">Envíos a toda Bolivia</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Facturación con NIT/CI</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <QrCode className="h-4 w-4 text-sky-600 shrink-0" />
                <span className="font-semibold">Pago con QR Simple</span>
              </div>
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE DETALLES TÉCNICOS Y ESPECIFICACIONES */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          {/* Cabecera de Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("descripcion")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "descripcion"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Descripción del Producto
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("especificaciones")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "especificaciones"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Ficha Técnica & Inventario
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("envios")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "envios"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Envíos & Formas de Pago
            </button>
          </div>

          {/* Contenido según Tab Activo */}
          <div className="text-slate-700 text-sm leading-relaxed">
            {activeTab === "descripcion" && (
              <div className="space-y-4 max-w-3xl">
                {product.description ? (
                  <p className="whitespace-pre-line text-slate-600">{product.description}</p>
                ) : (
                  <p className="text-slate-400 italic">
                    Este producto cuenta con especificaciones completas de fábrica y garantía oficial en Bolivia. Consulta detalles adicionales de configuración mediante nuestro canal directo de atención.
                  </p>
                )}

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Garantía Certificada
                    </h4>
                    <p className="text-xs text-slate-500">
                      Cobertura total contra defectos de fabricación con respaldo técnico local.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 mb-1">
                      <FileText className="h-4 w-4 text-sky-600" />
                      Factura Legal de Venta
                    </h4>
                    <p className="text-xs text-slate-500">
                      Emitimos factura con código QR fiscal para descargo de compras empresariales o personales.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "especificaciones" && (
              <div className="max-w-2xl">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="py-2.5 flex justify-between">
                      <td className="font-bold text-slate-400 uppercase py-2">Nombre Comercial</td>
                      <td className="font-semibold text-slate-900 py-2 text-right">{product.name}</td>
                    </tr>
                    <tr className="py-2.5 flex justify-between">
                      <td className="font-bold text-slate-400 uppercase py-2">Código SKU</td>
                      <td className="font-mono text-slate-900 py-2 text-right">{product.sku || "N/A"}</td>
                    </tr>
                    <tr className="py-2.5 flex justify-between">
                      <td className="font-bold text-slate-400 uppercase py-2">Código de Barras</td>
                      <td className="font-mono text-slate-900 py-2 text-right">{product.barcode || "N/A"}</td>
                    </tr>
                    <tr className="py-2.5 flex justify-between">
                      <td className="font-bold text-slate-400 uppercase py-2">Categoría</td>
                      <td className="font-semibold text-store-primary py-2 text-right">
                        {product.category?.name || "General"}
                      </td>
                    </tr>
                    <tr className="py-2.5 flex justify-between">
                      <td className="font-bold text-slate-400 uppercase py-2">Stock Físico en Mano</td>
                      <td className="font-bold text-emerald-600 py-2 text-right">
                        {product.stock} unidades
                      </td>
                    </tr>
                    <tr className="py-2.5 flex justify-between">
                      <td className="font-bold text-slate-400 uppercase py-2">Moneda Oficial</td>
                      <td className="font-semibold text-slate-900 py-2 text-right">Bolivianos (Bs)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "envios" && (
              <div className="space-y-4 max-w-3xl text-xs text-slate-600">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <Truck className="h-5 w-5 text-store-primary mb-2" />
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-xs mb-1">
                      Envíos Departamentales
                    </h4>
                    <p className="text-slate-500 leading-relaxed">
                      Despachos en 24 a 48 horas a La Paz, El Alto, Cochabamba, Santa Cruz, Oruro, Potosí, Sucre, Tarija, Beni y Pando.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <QrCode className="h-5 w-5 text-emerald-600 mb-2" />
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-xs mb-1">
                      Pago con QR Simple
                    </h4>
                    <p className="text-slate-500 leading-relaxed">
                      Paga sin comisiones desde la aplicación móvil de cualquier banco del sistema financiero boliviano.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <CreditCard className="h-5 w-5 text-sky-600 mb-2" />
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-xs mb-1">
                      Pago Contra Entrega
                    </h4>
                    <p className="text-slate-500 leading-relaxed">
                      Disponible para entregas locales y retiro en sucursal con previa coordinación por WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECCIÓN DE PRODUCTOS RELACIONADOS REALES */}
        {relatedProducts.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-store-primary block">
                  Recomendados
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                  Más en esta Categoría
                </h2>
              </div>

              <Link
                href="/catalogo"
                className="text-xs font-black text-store-primary hover:underline flex items-center gap-1"
              >
                <span>Ver Catálogo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedProducts.slice(0, 4).map((p) => (
                <article
                  key={p.id}
                  className="card bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <Link
                    href={`/producto/${p.slug}`}
                    className="h-36 w-full rounded-xl bg-slate-50 flex items-center justify-center p-3 mb-2 overflow-hidden block"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </Link>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">
                      {p.category?.name || "General"}
                    </span>
                    <Link href={`/producto/${p.slug}`}>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2 hover:text-store-primary transition-colors">
                        {p.name}
                      </h4>
                    </Link>
                    <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(p.price)}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          p.stock > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {p.stock > 0 ? `Stock: ${p.stock}` : "Agotado"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Cart Drawer */}
      <StoreCartSheet />

      {/* Mobile Nav Bar */}
      <StoreMobileNav />

      {/* Footer */}
      <StoreTrustBadges />
      <StoreFooter />
    </div>
  );
}
