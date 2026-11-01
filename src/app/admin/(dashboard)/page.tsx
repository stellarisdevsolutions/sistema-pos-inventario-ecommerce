"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrendingUp,
  Package,
  AlertCircle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Search,
  CheckCircle2,
  ExternalLink,
  Layers,
  Wallet,
  ArrowRight,
  Printer,
  Link2,
  Store,
  DollarSign,
  ShieldAlert,
  Boxes,
  Truck,
  Receipt,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import DashboardLoading from "./loading";

// Mock data de tickets y ventas del sistema POS & Web
const salesList = [
  {
    id: "VTA-2026-1001",
    time: "Hoy, 11:20 AM",
    status: "Cobrado",
    statusVariant: "completed",
    channel: "pos",
    channelLabel: "POS Mostrador",
    customer: "Carlos Mendoza",
    role: "Cliente Frecuente",
    cashier: "Sofía Cajera (Caja 1)",
    total: 129.9,
    subtotal: 106.48,
    tax: 23.42,
    costTotal: 75.0,
    grossProfit: 54.9, // 129.90 - 75.00
    paymentMethod: "Efectivo",
    cashGiven: 150.0,
    changeGiven: 20.1,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Auriculares Inalámbricos Pro ANC", quantity: 1, unitPrice: 129.9, unitCost: 75.0, subtotal: 129.9 },
    ],
  },
  {
    id: "VTA-2026-1002",
    time: "Hoy, 10:45 AM",
    status: "Cobrado",
    statusVariant: "completed",
    channel: "pos",
    channelLabel: "POS Mostrador",
    customer: "Dra. Laura Gómez",
    role: "Factura B",
    cashier: "Sofía Cajera (Caja 1)",
    total: 89.0,
    subtotal: 72.95,
    tax: 16.05,
    costTotal: 48.0,
    grossProfit: 41.0,
    paymentMethod: "Tarjeta Débito",
    cashGiven: 89.0,
    changeGiven: 0.0,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Teclado Mecánico RGB Switch Red", quantity: 1, unitPrice: 89.0, unitCost: 48.0, subtotal: 89.0 },
    ],
  },
  {
    id: "VTA-2026-1003",
    time: "Hoy, 09:15 AM",
    status: "Cobrado",
    statusVariant: "completed",
    channel: "online",
    channelLabel: "Tienda Online",
    customer: "Público General",
    role: "Pedido Web #8812",
    cashier: "Pasarela Stripe",
    total: 149.0,
    subtotal: 122.13,
    tax: 26.87,
    costTotal: 82.5,
    grossProfit: 66.5,
    paymentMethod: "Tarjeta Crédito",
    cashGiven: 149.0,
    changeGiven: 0.0,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Smartwatch Vitalis Health Band", quantity: 1, unitPrice: 149.0, unitCost: 82.5, subtotal: 149.0 },
    ],
  },
  {
    id: "VTA-2026-1004",
    time: "Ayer, 06:40 PM",
    status: "Cobrado",
    statusVariant: "completed",
    channel: "pos",
    channelLabel: "POS Mostrador",
    customer: "Roberto Gómez",
    role: "Público General",
    cashier: "Sofía Cajera (Caja 1)",
    total: 59.9,
    subtotal: 49.1,
    tax: 10.8,
    costTotal: 32.0,
    grossProfit: 27.9,
    paymentMethod: "Efectivo",
    cashGiven: 60.0,
    changeGiven: 0.1,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Parlante Bluetooth Resistente IPX7", quantity: 1, unitPrice: 59.9, unitCost: 32.0, subtotal: 59.9 },
    ],
  },
  {
    id: "VTA-2026-1005",
    time: "Ayer, 04:15 PM",
    status: "Cobrado",
    statusVariant: "completed",
    channel: "pos",
    channelLabel: "POS Mostrador",
    customer: "Alejandro Chen",
    role: "Cliente Mayorista",
    cashier: "Lucas Almacenero (Caja 2)",
    total: 34.5,
    subtotal: 28.28,
    tax: 6.22,
    costTotal: 18.0,
    grossProfit: 16.5,
    paymentMethod: "Transferencia QR",
    cashGiven: 34.5,
    changeGiven: 0.0,
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Ratón Ergonómico Inalámbrico Silent", quantity: 1, unitPrice: 34.5, unitCost: 18.0, subtotal: 34.5 },
    ],
  },
];

