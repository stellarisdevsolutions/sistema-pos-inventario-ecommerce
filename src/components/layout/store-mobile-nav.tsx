"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/context/cart-context";

export function StoreMobileNav() {
  const pathname = usePathname();
  const { cartCount, setIsCartOpen, favorites } = useCart();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-2.5 flex items-center justify-between shadow-lg">
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
          pathname === "/" ? "text-store-primary" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Home className="h-5 w-5" />
        <span>Inicio</span>
      </Link>

      <Link
        href="/catalogo"
        className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
          pathname.startsWith("/catalogo") ? "text-store-primary" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Compass className="h-5 w-5" />
        <span>Catálogo</span>
      </Link>

      <Link
        href="/catalogo?favs=true"
        className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors relative ${
          pathname.includes("favs=true") ? "text-store-primary" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Heart className="h-5 w-5" />
        <span>Deseos</span>
        {favorites.length > 0 && (
          <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-store-primary" />
        )}
      </Link>

      <button
        onClick={() => setIsCartOpen(true)}
        className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 relative"
      >
        <ShoppingBag className="h-5 w-5" />
        <span>Carrito</span>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-store-primary text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </button>

      <Link
        href="/admin/login"
        className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600"
      >
        <User className="h-5 w-5" />
        <span>Cuenta</span>
      </Link>
    </nav>
  );
}
