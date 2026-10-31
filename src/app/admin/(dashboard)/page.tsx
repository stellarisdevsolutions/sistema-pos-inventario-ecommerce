"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock data de facturas / ventas para el split bento interactivo de Finnova
const invoicesList = [
  {
    id: "VTA-1001",
    time: "En 2 días",
    status: "Sin Enviar",
    statusVariant: "unsent",
    customer: "Elena Rostova",
    role: "Operaciones",
    company: "BrightWave Tech",
    total: 68750.0,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Smartphones X1 Flagship", amount: 28500.0 },
      { name: "Servidores Cloud Edge", amount: 24250.0 },
      { name: "Soporte Técnico Anual", amount: 16000.0 },
    ],
  },
  {
    id: "VTA-1002",
    time: "En 4 días",
    status: "Visto",
    statusVariant: "viewed",
    customer: "Marco Viteri",
    role: "Gerente de Compras",
    company: "Nova Commerce",
    total: 21480.0,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Audio Hi-Fi Auriculares", amount: 12480.0 },
      { name: "Bases de Carga Qi", amount: 9000.0 },
    ],
  },
  {
    id: "VTA-1003",
    time: "En 5 días",
    status: "Sin Cobrar",
    statusVariant: "unpaid",
    customer: "James Carter",
    role: "Director de Marketing",
    company: "BrightWave",
    total: 47980.0,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Diseño UI/UX Sistema", amount: 15990.0 },
      { name: "Desarrollo Frontend", amount: 21250.0 },
      { name: "Pruebas QA & Testing", amount: 10740.0 },
    ],
  },
  {
    id: "VTA-1004",
    time: "En 16 días",
    status: "Visto",
    statusVariant: "viewed",
    customer: "Sofía Martínez",
    role: "CFO",
    company: "Apex Soluciones",
    total: 55230.0,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    items: [
      { name: "Lote Laptops Pro 16", amount: 35230.0 },
      { name: "Periféricos RGB Studio", amount: 20000.0 },
    ],
  },
  {
    id: "VTA-1005",
    time: "En 19 días",
    status: "Visto",
    statusVariant: "viewed",
    customer: "Diego Salgado",
    role: "Líder Técnico",
    company: "CyberPoint S.A.",
    total: 6880.0,
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
    items: [{ name: "Kit Teclados Mecánicos", amount: 6880.0 }],
  },
];

