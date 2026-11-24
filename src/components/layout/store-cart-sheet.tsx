"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/currency";
import {
  STORE_FREE_SHIPPING_MIN_BS,
  STORE_NAME,
  STORE_WHATSAPP_NUMBER,
} from "@/lib/store-config";

export function StoreCartSheet() {
  const {
    cart,
    cartCount,
    subtotal,
    deliveryFee,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const missingForFreeShipping = Math.max(0, STORE_FREE_SHIPPING_MIN_BS - subtotal);
  const shippingProgress = Math.min(
    100,
    Math.round((subtotal / STORE_FREE_SHIPPING_MIN_BS) * 100)
  );

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[420px] p-0 gap-0 flex flex-col bg-store-bg border-l border-store-border font-store"
      >
        <SheetHeader className="px-5 py-4 border-b border-store-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-baseline gap-2">
            <SheetTitle className="text-base font-semibold tracking-[-0.02em] text-store-ink">
              Tu bolsa
            </SheetTitle>
            <span className="text-xs text-store-muted tabular-nums">
              {cartCount} {cartCount === 1 ? "artículo" : "artículos"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Cerrar carrito"
            className="h-8 w-8 rounded-full text-store-muted hover:text-store-ink hover:bg-store-surface flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {cart.length > 0 && (
          <div className="bg-store-surface px-5 py-3 border-b border-store-border space-y-2">
            {missingForFreeShipping > 0 ? (
              <p className="text-xs text-store-ink">
                Agrega{" "}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(missingForFreeShipping)}
                </span>{" "}
                más para obtener envío gratis.
              </p>
            ) : (
              <p className="text-xs font-medium text-store-success">
                Tienes envío gratuito a toda Bolivia.
              </p>
            )}
            <div className="h-1 w-full bg-store-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                  missingForFreeShipping === 0 ? "bg-store-success" : "bg-store-primary"
                }`}
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 divide-y divide-store-border">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-store-muted space-y-2.5">
              <ShoppingBag className="h-10 w-10 mx-auto stroke-[1.25] opacity-40" />
              <p className="text-sm font-semibold text-store-ink">Tu bolsa está vacía</p>
              <p className="text-xs max-w-[240px] mx-auto leading-relaxed">
                Explora el catálogo y agrega los productos que quieras pedir.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const atMaxStock =
                item.maxStock !== undefined && item.quantity >= item.maxStock;
              return (
                <div key={item.id} className="py-4 flex items-start gap-3.5">
                  <div className="h-20 w-20 rounded-xl bg-store-surface p-2 flex items-center justify-center shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-semibold text-[13px] text-store-ink leading-snug line-clamp-2">
                        {item.name}
                      </h5>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Eliminar ${item.name}`}
                        className="text-store-muted hover:text-store-primary p-1 -mt-1 -mr-1 rounded-full transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {(item.selectedVariant || item.selectedColor) && (
                      <p className="text-[11px] text-store-muted truncate">
                        {[item.selectedVariant, item.selectedColor]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    )}

                    <div className="pt-1.5 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-full bg-store-surface p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          aria-label={`Disminuir cantidad de ${item.name}`}
                          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-store-bg text-store-ink transition-colors cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-semibold w-6 text-center tabular-nums text-store-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={atMaxStock}
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                            atMaxStock
                              ? "text-store-muted/40 cursor-not-allowed"
                              : "hover:bg-store-bg text-store-ink cursor-pointer"
                          }`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-store-ink tabular-nums">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 border-t border-store-border bg-store-bg space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-store-muted">
                <span>Subtotal</span>
                <span className="font-medium text-store-ink tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-store-muted">
                <span>Envío estimado</span>
                <span className="font-medium text-store-success tabular-nums">
                  {deliveryFee === 0 ? "Gratis" : formatCurrency(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold text-store-ink pt-2.5 border-t border-store-border">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <a
              href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `¡Hola ${STORE_NAME}! Quiero confirmar mi pedido por un total de ${formatCurrency(
                  totalPrice
                )} con ${cartCount} productos:\n` +
                  cart
                    .map((i) => `- ${i.quantity}x ${i.name} (${formatCurrency(i.price)})`)
                    .join("\n")
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-sm font-bold flex items-center justify-center transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]"
            >
              Confirmar pedido por WhatsApp
            </a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
