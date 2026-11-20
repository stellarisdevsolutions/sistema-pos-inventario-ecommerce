"use client";

import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import {
  ShieldCheck,
  Truck,
  HeartHandshake,
  Award,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Package,
  FileText,
  QrCode,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NosotrosPage() {
  const pillars = [
    {
      icon: Package,
      title: "Stock Físico Garantizado",
      desc: "Solo publicamos productos con disponibilidad real y verificada en nuestro almacén central. Cero esperas por importaciones de terceros.",
      badge: "Stock Real",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      icon: FileText,
      title: "Facturación Legal con QR",
      desc: "Todas nuestras ventas son emitidas con factura computarizada autorizada por el Servicio de Impuestos Nacionales (SIN), válida para descargo de crédito fiscal.",
      badge: "100% Legal",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
      icon: Truck,
      title: "Logística Nacional Segura",
      desc: "Envíos directos a los 9 departamentos de Bolivia (La Paz, Santa Cruz, Cochabamba y provincias) con embalaje reforzado y número de guía de seguimiento.",
      badge: "Cobertura Total",
      badgeColor: "bg-orange-50 text-store-primary border-orange-200",
    },
    {
      icon: ShieldCheck,
      title: "Garantía Oficial de Fábrica",
      desc: "Respaldo directo y soporte posventa ante cualquier falla o desperfecto técnico. Nos comprometemos con la reposición inmediata de tu equipo.",
      badge: "12 Meses",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-white">
      <StoreHeader />

      {/* Migas de Pan */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-store-primary transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Quiénes Somos</span>
        </div>
      </div>

      {/* Hero Banner de Nosotros */}
      <section className="bg-slate-950 text-white py-16 sm:py-24 px-4 relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-store-primary rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-store-primary bg-orange-500/10 px-4 py-1.5 rounded-full border border-store-primary/30 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            COMPROMISO CON LA TECNOLOGÍA EN BOLIVIA
          </span>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight text-white">
            Tecnología confiable con <br />
            <span className="text-store-primary">garantía y stock real</span>
          </h1>

          <p className="text-slate-300 text-xs sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
            En <strong>Aura Store</strong> creemos que comprar tecnología en Bolivia debe ser una experiencia transparente, segura y rápida: con precios en moneda nacional, facturación legal y envíos puntuales.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/catalogo"
              className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black px-6 py-3.5 rounded-2xl shadow-md uppercase tracking-wider inline-flex items-center gap-2 hover:scale-105 transition-all"
            >
              <span>Ver Catálogo Completo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contacto"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-6 py-3.5 rounded-2xl uppercase tracking-wider transition-colors"
            >
              Contactar Asesor
            </Link>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="max-w-7xl w-full mx-auto p-4 md:py-16 flex-1 space-y-16">
        {/* Sección Quiénes Somos & Misión */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-black text-store-primary uppercase tracking-wider">
              Nuestra Misión
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 uppercase tracking-tight leading-tight">
              Diseñado para simplificar tus compras de tecnología
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Nuestra plataforma integra un sistema de inventario y punto de venta en tiempo real. Esto significa que cada artículo, precio y unidad disponible que ves en nuestra tienda web refleja la existencia física exacta en almacén.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Trabajamos con importaciones oficiales y distribuidores autorizados para garantizar que disfrutes de periféricos, componentes y equipos de última generación sin intermediarios oscuros ni sobreprecios.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Productos originales 100% nuevos en empaque sellado</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Factura legal válida para crédito fiscal y descargo empresarial</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Soporte técnico posventa directo por WhatsApp</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80"
                alt="Equipo de Trabajo Aura Store"
                className="w-full h-80 sm:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <p className="text-white text-xs font-bold leading-snug">
                  Centro de operaciones, control de calidad e inspección de equipos antes de cada despacho en Bolivia.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pilares / Valores Fundamentales */}
        <section className="space-y-6 pt-4 border-t border-slate-200">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-store-primary">
              NUESTROS PILARES
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
              ¿Por qué confiar en nosotros?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Compromisos reales que respaldan cada compra en nuestra tienda
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-orange-50 text-store-primary flex items-center justify-center border border-orange-100">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>

                    <h4 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                      {p.title}
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Llamado a la Acción Inferior */}
        <section className="rounded-3xl bg-slate-950 p-8 sm:p-12 text-center text-white space-y-4 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            ¿Listo para equipar tu espacio de trabajo o gaming?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Explora las categorías disponibles, consulta el stock en tiempo real y pide con entrega garantizada a tu domicilio o sucursal.
          </p>
          <div className="pt-2">
            <Link href="/catalogo">
              <Button
                size="lg"
                className="h-12 px-8 rounded-2xl bg-store-primary hover:bg-store-primary-hover text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
              >
                <span>Ir al Catálogo de Productos</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
