"use client";

import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import {
  ShieldCheck,
  Truck,
  ChevronRight,
  Package,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { STORE_NAME } from "@/lib/store-config";

export default function NosotrosPage() {
  const pillars = [
    {
      icon: Package,
      title: "Stock físico garantizado",
      desc: "Solo publicamos productos con disponibilidad real y verificada en nuestro almacén central. Cero esperas por importaciones de terceros.",
      badge: "Stock real",
    },
    {
      icon: FileText,
      title: "Facturación legal con QR",
      desc: "Todas nuestras ventas son emitidas con factura computarizada autorizada por el Servicio de Impuestos Nacionales (SIN), válida para crédito fiscal.",
      badge: "100% legal",
    },
    {
      icon: Truck,
      title: "Logística nacional segura",
      desc: "Envíos directos a los 9 departamentos de Bolivia con embalaje reforzado y número de guía de seguimiento.",
      badge: "Cobertura nacional",
    },
    {
      icon: ShieldCheck,
      title: "Garantía oficial de fábrica",
      desc: "Respaldo directo y soporte posventa ante cualquier falla técnica, con reposición inmediata según cobertura.",
      badge: "12 meses",
    },
  ];

  return (
    <div className="min-h-screen bg-store-bg text-store-ink font-store flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-store-on-primary">
      <StoreHeader />

      {/* Cabecera amplia sobre blanco puro */}
      <section className="border-b border-store-border px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-[1380px] mx-auto">
          <div className="max-w-3xl space-y-5">
            <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-xs text-store-muted">
              <Link href="/" className="hover:text-store-ink transition-colors">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-store-ink font-medium">Quiénes somos</span>
            </nav>

            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-store-ink leading-[1.08]">
              Tecnología confiable con garantía y stock real en Bolivia.
            </h1>

            <p className="text-store-muted text-sm sm:text-base leading-relaxed max-w-2xl">
              En <strong className="text-store-ink font-semibold">{STORE_NAME}</strong> creemos que comprar tecnología debe ser transparente y rápido: precios en moneda nacional, facturación legal con QR y envíos puntuales a los 9 departamentos.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/catalogo"
                className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-sm font-bold px-7 py-3 rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]"
              >
                Ver catálogo completo
              </Link>

              <Link
                href="/contacto"
                className="bg-store-bg hover:bg-store-surface text-store-ink border border-store-border hover:border-store-ink text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Contactar asesor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 space-y-16">
        {/* Sección Quiénes Somos & Misión */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-medium text-store-primary">Nuestra misión</p>
            <h2 className="text-2xl sm:text-4xl font-semibold text-store-ink tracking-[-0.03em] leading-[1.12]">
              Diseñado para simplificar tus compras de tecnología.
            </h2>
            <p className="text-sm text-store-muted leading-relaxed">
              Nuestra plataforma integra un sistema de inventario y punto de venta en tiempo real. Esto significa que cada artículo, precio y unidad disponible que ves en nuestra tienda web refleja la existencia física exacta en almacén.
            </p>
            <p className="text-sm text-store-muted leading-relaxed">
              Trabajamos con importaciones oficiales y distribuidores autorizados para garantizar equipos de última generación sin intermediarios ni sobreprecios.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs font-medium text-store-ink">
                <CheckCircle2 className="h-4 w-4 text-store-primary shrink-0" />
                <span>Productos originales 100% nuevos en empaque sellado</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-store-ink">
                <CheckCircle2 className="h-4 w-4 text-store-primary shrink-0" />
                <span>Factura legal válida para crédito fiscal y descargo empresarial</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-store-ink">
                <CheckCircle2 className="h-4 w-4 text-store-primary shrink-0" />
                <span>Soporte técnico posventa directo por WhatsApp</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-[24px] overflow-hidden bg-store-surface">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80"
                alt={`Equipo de trabajo ${STORE_NAME}`}
                className="w-full h-72 sm:h-80 object-cover"
              />
              <div className="px-6 py-4">
                <p className="text-store-muted text-xs leading-relaxed">
                  Centro de operaciones, control de calidad e inspección de equipos antes de cada despacho en Bolivia.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pilares */}
        <section className="space-y-7 pt-10 border-t border-store-border">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-store-ink tracking-[-0.025em]">
              Por qué comprar con nosotros
            </h2>
            <p className="text-sm text-store-muted">
              Compromisos concretos que respaldan cada compra en nuestra tienda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="bg-store-surface rounded-2xl p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-store-ink stroke-[1.5]" />
                      <span className="text-[11px] font-medium text-store-muted">
                        {p.badge}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-store-ink">
                      {p.title}
                    </h3>

                    <p className="text-xs text-store-muted leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bloque CTA final */}
        <section className="rounded-[28px] bg-store-surface p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-semibold text-store-ink tracking-[-0.025em]">
              Explora el inventario disponible hoy
            </h3>
            <p className="text-sm text-store-muted leading-relaxed">
              Consulta el stock en tiempo real y realiza tu pedido con entrega a domicilio o retiro en tienda.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-sm font-bold px-7 py-3 rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] shrink-0 text-center"
          >
            Ir al catálogo
          </Link>
        </section>
      </main>

      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
