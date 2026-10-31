"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { PRODUCTS_CATALOG } from "@/data/mock-products";
import { useCart } from "@/context/cart-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowRight,
  ChevronRight,
  List,
  Flame,
  Star,
  ShoppingCart,
  Heart,
  Plus,
  Sparkles,
} from "lucide-react";

// Categorías para el Menú Desktop
const categoriesList = [
  {
    name: "Laptops y Monitores",
    filter: "Laptops",
    count: "24 arts.",
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Componentes de PC",
    filter: "Gaming",
    count: "38 arts.",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Periféricos Gaming",
    filter: "Gaming",
    count: "29 arts.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Smartphones",
    filter: "Smartphones",
    count: "35 arts.",
    image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Audífonos & Sonido",
    filter: "Audífonos",
    count: "42 arts.",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Smartwatches",
    filter: "Smartwatches",
    count: "19 arts.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Accesorios Tech",
    filter: "Accesorios",
    count: "50 arts.",
    image: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=120&auto=format&fit=crop&q=80",
  },
];

// Categorías para Mobile
const mobileCategories = [
  {
    id: "laptops-monitores",
    name: "Laptops y Monitores",
    filter: "Laptops",
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "componentes-pc",
    name: "Componentes de PC",
    filter: "Gaming",
    image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "perifericos-gaming",
    name: "Periféricos Gaming",
    filter: "Gaming",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "smartphones",
    name: "Smartphones",
    filter: "Smartphones",
    image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "audio",
    name: "Audífonos & Audio",
    filter: "Audífonos",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "smartwatches",
    name: "Smartwatches",
    filter: "Smartwatches",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80",
  },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const { addToCart, toggleFavorite, isFavorite } = useCart();

  const filterTabs = [
    "Todos",
    "Smartphones",
    "Laptops",
    "Audífonos",
    "Smartwatches",
    "Gaming",
    "Accesorios",
  ];

  const flashOfferProducts = PRODUCTS_CATALOG.filter((p) => p.isFlashOffer).slice(0, 4);
  const featuredProducts = PRODUCTS_CATALOG.filter((p) => p.isFeatured).slice(0, 3);

  const filteredProducts =
    selectedCategory === "Todos"
      ? PRODUCTS_CATALOG
      : PRODUCTS_CATALOG.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-white">
      {/* 1. Header Global con paleta y navegación completa */}
      <StoreHeader />

      {/* 2. Sección Hero */}
      <section className="max-w-7xl w-full mx-auto p-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* LADO IZQUIERDO DESKTOP: Menú Vertical de Categorías */}
          <div className="hidden lg:flex lg:col-span-3 flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-100">
              <div className="p-1.5 rounded-lg bg-slate-900 text-white">
                <List className="h-4 w-4" />
              </div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">
                Categorías
              </h3>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {categoriesList.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/catalogo?cat=${encodeURIComponent(cat.filter)}`}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-7 w-7 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <span>{cat.name}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </Link>
              ))}
            </div>
          </div>

          {/* BANNER PRINCIPAL (Ocupa 9 cols en Desktop, y todo el ancho en Mobile) */}
          <div className="lg:col-span-9 flex">
            <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-sm flex items-center min-h-[260px] sm:min-h-[340px] lg:min-h-[440px] bg-slate-950">
              <img
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1400&auto=format&fit=crop&q=80"
                alt="Banner de Promoción"
                className="absolute inset-0 w-full h-full object-cover object-right md:object-center opacity-85"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent max-w-full md:max-w-[70%]" />

              <div className="relative z-10 p-6 sm:p-12 max-w-xl space-y-2.5 sm:space-y-4">
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-3 py-1 rounded-md inline-block border border-amber-500/30">
                  RENUEVA TU ESTILO Y TECNOLOGÍA
                </span>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08] uppercase">
                  HASTA <span className="text-store-primary">30% DTO.</span> <br />
                  EN SELECCIONADOS
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed max-w-md">
                  Explora las últimas novedades en audio, laptops y accesorios con envío inmediato y garantía directa.
                </p>

                <div className="pt-2">
                  <Link
                    href="/catalogo"
                    className="inline-flex items-center gap-2 bg-store-primary hover:bg-store-primary-hover text-white text-xs sm:text-sm font-extrabold px-6 py-3.5 rounded-xl shadow-md transition-transform hover:scale-105 uppercase tracking-wide"
                  >
                    <span>Comprar Ahora</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                <span className="h-2 w-7 rounded-full bg-store-primary shadow-xs" />
                <span className="h-2 w-2 rounded-full bg-white/60" />
                <span className="h-2 w-2 rounded-full bg-white/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Categorías en Mobile (COMPRA POR CATEGORÍA) */}
      <section className="md:hidden w-full px-4 pt-2 pb-6">
        <div className="text-center mb-5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950">
            COMPRA POR <span className="text-store-primary">CATEGORÍA</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto">
          {mobileCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogo?cat=${encodeURIComponent(cat.filter)}`}
              className="flex flex-col items-center group text-center focus:outline-hidden"
            >
              <div className="w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xs group-hover:shadow-md group-hover:scale-105 transition-all bg-white p-1">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                />
              </div>
              <span className="mt-2 text-[11px] font-black text-slate-900 leading-tight group-hover:text-store-primary transition-colors line-clamp-2">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Sección de Ofertas Flash */}
      <section id="ofertas" className="max-w-7xl w-full mx-auto p-4 md:py-8 space-y-6">
        <div className="relative rounded-3xl bg-gradient-to-r from-amber-500 via-store-primary to-rose-600 p-6 sm:p-8 text-white overflow-hidden shadow-lg">
          <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none">
            <Zap className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
                <span>OFERTAS FLASH • TIEMPO LIMITADO</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
                HASTA 50% DE DESCUENTO
              </h2>
              <p className="text-white/90 text-xs sm:text-sm max-w-xl font-normal">
                Aprovecha precios exclusivos de liquidación antes de que se agoten las unidades disponibles.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center px-1.5 sm:px-2.5">
                <span className="font-mono text-lg sm:text-2xl font-black text-amber-400 block leading-tight">
                  02
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Días</span>
              </div>
              <span className="font-black text-slate-500 text-lg sm:text-xl">:</span>
              <div className="text-center px-1.5 sm:px-2.5">
                <span className="font-mono text-lg sm:text-2xl font-black text-amber-400 block leading-tight">
                  14
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Horas</span>
              </div>
              <span className="font-black text-slate-500 text-lg sm:text-xl">:</span>
              <div className="text-center px-1.5 sm:px-2.5">
                <span className="font-mono text-lg sm:text-2xl font-black text-amber-400 block leading-tight">
                  36
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Min</span>
              </div>
              <span className="font-black text-slate-500 text-lg sm:text-xl">:</span>
              <div className="text-center px-1.5 sm:px-2.5">
                <span className="font-mono text-lg sm:text-2xl font-black text-rose-400 block leading-tight">
                  27
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Seg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
          {flashOfferProducts.map((p) => {
            const isFav = isFavorite(p.id);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-rose-100/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-xs flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {p.discount}
                </span>

                <button
                  onClick={() => toggleFavorite(p.id)}
                  className={`absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center transition-colors z-10 ${
                    isFav
                      ? "bg-rose-50 text-rose-500"
                      : "bg-slate-100/90 text-slate-400 hover:text-slate-600"
                  }`}
                  title="Favoritos"
                >
                  <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500" : ""}`} />
                </button>

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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase">
                    <span>{p.category}</span>
                    <span className="text-rose-600 font-black">Stock: {p.stock}</span>
                  </div>
                  <Link href={`/producto/${p.slug}`}>
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                      {p.name}
                    </h4>
                  </Link>

                  <div className="pt-1 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] line-through text-slate-400 font-semibold block">
                        ${p.originalPrice.toFixed(2)}
                      </span>
                      <span className="text-base sm:text-lg font-black text-rose-600">
                        ${p.price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      className="h-8 w-8 rounded-xl bg-slate-950 hover:bg-store-primary text-white flex items-center justify-center transition-all shadow-xs active:scale-95 group-hover:bg-store-primary"
                      title="Añadir al carrito"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Sección de Productos Destacados */}
      <section id="destacados" className="max-w-7xl w-full mx-auto p-4 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                PRODUCTOS DESTACADOS
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Los artículos mejor valorados y más elegidos por nuestros clientes
            </p>
          </div>

          <Link
            href="/catalogo"
            className="text-xs font-bold text-store-primary hover:text-store-primary-hover flex items-center gap-1"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {featuredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  {p.discount ? "OFERTA" : "DESTACADO"}
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span className="text-xs font-black text-slate-800">5.0</span>
                  <span className="text-[10px] text-slate-400 font-bold">({p.reviews})</span>
                </div>
              </div>

              <Link
                href={`/producto/${p.slug}`}
                className="h-48 w-full rounded-2xl bg-slate-50 flex items-center justify-center p-4 my-2 overflow-hidden block"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </Link>

              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  {p.category}
                </span>
                <Link href={`/producto/${p.slug}`}>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                    {p.name}
                  </h4>
                </Link>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    {p.originalPrice > p.price && (
                      <span className="text-xs line-through text-slate-400 block">
                        ${p.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xl font-black text-slate-950">
                      ${p.price.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    onClick={() => addToCart(p)}
                    className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black h-10 px-4 rounded-xl shadow-xs gap-1.5"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Añadir</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Listado de Productos Normal (Catálogo con Filtros por Pills) */}
      <section id="catalogo-normal" className="max-w-7xl w-full mx-auto p-4 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
              CATÁLOGO DE PRODUCTOS
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Encuentra la mejor tecnología con stock garantizado
            </p>
          </div>

          <Badge variant="secondary" className="text-xs font-bold w-fit">
            {filteredProducts.length} productos disponibles
          </Badge>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filterTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all shadow-2xs ${
                selectedCategory === cat
                  ? "bg-slate-950 text-white shadow-slate-950/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredProducts.map((p) => {
            const isFav = isFavorite(p.id);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                {p.discount && (
                  <span className="absolute top-3 left-3 bg-store-discount text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
                    {p.discount}
                  </span>
                )}

                <button
                  onClick={() => toggleFavorite(p.id)}
                  className={`absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center transition-colors z-10 ${
                    isFav
                      ? "bg-rose-50 text-rose-500"
                      : "bg-slate-100/90 text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500" : ""}`} />
                </button>

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
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {p.category}
                  </span>
                  <Link href={`/producto/${p.slug}`}>
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                      {p.name}
                    </h4>
                  </Link>

                  <div className="pt-1 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        Precio
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        ${p.price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      className="h-8 w-8 rounded-xl bg-slate-950 hover:bg-store-primary text-white flex items-center justify-center transition-all shadow-xs active:scale-95 group-hover:bg-store-primary"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
