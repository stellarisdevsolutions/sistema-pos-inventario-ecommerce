"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/cart-context";
import type { SavedOption } from "@/app/actions/store";
import { formatCurrency } from "@/lib/currency";

export function Deseos({ products }: { products: SavedOption[] }) {
  const { favorites, toggleFavorite } = useCart();
  const byId = new Map(products.map((p) => [p.id, p]));
  return favorites.length ? (
    <ul className="max-w-3xl divide-y divide-store-border">
      {favorites.map((id) => {
        const p = byId.get(id);
        return (
          <li key={id} className="py-4 flex items-center gap-4">
            {p ? (
              <Link
                className="flex flex-1 items-center gap-4"
                href={`/producto/${p.slug}`}
              >
                <Image
                  unoptimized
                  width={80}
                  height={80}
                  className="size-20 object-contain store-photo"
                  alt=""
                  src={p.imageUrl}
                />
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.variant}</p>
                  <p>{formatCurrency(p.price)}</p>
                </div>
              </Link>
            ) : (
              <span className="flex-1">Producto fuera del catálogo</span>
            )}
            <button
              className="store-text-action"
              aria-label={`Quitar ${p?.name ?? "producto"} de deseos`}
              onClick={() => toggleFavorite(id)}
            >
              Quitar
            </button>
          </li>
        );
      })}
    </ul>
  ) : (
    <div className="space-y-4">
      <p>
        Guarda productos con el corazón del catálogo para encontrarlos aquí.
      </p>
      <Link className="store-button" href="/catalogo">
        Explorar el catálogo →
      </Link>
    </div>
  );
}
