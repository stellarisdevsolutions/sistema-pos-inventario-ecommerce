"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter, StoreTrustBadges } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  ChevronRight,
  QrCode,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import {
  STORE_ADDRESS,
  STORE_EMAIL,
  STORE_NAME,
  STORE_PHONE_DISPLAY,
  STORE_WHATSAPP_NUMBER,
} from "@/lib/store-config";

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    ciudad: "La Paz",
    asunto: "consulta-producto",
    mensaje: "",
  });
  const [sentSuccess, setSentSuccess] = useState(false);

  const directWhatsappMessage =
    `¡Hola ${STORE_NAME}! Mi nombre es ${formData.nombre || "un cliente"} desde ${formData.ciudad}.\n\n` +
    (formData.correo ? `Correo: ${formData.correo}\n` : "") +
    (formData.telefono ? `Teléfono: ${formData.telefono}\n` : "") +
    `Asunto: ${formData.asunto}\n` +
    `Mensaje: ${formData.mensaje || "Deseo consultar sobre disponibilidad de productos y envíos."}`;
  const directWhatsappText = encodeURIComponent(directWhatsappMessage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.correo.trim() || !formData.mensaje.trim()) {
      toast.error("Por favor completa los campos obligatorios", {
        description: "Nombre, correo y mensaje son requeridos.",
      });
      return;
    }

    const waUrl = `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${directWhatsappText}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setSentSuccess(true);
    toast.success("Abriendo WhatsApp con tu consulta", {
      description: `Si la ventana no se abrió automáticamente, usa el botón "Continuar por WhatsApp".`,
    });
  };

  const handleResetForm = () => {
    setSentSuccess(false);
    setFormData({
      nombre: "",
      correo: "",
      telefono: "",
      ciudad: "La Paz",
      asunto: "consulta-producto",
      mensaje: "",
    });
  };

  const whatsappDisplay = STORE_WHATSAPP_NUMBER.startsWith("591")
    ? `+591 ${STORE_WHATSAPP_NUMBER.slice(3)}`
    : `+${STORE_WHATSAPP_NUMBER}`;
  const telHref = `tel:${STORE_PHONE_DISPLAY.replace(/[^\d+]/g, "")}`;

  const contactChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp atención inmediata",
      value: whatsappDisplay,
      description: "Lunes a sábado de 08:30 a 20:00",
      actionText: "Chatear por WhatsApp",
      href: `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Hola ${STORE_NAME}, deseo hacer una consulta`
      )}`,
      primary: true,
    },
    {
      icon: Phone,
      title: "Línea directa y ventas",
      value: STORE_PHONE_DISPLAY,
      description: "Atención telefónica a nivel nacional",
      actionText: "Llamar por teléfono",
      href: telHref,
      primary: false,
    },
    {
      icon: Mail,
      title: "Correo institucional",
      value: STORE_EMAIL,
      description: "Cotizaciones, empresas y facturación",
      actionText: "Enviar correo",
      href: `mailto:${STORE_EMAIL}`,
      primary: false,
    },
  ];

  const faqs = [
    {
      q: "¿Cómo realizan los envíos y cuánto demoran?",
      a: "Despachamos pedidos a los 9 departamentos de Bolivia. En ciudades principales (La Paz, Santa Cruz, Cochabamba) la entrega demora de 24 a 48 horas hábiles con número de guía de seguimiento.",
    },
    {
      q: "¿Emiten factura legal para descargo tributario?",
      a: "Sí, todas nuestras ventas son facturadas legalmente con código QR y documento digital según normativa del SIN. Puedes ingresar tu NIT o Carnet de Identidad durante el pedido.",
    },
    {
      q: "¿Cuáles son las formas de pago admitidas?",
      a: "Aceptamos pago mediante QR Simple (sin comisiones adicionales desde cualquier banco de Bolivia), transferencias bancarias directas y pago contra entrega o en sucursal.",
    },
    {
      q: "¿Cómo funciona la garantía de los artículos?",
      a: "Todos nuestros productos tecnológicos cuentan con garantía oficial contra defectos de fábrica. Brindamos soporte técnico directo y reposición inmediata si existiera algún desperfecto.",
    },
  ];

  return (
    <div className="min-h-screen bg-store-bg text-store-ink font-store flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-store-on-primary">
      <StoreHeader />

      {/* Cabecera limpia sobre blanco puro */}
      <section className="border-b border-store-border py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1380px] mx-auto">
          <div className="max-w-2xl space-y-4">
            <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-xs text-store-muted">
              <Link href="/" className="hover:text-store-ink transition-colors">
                Inicio
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-store-ink font-medium">Contacto y soporte</span>
            </nav>

            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-store-ink leading-[1.08]">
              Contacto y soporte
            </h1>
            <p className="text-store-muted text-sm sm:text-base leading-relaxed">
              ¿Tienes dudas sobre especificaciones, stock, envíos departamentales o necesitas una cotización empresarial con factura? Escríbenos por cualquiera de nuestros canales.
            </p>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1 space-y-14">
        {/* 1. Canales de Contacto Directo */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {contactChannels.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="bg-store-surface rounded-2xl p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <Icon className="h-5 w-5 text-store-ink stroke-[1.5]" />
                  <div>
                    <h2 className="font-semibold text-sm text-store-ink">{c.title}</h2>
                    <p className="text-xs text-store-muted mt-0.5">{c.description}</p>
                    <span className="text-base font-semibold text-store-ink block mt-3 font-mono tabular-nums">
                      {c.value}
                    </span>
                  </div>
                </div>

                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`w-full h-10 px-4 rounded-lg font-bold text-xs text-center flex items-center justify-center transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] ${
                    c.primary
                      ? "bg-store-primary hover:bg-store-primary-hover text-store-on-primary"
                      : "bg-store-ink hover:bg-store-primary text-store-on-primary"
                  }`}
                >
                  {c.actionText}
                </a>
              </div>
            );
          })}
        </section>

        {/* 2. Formulario de Contacto y Horarios */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Formulario Interactivo (7 cols) */}
          <div className="lg:col-span-7 border border-store-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-store-primary">
                Envíanos un mensaje
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold text-store-ink tracking-[-0.025em]">
                Formulario de consulta directa
              </h2>
              <p className="text-xs text-store-muted">
                Completa tus datos y un asesor se pondrá en contacto en menos de 2 horas hábiles.
              </p>
            </div>

            {sentSuccess ? (
              <div className="p-8 rounded-2xl bg-store-surface text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-store-success text-store-on-primary flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-store-ink">
                    Consulta lista en WhatsApp
                  </h3>
                  <p className="text-xs text-store-muted max-w-sm mx-auto leading-relaxed">
                    Preparamos tu mensaje para atención directa por WhatsApp. Si no se abrió la pestaña automáticamente, haz clic abajo para continuar.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${directWhatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-store-primary hover:bg-store-primary-hover text-store-on-primary font-medium text-xs px-5 h-10 rounded-full transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Continuar por WhatsApp</span>
                  </a>

                  <Button
                    variant="outline"
                    onClick={handleResetForm}
                    className="text-xs font-medium rounded-full border-store-border h-10 px-5 cursor-pointer"
                  >
                    Enviar otro mensaje
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-store-ink block">
                      Nombre completo <span className="text-store-primary">*</span>
                    </label>
                    <Input
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Carlos Mendoza"
                      className="text-xs h-10 rounded-xl bg-store-surface border-transparent focus-visible:bg-store-bg focus-visible:border-store-ink focus-visible:ring-0 shadow-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-store-ink block">
                      Correo electrónico <span className="text-store-primary">*</span>
                    </label>
                    <Input
                      required
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      placeholder="carlos@correo.com"
                      className="text-xs h-10 rounded-xl bg-store-surface border-transparent focus-visible:bg-store-bg focus-visible:border-store-ink focus-visible:ring-0 shadow-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-store-ink block">
                      Teléfono / WhatsApp
                    </label>
                    <Input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+591 7XXXXXXX"
                      className="text-xs h-10 rounded-xl bg-store-surface border-transparent focus-visible:bg-store-bg focus-visible:border-store-ink focus-visible:ring-0 shadow-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-store-ink block">
                      Ciudad o departamento
                    </label>
                    <select
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      className="w-full h-10 text-xs font-medium rounded-xl bg-store-surface border border-transparent focus:bg-store-bg focus:border-store-ink px-3 text-store-ink focus:outline-hidden"
                    >
                      <option value="La Paz">La Paz / El Alto</option>
                      <option value="Santa Cruz">Santa Cruz de la Sierra</option>
                      <option value="Cochabamba">Cochabamba</option>
                      <option value="Oruro">Oruro</option>
                      <option value="Potosí">Potosí</option>
                      <option value="Tarija">Tarija</option>
                      <option value="Chuquisaca / Sucre">Chuquisaca / Sucre</option>
                      <option value="Beni">Beni / Trinidad</option>
                      <option value="Pando">Pando / Cobija</option>
                      <option value="Otra localidad">Otra localidad de Bolivia</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-store-ink block">
                    Motivo de la consulta
                  </label>
                  <select
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    className="w-full h-10 text-xs font-medium rounded-xl bg-store-surface border border-transparent focus:bg-store-bg focus:border-store-ink px-3 text-store-ink focus:outline-hidden"
                  >
                    <option value="consulta-producto">Consulta sobre producto y disponibilidad</option>
                    <option value="estado-pedido">Seguimiento / Estado de mi pedido</option>
                    <option value="facturacion">Facturación con NIT y comprobantes</option>
                    <option value="garantia">Soporte técnico o garantía de fábrica</option>
                    <option value="ventas-corporativas">Ventas por mayor y empresas</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-store-ink block">
                    Mensaje o detalle <span className="text-store-primary">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.mensaje}
                    onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    placeholder="Escribe tu consulta detallada aquí..."
                    className="w-full p-3 text-xs rounded-xl bg-store-surface border border-transparent focus:bg-store-bg focus:border-store-ink focus:outline-hidden text-store-ink placeholder:text-store-muted"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto h-11 px-6 rounded-lg bg-store-primary hover:bg-store-primary-hover text-store-on-primary font-bold text-xs flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar por WhatsApp</span>
                  </Button>

                  <a
                    href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${directWhatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-11 px-6 rounded-lg bg-store-ink hover:bg-store-primary text-store-on-primary font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Abrir chat WhatsApp</span>
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* Ubicación y Horarios (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-store-surface rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-store-border">
                <Building2 className="h-5 w-5 text-store-ink stroke-[1.5]" />
                <div>
                  <h3 className="font-semibold text-sm text-store-ink">
                    Centro de distribución
                  </h3>
                  <span className="text-xs text-store-muted">
                    Almacén central y despachos
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs text-store-muted">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-store-ink stroke-[1.5] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-store-ink block font-medium">Dirección</strong>
                    <span>{STORE_ADDRESS}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-store-ink stroke-[1.5] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-store-ink block font-medium">Horarios de atención</strong>
                    <span>Lunes a viernes: 08:30 - 18:30</span>
                    <span className="block">Sábados: 09:00 - 13:00 (Soporte y entregas)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <QrCode className="h-4 w-4 text-store-ink stroke-[1.5] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-store-ink block font-medium">Cobros y facturación</strong>
                    <span>Factura electrónica con QR SIN en todas las compras</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-store-surface rounded-2xl p-6 space-y-2">
              <h4 className="text-sm font-semibold text-store-ink">
                Garantía y stock físico real
              </h4>
              <p className="text-xs text-store-muted leading-relaxed">
                Toda nuestra mercadería cuenta con stock inspeccionado en Bolivia. No realizamos dropshipping ni ventas sin disponibilidad física.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Preguntas Frecuentes */}
        <section className="pt-10 border-t border-store-border space-y-6">
          <h2 className="text-2xl font-semibold text-store-ink tracking-[-0.025em]">
            Preguntas frecuentes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-store-surface space-y-2">
                <h3 className="font-semibold text-sm text-store-ink leading-snug">
                  {faq.q}
                </h3>
                <p className="text-xs text-store-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
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
