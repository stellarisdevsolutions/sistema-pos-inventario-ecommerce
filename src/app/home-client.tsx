"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  LayoutGrid,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { StoreProductCard } from "@/components/store/product-card";
import { StoreProduct, StoreCategory } from "@/app/actions/store";
import { formatCurrency } from "@/lib/currency";
import { STORE_FREE_SHIPPING_MIN_BS } from "@/lib/store-config";

interface HomeClientProps {
  products: StoreProduct[];
  categories: StoreCategory[];
}

export function HomeClient({ products, categories }: HomeClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const featuredOrdered = [
    ...products.filter((p) => p.isFeatured && (p.totalStock ?? p.stock) > 0),
    ...products.filter((p) => p.isFeatured && (p.totalStock ?? p.stock) <= 0),
    ...products.filter((p) => !p.isFeatured && (p.totalStock ?? p.stock) > 0),
    ...products.filter((p) => !p.isFeatured && (p.totalStock ?? p.stock) <= 0),
  ];

  const heroProducts = featuredOrdered.slice(0, 3);
  const safeHeroIndex = activeHeroIndex < heroProducts.length ? activeHeroIndex : 0;
  const activeHero = heroProducts[safeHeroIndex] ?? products[0] ?? null;

  const filteredProducts =
    selectedCategory === "todos"
      ? featuredOrdered
      : featuredOrdered.filter(
          (p) =>
            p.category?.slug === selectedCategory ||
            p.category?.name.toLowerCase() === selectedCategory.toLowerCase()
        );

  const handlePrevHero = () => {
    if (heroProducts.length <= 1) return;
    setActiveHeroIndex((prev) => (prev - 1 + heroProducts.length) % heroProducts.length);
  };

  const handleNextHero = () => {
    if (heroProducts.length <= 1) return;
    setActiveHeroIndex((prev) => (prev + 1) % heroProducts.length);
  };

  const trustItems = [
    {
      icon: Truck,
      title: "Envío gratis",
      desc: `Desde ${formatCurrency(STORE_FREE_SHIPPING_MIN_BS)} en Bolivia`,
    },
    {
      icon: ShieldCheck,
      title: "Garantía oficial",
      desc: "Respaldo técnico directo",
    },
    {
      icon: QrCode,
      title: "Pago QR seguro",
      desc: "Transferencia sin comisiones",
    },
    {
      icon: Headphones,
      title: "Soporte WhatsApp",
      desc: "Atención en horario comercial",
    },
  ];

  return (
    <div className="min-h-screen bg-store-bg text-store-ink font-store flex flex-col pb-24 md:pb-0 selection:bg-store-primary selection:text-store-on-primary">
      <StoreHeader categories={categories} />

      <main className="flex-1 w-full">
        {/* 1. Hero Estudio Claro con Vitrina y Círculo Acento */}
        <section className="bg-store-surface/60 border-b border-store-border">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Izquierda */}
            <div className="lg:col-span-6 space-y-5">
              <span className="inline-flex items-center bg-store-primary text-store-on-primary text-[11px] font-bold px-3.5 py-1 rounded-full">
                {activeHero?.category?.name
                  ? `Nuevo · ${activeHero.category.name}`
                  : "Stock físico en Bolivia"}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[1.03]">
                <span className="text-store-ink block">TECNOLOGÍA QUE</span>
                <span className="text-store-primary block">IMPULSA TU DÍA</span>
              </h1>

              <p className="text-sm sm:text-base text-store-muted max-w-md leading-relaxed">
                Equipos verificados en almacén, garantía directa y facturación legal con envío a toda Bolivia.
              </p>

              {/* 3 micro-beneficios con icono circular bordeado */}
              <div className="flex flex-wrap items-center gap-5 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-9 rounded-full border border-store-primary/40 text-store-primary flex items-center justify-center shrink-0">
                    <PackageCheck className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-store-ink">
                      Stock real
                    </span>
                    <span className="block text-[11px] text-store-muted">
                      Entrega inmediata
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-9 rounded-full border border-store-primary/40 text-store-primary flex items-center justify-center shrink-0">
                    <QrCode className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-store-ink">
                      Pago QR
                    </span>
                    <span className="block text-[11px] text-store-muted">
                      Sin comisiones
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-9 rounded-full border border-store-primary/40 text-store-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-store-ink">
                      Garantía
                    </span>
                    <span className="block text-[11px] text-store-muted">
                      Respaldo oficial
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/catalogo"
                  className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary font-bold text-xs sm:text-sm px-7 h-12 rounded-lg inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <span>COMPRAR AHORA</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {activeHero && (
                  <Link
                    href={`/producto/${activeHero.slug}`}
                    className="bg-store-bg hover:border-store-ink border border-store-border text-store-ink font-bold text-xs sm:text-sm px-6 h-12 rounded-lg inline-flex items-center transition-colors"
                  >
                    Ver producto
                  </Link>
                )}
              </div>
            </div>

            {/* Derecha: Vitrina editorial elevada sobre círculo acento */}
            <div className="lg:col-span-6 relative flex flex-col items-center justify-center py-4 sm:py-6">
              {activeHero ? (
                <>
                  <div className="relative w-full max-w-[340px] sm:max-w-[380px] flex items-center justify-center py-4">
                    {/* Círculo focal naranja y aro arquitectónico detrás */}
                    <div
                      aria-hidden="true"
                      className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-store-primary shadow-md"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute w-74 h-74 sm:w-88 sm:h-88 rounded-full border-2 border-store-primary/25 pointer-events-none"
                    />

                    {/* Tarjeta vitrina blanca para encuadrar fotos reales de cualquier formato */}
                    <Link
                      href={`/producto/${activeHero.slug}`}
                      className="group relative z-10 w-[86%] rounded-2xl bg-store-bg p-3 sm:p-4 shadow-xl border border-store-border hover:border-store-primary/40 transition-colors"
                    >
                      <div className="aspect-[4/3] w-full rounded-xl bg-store-surface/50 border border-store-border/50 flex items-center justify-center p-2.5 overflow-hidden">
                        <img
                          src={activeHero.imageUrl}
                          alt={activeHero.name}
                          className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 px-0.5">
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-store-primary truncate">
                            {activeHero.brand?.name || activeHero.category?.name || "Destacado"}
                          </span>
                          <span className="block text-xs sm:text-sm font-bold text-store-ink truncate group-hover:text-store-primary transition-colors">
                            {activeHero.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            (activeHero.totalStock ?? activeHero.stock) > 0
                              ? "bg-store-surface text-store-success"
                              : "bg-store-surface text-store-muted"
                          }`}
                        >
                          {(activeHero.totalStock ?? activeHero.stock) > 0
                            ? "En stock"
                            : "Agotado"}
                        </span>
                      </div>
                    </Link>

                    <Link
                      href={`/producto/${activeHero.slug}`}
                      className="absolute top-0 right-1 sm:-right-2 z-20 h-18 w-18 sm:h-21 sm:w-21 rounded-full bg-store-danger text-store-on-primary shadow-lg border-4 border-store-bg flex flex-col items-center justify-center text-center p-1.5 leading-tight hover:scale-[1.04] transition-transform"
                    >
                      <span className="text-[9px] sm:text-[10px] font-bold opacity-90">PRECIO</span>
                      <span className="text-[11px] sm:text-xs font-extrabold tabular-nums mt-0.5">
                        {formatCurrency(activeHero.minPrice ?? activeHero.price)}
                      </span>
                    </Link>
                  </div>

                  {/* Selector inferior */}
                  {heroProducts.length > 1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevHero}
                        aria-label="Producto anterior"
                        className="h-7 w-7 rounded-full border border-store-border bg-store-bg hover:border-store-primary text-store-ink flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      {heroProducts.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`Ver ${item.name}`}
                          onClick={() => setActiveHeroIndex(idx)}
                          className={`h-2 rounded-full transition-[width,background-color] duration-200 cursor-pointer ${
                            idx === safeHeroIndex
                              ? "bg-store-primary w-5"
                              : "bg-store-border w-2"
                          }`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={handleNextHero}
                        aria-label="Siguiente producto"
                        className="h-7 w-7 rounded-full border border-store-border bg-store-bg hover:border-store-primary text-store-ink flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-72 h-72 rounded-full bg-store-surface flex items-center justify-center text-sm text-store-muted">
                  Catálogo en actualización
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. Franja de Confianza (4 columnas sobre blanco) */}
        <section className="border-b border-store-border bg-store-bg">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3.5">
                  <Icon className="h-7 w-7 text-store-primary stroke-[1.6] shrink-0" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-store-ink">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-store-muted mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Compra por Categoría */}
        {categories.length > 0 && (
          <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 space-y-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-store-ink">Compra por </span>
                <span className="text-store-primary">Categoría</span>
              </h2>
              <Link
                href="/catalogo"
                className="text-xs font-bold text-store-ink hover:text-store-primary inline-flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Ver todas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((cat) => {
                const catImage =
                  cat.imageUrl ||
                  products.find((p) => p.category?.id === cat.id)?.imageUrl;

                return (
                  <Link
                    key={cat.id}
                    href={`/catalogo?cat=${encodeURIComponent(cat.slug)}`}
                    className="rounded-xl bg-store-surface hover:bg-store-primary-tint border border-transparent hover:border-store-primary/30 p-4 flex flex-col items-center text-center gap-3 transition-colors group"
                  >
                    <div className="h-24 w-full rounded-lg bg-store-bg border border-store-border/60 p-2.5 flex items-center justify-center overflow-hidden">
                      {catImage ? (
                        <img
                          src={catImage}
                          alt={cat.name}
                          className="max-h-full max-w-full rounded-md object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <LayoutGrid className="h-8 w-8 text-store-muted" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-store-ink line-clamp-1">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-store-muted tabular-nums mt-0.5">
                        {cat.count} {cat.count === 1 ? "producto" : "productos"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Banner Promocional Naranja con métricas reales */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-gradient-to-r from-store-primary via-store-primary to-store-primary-hover text-store-on-primary px-6 sm:px-10 py-6 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              <Zap className="h-10 w-10 fill-current shrink-0" />
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  ENVÍOS INMEDIATOS A TODA BOLIVIA
                </h2>
                <p className="text-xs sm:text-sm opacity-90 mt-0.5">
                  Stock real verificado en almacén y envío gratis desde{" "}
                  {formatCurrency(STORE_FREE_SHIPPING_MIN_BS)}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-store-ink text-store-on-ink rounded-lg px-3.5 py-2 text-center min-w-[74px]">
                <span className="block text-base font-extrabold tabular-nums leading-tight">
                  {products.length}
                </span>
                <span className="block text-[10px] text-store-on-ink-muted">
                  Productos
                </span>
              </div>
              <div className="bg-store-ink text-store-on-ink rounded-lg px-3.5 py-2 text-center min-w-[74px]">
                <span className="block text-base font-extrabold tabular-nums leading-tight">
                  {categories.length}
                </span>
                <span className="block text-[10px] text-store-on-ink-muted">
                  Categorías
                </span>
              </div>
              <div className="bg-store-ink text-store-on-ink rounded-lg px-3.5 py-2 text-center min-w-[74px]">
                <span className="block text-base font-extrabold tabular-nums leading-tight">
                  9
                </span>
                <span className="block text-[10px] text-store-on-ink-muted">
                  Deptos.
                </span>
              </div>
              <div className="hidden sm:block bg-store-ink text-store-on-ink rounded-lg px-3.5 py-2 text-center min-w-[74px]">
                <span className="block text-base font-extrabold tabular-nums leading-tight">
                  24–48h
                </span>
                <span className="block text-[10px] text-store-on-ink-muted">
                  Entrega
                </span>
              </div>
            </div>

            <Link
              href="/catalogo"
              className="bg-store-bg text-store-ink hover:bg-store-surface font-bold text-xs px-6 h-11 rounded-lg inline-flex items-center gap-2 shrink-0 transition-colors"
            >
              <span>Ver Catálogo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* 5. Productos Destacados (2 horizontales grandes + grilla de 5 columnas) */}
        <section className="max-w-[1320px] mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              <span className="text-store-ink">Productos </span>
              <span className="text-store-primary">Destacados</span>
            </h2>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("todos")}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === "todos"
                    ? "bg-store-primary text-store-on-primary"
                    : "bg-store-surface text-store-ink hover:bg-store-surface-hover"
                }`}
              >
                Todos
              </button>

              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.slug
                      ? "bg-store-primary text-store-on-primary"
                      : "bg-store-surface text-store-ink hover:bg-store-surface-hover"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-xl bg-store-surface p-12 text-center text-sm text-store-muted">
              No hay productos publicados en esta categoría por el momento.
            </div>
          ) : filteredProducts.length >= 2 ? (
            <div className="space-y-5">
              {/* Fila superior: 2 tarjetas anchas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredProducts.slice(0, 2).map((p) => (
                  <StoreProductCard key={p.id} product={p} layout="featured" />
                ))}
              </div>

              {/* Fila inferior: hasta 5 columnas */}
              {filteredProducts.length > 2 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {filteredProducts.slice(2, 12).map((p) => (
                    <StoreProductCard key={p.id} product={p} layout="grid" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredProducts.map((p) => (
                <StoreProductCard key={p.id} product={p} layout="grid" />
              ))}
            </div>
          )}

          <div className="pt-3 flex justify-center">
            <Link
              href="/catalogo"
              className="border border-store-ink text-store-ink hover:bg-store-ink hover:text-store-on-ink rounded-lg px-6 py-2.5 text-xs font-bold transition-colors"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </section>
      </main>

      <StoreFooter />
      <StoreCartSheet />
      <StoreMobileNav />
    </div>
  );
}
