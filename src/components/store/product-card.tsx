"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Plus } from "lucide-react";
import type { StoreProduct } from "@/app/actions/store";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";

export function StoreProductCard({ product }: { product: StoreProduct }) {
  const { isFavorite, toggleFavorite, addToCart } = useCart();
  const saved = isFavorite(product.id);
  const href = `/producto/${product.slug}`;
  const available = (product.totalStock ?? product.stock) > 0;
  return (
    <article className="relative min-w-0 space-y-3">
      <Link href={href} className="store-photo block relative aspect-square">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          unoptimized
          className="object-contain p-4"
        />
      </Link>
      <button
        aria-label={saved ? "Quitar de deseos" : "Guardar en deseos"}
        aria-pressed={!!saved}
        onClick={() => toggleFavorite(product.id)}
        className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-store-bg text-store-ink"
      >
        <Heart size={17} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="space-y-1">
        {product.category && (
          <p className="text-xs text-store-muted">{product.category.name}</p>
        )}
        <Link
          href={href}
          className="block font-semibold leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <p>
          {product.minPrice !== product.maxPrice ? "Desde " : ""}
          {formatCurrency(product.minPrice ?? product.price)}
        </p>
      </div>
      {product.modelCode ? (
        <Link className="store-text-action" href={href}>
          Ver opciones →
        </Link>
      ) : (
        <button
          className="store-text-action"
          disabled={!available}
          onClick={() =>
            addToCart({
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.imageUrl,
              maxStock: product.stock,
            })
          }
        >
          {available && <Plus size={15} />} {available ? "Agregar" : "Agotado"}
        </button>
      )}
    </article>
  );
}
