"use client";

import { useState } from "react";
import Link from "next/link";
import { Truck, ShieldCheck, QrCode, Headphones, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  STORE_ADDRESS,
  STORE_EMAIL,
  STORE_NAME,
  STORE_PHONE_DISPLAY,
  STORE_TAGLINE,
} from "@/lib/store-config";

export function StoreTrustBadges() {
  const items = [
    {
      icon: Truck,
      title: "Envíos a toda Bolivia",
      desc: "Despachos en 24 a 48 horas hábiles",
    },
    {
      icon: ShieldCheck,
      title: "Garantía oficial",
      desc: "Respaldo técnico directo de fábrica",
    },
    {
      icon: QrCode,
      title: "Pago con QR Simple",
      desc: "Transferencia bancaria sin comisiones",
    },
    {
      icon: Headphones,
      title: "Atención directa",
      desc: "Soporte por WhatsApp en horario comercial",
    },
  ];

  return (
    <section className="bg-store-bg border-y border-store-border px-4 sm:px-6 py-8 mt-10 font-store">
      <div className="max-w-[1320px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3">
              <Icon className="h-6 w-6 text-store-primary shrink-0 mt-0.5 stroke-[1.6]" />
              <div>
                <h4 className="text-xs font-bold text-store-ink">{item.title}</h4>
                <p className="text-[11px] text-store-muted mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StoreFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const brandParts = STORE_NAME.trim().split(/\s+/);
  const brandLead = brandParts[0] || STORE_NAME;
  const brandRest = brandParts.slice(1).join(" ");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }
    toast.success("Correo registrado para novedades", {
      description: `Te notificaremos ofertas y novedades de ${STORE_NAME} en ${cleaned}.`,
    });
    setNewsletterEmail("");
  };

  const paymentMethods = ["QR Simple", "Transferencia", "Factura SIN", "Efectivo"];

  return (
    <footer className="bg-store-ink text-store-on-ink-muted text-xs mt-auto font-store">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Col 1: Marca */}
        <div className="md:col-span-4 space-y-3.5">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-store-primary fill-store-primary shrink-0" />
            <div>
              <span className="text-lg font-extrabold tracking-tight leading-none block">
                <span className="text-store-on-ink">{brandLead}</span>
                {brandRest && (
                  <span className="text-store-primary"> {brandRest}</span>
                )}
              </span>
              <span className="text-[10px] text-store-on-ink-muted block mt-0.5">
                {STORE_TAGLINE}
              </span>
            </div>
          </Link>

          <p className="text-xs leading-relaxed max-w-sm">
            Tu tienda oficial de tecnología y equipamiento en Bolivia. Stock físico verificado, facturación legal con QR y envíos departamentales.
          </p>

          <div className="space-y-1 text-[11px] pt-1">
            <p>{STORE_ADDRESS}</p>
            <p>{STORE_PHONE_DISPLAY}</p>
            <p>{STORE_EMAIL}</p>
          </div>
        </div>

        {/* Col 2: Tienda */}
        <div className="md:col-span-2 space-y-3">
          <h5 className="font-bold text-store-on-ink text-xs">Tienda</h5>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/catalogo" className="hover:text-store-on-ink transition-colors">
                Todo el catálogo
              </Link>
            </li>
            <li>
              <Link href="/catalogo?favs=true" className="hover:text-store-on-ink transition-colors">
                Favoritos
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Soporte */}
        <div className="md:col-span-2 space-y-3">
          <h5 className="font-bold text-store-on-ink text-xs">Soporte</h5>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/nosotros" className="hover:text-store-on-ink transition-colors">
                Quiénes somos
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-store-on-ink transition-colors">
                Contacto
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-store-primary hover:underline font-semibold">
                Panel administrativo
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Boletín */}
        <div className="md:col-span-4 space-y-3">
          <h5 className="font-bold text-store-on-ink text-xs">Boletín</h5>
          <p className="text-xs leading-relaxed">
            Recibe nuevos arribos de inventario y promociones exclusivas en tu correo.
          </p>
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex rounded-lg overflow-hidden bg-store-bg h-10"
          >
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Ingresa tu correo"
              aria-label="Correo electrónico para boletín"
              className="flex-1 min-w-0 bg-store-bg h-full px-3.5 text-xs text-store-ink placeholder:text-store-muted focus:outline-hidden"
            />
            <button
              type="submit"
              className="bg-store-primary hover:bg-store-primary-hover text-store-on-primary text-xs font-bold px-5 h-full shrink-0 transition-colors cursor-pointer"
            >
              Suscribirse
            </button>
          </form>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-white/10 py-4 px-4 sm:px-6">
        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>© 2026 {STORE_NAME}. Todos los derechos reservados.</span>

          <div className="flex flex-wrap items-center gap-1.5">
            {paymentMethods.map((method) => (
              <span
                key={method}
                className="bg-white/10 text-store-on-ink text-[10px] font-semibold px-2.5 py-1 rounded"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
