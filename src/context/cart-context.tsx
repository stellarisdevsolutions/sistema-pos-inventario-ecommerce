"use client";

import React, { createContext, useContext, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { STORE_DELIVERY_FEE_BS, STORE_FREE_SHIPPING_MIN_BS } from "@/lib/store-config";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  selectedColor?: string;
  selectedVariant?: string;
  maxStock?: number;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: {
    id: number;
    name: string;
    price: number;
    image: string;
    quantity?: number;
    selectedColor?: string;
    selectedVariant?: string;
    maxStock?: number;
  }) => void;
  updateQuantity: (id: number, delta: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

const CART_STORAGE_KEY = "aura_ecommerce_cart";
const FAVS_STORAGE_KEY = "aura_ecommerce_favs";
const EMPTY_CART: CartItem[] = [];
const EMPTY_FAVS: number[] = [];

let cachedCartRaw: string | null | undefined = undefined;
let cachedCartValue: CartItem[] = EMPTY_CART;
let cachedFavsRaw: string | null | undefined = undefined;
let cachedFavsValue: number[] = EMPTY_FAVS;

function subscribeCartStore(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CART_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("aura-cart-change", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("aura-cart-change", callback);
  };
}

function getCartSnapshot(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw === cachedCartRaw) return cachedCartValue;
    cachedCartRaw = raw;
    if (!raw) {
      cachedCartValue = EMPTY_CART;
      return cachedCartValue;
    }
    const parsed = JSON.parse(raw);
    cachedCartValue = Array.isArray(parsed) ? parsed : EMPTY_CART;
    return cachedCartValue;
  } catch (e) {
    console.warn("Error leyendo carrito de localStorage:", e);
    return EMPTY_CART;
  }
}

function getCartServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function writeCart(next: CartItem[]) {
  const raw = JSON.stringify(next);
  cachedCartRaw = raw;
  cachedCartValue = next;
  try {
    localStorage.setItem(CART_STORAGE_KEY, raw);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("aura-cart-change"));
  }
}

function subscribeFavsStore(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === FAVS_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("aura-favs-change", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("aura-favs-change", callback);
  };
}

function getFavsSnapshot(): number[] {
  if (typeof window === "undefined") return EMPTY_FAVS;
  try {
    const raw = localStorage.getItem(FAVS_STORAGE_KEY);
    if (raw === cachedFavsRaw) return cachedFavsValue;
    cachedFavsRaw = raw;
    if (!raw) {
      cachedFavsValue = EMPTY_FAVS;
      return cachedFavsValue;
    }
    const parsed = JSON.parse(raw);
    cachedFavsValue = Array.isArray(parsed) ? parsed : EMPTY_FAVS;
    return cachedFavsValue;
  } catch (e) {
    console.warn("Error leyendo favoritos de localStorage:", e);
    return EMPTY_FAVS;
  }
}

function getFavsServerSnapshot(): number[] {
  return EMPTY_FAVS;
}

function writeFavs(next: number[]) {
  const raw = JSON.stringify(next);
  cachedFavsRaw = raw;
  cachedFavsValue = next;
  try {
    localStorage.setItem(FAVS_STORAGE_KEY, raw);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("aura-favs-change"));
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useSyncExternalStore(subscribeCartStore, getCartSnapshot, getCartServerSnapshot);
  const favorites = useSyncExternalStore(subscribeFavsStore, getFavsSnapshot, getFavsServerSnapshot);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee =
    subtotal === 0 || subtotal >= STORE_FREE_SHIPPING_MIN_BS ? 0 : STORE_DELIVERY_FEE_BS;
  const totalPrice = subtotal + deliveryFee;

  const addToCart = (product: {
    id: number;
    name: string;
    price: number;
    image: string;
    quantity?: number;
    selectedColor?: string;
    selectedVariant?: string;
    maxStock?: number;
  }) => {
    const qtyToAdd = Math.max(1, product.quantity || 1);
    const prev = getCartSnapshot();
    const existing = prev.find((item) => item.id === product.id);
    const limit = product.maxStock ?? existing?.maxStock;

    if (existing) {
      const candidateQty = existing.quantity + qtyToAdd;
      const nextQty =
        limit !== undefined ? Math.min(candidateQty, Math.max(0, limit)) : candidateQty;
      const actuallyAdded = nextQty - existing.quantity;

      if (actuallyAdded <= 0) {
        if (limit !== undefined && existing.maxStock !== limit) {
          writeCart(
            prev.map((item) => (item.id === product.id ? { ...item, maxStock: limit } : item))
          );
        }
        toast.warning(`Stock máximo alcanzado para ${product.name}`, {
          description: `Solo hay ${limit ?? existing.quantity} unidad(es) disponibles.`,
        });
        return;
      }

      writeCart(
        prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: nextQty, maxStock: limit }
            : item
        )
      );

      if (actuallyAdded < qtyToAdd) {
        toast.warning(`${product.name}: se agregaron ${actuallyAdded} unidad(es)`, {
          description: `Máximo disponible en stock: ${limit}.`,
        });
      } else {
        toast.success(`${product.name} añadido al carrito`, {
          description: `${qtyToAdd} ${qtyToAdd > 1 ? "unidades agregadas" : "unidad agregada"} con éxito.`,
        });
      }
      return;
    }

    const nextQty = limit !== undefined ? Math.min(qtyToAdd, Math.max(0, limit)) : qtyToAdd;
    if (nextQty <= 0) {
      toast.warning(`${product.name} no tiene stock disponible.`);
      return;
    }

    writeCart([
      ...prev,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: nextQty,
        image: product.image,
        selectedColor: product.selectedColor,
        selectedVariant: product.selectedVariant,
        maxStock: limit,
      },
    ]);

    if (nextQty < qtyToAdd) {
      toast.warning(`${product.name} añadido con stock limitado`, {
        description: `Solo había ${nextQty} unidad(es) disponibles.`,
      });
    } else {
      toast.success(`${product.name} añadido al carrito`, {
        description: `${nextQty} ${nextQty > 1 ? "unidades agregadas" : "unidad agregada"} con éxito.`,
      });
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    const prev = getCartSnapshot();
    const target = prev.find((item) => item.id === id);
    if (!target) return;

    if (delta > 0 && target.maxStock !== undefined && target.quantity + delta > target.maxStock) {
      if (target.quantity >= target.maxStock) {
        toast.warning(`Stock máximo alcanzado para ${target.name}`, {
          description: `Solo hay ${target.maxStock} unidad(es) disponibles.`,
        });
        return;
      }
      writeCart(
        prev.map((item) => (item.id === id ? { ...item, quantity: item.maxStock! } : item))
      );
      toast.warning(`Cantidad ajustada al stock disponible (${target.maxStock}).`);
      return;
    }

    const next = prev
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    writeCart(next);
  };

  const removeFromCart = (id: number) => {
    const prev = getCartSnapshot();
    writeCart(prev.filter((item) => item.id !== id));
    toast.info("Producto eliminado del carrito");
  };

  const clearCart = () => {
    writeCart([]);
  };

  const toggleFavorite = (id: number) => {
    const prev = getFavsSnapshot();
    const exists = prev.includes(id);
    if (exists) {
      writeFavs(prev.filter((item) => item !== id));
      toast.info("Eliminado de tu lista de deseos");
    } else {
      writeFavs([...prev, id]);
      toast.success("¡Añadido a tus favoritos!");
    }
  };

  const isFavorite = (id: number) => favorites.includes(id);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        subtotal,
        deliveryFee,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