// Productos con bajo stock crítico
const criticalStockProducts = [
  { name: "Teclado Mecánico RGB Switch Red", sku: "GAM-KB-02", stock: 2, minStock: 8, supplier: "Importadora Gaming Gear" },
  { name: "GadgetHub Watch X1 Pro", sku: "WAT-X1-PRO", stock: 3, minStock: 8, supplier: "Distribuidora Tech Global S.A." },
];

export default function AdminDashboardPage() {
  const [selectedSaleId, setSelectedSaleId] = useState("VTA-2026-1001");
  const [activeChannelTab, setActiveChannelTab] = useState<"all" | "pos" | "online">("all");
  const [showSkeleton, setShowSkeleton] = useState(false);

  const selectedSale =
    salesList.find((s) => s.id === selectedSaleId) || salesList[0];

  const filteredSales = salesList.filter((s) => {
    if (activeChannelTab === "pos") return s.channel === "pos";
    if (activeChannelTab === "online") return s.channel === "online";
    return true;
  });

  if (showSkeleton) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto select-none">
        <div className="flex items-center justify-between p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-ping" />
            <span>Vista previa del Skeleton Loader activo (modo de prueba)</span>
          </div>
          <button
            onClick={() => setShowSkeleton(false)}
            className="text-xs font-black px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            ✕ Salir del Esqueleto
          </button>
        </div>
        <DashboardLoading />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto select-none">
      {/* =========================================================================
          1. HEADER DEL PANEL (ESTILO FINNOVA)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Panel General
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
              En Vivo • Neon DB
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Métricas de facturación comercial, utilidad bruta en tiempo real y arqueo de turnos.
          </p>
        </div>

        {/* Acciones Superiores: Ir al POS o Abrir Turno */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSkeleton(true)}
            title="Previsualizar el diseño del Esqueleto de Carga (Skeleton Loader)"
            className="h-10 px-3.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Ver Esqueleto</span>
          </button>

          <Link href="/admin/cajas">
            <button className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>Turnos & Arqueos</span>
            </button>
          </Link>

          <Link href="/admin/ventas">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black gap-2 shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Cobrar en POS</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI PRINCIPALES (ESTILO FINNOVA CON DATOS COMERCIALES)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VENTAS TOTALES */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ventas del Mes</span>
              <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              $ 24,850.00
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <span>↑ 12.5%</span>
              <span className="text-slate-400 font-medium">vs mes anterior</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span>584 transacciones</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">78% POS • 22% Web</span>
          </div>
        </div>

        {/* KPI 2: UTILIDAD / GANANCIA BRUTA REAL CON MINI BAR CHART */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Ganancia Bruta Real
              </span>
              <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              $ 9,420.00
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-1">
              <span>37.9% margen</span>
              <span className="text-slate-400 font-medium">(PVP - Costo Kardex)</span>
            </div>
          </div>

          {/* Mini Bar Chart Índigo idéntico a Finnova */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-1.5 h-10 px-1">
              <div className="w-full bg-indigo-100 dark:bg-indigo-950/50 rounded-t-sm h-[30%]" title="Jul" />
              <div className="w-full bg-indigo-200 dark:bg-indigo-900/50 rounded-t-sm h-[45%]" title="Ago" />
              <div className="w-full bg-indigo-300 dark:bg-indigo-800/60 rounded-t-sm h-[60%]" title="Sep" />
              <div className="w-full bg-indigo-400 dark:bg-indigo-700/70 rounded-t-sm h-[75%]" title="Oct" />
              <div className="w-full bg-indigo-600 rounded-t-sm h-[95%]" title="Nov" />
              <div className="w-full bg-indigo-500 rounded-t-sm h-[85%]" title="Dic" />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 px-1">
              <span>Jul</span>
              <span>Ago</span>
              <span>Sep</span>
              <span>Oct</span>
              <span className="font-bold text-indigo-600">Nov</span>
              <span>Dic</span>
            </div>
          </div>
        </div>

        {/* KPI 3: TICKET PROMEDIO CON SPLINE CHART */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Ticket Promedio
              </span>
              <div className="h-7 w-7 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              $ 42.50
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <span>↑ +$4.80</span>
              <span className="text-slate-400 font-medium">por compra</span>
            </div>
          </div>

          {/* Gráfico Spline Morado de tendencia */}
          <div className="pt-2 relative h-10 flex items-center">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 200 40">
              <path
                d="M 0 35 Q 35 32, 60 25 T 110 18 T 160 10 T 200 4"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="20" cy="33" r="3" fill="#7c3aed" />
              <circle cx="60" cy="25" r="3" fill="#7c3aed" />
              <circle cx="110" cy="18" r="3" fill="#7c3aed" />
              <circle cx="160" cy="10" r="3" fill="#7c3aed" />
              <circle cx="195" cy="5" r="4" fill="#7c3aed" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* KPI 4: EFECTIVO EN CAJAS & MÉTODOS DE PAGO */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Efectivo en Gavetas
              </span>
              <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
              $ 1,485.50
            </div>

            <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
              ✓ Turnos en Caja 1 y 2 cuadrados
            </span>
          </div>

          {/* Desglose de Canales de Cobro: Solo Efectivo y QR */}
          <div className="pt-2 flex items-center gap-2 justify-between">
            <div className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-600 text-white text-center shadow-xs">
              <span className="block text-[8px] font-mono opacity-80 uppercase tracking-wider">Efectivo</span>
              <span className="block text-xs font-black">$865.50</span>
            </div>

            <div className="flex-1 py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">Cobros QR</span>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">$620.00</span>
            </div>

            <Link href="/admin/cajas">
              <button className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold shrink-0 hover:bg-black transition-colors cursor-pointer">
                Arqueo
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BARRA DE FILTROS EN PÍLDORA (ESTILO FINNOVA)
          ========================================================================= */}
      <section className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-2xs">
          <span>Canal Activo</span>
          <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
            {activeChannelTab === "all" ? "All" : activeChannelTab.toUpperCase()}
          </span>
        </span>

        <button
          onClick={() => setActiveChannelTab("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer",
            activeChannelTab === "all"
              ? "bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
        >
          Todos los Canales
        </button>

        <button
          onClick={() => setActiveChannelTab("pos")}
          className={cn(
            "px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer",
            activeChannelTab === "pos"
              ? "bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
        >
          Solo Mostrador POS
        </button>

        <button
          onClick={() => setActiveChannelTab("online")}
          className={cn(
            "px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer",
            activeChannelTab === "online"
              ? "bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          )}
        >
          Solo Pedidos Web
        </button>

        <div className="relative ml-auto w-full sm:w-56 mt-2 sm:mt-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ticket..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
          />
        </div>
      </section>

      {/* =========================================================================
          4. CONTENEDOR SPLIT BENTO OSCURO (#11162b - LA JOYA DE LA CORONA DE FINNOVA)
          ========================================================================= */}
      <section className="rounded-3xl bg-[#11162b] border border-[#1e2648] p-6 lg:p-7 text-white shadow-xl space-y-6">
        {/* Cabecera del Contenedor Oscuro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2648]">
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              Monitor de Ventas & Tickets en Tiempo Real
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier ticket para auditar su margen de ganancia y comprobante de cobro.
            </p>
          </div>

          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-bold w-fit">
            Sincronizado con Neon DB
          </Badge>
        </div>

        {/* Layout en 2 Columnas Split: Lista a la izquierda + Detalle Expandido a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: LISTA INTERACTIVA DE TICKETS */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
              Últimas Transacciones ({filteredSales.length})
            </div>

            <div className="space-y-2">
              {filteredSales.map((sale) => {
                const isSelected = sale.id === selectedSaleId;

                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedSaleId(sale.id)}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#28325a] border border-indigo-400/50 shadow-md scale-[1.01]"
                        : "bg-[#161c38]/60 hover:bg-[#1a2144] border border-[#222b52]/50 text-slate-300"
                    )}
                  >
                    {/* Avatar y Datos de Ticket */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={sale.avatar}
                        alt={sale.customer}
                        className="h-10 w-10 rounded-full object-cover border border-indigo-300/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          # {sale.id}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sale.time} • {sale.cashier}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Canal y Monto */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                          sale.channel === "pos"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        )}
                      >
                        {sale.channel === "pos" ? "POS" : "Web"}
                      </span>
                      <span className="text-sm font-black text-white">
                        ${sale.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA: TARJETA DE DETALLE AUDITADO */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-[#1c234a] border border-[#2b356c] p-6 lg:p-7 shadow-2xl space-y-6">
              {/* Encabezado del Detalle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2b356c]">
                <div>
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Ticket Auditado
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      # {selectedSale.id}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedSale.status}
                    </span>
                  </div>
                </div>

                {/* Cliente y Cajero */}
                <div className="flex items-center gap-3">
                  <img
                    src={selectedSale.avatar}
                    alt={selectedSale.customer}
                    className="h-10 w-10 rounded-full object-cover border border-indigo-300/40"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {selectedSale.customer}
                    </span>
                    <span className="text-[10px] text-indigo-300">
                      {selectedSale.role} • {selectedSale.channelLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de Ítems Vendidos con Utilidad Neta Visible */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Productos Desglosados
                </div>

                <div className="space-y-2">
                  {selectedSale.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#262f60]/80 border border-indigo-400/20 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white text-xs">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.quantity} ud x ${item.unitPrice.toFixed(2)} (Costo de compra: ${item.unitCost.toFixed(2)})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-white block">
                          ${item.subtotal.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400">
                          +${(item.unitPrice - item.unitCost).toFixed(2)} ganancia
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen Financiero y Métodos de Cobro */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-[#2b356c] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Subtotal</span>
                  <span className="text-sm font-bold text-slate-200">${selectedSale.subtotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">IVA (21%)</span>
                  <span className="text-sm font-bold text-slate-200">${selectedSale.tax.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Utilidad Neta</span>
                  <span className="text-sm font-black text-emerald-400">+${selectedSale.grossProfit.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-300 block font-medium">Total Cobrado</span>
                  <span className="text-base font-black text-white">${selectedSale.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Pie de Acción: Vuelto y Botón de Reimpresión */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">Medio: </span>
                  <span className="font-bold text-white">{selectedSale.paymentMethod}</span>
                  {selectedSale.changeGiven > 0 && (
                    <span className="ml-2 text-emerald-400 font-bold">
                      (Vuelto: ${selectedSale.changeGiven.toFixed(2)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link href="/admin/inventario">
                    <button
                      className="h-10 px-4 rounded-full bg-[#262f60] hover:bg-[#323d7a] text-indigo-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Boxes className="h-4 w-4" />
                      <span>Ver en Kardex</span>
                    </button>
                  </Link>

                  <button
                    onClick={() =>
                      toast.info("Enviando a impresora", {
                        description: `Ticket de venta #${selectedSale.id} enviado a cola de impresión térmica.`,
                      })
                    }
                    className="h-10 px-5 rounded-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Ticket</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. FILA INFERIOR: CONTROL DE INVENTARIO CRÍTICO & MERMAS (2 BENTO CARDS)
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bento A: Alertas de Quiebre de Stock */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Stock Crítico para Reposición
                  </h3>
                  <p className="text-[11px] text-slate-400">Productos que están por debajo de su stock mínimo</p>
                </div>
              </div>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                2 en alerta
              </Badge>
            </div>

            <div className="space-y-2.5">
              {criticalStockProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      SKU: {p.sku} • Proveedor: {p.supplier}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-600 text-sm">
                      {p.stock} uds restantes
                    </span>
                    <span className="block text-[10px] text-slate-400">mín. {p.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Valor total almacén: $4,860.00</span>
            <Link href="/admin/compras">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-indigo-200 text-indigo-600 dark:border-indigo-800">
                <Truck className="h-3.5 w-3.5" />
                <span>Generar Orden de Compra</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento B: Mermas & Pérdidas por Producto Dañado */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Auditoría de Mermas & Bajas
                  </h3>
                  <p className="text-[11px] text-slate-400">Pérdidas monetarias por productos defectuosos o rotos</p>
                </div>
              </div>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                $74.00 este mes
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-800 dark:text-rose-300 block">Acta BAJA-2026-001</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    1x Auriculares ANC Pro • Rotura en transporte • Auth: Martín Supervisor
                  </p>
                </div>
                <span className="font-black text-rose-600 text-sm">-$55.00</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-800 dark:text-amber-300 block">Acta BAJA-2026-000</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    1x Base Qi 3en1 • Falla de fábrica (RMA proveedor en curso)
                  </p>
                </div>
                <span className="font-black text-amber-600 text-sm">-$19.00</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Tasa de merma: 0.28% de ventas</span>
            <Link href="/admin/inventario">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1.5 border-rose-200 text-rose-600 dark:border-rose-800">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Ver Actas de Baja</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