export default function AdminDashboardPage() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("VTA-1003");
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "unpaid">("unpaid");

  const selectedInvoice =
    invoicesList.find((i) => i.id === selectedInvoiceId) || invoicesList[2];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto select-none">
      {/* =========================================================================
          1. HEADER DEL PANEL (ESTILO FINNOVA)
          Título "Panel General", filtros y CTA principal sin saludo redundante
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Panel General
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Métricas de facturación, flujo de caja y ventas en tiempo real.
            </p>
          </div>
        </div>

        {/* Acciones de la derecha: Filtros y Botón "+ Nueva Venta" estilo Finnova */}
        <div className="flex items-center gap-2.5">
          <button
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
            title="Ajustes de vista"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <Link href="/admin/ventas">
            <Button
              size="sm"
              className="h-10 px-5 rounded-xl bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white text-xs font-bold gap-2 shadow-md shadow-[var(--admin-accent)]/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>+ Nueva Venta</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. LAS 4 TARJETAS KPI PRINCIPALES (REPLICADAS FIELMENTE DE FINNOVA)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: OVERDUE / VENCIDO CON ALERTA */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Por Cobrar</span>
              <div className="h-6 w-6 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 tracking-tight mt-3">
              $ 24,850.00
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-500 mt-1">
              <span>↑ 12.5%</span>
              <span className="text-slate-400 font-medium">vs mes anterior</span>
            </div>
          </div>

          {/* Mini preview gráfico estilizado */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-500">
            <span>4 clientes pendientes</span>
            <span className="font-bold text-slate-800">Urgente</span>
          </div>
        </div>

        {/* CARD 2: DUE WITHIN NEXT MONTH CON MINI BAR CHART */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Proyección del Mes
              </span>
              <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Calendar className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 tracking-tight mt-3">
              $ 142,560.00
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-1">
              <span>↑ 8.2%</span>
              <span className="text-slate-400 font-medium">vs mes anterior</span>
            </div>
          </div>

          {/* Mini Bar Chart idéntico al de Finnova */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-1 h-9">
              <div className="w-3 rounded-full bg-indigo-200 h-4" />
              <div className="w-3 rounded-full bg-indigo-300 h-6" />
              <div className="w-3 rounded-full bg-indigo-400 h-5" />
              <div className="w-3 rounded-full bg-indigo-500 h-7" />
              <div className="w-3 rounded-full bg-indigo-400 h-6" />
              <div className="w-3 rounded-full bg-[#4338ca] h-9" />
              <div className="w-3 rounded-full bg-indigo-300 h-5" />
            </div>
            <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1">
              <span>Jul</span>
              <span>Ago</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dic</span>
            </div>
          </div>
        </div>

        {/* CARD 3: AVERAGE TIME CON MINI SPLINE LINE CHART */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Tiempo Promedio de Cobro
              </span>
              <div className="h-6 w-6 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 tracking-tight mt-3">
              16 <span className="text-lg font-bold text-slate-500">días</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <span>↓ 2 días</span>
              <span className="text-slate-400 font-medium">más rápido este mes</span>
            </div>
          </div>

          {/* Mini Gráfico de Línea con Puntos de Finnova */}
          <div className="pt-2 relative h-10 flex items-center">
            <svg className="w-full h-10 overflow-visible" viewBox="0 0 200 40">
              <path
                d="M 0 35 Q 35 32, 60 25 T 110 18 T 160 10 T 200 4"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="20" cy="33" r="3" fill="#4338ca" />
              <circle cx="60" cy="25" r="3" fill="#4338ca" />
              <circle cx="110" cy="18" r="3" fill="#4338ca" />
              <circle cx="160" cy="10" r="3" fill="#4338ca" />
              <circle cx="195" cy="5" r="4" fill="#4338ca" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* CARD 4: DISPONIBLE CON TARJETAS DE PAGO (STRIPE/VISA/PAYPAL) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Disponible en Cuenta
              </span>
              <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="text-3xl font-black text-slate-900 tracking-tight mt-3">
              $ 186,540.00
            </div>

            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Conciliación bancaria activa
            </span>
          </div>

          {/* Selector de Cuentas estilo Finnova */}
          <div className="pt-2 flex items-center gap-1.5 justify-between">
            <div className="flex-1 py-1.5 px-1 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="block text-[8px] font-mono text-slate-400">•••• 4242</span>
              <span className="block text-[9px] font-bold text-slate-700">Visa</span>
            </div>

            {/* Tarjeta Activa Destacada en Indigo */}
            <div className="flex-1 py-2 px-1 rounded-xl bg-[#4338ca] text-white text-center shadow-xs">
              <span className="block text-[8px] font-mono opacity-80">•••• 6789</span>
              <span className="block text-[9px] font-bold">Stripe</span>
            </div>

            <div className="flex-1 py-1.5 px-1 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="block text-[8px] font-mono text-slate-400">•••• 1234</span>
              <span className="block text-[9px] font-bold text-slate-700">PayPal</span>
            </div>

            <button className="h-8 px-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold shrink-0 hover:bg-black transition-colors cursor-pointer">
              Cobrar
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BARRA DE FILTROS EN PÍLDORA (ESTILO FINNOVA)
          ========================================================================= */}
      <section className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white font-bold shadow-2xs">
          <span>Filtros activos</span>
          <span className="h-4 w-4 rounded-full bg-white text-slate-900 text-[10px] font-black flex items-center justify-center">
            2
          </span>
        </span>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
          <span>Todos los clientes</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
          <span>Todos los estados</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
          <span>Noviembre 2026</span>
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
          <span>Diciembre 2026</span>
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <div className="relative ml-auto w-full sm:w-56 mt-2 sm:mt-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="N° de factura..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-full bg-white border border-slate-200/90 focus:outline-hidden focus:ring-2 focus:ring-[#4338ca]/20 focus:border-[#4338ca]"
          />
        </div>
      </section>

      {/* =========================================================================
          4. CONTENEDOR SPLIT BENTO OSCURO (LA JOYA DE LA CORONA DE FINNOVA)
          Fondo y bordes controlados por variables globales CSS
          ========================================================================= */}
      <section className="rounded-3xl bg-[var(--admin-sidebar-bg)] border border-[var(--admin-sidebar-border)] p-6 lg:p-7 text-white shadow-xl space-y-6">
        {/* Cabecera Superior del Contenedor Oscuro con Pestañas Flotantes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--admin-sidebar-border)]">
          <h2 className="text-base font-black text-white tracking-tight">
            Facturas & Ventas Emitidas
          </h2>

          {/* Pestañas Flotantes estilo Finnova */}
          <div className="flex items-center bg-[var(--admin-sidebar-hover)] p-1 rounded-full border border-[var(--admin-sidebar-border)] self-start sm:self-auto text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer",
                activeTab === "all"
                  ? "bg-[var(--admin-accent)] text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              )}
            >
              Todas
            </button>

            <button
              onClick={() => setActiveTab("draft")}
              className={cn(
                "px-3.5 py-1 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "draft"
                  ? "bg-[var(--admin-accent)] text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <span>Borrador</span>
              <span className="text-[10px] opacity-75">3</span>
            </button>

            <button
              onClick={() => setActiveTab("unpaid")}
              className={cn(
                "px-3.5 py-1 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "unpaid"
                  ? "bg-[var(--admin-accent)] text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              )}
            >
              <span>Sin Cobrar</span>
              <span className="h-4 px-1.5 rounded-full bg-white/20 text-[10px] font-black flex items-center justify-center">
                5
              </span>
            </button>
          </div>
        </div>

        {/* Layout en 2 Columnas Split: Lista a la izquierda (38%) + Detalle a la derecha (62%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: LISTA INTERACTIVA DE VENTAS (5 Columnas) */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
              Pendientes de Liquidación
            </div>

            <div className="space-y-2">
              {invoicesList.map((inv) => {
                const isSelected = inv.id === selectedInvoiceId;

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
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
                        src={inv.avatar}
                        alt={inv.customer}
                        className="h-10 w-10 rounded-full object-cover border border-indigo-300/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          # {inv.id}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {inv.time}
                        </span>
                      </div>
                    </div>

                    {/* Estado y Monto */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                          isSelected
                            ? "bg-white text-slate-900"
                            : "bg-[#242d54] text-slate-300"
                        )}
                      >
                        {inv.status}
                      </span>
                      <span className="text-sm font-black text-white">
                        ${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA: TARJETA DE DETALLE COMPLETO (7 Columnas - EXACTA A FINNOVA) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-[#1c234a] border border-[#2b356c] p-6 lg:p-7 shadow-2xl space-y-6">
              {/* Encabezado del Detalle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2b356c]">
                <div>
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Detalles de Factura
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      # {selectedInvoice.id}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-indigo-200 border border-white/15">
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>

                {/* Cliente */}
                <div className="flex items-center gap-3">
                  <img
                    src={selectedInvoice.avatar}
                    alt={selectedInvoice.customer}
                    className="h-10 w-10 rounded-full object-cover border border-indigo-300/40"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {selectedInvoice.customer}
                    </span>
                    <span className="text-[10px] text-indigo-300">
                      {selectedInvoice.role} • {selectedInvoice.company}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de 3 Items / Conceptos Facturados + Botón "+ Agregar Ítem" */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedInvoice.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#262f60]/80 border border-indigo-400/20 hover:border-indigo-400/40 transition-all flex flex-col justify-between min-h-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-white">
                        ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-indigo-300" />
                    </div>
                    <span className="text-xs font-medium text-indigo-200 mt-2">
                      {item.name}
                    </span>
                  </div>
                ))}

                {/* Tarjeta "+ Agregar ítem" punteada estilo Finnova */}
                <button className="p-4 rounded-2xl border-2 border-dashed border-indigo-400/30 hover:border-indigo-400/60 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-1.5 min-h-[90px] text-indigo-200 cursor-pointer">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-bold">Agregar ítem</span>
                </button>
              </div>

              {/* Resumen Financiero y Botones de Acción (Payout Now / Imprimir) */}
              <div className="pt-4 border-t border-[#2b356c] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Sub Total</span>
                    <span className="text-sm font-black text-white">
                      ${selectedInvoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total Facturado</span>
                    <span className="text-sm font-black text-white">
                      ${selectedInvoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Saldo Pendiente</span>
                    <span className="text-sm font-black text-[#38bdf8]">
                      ${selectedInvoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center gap-2">
                  <button
                    className="h-10 w-10 rounded-full bg-[#262f60] hover:bg-[#323d7a] text-indigo-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Copiar enlace de pago"
                  >
                    <Link2 className="h-4 w-4" />
                  </button>

                  <button
                    className="h-10 w-10 rounded-full bg-[#262f60] hover:bg-[#323d7a] text-indigo-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Ver calendario"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>

                  {/* Botón Píldora Blanco "Cobrar Ahora" idéntico a Finnova */}
                  <button
                    onClick={() => alert(`Procesando liquidación para #${selectedInvoice.id}`)}
                    className="h-10 px-6 rounded-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                  >
                    Cobrar ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
