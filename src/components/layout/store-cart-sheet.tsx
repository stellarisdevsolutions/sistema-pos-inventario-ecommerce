"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShoppingBag, X, Plus, Minus, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";

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
  } = useCart();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] p-0 flex flex-col bg-white">
        <SheetHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-store-primary" />
            <SheetTitle className="text-base font-black">Mi Carrito de Compras</SheetTitle>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {cartCount} {cartCount === 1 ? "artículo" : "artículos"}
            </Badge>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-xs font-bold">Tu carrito está vacío</p>
              <p className="text-[11px]">Agrega productos tocando el botón de añadir.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between gap-3"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-14 w-14 rounded-xl object-contain bg-white p-1 border border-slate-200/80 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-extrabold text-xs text-slate-900 truncate">
                    {item.name}
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-store-primary">
                      ${item.price.toFixed(2)}
                    </span>
                    {item.selectedColor && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        • {item.selectedColor}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Costo de Envío:</span>
                <span className="font-semibold text-emerald-600">
                  {deliveryFee === 0 ? "¡Gratis!" : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200/80">
                <span>Total a Pagar:</span>
                <span className="text-store-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `¡Hola GadgetHub! Quiero confirmar mi pedido por un total de $${totalPrice.toFixed(
                  2
                )} con ${cartCount} productos:\n` +
                  cart.map((i) => `- ${i.quantity}x ${i.name} ($${i.price})`).join("\n")
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black py-3.5 rounded-2xl shadow-md shadow-store-primary/25 flex items-center justify-center gap-2 uppercase tracking-wide transition-all"
            >
              <span>Confirmar Pedido vía WhatsApp</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
