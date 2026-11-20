"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { StoreProduct, StoreCategory } from "@/app/actions/store";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  SlidersHorizontal,
  Heart,
  ShoppingCart,
  ArrowUpDown,
  Filter,
  X,
  Check,
  ChevronRight,
  RotateCcw,
  Package,
  Layers,
} from "lucide-react";

interface CatalogoClientProps {
  initialProducts: StoreProduct[];
  categories: StoreCategory[];
}

export function CatalogoClient({ initialProducts, categories }: CatalogoClientProps) {
  const searchParams = useSearchParams();
  const initialCatSlug = searchParams.get("cat") || "todos";
  const initialQuery = searchParams.get("q") || "";
  const onlyFavs = searchParams.get("favs") === "true";

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCatSlug);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc" | "name-asc">("recent");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { addToCart, toggleFavorite, isFavorite, favorites } = useCart();

  // Filtrado 100% con datos reales de la base de datos
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        // Filtro favoritos
        if (onlyFavs && !favorites.includes(p.id)) return false;

        // Filtro de categoría real por slug o ID
        if (selectedCategory !== "todos") {
          const matchSlug = p.category?.slug === selectedCategory;
          const matchName = p.category?.name.toLowerCase() === selectedCategory.toLowerCase();
          if (!matchSlug && !matchName) return false;
        }

        // Filtro de solo stock disponible
        if (onlyInStock && p.stock <= 0) return false;

        // Búsqueda en tiempo real por nombre o descripción
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const inName = p.name.toLowerCase().includes(q);
          const inDesc = p.description ? p.description.toLowerCase().includes(q) : false;
          const inSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
          if (!inName && !inDesc && !inSku) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        return b.id - a.id; // Más recientes por ID descendente
      });
  }, [initialProducts, selectedCategory, onlyInStock, searchQuery, sortBy, onlyFavs, favorites]);

  const handleResetFilters = () => {
    setSelectedCategory("todos");
    setOnlyInStock(false);
    setSearchQuery("");
  };

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === "todos") return "Todos los Productos";
    const found = categories.find(
      (c) => c.slug === selectedCategory || c.name.toLowerCase() === selectedCategory.toLowerCase()
    );
    return found ? found.name : selectedCategory;
  }, [selectedCategory, categories]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-white">
      <StoreHeader />

      {/* Migas de Pan / Breadcrumbs & Banner Superior */}
      <div className="bg-slate-950 text-white py-8 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <nav aria-label="Migas de pan" className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <Link href="/catalogo" className="text-store-primary font-bold hover:underline">
              Catálogo
            </Link>
            {selectedCategory !== "todos" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-slate-200 font-semibold">{selectedCategoryName}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                {onlyFavs ? "Mis Productos Favoritos" : selectedCategoryName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1 font-normal">
                Explora nuestro catálogo en tiempo real con stock real, facturación legal y envíos en Bolivia.
              </p>
            </div>

            <Badge
              variant="secondary"
              className="text-xs font-bold w-fit bg-slate-800 text-slate-200 border border-slate-700 py-1.5 px-3 rounded-xl"
            >
              {filteredProducts.length} {filteredProducts.length === 1 ? "artículo disponible" : "artículos disponibles"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Contenido Principal con Sidebar de Filtros y Grid */}
      <div className="max-w-7xl w-full mx-auto p-4 md:py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR DE FILTROS (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6 sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-store-primary" />
                <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  Filtros del Catálogo
                </h2>
              </div>

              {(selectedCategory !== "todos" || onlyInStock || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-slate-400 hover:text-store-primary transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Restablecer</span>
                </button>
              )}
            </div>

            {/* Búsqueda dentro del catálogo */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                Búsqueda Rápida
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  className="pl-8 text-xs h-9 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro por Categorías Reales de la BD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  Categorías
                </label>
                <Layers className="h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="space-y-1">
                {/* Opción Todos */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("todos")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === "todos"
                      ? "bg-store-primary text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>Todas las Categorías</span>
                  <span
                    className={`text-[10px] ${
                      selectedCategory === "todos" ? "text-white/80" : "text-slate-400"
                    }`}
                  >
                    {initialProducts.length}
                  </span>
                </button>

                {/* Categorías Reales */}
                {categories.map((cat) => {
                  const isSelected =
                    selectedCategory === cat.slug ||
                    selectedCategory.toLowerCase() === cat.name.toLowerCase();

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-store-primary text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span
                        className={`text-[10px] shrink-0 ${
                          isSelected ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtro de Disponibilidad Real */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  onlyInStock
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className={`h-4 w-4 ${onlyInStock ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>Solo con Stock</span>
                </div>
                <span
                  className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                    onlyInStock ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                  }`}
                >
                  {onlyInStock && <Check className="h-2.5 w-2.5 stroke-[3]" />}
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
                  {filteredProducts.length}{" "}
                  {filteredProducts.length === 1 ? "Producto encontrado" : "Productos encontrados"}
                </span>

                {/* Botón Filtros Mobile */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filtros</span>
                </button>
              </div>

              {/* Selector de Ordenamiento Real */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-store-primary cursor-pointer"
                >
                  <option value="recent">Más Recientes</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="name-asc">Nombre (A - Z)</option>
                </select>
              </div>
            </div>

            {/* Badges de filtros activos */}
            {(selectedCategory !== "todos" || onlyInStock || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Filtros activos:</span>
                {selectedCategory !== "todos" && (
                  <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 rounded-lg">
                    Categoría: {selectedCategoryName}
                    <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => setSelectedCategory("todos")} />
                  </Badge>
                )}
                {onlyInStock && (
                  <Badge className="gap-1 bg-emerald-600 text-white rounded-lg">
                    Solo con Stock
                    <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setOnlyInStock(false)} />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700 rounded-lg">
                    &quot;{searchQuery}&quot;
                    <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Borrar filtros
                </button>
              </div>
            )}

            {/* GRILLA DE PRODUCTOS REALES */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Search className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-lg text-slate-900">No encontramos productos</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Intenta ajustar tus criterios de búsqueda o restablecer los filtros para ver todos los artículos.
                  </p>
                </div>
                <Button
                  onClick={handleResetFilters}
                  className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-bold rounded-xl"
                >
                  Ver Todo el Catálogo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                {filteredProducts.map((p) => {
                  const isFav = isFavorite(p.id);
                  const inStock = p.stock > 0;

                  return (
                    <article
                      key={p.id}
                      className="card bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                    >
                      {/* Estado de Stock en esquina superior izquierda */}
                      <span
                        className={`absolute top-3 left-3 text-[10px] font-black px-2 py-0.5 rounded-md z-10 shadow-2xs border ${
                          inStock
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {inStock ? `En stock (${p.stock})` : "Agotado"}
                      </span>

                      {/* Botón Favorito */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(p.id)}
                        className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer ${
                          isFav
                            ? "bg-rose-50 text-rose-500"
                            : "bg-slate-100/90 text-slate-400 hover:text-slate-600"
                        }`}
                        title="Guardar en favoritos"
                        aria-label="Guardar en favoritos"
                      >
                        <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500" : ""}`} />
                      </button>

                      {/* Enlace Imagen Producto */}
                      <Link
                        href={`/producto/${p.slug}`}
                        className="h-40 sm:h-48 w-full rounded-xl bg-slate-50 flex items-center justify-center p-3 mb-2 overflow-hidden block"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </Link>

                      {/* Información Real del Producto (SIN estrellas ni reseñas inventadas) */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {p.category?.name || "Tecnología"}
                        </div>

                        <Link href={`/producto/${p.slug}`} className="block">
                          <h3 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-store-primary transition-colors">
                            {p.name}
                          </h3>
                        </Link>

                        <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                          <div>
                            <span className="text-sm sm:text-base font-black text-slate-900">
                              {formatCurrency(p.price)}
                            </span>
                          </div>

                          {/* Botón Carrito */}
                          <button
                            type="button"
                            disabled={!inStock}
                            onClick={() => {
                              if (inStock) {
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
                            title={inStock ? "Añadir al carrito" : "Producto sin stock"}
                            aria-label={`Añadir ${p.name} al carrito`}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL MÓVIL DE FILTROS */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end lg:hidden">
          <div className="w-full max-w-xs bg-white h-full p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  Filtros de Catálogo
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Categorías en Móvil */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  Categorías
                </label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("todos");
                      setMobileFiltersOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                      selectedCategory === "todos"
                        ? "bg-store-primary text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>Todas las Categorías</span>
                    <span>{initialProducts.length}</span>
                  </button>

                  {categories.map((cat) => {
                    const isSelected =
                      selectedCategory === cat.slug ||
                      selectedCategory.toLowerCase() === cat.name.toLowerCase();

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.slug);
                          setMobileFiltersOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                          isSelected
                            ? "bg-store-primary text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate pr-2">{cat.name}</span>
                        <span>{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Solo en stock */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOnlyInStock(!onlyInStock)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold ${
                    onlyInStock
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Solo con Stock</span>
                  </div>
                  {onlyInStock && <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />}
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-2">
              <Button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-store-primary text-white font-bold text-xs rounded-xl"
              >
                Ver {filteredProducts.length} Resultados
              </Button>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="w-full text-slate-600 text-xs font-bold rounded-xl"
              >
                Restablecer Filtros
              </Button>
            </div>
          </div>
        </div>
      )}

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
