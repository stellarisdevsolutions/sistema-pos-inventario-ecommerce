"use client";

import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { STORE_NAME } from "@/lib/store-config";
import type { StoreCategory } from "@/app/actions/store";

export function StoreHeader({
  categories,
  activeCategory,
}: { categories?: StoreCategory[]; activeCategory?: string } = {}) {
  const { cartCount, favorites } = useCart();
  return (
    <header className="border-b border-store-border bg-store-bg">
      <div className="store-width flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
        <Link href="/" className="store-wordmark">
          {STORE_NAME}
        </Link>
        <nav aria-label="Principal" className="hidden lg:flex gap-5 text-sm">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/nosotros">Nosotros</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <form
          action="/catalogo"
          role="search"
          className="flex h-11 items-center bg-store-surface rounded-full px-4 order-last w-full md:order-none md:ml-auto md:w-auto"
        >
          <input
            name="q"
            type="search"
            aria-label="Buscar productos"
            placeholder="Buscar productos, marcas o SKU"
            className="min-w-0 flex-1 bg-transparent text-sm md:w-56"
          />
          <button aria-label="Buscar" className="p-1">
            <Search size={18} />
          </button>
        </form>
        <div className="ml-auto flex gap-4 md:ml-0">
          <Link
            href="/deseos"
            aria-label={`Lista de deseos, ${favorites.length} guardados`}
          >
            <Heart size={22} />
          </Link>
          <Link
            href="/carrito"
            className="flex gap-1"
            aria-label={`Carrito, ${cartCount} artículos`}
          >
            <ShoppingBag size={22} />
            <span className="text-sm">{cartCount}</span>
          </Link>
        </div>
      </div>
      {categories?.some((c) => c.count > 0) && (
        <nav
          aria-label="Categorías"
          className="store-width flex gap-6 overflow-x-auto py-3 border-t border-store-border text-sm"
        >
          {categories
            .filter((c) => c.count > 0)
            .slice(0, 8)
            .map((c) => (
              <Link
                className="whitespace-nowrap"
                aria-current={c.slug === activeCategory ? "page" : undefined}
                key={c.id}
                href={`/catalogo?cat=${encodeURIComponent(c.slug)}`}
              >
                {c.name}
              </Link>
            ))}
        </nav>
      )}
    </header>
  );
}
