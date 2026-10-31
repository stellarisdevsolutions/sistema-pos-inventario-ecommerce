"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/data/mock-products";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { useCart } from "@/context/cart-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  ShoppingCart,
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Plus,
  Minus,
  Check,
  ArrowRight,
  Sparkles,
  Share2,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ProductClientProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailClient({ product, relatedProducts }: ProductClientProps) {
  const [selectedImage, setSelectedImage] = useState(product.images[0] || product.image);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name || "");
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"descripcion" | "caracteristicas" | "especificaciones">("descripcion");

  const { addToCart, toggleFavorite, isFavorite } = useCart();
  const isFav = isFavorite(product.id);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: selectedImage,
      quantity,
      selectedColor,
      selectedVariant,
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Mira este producto en GadgetHub: ${product.name}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado al portapapeles");
    }
  };

  const whatsappMessage = encodeURIComponent(
    `¡Hola GadgetHub! Estoy interesado en comprar:\n\n` +
      `📦 *${product.name}*\n` +
      `💰 Precio: $${product.price.toFixed(2)}\n` +
      `🔢 Cantidad: ${quantity}\n` +
      (selectedColor ? `🎨 Color: ${selectedColor}\n` : "") +
      (selectedVariant ? `⚙️ Variante: ${selectedVariant}\n` : "") +
      `\n¿Tienen disponibilidad para envío inmediato?`
  );

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col pb-20 md:pb-0">
      <StoreHeader />

      {/* Migas de Pan / Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link href="/" className="hover:text-store-primary transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <Link href="/catalogo" className="hover:text-store-primary transition-colors">
            Catálogo
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <Link
            href={`/catalogo?cat=${encodeURIComponent(product.category)}`}
            className="hover:text-store-primary transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-900 truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* DETALLE PRINCIPAL: Galería + Compra */}
      <main className="max-w-7xl w-full mx-auto p-4 md:py-8 space-y-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: Galería de Imágenes (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Imagen Principal Grande con bordes modernos */}
            <div className="relative w-full aspect-square rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 flex items-center justify-center overflow-hidden group">
              {product.discount && (
                <span className="absolute top-4 left-4 bg-store-discount text-white text-xs font-black px-3 py-1 rounded-full z-10 shadow-sm">
                  {product.discount}
                </span>
              )}

              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={handleShare}
                  className="h-10 w-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  title="Compartir"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${
                    isFav
                      ? "bg-rose-50 text-rose-500"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                  title="Favoritos"
                >
                  <Heart className={`h-5 w-5 ${isFav ? "fill-rose-500" : ""}`} />
                </button>
              </div>

              <img
                src={selectedImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Selector de Miniaturas */}
            {product.images && product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`h-20 w-20 rounded-2xl bg-white border-2 p-2 flex items-center justify-center overflow-hidden transition-all shrink-0 ${
                      selectedImage === img
                        ? "border-store-primary shadow-xs scale-95"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: Ficha de Compra e Información (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            {/* Categoría, Marca y Calificación */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-store-primary bg-orange-50 px-3 py-1 rounded-full border border-orange-200/50">
                    {product.brand}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase">•</span>
                  <span className="text-xs text-slate-500 font-bold uppercase">
                    {product.category}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 text-xs font-black">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>5.0</span>
                  <span className="text-slate-400 font-medium">({product.reviews} reseñas)</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Disponibilidad */}
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Disponible en Stock ({product.stock} unidades listas para despacho)</span>
              </div>
            </div>

            {/* Precios */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  Precio de Oferta
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-slate-950">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-sm sm:text-base text-slate-400 line-through font-bold">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Precios con impuestos incluidos. Factura disponible.
                </span>
              </div>

              {product.discount && (
                <div className="bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-xs">
                  Ahorras {product.discount}
                </div>
              )}
            </div>

            {/* Selector de Colores si tiene */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  Color: <span className="text-store-primary">{selectedColor}</span>
                </label>
                <div className="flex items-center gap-3">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        selectedColor === c.name
                          ? "border-store-primary bg-orange-50/50 text-slate-900 shadow-xs ring-2 ring-store-primary/20"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de Variantes (ej. almacenamiento o talla) */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  Versión / Tamaño: <span className="text-store-primary">{selectedVariant}</span>
                </label>
                <div className="flex items-center gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                        selectedVariant === v
                          ? "border-store-primary bg-store-primary text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de Cantidad & Botones de Acción */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Control Cantidad */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shrink-0">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-white text-slate-700 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-black text-sm w-10 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-white text-slate-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Botón Añadir al Carrito */}
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black h-12 rounded-2xl shadow-md shadow-store-primary/25 gap-2 uppercase tracking-wide"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Añadir al Carrito</span>
                </Button>
              </div>

              {/* Botón Comprar Directo por WhatsApp */}
              <a
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide transition-all"
              >
                <MessageCircle className="h-4 w-4 fill-white" />
                <span>Comprar Ahora vía WhatsApp</span>
              </a>
            </div>

            {/* Garantías y Beneficios Rápidos */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <Truck className="h-4 w-4 mx-auto text-store-primary" />
                <span className="text-[10px] font-black uppercase text-slate-900 block">Envío Rápido</span>
                <span className="text-[9px] text-slate-500 block">24 a 48 Horas</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <ShieldCheck className="h-4 w-4 mx-auto text-store-primary" />
                <span className="text-[10px] font-black uppercase text-slate-900 block">Garantía</span>
                <span className="text-[9px] text-slate-500 block">12 Meses Oficial</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <RefreshCw className="h-4 w-4 mx-auto text-store-primary" />
                <span className="text-[10px] font-black uppercase text-slate-900 block">Devolución</span>
                <span className="text-[9px] text-slate-500 block">30 Días Gratis</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABS DE INFORMACIÓN: Descripción, Características, Especificaciones */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("descripcion")}
              className={`text-xs font-black px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all ${
                activeTab === "descripcion"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Descripción
            </button>
            <button
              onClick={() => setActiveTab("caracteristicas")}
              className={`text-xs font-black px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all ${
                activeTab === "caracteristicas"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Características Clave
            </button>
            <button
              onClick={() => setActiveTab("especificaciones")}
              className={`text-xs font-black px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all ${
                activeTab === "especificaciones"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Ficha Técnica
            </button>
          </div>

          {/* TAB 1: Descripción */}
          {activeTab === "descripcion" && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-lg font-black text-slate-900 uppercase">
                Acerca de este producto
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {product.description}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                En <strong>GadgetHub</strong> garantizamos la originalidad absoluta de todos nuestros equipos, incluyendo empaque sellado de fábrica, número de serie verificable y soporte técnico especializado.
              </p>
            </div>
          )}

          {/* TAB 2: Características */}
          {activeTab === "caracteristicas" && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 uppercase">
                Lo más destacado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3"
                  >
                    <div className="h-6 w-6 rounded-lg bg-store-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 leading-snug">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Especificaciones */}
          {activeTab === "especificaciones" && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 uppercase">
                Especificaciones Técnicas Detalladas
              </h3>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <tbody>
                    {Object.entries(product.specs).map(([key, val], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? "bg-slate-50/70" : "bg-white"}
                      >
                        <td className="px-4 py-3 font-bold text-slate-500 w-1/3 border-b border-slate-100">
                          {key}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900 border-b border-slate-100">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* SECCIÓN DE PRODUCTOS RELACIONADOS */}
        {relatedProducts.length > 0 && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-store-primary" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                  TAMBIÉN TE PUEDE INTERESAR
                </h2>
              </div>
              <Link
                href="/catalogo"
                className="text-xs font-bold text-store-primary hover:text-store-primary-hover flex items-center gap-1"
              >
                <span>Ver Más</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
              {relatedProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <Link
                    href={`/producto/${p.slug}`}
                    className="h-36 sm:h-44 w-full rounded-xl bg-slate-50 flex items-center justify-center p-3 mb-2 overflow-hidden block"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {p.category}
                    </span>
                    <Link href={`/producto/${p.slug}`}>
                      <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 hover:text-store-primary transition-colors">
                        {p.name}
                      </h4>
                    </Link>

                    <div className="pt-2 flex items-baseline justify-between">
                      <span className="text-sm font-black text-slate-900">
                        ${p.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => addToCart(p)}
                        className="h-8 w-8 rounded-xl bg-slate-950 hover:bg-store-primary text-white flex items-center justify-center transition-all"
                        title="Añadir"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
