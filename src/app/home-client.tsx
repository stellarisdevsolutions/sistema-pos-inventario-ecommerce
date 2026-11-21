"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { StoreProduct, StoreCategory } from "@/app/actions/store";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Flame,
  Heart,
  Plus,
  Sparkles,
  Truck,
  ShieldCheck,
  QrCode,
  Tag,
  Layers,
  Package,
} from "lucide-react";

interface HomeClientProps {
  products: StoreProduct[];
  categories: StoreCategory[];
}

// 3 Mini Banners promocionales de impacto
const miniBanners = [
  {
    id: 1,
    title: "Audio & Sonido Pro",
    subtitle: "Cancelación de ruido activa, altavoces y fidelidad acústica.",
    badge: "OFERTAS FLASH",
    badgeColor: "bg-rose-500",
    catSlug: "audio-sonido-pro",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    title: "Gaming & Periféricos",
    subtitle: "Teclados mecánicos, ratones de alta precisión y monitores.",
    badge: "ALTO RENDIMIENTO",
    badgeColor: "bg-sky-500",
    catSlug: "gaming-perifericos",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    title: "Accesorios & Wearables",
    subtitle: "Smartwatches, soportes ergonómicos y gadgets para tu setup.",
    badge: "STOCK DISPONIBLE",
    badgeColor: "bg-emerald-500",
    catSlug: "accesorios-wearables",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  },
];

