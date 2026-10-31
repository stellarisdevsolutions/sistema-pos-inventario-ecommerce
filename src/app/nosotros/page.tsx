"use client";

import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import {
  Zap,
  ShieldCheck,
  Truck,
  HeartHandshake,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NosotrosPage() {
  const stats = [
    { label: "Clientes Felices", value: "15,000+" },
    { label: "Índice de Satisfacción", value: "99.4%" },
    { label: "Envíos en 24/48 Horas", value: "100%" },
    { label: "Garantía Oficial", value: "12 Meses" },
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: "Garantía y Originalidad",
      desc: "Todos los productos provienen directamente de distribuidores autorizados con sellos originales de fábrica.",
    },
    {
      icon: Truck,
      title: "Logística Ultrarrápida",
      desc: "Empacamos con protección de alta densidad y despachamos en tiempo récord para que disfrutes tu tecnología sin esperas.",
    },
    {
      icon: HeartHandshake,
      title: "Atención 1 a 1",
      desc: "No somos bots genéricos; nuestro equipo de expertos en tecnología te asesora antes, durante y después de tu compra.",
    },
    {
      icon: Award,
      title: "Precios Justos y Transparentes",
      desc: "Sin comisiones ocultas ni sorpresas al pagar. Garantizamos la mejor relación calidad-precio del mercado.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col pb-20 md:pb-0">
      <StoreHeader />

      {/* Hero Banner de Nosotros */}
      <section className="bg-slate-950 text-white py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-store-primary rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-store-primary bg-orange-500/10 px-4 py-1.5 rounded-full border border-store-primary/30 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            NUESTRA HISTORIA Y COMPROMISO
          </span>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight">
            Pasión por la tecnología que <br />
            <span className="text-store-primary">transforma tu vida</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
            En <strong>GadgetHub</strong> nacimos con una misión clara: acercar lo mejor de la tecnología mundial a tus manos, combinando precios honestos, asesoría humana y un servicio de entrega intachable.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/catalogo"
              className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black px-6 py-3.5 rounded-2xl shadow-md shadow-store-primary/30 uppercase tracking-wider inline-flex items-center gap-2"
            >
              <span>Explorar Nuestro Catálogo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contacto"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-black px-6 py-3.5 rounded-2xl uppercase tracking-wider transition-colors"
            >
              Contactar al Equipo
            </Link>
          </div>
        </div>
      </section>

      {/* Métricas Destacadas */}
      <section className="max-w-7xl w-full mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md">
          {stats.map((s, idx) => (
            <div key={idx} className="text-center p-2 space-y-1">
              <span className="text-2xl sm:text-4xl font-black text-store-primary block font-mono">
                {s.value}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Sección Historia & Filosofía */}
      <section className="max-w-7xl w-full mx-auto p-4 md:py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-black text-store-primary uppercase tracking-wider">
              Quiénes Somos
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 uppercase tracking-tight leading-tight">
              Diseñamos una experiencia de compra pensada en ti
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Comenzamos como una pequeña tienda de entusiastas de los periféricos y el audio de alta fidelidad. Hoy somos una plataforma de comercio electrónico de referencia que atiende a miles de creadores, gamers y profesionales.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seleccionamos meticulosamente cada modelo de nuestro catálogo: probamos su durabilidad, ergonomía y rendimiento antes de ofrecerlo al público.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Productos 100% nuevos en empaque sellado</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Garantía de reposición o reembolso inmediato</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Soporte técnico posventa por WhatsApp y correo</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80"
                alt="Equipo GadgetHub"
                className="w-full h-80 sm:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <p className="text-white text-xs font-bold">
                  Nuestro equipo de especialistas en el centro logístico y de control de calidad.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pilares / Valores de la Empresa */}
        <div className="space-y-6 pt-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
              Nuestros Valores
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Principios que guían cada orden y envío que procesamos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v, idx) => {
              const Icon = v.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3"
                >
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-store-primary flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                    {v.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
