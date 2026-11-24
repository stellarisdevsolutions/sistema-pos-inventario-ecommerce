"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Heart, ShoppingCart } from "lucide-react";
import { StoreProduct } from "@/app/actions/store";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";

interface StoreProductCardProps {
  product: StoreProduct;
  layout?: "grid" | "featured";
}

/**
 * Tarjeta comercial estilo GadgetHub con soporte para variantes y modo destacado ancho.
 */
export function StoreProductCard({
  product: p,
  layout = "grid",
}: StoreProductCardProps) {
  const router = useRouter();
  const { addToCart, toggleFavorite, isFavorite } = useCart();

  const isFav = isFavorite(p.id);
  const effectiveStock = p.totalStock ?? p.stock;
  const inStock = effectiveStock > 0;
  const hasMultipleVariants = Boolean(p.modelCode) && (p.variantCount ?? 1) > 1;
  const hasPriceRange =
    p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice < p.maxPrice;
  const swatches = p.colorSwatches ?? [];
  const metaLabel = p.brand?.name || p.category?.name || "Tecnología";

  const handleAction = () => {
    if (!inStock) return;
    if (p.modelCode) {
      router.push(`/producto/${p.slug}`);
      return;
    }
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.imageUrl,
      quantity: 1,
      maxStock: p.stock,
    });
  };

  if (layout === "featured") {
    return (
      <article className="group bg-store-primary-tint border border-store-primary/15 hover:border-store-primary/40 rounded-2xl p-4 sm:p-5 grid grid-cols-12 gap-4 sm:gap-5 items-center relative transition-colors font-store">
        <div className="col-span-5 relative aspect-[4/3] rounded-xl bg-store-bg border border-store-border/60 flex items-center justify-center p-2.5 overflow-hidden">
          <span className="absolute top-2 left-2 z-10 bg-store-primary text-store-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
            {hasMultipleVariants ? `${p.variantCount} opciones` : "Destacado"}
          </span>

          <button
            type="button"
            onClick={() => toggleFavorite(p.id)}
            aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
            title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
            className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-store-surface/90 hover:bg-store-surface flex items-center justify-center transition-colors cursor-pointer"
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                isFav ? "fill-store-primary text-store-primary" : "text-store-ink"
              }`}
            />
          </button>

          <Link
            href={`/producto/${p.slug}`}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={p.imageUrl}
              alt={p.name}
              className="max-h-full max-w-full rounded-md object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          </Link>
        </div>

        <div className="col-span-7 space-y-2.5 min-w-0">
          <Link href={`/producto/${p.slug}`} className="block">
            <h3 className="text-base sm:text-lg font-bold text-store-ink leading-snug line-clamp-2 group-hover:text-store-primary transition-colors">
              {p.name}
            </h3>
          </Link>

          <p className="text-xs text-store-muted line-clamp-2 leading-relaxed">
            {p.description || `${metaLabel} con stock verificado en almacén.`}
          </p>

          {swatches.length > 0 && (
            <div className="flex items-center gap-1.5" aria-label="Colores disponibles">
              {swatches.slice(0, 5).map((sw) => (
                <span
                  key={sw.hex}
                  title={sw.name}
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/15 shrink-0"
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
              {swatches.length > 5 && (
                <span className="text-[11px] text-store-muted tabular-nums">
                  +{swatches.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="text-xl sm:text-2xl font-extrabold text-store-ink tabular-nums">
            {hasPriceRange && (
              <span className="text-xs font-medium text-store-muted mr-1">Desde</span>
            )}
            {formatCurrency(hasPriceRange ? p.minPrice! : p.price)}
          </div>

          <div className="text-xs font-semibold flex items-center gap-1">
            {inStock ? (
              <span className="text-store-success inline-flex items-center gap-1 tabular-nums">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>En stock ({effectiveStock} disponibles)</span>
              </span>
            ) : (
              <span className="text-store-muted">Agotado</span>
            )}
          </div>

          {hasMultipleVariants ? (
            <Link
              href={`/producto/${p.slug}`}
              className="w-full h-10 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Elegir opción</span>
            </Link>
          ) : inStock ? (
            <button
              type="button"
              onClick={handleAction}
              className="w-full h-10 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Añadir al carrito</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full h-10 rounded-lg bg-store-surface text-store-muted text-xs font-bold flex items-center justify-center cursor-not-allowed"
            >
              Sin stock
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-store-bg border border-store-border hover:border-store-primary/40 rounded-xl p-3.5 flex flex-col justify-between transition-colors font-store">
      <div>
        <div className="relative aspect-square rounded-lg bg-store-surface/40 border border-store-border/50 flex items-center justify-center p-3 overflow-hidden mb-3">
          {!inStock ? (
            <span className="absolute top-2 left-2 z-10 bg-store-ink text-store-on-ink text-[10px] font-bold px-2 py-0.5 rounded-md">
              Agotado
            </span>
          ) : hasMultipleVariants ? (
            <span className="absolute top-2 left-2 z-10 bg-store-primary text-store-on-primary text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums">
              {p.variantCount} opciones
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => toggleFavorite(p.id)}
            aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
            title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
            className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-store-bg border border-store-border/60 hover:bg-store-surface flex items-center justify-center transition-colors cursor-pointer"
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                isFav ? "fill-store-primary text-store-primary" : "text-store-ink"
              }`}
            />
          </button>

          <Link
            href={`/producto/${p.slug}`}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={p.imageUrl}
              alt={p.name}
              className="max-h-full max-w-full rounded-md object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
          </Link>
        </div>

        <div className="space-y-1.5 mb-3">
          <Link href={`/producto/${p.slug}`} className="block">
            <h3 className="text-[13px] font-bold text-store-ink line-clamp-2 leading-snug group-hover:text-store-primary transition-colors min-h-[2.25rem]">
              {p.name}
            </h3>
          </Link>

          <p className="text-[11px] text-store-muted truncate">{metaLabel}</p>

          {swatches.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5" aria-label="Colores disponibles">
              {swatches.slice(0, 5).map((sw) => (
                <span
                  key={sw.hex}
                  title={sw.name}
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/15 shrink-0"
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
              {swatches.length > 5 && (
                <span className="text-[11px] text-store-muted tabular-nums">
                  +{swatches.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="text-base font-extrabold text-store-ink tabular-nums pt-0.5">
            {hasPriceRange && (
              <span className="text-[11px] font-normal text-store-muted mr-1">
                Desde
              </span>
            )}
            {formatCurrency(hasPriceRange ? p.minPrice! : p.price)}
          </div>

          <div className="text-[11px] font-medium flex items-center gap-1">
            {inStock ? (
              <span className="text-store-success inline-flex items-center gap-1">
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span>En stock</span>
              </span>
            ) : (
              <span className="text-store-muted">Agotado</span>
            )}
          </div>
        </div>
      </div>

      {hasMultipleVariants ? (
        <Link
          href={`/producto/${p.slug}`}
          className="w-full h-9 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Elegir opción</span>
        </Link>
      ) : inStock ? (
        <button
          type="button"
          onClick={handleAction}
          className="w-full h-9 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Añadir al carrito</span>
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full h-9 rounded-lg bg-store-surface text-store-muted text-xs font-semibold flex items-center justify-center cursor-not-allowed"
        >
          Sin stock
        </button>
      )}
    </article>
  );
}