export function HomeClient({ products, categories }: HomeClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const { addToCart, toggleFavorite, isFavorite } = useCart();

  // Productos para sección de ofertas (priorizando los que tienen stock)
  const offerProducts = products.filter((p) => p.stock > 0).slice(0, 4);

  // Productos para sección explorar filtrados por categoría real
  const filteredProducts =
    selectedCategory === "todos"
      ? products.slice(0, 8)
      : products
          .filter(
            (p) =>
              p.category?.slug === selectedCategory ||
              p.category?.name.toLowerCase() === selectedCategory.toLowerCase()
          )
          .slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-white">
      {/* 0. Header Global de la Tienda */}
      <StoreHeader />

      <main className="flex-1 w-full space-y-10 md:space-y-14">
        {/* =========================================================================
            1. SECCIÓN HERO PRINCIPAL
            ========================================================================= */}
        <section className="max-w-7xl w-full mx-auto px-4 pt-4 md:pt-6">
          <div className="relative w-full rounded-3xl overflow-hidden shadow-md flex items-center min-h-[360px] sm:min-h-[440px] lg:min-h-[500px] bg-slate-950">
            {/* Imagen de Fondo */}
            <img
              src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80"
              alt="Tecnología de Vanguardia"
              className="absolute inset-0 w-full h-full object-cover object-right md:object-center opacity-75"
            />

            {/* Gradiente de Superposición */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent max-w-full md:max-w-[70%]" />

            {/* Contenido Textual Hero */}
            <div className="relative z-10 p-6 sm:p-12 lg:p-16 max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                <span>TECNOLOGÍA DE VANGUARDIA • BOLIVIA</span>
              </span>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] uppercase">
                RENOVA TU EQUIPO CON <span className="text-store-primary">PRECIOS EN BS.</span>
              </h1>

              <p className="text-slate-300 text-xs sm:text-base font-normal leading-relaxed max-w-lg">
                Catálogo con stock real en almacén, garantía oficial, facturación legal y envíos inmediatos a toda Bolivia.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center gap-2 bg-store-primary hover:bg-store-primary-hover text-white text-xs sm:text-sm font-black px-6 py-3.5 rounded-xl shadow-lg transition-transform hover:scale-105 uppercase tracking-wide"
                >
                  <span>Comprar Ahora</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#ofertas"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold px-5 py-3.5 rounded-xl backdrop-blur-md border border-white/20 transition-colors uppercase tracking-wide"
                >
                  <span>Ver Ofertas Destacadas</span>
                </a>
              </div>

              {/* Badges de Confianza */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-store-primary" />
                  <span>Envíos a todo el país</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Garantía Oficial</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-sky-400" />
                  <span>Pago con QR Simple</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. SECCIÓN DE CATEGORÍAS REALES DE LA BASE DE DATOS
            ========================================================================= */}
        <section className="max-w-7xl w-full mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-store-primary block">
                COLECCIONES
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                COMPRA POR CATEGORÍA
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Explora nuestros productos organizados por departamento
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?cat=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col items-center bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-store-primary/40 transition-all text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-store-primary mb-3 group-hover:scale-105 transition-transform">
                  <Layers className="h-7 w-7" />
                </div>

                <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-store-primary transition-colors leading-tight line-clamp-2">
                  {cat.name}
                </h3>

                <span className="text-[10px] text-slate-400 font-semibold mt-1">
                  {cat.count} {cat.count === 1 ? "artículo" : "artículos"}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* =========================================================================
            3. SECCIÓN DE 3 MINI BANNERS
            ========================================================================= */}
        <section className="max-w-7xl w-full mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {miniBanners.map((banner) => (
              <div
                key={banner.id}
                className="relative rounded-3xl overflow-hidden bg-slate-950 shadow-sm min-h-[200px] flex items-center group border border-slate-200/60"
              >
                {/* Imagen del Banner */}
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                />

                {/* Overlay Oscuro */}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

                {/* Contenido del Mini Banner */}
                <div className="relative z-10 p-6 space-y-2 max-w-xs">
                  <span
                    className={`inline-block text-[9px] font-black uppercase tracking-wider text-white px-2.5 py-0.5 rounded-md ${banner.badgeColor}`}
                  >
                    {banner.badge}
                  </span>

                  <h3 className="text-lg font-black text-white leading-tight uppercase">
                    {banner.title}
                  </h3>

                  <p className="text-[11px] text-slate-300 font-normal line-clamp-2">
                    {banner.subtitle}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`/catalogo?cat=${banner.catSlug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 uppercase tracking-wide group-hover:translate-x-1 transition-transform"
                    >
                      <span>Ver Productos</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            4. SECCIÓN DE PRODUCTOS DESTACADOS / OFERTAS CON STOCK
            ========================================================================= */}
        <section id="ofertas" className="max-w-7xl w-full mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 text-rose-600 font-black text-xs uppercase tracking-wider">
                <Flame className="h-4 w-4 fill-rose-600 animate-pulse" />
                <span>DISPONIBILIDAD INMEDIATA</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                PRODUCTOS DESTACADOS
              </h2>
            </div>

            <Link
              href="/catalogo"
              className="text-xs font-bold text-store-primary hover:text-store-primary-hover flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Ver todo el catálogo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
            {offerProducts.map((p) => {
              const isFav = isFavorite(p.id);

              return (
                <article
                  key={p.id}
                  className="card bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <span className="absolute top-3 left-3 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md z-10 shadow-xs flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    En Stock ({p.stock})
                  </span>

                  {/* Botón Favoritos */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(p.id)}
                    className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer ${
                      isFav
                        ? "bg-rose-50 text-rose-500"
                        : "bg-slate-100/80 text-slate-400 hover:text-slate-600"
                    }`}
                    title="Guardar en favoritos"
                    aria-label="Guardar en favoritos"
                  >
                    <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500" : ""}`} />
                  </button>

                  {/* Imagen del Producto */}
                  <Link
                    href={`/producto/${p.slug}`}
                    className="h-40 sm:h-48 w-full rounded-xl bg-slate-50 flex items-center justify-center p-3 mb-2 overflow-hidden block"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Información y Precios en Bolivianos */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase truncate">
                      {p.category?.name || "General"}
                    </div>

                    <Link href={`/producto/${p.slug}`}>
                      <h3 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                        {p.name}
                      </h3>
                    </Link>

                    <div className="pt-2 flex items-end justify-between border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Precio</span>
                        <span className="text-base sm:text-lg font-black text-slate-950 block">
                          {formatCurrency(p.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (p.modelCode) { window.location.assign("/producto/" + p.slug); return; }
                          addToCart({
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            image: p.imageUrl,
                            quantity: 1,
                          });
                        }}
                        className="h-9 w-9 rounded-xl bg-slate-950 hover:bg-store-primary text-white flex items-center justify-center transition-all shadow-xs active:scale-95 group-hover:bg-store-primary cursor-pointer"
                        title="Añadir al carrito"
                        aria-label={`Añadir ${p.name} al carrito`}
                      >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            5. SECCIÓN DE BANNER: EXPLORA MÁS PRODUCTOS
            ========================================================================= */}
        <section className="max-w-7xl w-full mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 p-8 sm:p-12 lg:p-14 text-white shadow-xl flex items-center">
            {/* Imagen de Fondo */}
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&auto=format&fit=crop&q=80"
              alt="Explora Más Productos"
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />

            {/* Gradiente de Superposición */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />

            <div className="relative z-10 max-w-xl space-y-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-store-primary bg-store-primary/20 px-3 py-1 rounded-md border border-store-primary/30">
                <Tag className="h-3.5 w-3.5" />
                <span>CATÁLOGO COMPLETO DISPONIBLE</span>
              </span>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-tight">
                EXPLORA MÁS PRODUCTOS <br />
                <span className="text-store-primary">Y NOVEDADES TECH</span>
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed">
                Desde periféricos gaming hasta accesorios de audio y oficina. Stock real y sincronizado con nuestro sistema de inventario.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center gap-2 bg-store-primary hover:bg-store-primary-hover text-white text-xs sm:text-sm font-black px-6 py-3.5 rounded-xl shadow-md transition-transform hover:scale-105 uppercase tracking-wide"
                >
                  <span>Explorar Catálogo</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. SECCIÓN DE EXPLORAR MÁS PRODUCTOS (CATÁLOGO FILTRABLE)
            ========================================================================= */}
        <section className="max-w-7xl w-full mx-auto px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-store-primary block">
                SELECCIÓN DESTACADA
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                MÁS PRODUCTOS PARA TI
              </h2>
            </div>

            <Badge variant="secondary" className="text-xs font-bold w-fit">
              {filteredProducts.length} productos mostrados
            </Badge>
          </div>

          {/* Filtros por Categoría Real */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory("todos")}
              className={`text-xs px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
                selectedCategory === "todos"
                  ? "bg-slate-950 text-white shadow-slate-950/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Todos ({products.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`text-xs px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
                  selectedCategory === cat.slug
                    ? "bg-slate-950 text-white shadow-slate-950/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>

          {/* Grid de Productos */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredProducts.map((p) => {
              const isFav = isFavorite(p.id);
              const inStock = p.stock > 0;

              return (
                <article
                  key={p.id}
                  className="card bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <span
                    className={`absolute top-3 left-3 text-[10px] font-black px-2 py-0.5 rounded-md z-10 border ${
                      inStock
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    {inStock ? `Stock: ${p.stock}` : "Agotado"}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(p.id)}
                    className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer ${
                      isFav
                        ? "bg-rose-50 text-rose-500"
                        : "bg-slate-100/90 text-slate-400 hover:text-slate-600"
                    }`}
                    title="Favoritos"
                    aria-label="Favoritos"
                  >
                    <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500" : ""}`} />
                  </button>

                  <Link
                    href={`/producto/${p.slug}`}
                    className="h-36 sm:h-44 w-full rounded-xl bg-slate-50 flex items-center justify-center p-3 mb-2 overflow-hidden block"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  <div className="space-y-1.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      {p.category?.name || "General"}
                    </span>

                    <Link href={`/producto/${p.slug}`}>
                      <h3 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                        {p.name}
                      </h3>
                    </Link>

                    <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">
                          Precio
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {formatCurrency(p.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!inStock}
                        onClick={() => {
                          if (inStock) {
                            if (p.modelCode) { window.location.assign("/producto/" + p.slug); return; }
                            addToCart({
                              id: p.id,
                              name: p.name,
                              price: p.price,
                              image: p.imageUrl,
                              quantity: 1,
                            });
                          }
                        }}
                        className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all shadow-xs active:scale-95 ${
                          inStock
                            ? "bg-slate-950 hover:bg-store-primary text-white group-hover:bg-store-primary cursor-pointer"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        title={inStock ? "Añadir al carrito" : "Sin stock"}
                        aria-label={`Añadir ${p.name} al carrito`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* =========================================================================
              7. BOTÓN FINAL: VER CATÁLOGO COMPLETO
              ========================================================================= */}
          <div className="text-center pt-8 pb-4">
            <Link href="/catalogo">
              <Button
                size="lg"
                className="h-14 px-8 rounded-2xl bg-slate-950 hover:bg-store-primary text-white text-xs sm:text-sm font-black gap-2.5 shadow-lg transition-all hover:scale-105 uppercase tracking-wider cursor-pointer"
              >
                <span>Ver Catálogo Completo</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* 8. Componentes del Pie de la Tienda */}
      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
