"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { StoreProductCard } from "@/components/store/product-card";
import { StoreProduct, StoreCategory } from "@/app/actions/store";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

interface CatalogoClientProps {
  initialProducts: StoreProduct[];
  categories: StoreCategory[];
}

type PriceRangeKey = "all" | "under-250" | "250-1000" | "over-1000";

const PRICE_RANGES: { key: PriceRangeKey; label: string }[] = [
  { key: "all", label: "Cualquier precio" },
  { key: "under-250", label: "Hasta Bs 250" },
  { key: "250-1000", label: "Bs 250 a Bs 1.000" },
  { key: "over-1000", label: "Más de Bs 1.000" },
];

type SortKey = "recent" | "price-asc" | "price-desc" | "name-asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Más recientes" },
  { key: "price-asc", label: "Menor precio" },
  { key: "price-desc", label: "Mayor precio" },
  { key: "name-asc", label: "Nombre A - Z" },
];

export function CatalogoClient({ initialProducts, categories }: CatalogoClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("cat") || "todos";
  const urlQuery = searchParams.get("q") || "";
  const onlyFavs = searchParams.get("favs") === "true";

  const [localSearch, setLocalSearch] = useState<{ base: string; value: string }>({
    base: urlQuery,
    value: urlQuery,
  });
  const searchQuery = localSearch.base === urlQuery ? localSearch.value : urlQuery;
  const setSearchQuery = (nextVal: string) =>
    setLocalSearch({ base: urlQuery, value: nextVal });

  const [onlyInStock, setOnlyInStock] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceRangeKey>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedColorHex, setSelectedColorHex] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc" | "name-asc">(
    "recent"
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { favorites } = useCart();

  // Marcas y colores reales extraídos dinámicamente de los productos publicados
  const availableBrands = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of initialProducts) {
      if (p.brand?.slug && p.brand.name) {
        map.set(p.brand.slug, p.brand.name);
      }
    }
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialProducts]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of initialProducts) {
      for (const sw of p.colorSwatches ?? []) {
        const key = sw.hex.toLowerCase();
        if (!map.has(key)) {
          map.set(key, sw.name);
        }
      }
    }
    return [...map.entries()].map(([hex, name]) => ({ hex, name }));
  }, [initialProducts]);

  const updateUrlParam = (updates: {
    cat?: string | null;
    favs?: boolean | null;
    q?: string | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.cat !== undefined) {
      if (!updates.cat || updates.cat === "todos") params.delete("cat");
      else params.set("cat", updates.cat);
    }
    if (updates.favs !== undefined) {
      if (updates.favs) params.set("favs", "true");
      else params.delete("favs");
    }
    if (updates.q !== undefined) {
      if (updates.q && updates.q.trim()) params.set("q", updates.q.trim());
      else params.delete("q");
    }
    const qs = params.toString();
    router.replace(qs ? `/catalogo?${qs}` : "/catalogo", { scroll: false });
  };

  const setSelectedCategory = (cat: string) => {
    updateUrlParam({ cat });
  };

  const clearSearch = () => {
    setLocalSearch({ base: "", value: "" });
    if (urlQuery) {
      updateUrlParam({ q: null });
    }
  };

  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((p) => {
        if (onlyFavs && !favorites.includes(p.id)) return false;

        if (selectedCategory !== "todos") {
          const matchSlug = p.category?.slug === selectedCategory;
          const matchName =
            p.category?.name.toLowerCase() === selectedCategory.toLowerCase();
          if (!matchSlug && !matchName) return false;
        }

        if (selectedBrand !== "all" && p.brand?.slug !== selectedBrand) return false;

        if (selectedColorHex) {
          const hasColor = (p.colorSwatches ?? []).some(
            (sw) => sw.hex.toLowerCase() === selectedColorHex.toLowerCase()
          );
          if (!hasColor) return false;
        }

        const effectiveStock = p.totalStock ?? p.stock;
        if (onlyInStock && effectiveStock <= 0) return false;

        const effectivePrice = p.minPrice ?? p.price;
        if (priceRange === "under-250" && effectivePrice > 250) return false;
        if (
          priceRange === "250-1000" &&
          (effectivePrice < 250 || effectivePrice > 1000)
        ) {
          return false;
        }
        if (priceRange === "over-1000" && effectivePrice <= 1000) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const inName = p.name.toLowerCase().includes(q);
          const inDesc = p.description ? p.description.toLowerCase().includes(q) : false;
          const inSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
          const inVariant = p.variant ? p.variant.toLowerCase().includes(q) : false;
          const inBrand = p.brand?.name ? p.brand.name.toLowerCase().includes(q) : false;
          if (!inName && !inDesc && !inSku && !inVariant && !inBrand) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.minPrice ?? a.price;
        const priceB = b.minPrice ?? b.price;
        if (sortBy === "price-asc") return priceA - priceB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        return b.id - a.id;
      });
  }, [
    initialProducts,
    selectedCategory,
    selectedBrand,
    selectedColorHex,
    onlyInStock,
    priceRange,
    searchQuery,
    sortBy,
    onlyFavs,
    favorites,
  ]);

  const handleResetFilters = () => {
    setLocalSearch({ base: "", value: "" });
    setOnlyInStock(false);
    setPriceRange("all");
    setSelectedBrand("all");
    setSelectedColorHex(null);
    router.replace("/catalogo", { scroll: false });
  };

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === "todos") return "Catálogo completo";
    const found = categories.find(
      (c) =>
        c.slug === selectedCategory ||
        c.name.toLowerCase() === selectedCategory.toLowerCase()
    );
    return found ? found.name : selectedCategory;
  }, [selectedCategory, categories]);

  const activeFilterCount =
    (selectedCategory !== "todos" ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (priceRange !== "all" ? 1 : 0) +
    (selectedBrand !== "all" ? 1 : 0) +
    (selectedColorHex ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (onlyFavs ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const renderSidebarSections = (onAfterSelect?: () => void) => (
    <div className="divide-y divide-store-border">
      {/* Disponibilidad */}
      <div className="pb-5">
        <button
          type="button"
          onClick={() => setOnlyInStock(!onlyInStock)}
          className="w-full flex items-center justify-between py-1 text-sm font-medium text-store-ink cursor-pointer"
        >
          <span>Solo en stock</span>
          <span
            aria-hidden="true"
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              onlyInStock ? "bg-store-primary" : "bg-store-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-store-bg transition-transform duration-150 ease-out ${
                onlyInStock ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Rango de precio */}
      <div className="py-5 space-y-2.5">
        <span className="text-xs font-semibold text-store-ink block">
          Rango de precio
        </span>
        <div className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const active = priceRange === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => {
                  setPriceRange(range.key);
                  onAfterSelect?.();
                }}
                className={`w-full flex items-center justify-between py-1.5 text-xs transition-colors cursor-pointer ${
                  active
                    ? "text-store-ink font-semibold"
                    : "text-store-muted hover:text-store-ink"
                }`}
              >
                <span>{range.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-store-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Marcas (solo si existen en los productos reales) */}
      {availableBrands.length > 0 && (
        <div className="py-5 space-y-2.5">
          <span className="text-xs font-semibold text-store-ink block">Marcas</span>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setSelectedBrand("all");
                onAfterSelect?.();
              }}
              className={`w-full flex items-center justify-between py-1.5 text-xs transition-colors cursor-pointer ${
                selectedBrand === "all"
                  ? "text-store-ink font-semibold"
                  : "text-store-muted hover:text-store-ink"
              }`}
            >
              <span>Todas las marcas</span>
              {selectedBrand === "all" && (
                <span className="h-1.5 w-1.5 rounded-full bg-store-primary shrink-0" />
              )}
            </button>

            {availableBrands.map((b) => {
              const active = selectedBrand === b.slug;
              return (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => {
                    setSelectedBrand(b.slug);
                    onAfterSelect?.();
                  }}
                  className={`w-full flex items-center justify-between py-1.5 text-xs transition-colors cursor-pointer ${
                    active
                      ? "text-store-ink font-semibold"
                      : "text-store-muted hover:text-store-ink"
                  }`}
                >
                  <span className="truncate pr-2">{b.name}</span>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-store-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colores (solo si existen variantes de color reales) */}
      {availableColors.length > 0 && (
        <div className="py-5 space-y-3">
          <span className="text-xs font-semibold text-store-ink block">Color</span>
          <div className="flex flex-wrap gap-2.5">
            {availableColors.map((c) => {
              const active = selectedColorHex?.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  aria-label={`Filtrar por color ${c.name}`}
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedColorHex(active ? null : c.hex);
                    onAfterSelect?.();
                  }}
                  className={`h-7 w-7 rounded-full border border-black/15 transition-transform duration-150 cursor-pointer ${
                    active ? "ring-2 ring-offset-2 ring-store-ink scale-105" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="pt-5">
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-medium text-store-primary hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-store-bg text-store-ink font-store flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-store-on-primary">
      <StoreHeader categories={categories} activeCategory={selectedCategory} />

      {/* Cabecera editorial limpia */}
      <div className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 pt-7 pb-6">
        <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-xs text-store-muted mb-3">
          <Link href="/" className="hover:text-store-ink transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/catalogo" className="hover:text-store-ink transition-colors">
            Catálogo
          </Link>
          {selectedCategory !== "todos" && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-store-ink font-medium">{selectedCategoryName}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-store-ink">
            {onlyFavs ? "Mis favoritos" : selectedCategoryName}
          </h1>
          <p className="text-sm text-store-muted tabular-nums">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "producto" : "productos"}
          </p>
        </div>

        {/* Cinta horizontal de categorías */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-5">
            <button
              type="button"
              onClick={() => setSelectedCategory("todos")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "todos"
                  ? "bg-store-primary text-store-on-primary"
                  : "bg-store-surface text-store-ink hover:bg-store-surface-hover"
              }`}
            >
              Todas <span className="opacity-75 ml-1 tabular-nums">{initialProducts.length}</span>
            </button>

            {categories.map((cat) => {
              const isSelected =
                selectedCategory === cat.slug ||
                selectedCategory.toLowerCase() === cat.name.toLowerCase();

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-store-primary text-store-on-primary"
                      : "bg-store-surface text-store-ink hover:bg-store-surface-hover"
                  }`}
                >
                  {cat.name}{" "}
                  <span className="opacity-75 ml-1 tabular-nums">{cat.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra de herramientas */}
      <div className="bg-store-bg border-y border-store-border">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 bg-store-surface hover:bg-store-surface-hover px-3.5 h-9 rounded-lg text-xs font-semibold text-store-ink transition-colors cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="bg-store-primary text-store-on-primary text-[10px] font-semibold h-4 min-w-4 px-1 rounded-full flex items-center justify-center tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-store-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en el catálogo..."
                aria-label="Buscar en el catálogo"
                className="w-full h-9 rounded-lg bg-store-surface border border-transparent focus:bg-store-bg focus:border-store-ink focus:outline-hidden pl-9 pr-8 text-xs text-store-ink placeholder:text-store-muted transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-store-muted hover:text-store-ink cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="catalog-sort" className="text-xs text-store-muted hidden sm:inline">
              Ordenar por
            </label>
            <div className="relative inline-flex items-center">
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "recent" | "price-asc" | "price-desc" | "name-asc"
                  )
                }
                className="appearance-none bg-store-surface border border-store-border/60 hover:border-store-border text-store-ink text-xs font-medium rounded-lg h-9 pl-3.5 pr-8 focus:outline-hidden focus:border-store-ink cursor-pointer"
              >
                <option value="recent">Más recientes</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
                <option value="name-asc">Nombre A - Z</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="h-3.5 w-3.5 text-store-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal de 2 columnas */}
      <div className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Sidebar desktop */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-40">
            {renderSidebarSections()}
          </aside>

          {/* Zona de productos */}
          <main className="lg:col-span-9 space-y-6">
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {onlyFavs && (
                  <button
                    type="button"
                    onClick={() => updateUrlParam({ favs: null })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span>Favoritos</span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}
                {selectedCategory !== "todos" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("todos")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span>{selectedCategoryName}</span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}
                {priceRange !== "all" && (
                  <button
                    type="button"
                    onClick={() => setPriceRange("all")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span>{PRICE_RANGES.find((r) => r.key === priceRange)?.label}</span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}
                {selectedBrand !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrand("all")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span>
                      {availableBrands.find((b) => b.slug === selectedBrand)?.name ??
                        selectedBrand}
                    </span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}
                {selectedColorHex && (
                  <button
                    type="button"
                    onClick={() => setSelectedColorHex(null)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: selectedColorHex }}
                    />
                    <span>
                      {availableColors.find(
                        (c) => c.hex.toLowerCase() === selectedColorHex.toLowerCase()
                      )?.name ?? "Color"}
                    </span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}
                {onlyInStock && (
                  <button
                    type="button"
                    onClick={() => setOnlyInStock(false)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span>Solo en stock</span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="inline-flex items-center gap-1.5 rounded-full bg-store-surface hover:bg-store-border px-3 py-1.5 text-xs font-medium text-store-ink transition-colors cursor-pointer"
                  >
                    <span>&ldquo;{searchQuery}&rdquo;</span>
                    <X className="h-3 w-3 text-store-muted" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-store-primary hover:underline ml-1 cursor-pointer"
                >
                  Limpiar todo
                </button>
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="bg-store-surface rounded-2xl p-12 text-center space-y-4">
                <p className="font-semibold text-base text-store-ink">
                  No encontramos productos con esos criterios
                </p>
                <p className="text-xs text-store-muted max-w-sm mx-auto leading-relaxed">
                  Prueba limpiando la búsqueda o seleccionando otra categoría para ver el inventario disponible.
                </p>
                <Button
                  onClick={handleResetFilters}
                  className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-xs font-semibold rounded-lg px-6 h-10 cursor-pointer"
                >
                  Ver todo el catálogo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {filteredProducts.map((p) => (
                  <StoreProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Drawer móvil de filtros */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end lg:hidden">
          <div className="w-full max-w-xs bg-store-bg h-full p-5 flex flex-col justify-between overflow-y-auto border-l border-store-border">
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-store-border">
                <h3 className="font-semibold text-sm text-store-ink">Filtros</h3>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Cerrar filtros"
                  className="h-8 w-8 rounded-full text-store-muted hover:text-store-ink hover:bg-store-surface flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderSidebarSections(() => setMobileFiltersOpen(false))}
            </div>

            <div className="pt-4 mt-6 border-t border-store-border space-y-2">
              <Button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-store-primary hover:bg-store-primary-hover text-store-on-primary font-medium text-xs rounded-full h-11 cursor-pointer"
              >
                Mostrar {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "producto" : "productos"}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleResetFilters();
                    setMobileFiltersOpen(false);
                  }}
                  className="w-full text-store-ink border-store-border text-xs font-medium rounded-full h-10 cursor-pointer"
                >
                  Restablecer filtros
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <StoreCartSheet />
      <StoreMobileNav />
      <StoreTrustBadges />
      <StoreFooter />
    </div>
  );
}
