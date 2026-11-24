"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingCart,
  User,
  Zap,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";
import {
  STORE_EMAIL,
  STORE_NAME,
  STORE_PHONE_DISPLAY,
  STORE_TAGLINE,
} from "@/lib/store-config";
import { StoreCategory } from "@/app/actions/store";

interface StoreHeaderProps {
  categories?: StoreCategory[];
  activeCategory?: string;
}

export function StoreHeader({ categories = [], activeCategory }: StoreHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, subtotal, setIsCartOpen, favorites } = useCart();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalogo?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/catalogo");
    }
  };

  const brandParts = STORE_NAME.trim().split(/\s+/);
  const brandLead = brandParts[0] || STORE_NAME;
  const brandRest = brandParts.slice(1).join(" ");

  return (
    <header className="sticky top-0 z-40 font-store">
      {/* Franja 1: Barra superior de contacto */}
      <div className="hidden md:block bg-store-ink-deep text-store-on-ink-muted text-[11px]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <a
              href={`mailto:${STORE_EMAIL}`}
              className="inline-flex items-center gap-1.5 hover:text-store-on-ink transition-colors"
            >
              <Mail className="h-3 w-3" />
              <span>{STORE_EMAIL}</span>
            </a>
            <a
              href={`tel:${STORE_PHONE_DISPLAY.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1.5 hover:text-store-on-ink transition-colors"
            >
              <Phone className="h-3 w-3" />
              <span>{STORE_PHONE_DISPLAY}</span>
            </a>
          </div>

          <div className="flex items-center gap-5">
            <span>Bolivia (Bs)</span>
            <span>Envíos a todo el país</span>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-1 hover:text-store-on-ink transition-colors"
            >
              <MapPin className="h-3 w-3" />
              <span>Contacto y envíos</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Franja 2: Cabecera principal navy */}
      <div className="bg-store-ink text-store-on-ink">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 lg:gap-8">
          {/* Izquierda: Logo 2 tonos */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Zap className="h-7 w-7 text-store-primary fill-store-primary shrink-0" />
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none block">
                <span className="text-store-on-ink">{brandLead}</span>
                {brandRest && (
                  <span className="text-store-primary"> {brandRest}</span>
                )}
              </span>
              <span className="text-[10px] text-store-on-ink-muted block mt-0.5 leading-none">
                {STORE_TAGLINE}
              </span>
            </div>
          </Link>

          {/* Centro: Buscador blanco con botón acento integrado */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="flex w-full h-11 rounded-lg overflow-hidden bg-store-bg shadow-xs">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, marcas o categorías..."
                aria-label="Buscar productos"
                className="flex-1 min-w-0 bg-store-bg h-full px-4 text-xs text-store-ink placeholder:text-store-muted focus:outline-hidden"
              />
              <button
                type="submit"
                aria-label="Buscar"
                title="Buscar"
                className="w-12 h-full bg-store-primary hover:bg-store-primary-hover text-store-on-primary flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Derecha: Admin + Favoritos + Carrito naranja */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/admin"
              className="hidden lg:flex items-center gap-2 text-store-on-ink hover:text-store-primary transition-colors"
              title="Ir al panel administrativo"
            >
              <User className="h-[18px] w-[18px] shrink-0" />
              <div className="leading-tight text-left">
                <span className="block text-[10px] text-store-on-ink-muted">Panel</span>
                <span className="block text-xs font-semibold">Admin</span>
              </div>
            </Link>

            <Link
              href="/catalogo?favs=true"
              className="flex items-center gap-2 text-store-on-ink hover:text-store-primary transition-colors relative"
              title="Lista de deseos"
              aria-label="Lista de deseos"
            >
              <div className="relative">
                <Heart
                  className={`h-[18px] w-[18px] ${
                    favorites.length > 0 ? "fill-store-primary text-store-primary" : ""
                  }`}
                />
                {favorites.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-store-primary text-store-on-primary text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center tabular-nums">
                    {favorites.length}
                  </span>
                )}
              </div>
              <div className="hidden sm:block leading-tight text-left">
                <span className="block text-[10px] text-store-on-ink-muted">Lista</span>
                <span className="block text-xs font-semibold">Deseos</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary rounded-lg px-3.5 h-11 flex items-center gap-2.5 transition-colors cursor-pointer"
              title="Abrir carrito"
            >
              <div className="relative">
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-store-bg text-store-ink text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <span className="block text-[10px] opacity-90">Carrito</span>
                <span className="block text-xs font-bold tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Franja 3: Barra de navegación */}
      <div className="hidden md:block bg-store-ink-soft border-t border-white/10 border-b border-black/15 text-store-on-ink shadow-xs">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-4">
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-6 overflow-x-auto no-scrollbar text-xs font-medium h-full"
          >
            <Link
              href="/"
              className={`h-full inline-flex items-center border-b-2 whitespace-nowrap transition-colors ${
                pathname === "/"
                  ? "text-store-primary font-semibold border-store-primary"
                  : "text-store-on-ink hover:text-store-primary border-transparent"
              }`}
            >
              Inicio
            </Link>

            <Link
              href="/catalogo"
              className={`h-full inline-flex items-center border-b-2 whitespace-nowrap transition-colors ${
                pathname === "/catalogo" && (!activeCategory || activeCategory === "todos")
                  ? "text-store-primary font-semibold border-store-primary"
                  : "text-store-on-ink hover:text-store-primary border-transparent"
              }`}
            >
              Catálogo
            </Link>

            {categories.slice(0, 4).map((cat) => {
              const isCatActive =
                activeCategory === cat.slug ||
                activeCategory?.toLowerCase() === cat.name.toLowerCase();
              return (
                <Link
                  key={cat.id}
                  href={`/catalogo?cat=${encodeURIComponent(cat.slug)}`}
                  className={`h-full inline-flex items-center border-b-2 whitespace-nowrap transition-colors ${
                    isCatActive
                      ? "text-store-primary font-semibold border-store-primary"
                      : "text-store-on-ink/85 hover:text-store-primary border-transparent"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}

            <Link
              href="/nosotros"
              className={`h-full inline-flex items-center border-b-2 whitespace-nowrap transition-colors ${
                pathname.startsWith("/nosotros")
                  ? "text-store-primary font-semibold border-store-primary"
                  : "text-store-on-ink/85 hover:text-store-primary border-transparent"
              }`}
            >
              Nosotros
            </Link>

            <Link
              href="/contacto"
              className={`h-full inline-flex items-center border-b-2 whitespace-nowrap transition-colors ${
                pathname.startsWith("/contacto")
                  ? "text-store-primary font-semibold border-store-primary"
                  : "text-store-on-ink/85 hover:text-store-primary border-transparent"
              }`}
            >
              Contacto
            </Link>
          </nav>

          <Link
            href="/catalogo"
            className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-[11px] font-bold px-4 h-7 rounded-md inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Zap className="h-3 w-3 fill-current" />
            <span>DESTACADOS</span>
          </Link>
        </div>
      </div>

      {/* Buscador móvil */}
      <div className="md:hidden bg-store-ink px-4 pb-3">
        <form onSubmit={handleSearch} className="flex w-full h-10 rounded-lg overflow-hidden bg-store-bg">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos o SKU..."
            aria-label="Buscar productos o SKU"
            className="flex-1 min-w-0 bg-store-bg h-full px-3.5 text-xs text-store-ink placeholder:text-store-muted focus:outline-hidden"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="w-11 h-full bg-store-primary hover:bg-store-primary-hover text-store-on-primary flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
