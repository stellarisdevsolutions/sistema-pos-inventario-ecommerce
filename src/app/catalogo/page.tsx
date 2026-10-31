"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { PRODUCTS_CATALOG, Product } from "@/data/mock-products";
import { useCart } from "@/context/cart-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  SlidersHorizontal,
  Heart,
  ShoppingCart,
  Star,
  ArrowUpDown,
  Filter,
  X,
  Check,
  ChevronRight,
  Flame,
} from "lucide-react";

function CatalogoContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("cat") || "Todos";
  const initialQuery = searchParams.get("q") || "";
  const onlyFavs = searchParams.get("favs") === "true";

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "rating">("featured");
  const [selectedBrand, setSelectedBrand] = useState("Todas");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { addToCart, toggleFavorite, isFavorite, favorites } = useCart();

  const categories = [
    "Todos",
    "Smartphones",
    "Laptops",
    "Audífonos",
    "Smartwatches",
    "Gaming",
    "Accesorios",
  ];

  const brands = useMemo(() => {
    const list = Array.from(new Set(PRODUCTS_CATALOG.map((p) => p.brand)));
    return ["Todas", ...list];
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS_CATALOG.filter((p) => {
      if (onlyFavs && !favorites.includes(p.id)) return false;
      if (selectedCategory !== "Todos" && p.category !== selectedCategory) return false;
      if (selectedBrand !== "Todas" && p.brand !== selectedBrand) return false;
      if (onlyOffers && !p.discount && !p.isFlashOffer) return false;
      if (
        searchQuery.trim() &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0; // featured default
    });
  }, [selectedCategory, selectedBrand, onlyOffers, searchQuery, sortBy, onlyFavs, favorites]);

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col pb-20 md:pb-0">
      <StoreHeader />

      {/* Migas de Pan / Breadcrumbs & Banner */}
      <div className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-store-primary font-bold">Catálogo</span>
            {selectedCategory !== "Todos" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-slate-300">{selectedCategory}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
            {onlyFavs
              ? "Mis Productos Favoritos"
              : selectedCategory === "Todos"
              ? "Catálogo Completo de Tecnología"
              : selectedCategory}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Descubre nuestra gama premium de gadgets, periféricos y accesorios con entrega garantizada.
          </p>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl w-full mx-auto p-4 md:py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR DE FILTROS (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6 sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-store-primary" />
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  Filtros
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory("Todos");
                  setSelectedBrand("Todas");
                  setOnlyOffers(false);
                  setSearchQuery("");
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-store-primary transition-colors"
              >
                Limpiar todo
              </button>
            </div>

            {/* Búsqueda dentro del catálogo */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Búsqueda
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por nombre..."
                  className="pl-8 text-xs h-9 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Filtro por Categorías */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                Categorías
              </label>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      selectedCategory === cat
                        ? "bg-store-primary text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-75">
                      {cat === "Todos"
                        ? PRODUCTS_CATALOG.length
                        : PRODUCTS_CATALOG.filter((p) => p.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Marca */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                Marca
              </label>
              <div className="space-y-1">
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedBrand === b
                        ? "text-store-primary font-bold bg-orange-50"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{b}</span>
                    {selectedBrand === b && <Check className="h-3 w-3 text-store-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Solo Ofertas Switch */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setOnlyOffers(!onlyOffers)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                  onlyOffers
                    ? "bg-rose-50 border-rose-200 text-rose-600 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className={`h-4 w-4 ${onlyOffers ? "text-rose-500" : "text-slate-400"}`} />
                  <span>Solo en Oferta</span>
                </div>
                <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${onlyOffers ? "bg-rose-600 border-rose-600 text-white" : "border-slate-300"}`}>
                  {onlyOffers && <Check className="h-2.5 w-2.5" />}
                </span>
              </button>
            </div>
          </aside>

          {/* LISTA Y CONTENIDO DEL CATÁLOGO */}
          <main className="lg:col-span-9 space-y-5">
            {/* Barra Superior de Orden y Conteo */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="text-xs font-black text-slate-900">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "Producto" : "Productos"}
                </span>

                {/* Botón Filtros Mobile */}
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filtros</span>
                </button>
              </div>

              {/* Selector de Ordenamiento */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-store-primary"
                >
                  <option value="featured">Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="rating">Mejor Calificados</option>
                </select>
              </div>
            </div>

            {/* Badges de filtros activos */}
            {(selectedCategory !== "Todos" || selectedBrand !== "Todas" || onlyOffers || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Activos:</span>
                {selectedCategory !== "Todos" && (
                  <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700">
                    {selectedCategory}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory("Todos")} />
                  </Badge>
                )}
                {selectedBrand !== "Todas" && (
                  <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700">
                    Marca: {selectedBrand}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedBrand("Todas")} />
                  </Badge>
                )}
                {onlyOffers && (
                  <Badge className="gap-1 bg-rose-500 text-white">
                    En Oferta
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setOnlyOffers(false)} />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700">
                    &quot;{searchQuery}&quot;
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
              </div>
            )}

            {/* GRILLA DE PRODUCTOS */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Search className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-lg text-slate-900">No encontramos productos</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Intenta ajustar tus filtros o buscar con otro término.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedCategory("Todos");
                    setSelectedBrand("Todas");
                    setOnlyOffers(false);
                    setSearchQuery("");
                  }}
                  className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-bold rounded-xl"
                >
                  Restablecer Filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                {filteredProducts.map((p) => {
                  const isFav = isFavorite(p.id);

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                    >
                      {/* Descuento Badge */}
                      {p.discount && (
                        <span className="absolute top-3 left-3 bg-store-discount text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-2xs">
                          {p.discount}
                        </span>
                      )}

                      {/* Botón Favorito */}
                      <button
                        onClick={() => toggleFavorite(p.id)}
                        className={`absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center transition-colors z-10 ${
                          isFav
                            ? "bg-rose-50 text-rose-500"
                            : "bg-slate-100/90 text-slate-400 hover:text-slate-600"
                        }`}
                        title="Favorito"
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500" : ""}`} />
                      </button>

                      {/* Enlace Imagen Producto */}
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

                      {/* Información */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>{p.category}</span>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>5.0</span>
                          </div>
                        </div>

                        <Link href={`/producto/${p.slug}`} className="block">
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                            {p.name}
                          </h4>
                        </Link>

                        <div className="pt-2 flex items-baseline justify-between">
                          <div>
                            {p.originalPrice > p.price && (
                              <span className="text-[10px] text-slate-400 line-through block font-medium">
                                ${p.originalPrice.toFixed(2)}
                              </span>
                            )}
                            <span className="text-sm sm:text-base font-black text-slate-900">
                              ${p.price.toFixed(2)}
                            </span>
                          </div>

                          {/* Botón Carrito */}
                          <button
                            onClick={() => addToCart(p)}
                            className="h-8 w-8 rounded-xl bg-slate-950 hover:bg-store-primary text-white flex items-center justify-center transition-all shadow-xs active:scale-95 group-hover:bg-store-primary"
                            title="Añadir al carrito"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL MÓVIL DE FILTROS */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-5 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-store-primary" />
                  <h3 className="font-black text-sm uppercase">Filtros de Búsqueda</h3>
                </div>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Categorías Mobile */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-700">Categoría</label>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setMobileFiltersOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        selectedCategory === cat
                          ? "bg-store-primary text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ofertas */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setOnlyOffers(!onlyOffers);
                    setMobileFiltersOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold ${
                    onlyOffers ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <span>Solo en Oferta</span>
                  {onlyOffers && <Check className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black py-3 rounded-xl"
            >
              Ver {filteredProducts.length} Resultados
            </Button>
          </div>
        </div>
      )}

      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100/60 p-8 text-center text-xs font-bold">Cargando catálogo...</div>}>
      <CatalogoContent />
    </Suspense>
  );
}
