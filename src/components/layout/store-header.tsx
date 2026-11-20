"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Search, ShoppingCart, Heart, Lock, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";

export function StoreHeader() {
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

  const navLinks = [
    { label: "Inicio", href: "/" },
    { label: "Catálogo", href: "/catalogo" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Contacto", href: "/contacto" },
  ];

  return (
    <header className="bg-slate-950 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      {/* Fila 1: Logo + Buscador + Acciones */}
      <div className="px-4 py-3 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          {/* Logo + Nombre de la Tienda */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--admin-brand)] to-sky-500 text-white shadow-md shadow-[var(--admin-brand)]/25 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1">
                Aura <span className="text-store-primary">Store</span>
              </span>
              <span className="text-[9px] text-slate-400 block -mt-1 tracking-wider uppercase font-semibold">
                Tecnología & Retail Bolivia
              </span>
            </div>
          </Link>

          {/* Buscador Central (Desktop md+) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full flex items-center">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, modelos o categorías..."
                className="w-full bg-slate-900 text-white placeholder:text-slate-400 h-10 pl-4 pr-11 rounded-xl border border-slate-700/80 shadow-inner text-xs focus-visible:ring-2 focus-visible:ring-store-primary font-medium"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg bg-store-primary hover:bg-store-primary-hover text-white transition-colors shadow-xs cursor-pointer"
                title="Buscar"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Acciones Derecha: Favoritos + Carrito + Enlace Admin */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Botón Favoritos */}
            <Link
              href="/catalogo?favs=true"
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors relative border border-slate-800 cursor-pointer"
              title="Mis Favoritos"
              aria-label="Mis Favoritos"
            >
              <Heart
                className={`h-4.5 w-4.5 ${
                  favorites.length > 0 ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-store-primary text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Botón Carrito en Bolivianos */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 bg-store-primary hover:bg-store-primary-hover text-white px-3 sm:px-3.5 py-2 h-10 rounded-xl font-bold shadow-md shadow-store-primary/25 transition-all active:scale-95 cursor-pointer"
              title="Abrir Carrito"
            >
              <div className="relative">
                <ShoppingCart className="h-4.5 w-4.5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-store-primary text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-left text-xs leading-none hidden sm:block">
                <span className="text-[9px] opacity-80 block uppercase tracking-wider font-semibold">
                  Carrito
                </span>
                <span className="font-black text-xs">{formatCurrency(subtotal)}</span>
              </div>
            </button>

            {/* Acceso directo a Panel Admin */}
            <Link
              href="/admin"
              className="hidden lg:flex items-center justify-center h-10 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold gap-1.5 transition-colors cursor-pointer"
              title="Ir al Panel de Administración"
            >
              <Lock className="h-3.5 w-3.5 text-store-primary" />
              <span>Admin</span>
            </Link>
          </div>
        </div>

        {/* Fila Móvil Debajo: Buscador (< md) */}
        <div className="md:hidden mt-3 pt-2 border-t border-slate-800/80">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos o categorías..."
                className="w-full bg-slate-900 text-white placeholder:text-slate-400 h-10 pl-9 pr-3 rounded-xl border border-slate-700/80 text-xs font-medium shadow-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push("/catalogo")}
              className="h-10 w-10 rounded-xl bg-store-primary hover:bg-store-primary-hover text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
              title="Filtros del catálogo"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Fila 2: Navegación Principal (Inicio | Catálogo | Nosotros | Contacto) */}
      <div className="hidden md:block bg-slate-900/90 backdrop-blur-xs px-4 py-2 border-b border-slate-800">
        <nav
          aria-label="Navegación principal"
          className="max-w-7xl mx-auto flex items-center justify-center gap-8 lg:gap-12 text-xs font-bold tracking-wide"
        >
          {navLinks.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`transition-colors relative py-1 uppercase tracking-wider text-[11px] ${
                  isActive
                    ? "text-store-primary font-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-store-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
