"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  selectedColor?: string;
  selectedVariant?: string;
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
  }) => void;
  updateQuantity: (id: number, delta: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 1,
      name: "GadgetHub Watch X1 Pro Amoled",
      price: 149.99,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=150&auto=format&fit=crop&q=80",
    },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([1, 4]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 50 || subtotal === 0 ? 0 : 5.0;
  const totalPrice = subtotal + deliveryFee;

  const addToCart = (product: {
    id: number;
    name: string;
    price: number;
    image: string;
    quantity?: number;
    selectedColor?: string;
    selectedVariant?: string;
  }) => {
    const qtyToAdd = product.quantity || 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + qtyToAdd } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: qtyToAdd,
          image: product.image,
          selectedColor: product.selectedColor,
          selectedVariant: product.selectedVariant,
        },
      ];
    });

    toast.success(`${product.name} añadido al carrito`, {
      description: `${qtyToAdd} ${qtyToAdd > 1 ? "unidades agregadas" : "unidad agregada"} con éxito.`,
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast.info("Producto eliminado del carrito");
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        toast.info("Eliminado de tu lista de deseos");
        return prev.filter((item) => item !== id);
      } else {
        toast.success("¡Añadido a tus favoritos!");
        return [...prev, id];
      }
    });
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
