"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Compass, Heart, ShoppingBag, Mail } from "lucide-react";
import { useCart } from "@/context/cart-context";

function StoreMobileNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { cartCount, favorites } = useCart();
  const isFavs =
    pathname === "/deseos" ||
    (pathname === "/catalogo" && searchParams.get("favs") === "true");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-store-ink text-store-on-primary/70 rounded-t-2xl px-5 py-2.5 flex items-center justify-between shadow-lg font-store">
      <Link
        href="/"
        className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
          pathname === "/"
            ? "text-store-on-primary font-semibold"
            : "text-store-on-primary/65 hover:text-store-on-primary"
        }`}
      >
        <Home className="h-5 w-5 stroke-[1.75]" />
        <span>Inicio</span>
      </Link>

      <Link
        href="/catalogo"
        className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
          pathname.startsWith("/catalogo") && !isFavs
            ? "text-store-on-primary font-semibold"
            : "text-store-on-primary/65 hover:text-store-on-primary"
        }`}
      >
        <Compass className="h-5 w-5 stroke-[1.75]" />
        <span>Catálogo</span>
      </Link>

      {/* Botón central elevado de bolsa */}
      <Link
        href="/carrito"
        aria-label="Abrir carrito"
        className="-mt-7 h-13 w-13 rounded-full bg-store-primary border-4 border-store-bg text-store-on-primary shadow-md flex items-center justify-center relative transition-transform duration-150 ease-out active:scale-[0.95] cursor-pointer"
      >
        <ShoppingBag className="h-5 w-5 stroke-[2]" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-store-ink text-store-on-primary text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center tabular-nums">
            {cartCount}
          </span>
        )}
      </Link>

      <Link
        href="/deseos"
        className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors relative ${
          isFavs
            ? "text-store-on-primary font-semibold"
            : "text-store-on-primary/65 hover:text-store-on-primary"
        }`}
      >
        <Heart className="h-5 w-5 stroke-[1.75]" />
        <span>Deseos</span>
        {favorites.length > 0 && (
          <span className="absolute top-0 right-0.5 h-2 w-2 rounded-full bg-store-primary" />
        )}
      </Link>

      <Link
        href="/contacto"
        className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-store-on-primary/65 hover:text-store-on-primary transition-colors"
      >
        <Mail className="h-5 w-5 stroke-[1.75]" />
        <span>Contacto</span>
      </Link>
    </nav>
  );
}

export function StoreMobileNav() {
  return (
    <Suspense fallback={null}>
      <StoreMobileNavContent />
    </Suspense>
  );
}
