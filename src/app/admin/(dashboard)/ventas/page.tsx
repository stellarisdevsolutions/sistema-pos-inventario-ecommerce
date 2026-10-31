"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Zap,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Catálogo de productos listos para cobrar en POS
const posCatalog = [
  {
    id: 1,
    name: "GadgetHub Watch X1 Pro",
    sku: "WAT-X1-PRO",
    price: 199.99,
    stock: 3,
    category: "Smartwatches",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "SoundCore Elite Earbuds Pro",
    sku: "AUD-EAR-PRO",
    price: 129.9,
    stock: 24,
    category: "Audio",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Teclado Mecánico RGB Wireless",
    sku: "KEY-RGB-WL",
    price: 89.0,
    stock: 2,
    category: "Gaming",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Base Carga Rápida Qi 3 en 1",
    sku: "CHG-QI-03",
    price: 49.99,
    stock: 10,
    category: "Accesorios",
    image: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    name: "Cámara Ultra 4K Creator Kit",
    sku: "CAM-4K-KIT",
    price: 349.0,
    stock: 15,
    category: "Video",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: 6,
    name: "Cable Magnético USB-C 100W",
    sku: "CBL-MAG-100",
    price: 18.5,
    stock: 45,
    category: "Accesorios",
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=150&auto=format&fit=crop&q=80",
  },
];

interface CartItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function VentasPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 1,
      name: "GadgetHub Watch X1 Pro",
      sku: "WAT-X1-PRO",
      price: 199.99,
      quantity: 1,
    },
    {
      id: 4,
      name: "Base Carga Rápida Qi 3 en 1",
      sku: "CHG-QI-03",
      price: 49.99,
      quantity: 1,
    },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [customerName, setCustomerName] = useState("Público General");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Totales
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  // Manejo de Carrito
  const addToCart = (product: (typeof posCatalog)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // Filtrado de Catálogo
  const filteredCatalog = posCatalog.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["Todas", "Smartwatches", "Audio", "Gaming", "Accesorios", "Video"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HEADER CON SELECTOR DE MODO (POS CAJA vs HISTORIAL)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            Punto de Venta & Caja
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Turno Abierto
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emisión de tickets en mostrador, control de cobros y arqueo en vivo.
          </p>
        </div>

        {/* Selector de Pestañas: Terminal vs Historial */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          <button
            onClick={() => setActiveTab("pos")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === "pos"
                ? "bg-[#0b1329] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Terminal POS
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === "history"
                ? "bg-[#0b1329] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Historial de Ventas
          </button>
        </div>
      </div>

      {activeTab === "pos" ? (
        /* =========================================================================
            2. VISTA TERMINAL POS (GRID 2 COLUMNAS: CATÁLOGO + TICKET)
            ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LADO IZQUIERDO: CATÁLOGO RÁPIDO (7 Columnas) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Buscador y Categorías */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escanear código de barras o escribir producto / SKU..."
                  className="pl-9 h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 focus:ring-2 focus:ring-[#0284c7]/20 focus:border-[#0284c7]"
                />
              </div>

              {/* Pills de categorías */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all",
                      selectedCategory === cat
                        ? "bg-[#0284c7] text-white shadow-xs font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Productos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCatalog.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group rounded-2xl bg-white border border-slate-200/80 p-3 shadow-xs hover:border-[#0284c7] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100 mb-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                      {product.stock} disp.
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {product.category}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
                    <span className="text-sm font-black text-slate-900">
                      ${product.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LADO DERECHO: TICKET DE CAJA / REGISTRADORA (5 Columnas) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl bg-white border border-slate-200/80 shadow-md p-5 space-y-4">
              {/* Header del Ticket */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-sky-50 text-[#0284c7] flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900">Ticket en Curso</h2>
                    <span className="text-[10px] text-slate-400">Orden #VTA-1050</span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Selector de Cliente */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cliente
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Público General o Nombre..."
                    className="pl-8 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              {/* Lista de Productos en Ticket */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    El carrito de venta está vacío.
                    <br />
                    Haz clic en los productos para agregarlos.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ${item.price.toFixed(2)} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-6 w-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-6 w-6 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-black text-slate-900 min-w-[50px] text-right">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selector de Método de Pago */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={cn(
                      "h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      paymentMethod === "cash"
                        ? "bg-[#0284c7] text-white shadow-xs font-black"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      paymentMethod === "card"
                        ? "bg-[#0284c7] text-white shadow-xs font-black"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Tarjeta</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("transfer")}
                    className={cn(
                      "h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      paymentMethod === "transfer"
                        ? "bg-[#0284c7] text-white shadow-xs font-black"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Transf.</span>
                  </button>
                </div>
              </div>

              {/* Resumen Financiero y Botón Primario Cobrar */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-500">TOTAL A COBRAR:</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <Button
                  disabled={cart.length === 0}
                  onClick={() => setReceiptOpen(true)}
                  className="w-full h-12 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-black gap-2 shadow-md shadow-[#0284c7]/25 active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>Cobrar e Imprimir Ticket (${total.toFixed(2)})</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            3. HISTORIAL DE VENTAS Y TICKETS
            ========================================================================= */
        <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 font-black">Monto Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">#VTA-1049</td>
                  <td className="py-3.5 px-4 text-slate-500">Hoy, 11:20 PM</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">Carlos Mendoza</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                      Efectivo
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900">$145.00</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completada
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReceiptOpen(true)}
                      className="h-8 rounded-lg text-xs gap-1 border-slate-200 text-slate-700 hover:text-slate-900"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Ticket</span>
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MODAL DE COMPROBANTE TÉRMICO / TICKET DE VENTA
          ========================================================================= */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-xs p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
          <DialogHeader className="text-center pb-3 border-b border-dashed border-slate-200">
            <DialogTitle className="text-base font-black tracking-tight text-slate-900">
              Aura Commerce
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              Comprobante de Venta Electrónico
              <br />
              Ticket: <span className="font-mono font-bold text-slate-900">#VTA-1050</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Cliente: {customerName}</span>
              <span>Hoy</span>
            </div>

            <div className="border-y border-dashed border-slate-200 py-2.5 space-y-1.5">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-[11px]">
                  <span className="font-medium text-slate-700">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-black text-sm pt-1 text-slate-900">
                <span>TOTAL:</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Método de pago:</span>
                <span className="uppercase font-bold text-slate-800">{paymentMethod}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-200">
              ¡Gracias por su compra!
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptOpen(false)}
              className="flex-1 text-xs h-9 rounded-xl border-slate-200"
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.print();
                setReceiptOpen(false);
              }}
              className="flex-1 text-xs h-9 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold gap-1.5 shadow-md shadow-[#0284c7]/20"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
