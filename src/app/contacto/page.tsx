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
  HelpCircle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  FileText,
  QrCode,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    ciudad: "La Paz",
    asunto: "consulta-producto",
    mensaje: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.correo.trim() || !formData.mensaje.trim()) {
      toast.error("Por favor completa los campos obligatorios", {
        description: "Nombre, correo y mensaje son requeridos.",
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSentSuccess(true);
      toast.success("¡Mensaje recibido con éxito!", {
        description: `Gracias ${formData.nombre}, nuestro equipo en Bolivia te responderá a la brevedad.`,
      });
    }, 700);
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

  const directWhatsappText = encodeURIComponent(
    `¡Hola Aura Store! Mi nombre es ${formData.nombre || "un cliente"} desde ${formData.ciudad}.\n\n` +
      `Asunto: ${formData.asunto}\n` +
      `Mensaje: ${formData.mensaje || "Deseo consultar sobre disponibilidad de productos y envíos."}`
  );

  const contactChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp Atención Inmediata",
      value: "+591 70000000",
      description: "Lunes a Sábado de 08:30 a 20:00",
      actionText: "Chatear por WhatsApp",
      href: "https://wa.me/59170000000?text=Hola%20Aura%20Store,%20deseo%20hacer%20una%20consulta",
      bg: "bg-emerald-50 text-emerald-600 border-emerald-200",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
      icon: Phone,
      title: "Línea Directa & Ventas",
      value: "+591 2 2440000",
      description: "Atención telefónica a nivel nacional",
      actionText: "Llamar por Teléfono",
      href: "tel:+59122440000",
      bg: "bg-sky-50 text-sky-600 border-sky-200",
      btnClass: "bg-sky-600 hover:bg-sky-700 text-white",
    },
    {
      icon: Mail,
      title: "Correo Institucional",
      value: "ventas@auracommerce.bo",
      description: "Cotizaciones, empresas y facturación",
      actionText: "Enviar Correo",
      href: "mailto:ventas@auracommerce.bo",
      bg: "bg-orange-50 text-store-primary border-orange-200",
      btnClass: "bg-store-primary hover:bg-store-primary-hover text-white",
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
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col pb-20 md:pb-0 selection:bg-store-primary selection:text-white">
      <StoreHeader />

      {/* Migas de Pan */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-store-primary transition-colors">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Contacto & Soporte</span>
        </div>
      </div>

      {/* Hero Banner de Contacto */}
      <section className="bg-slate-950 text-white py-12 sm:py-16 px-4 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-3 relative z-10">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-store-primary bg-orange-500/10 px-3.5 py-1.5 rounded-full border border-store-primary/30 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            CANALES DE ATENCIÓN DIRECTA EN BOLIVIA
          </span>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
            Estamos listos para <span className="text-store-primary">ayudarte</span>
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            ¿Tienes dudas sobre especificaciones, stock, envíos departamentales o necesitas una cotización empresarial con factura? Contáctanos por cualquiera de nuestros canales.
          </p>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="max-w-7xl w-full mx-auto p-4 md:py-10 flex-1 space-y-12">
        {/* 1. Tarjetas de Canales de Contacto Directo */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 -mt-8 relative z-20">
          {contactChannels.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${c.bg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                    <span className="text-base font-black text-slate-900 block mt-2 font-mono">
                      {c.value}
                    </span>
                  </div>
                </div>

                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center block transition-all shadow-xs ${c.btnClass}`}
                >
                  {c.actionText}
                </a>
              </div>
            );
          })}
        </section>

        {/* 2. Formulario de Contacto y Horarios de Sucursal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulario Interactivo (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-store-primary">
                Envíanos un mensaje
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                Formulario de Consulta Directa
              </h2>
              <p className="text-xs text-slate-500">
                Completa tus datos y un asesor se pondrá en contacto en menos de 2 horas hábiles.
              </p>
            </div>

            {sentSuccess ? (
              <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-base text-emerald-950">¡Mensaje Enviado con Éxito!</h3>
                  <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                    Hemos registrado tu solicitud correctamente. Si necesitas respuesta instantánea, también puedes enviarla directamente a nuestro WhatsApp.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/59170000000?text=${directWhatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Continuar por WhatsApp</span>
                  </a>

                  <Button
                    variant="outline"
                    onClick={handleResetForm}
                    className="text-xs font-bold rounded-xl"
                  >
                    Enviar otro mensaje
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nombre Completo <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Carlos Mendoza"
                      className="text-xs h-10 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Correo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Correo Electrónico <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      placeholder="carlos@correo.com"
                      className="text-xs h-10 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Teléfono / WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Teléfono / WhatsApp
                    </label>
                    <Input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+591 7XXXXXXX"
                      className="text-xs h-10 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Ciudad / Departamento en Bolivia */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Ciudad o Departamento
                    </label>
                    <select
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                      className="w-full h-10 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 px-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-store-primary"
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

                {/* Asunto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Motivo de la Consulta
                  </label>
                  <select
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    className="w-full h-10 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 px-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-store-primary"
                  >
                    <option value="consulta-producto">Consulta sobre producto y disponibilidad</option>
                    <option value="estado-pedido">Seguimiento / Estado de mi pedido</option>
                    <option value="facturacion">Facturación con NIT y comprobantes</option>
                    <option value="garantia">Soporte técnico o garantía de fábrica</option>
                    <option value="ventas-corporativas">Ventas por mayor y empresas</option>
                  </select>
                </div>

                {/* Mensaje */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Mensaje o Detalle del Requerimiento <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.mensaje}
                    onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    placeholder="Escribe tu consulta detallada aquí..."
                    className="w-full p-3 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-store-primary"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 px-6 rounded-xl bg-store-primary hover:bg-store-primary-hover text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? "Enviando..." : "Enviar Formulario"}</span>
                  </Button>

                  <a
                    href={`https://wa.me/59170000000?text=${directWhatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Enviar directo a WhatsApp</span>
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* Información Institucional, Ubicación y Horarios (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tarjeta de Ubicación y Horarios */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-slate-900">
                    Centro de Distribución
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Almacén Central & Despachos
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-store-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">Dirección:</strong>
                    <span>Av. 6 de Agosto esquina Guachalla, Edificio Los Robles, La Paz - Bolivia</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">Horarios de Atención:</strong>
                    <span>Lunes a Viernes: 08:30 - 18:30</span>
                    <span className="block text-slate-400">Sábados: 09:00 - 13:00 (Soporte y entregas)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <QrCode className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-bold">Cobros y Facturación:</strong>
                    <span>Factura electrónica con QR SIN en todas las compras</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Garantías Oficiales */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 inline-block">
                COMPROMISO DE SERVICIO
              </span>
              <h4 className="text-base font-black uppercase tracking-tight">
                Garantía y Confianza
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toda nuestra mercadería cuenta con stock real inspeccionado en Bolivia. No realizamos dropshipping ni ventas sin disponibilidad física.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Preguntas Frecuentes / FAQs */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-store-primary" />
            <h3 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-tight">
              Preguntas Frecuentes de Clientes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
              >
                <h4 className="font-extrabold text-xs text-slate-900 leading-snug">
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Pie de Tienda & Carrito */}
      <StoreTrustBadges />
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
