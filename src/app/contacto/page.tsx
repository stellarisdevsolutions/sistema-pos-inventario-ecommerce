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
} from "lucide-react";
import { toast } from "sonner";

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    asunto: "consulta-general",
    mensaje: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.correo || !formData.mensaje) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("¡Mensaje enviado con éxito!", {
        description: "Nuestro equipo se pondrá en contacto contigo en menos de 2 horas hábiles.",
      });
      setFormData({
        nombre: "",
        correo: "",
        telefono: "",
        asunto: "consulta-general",
        mensaje: "",
      });
    }, 800);
  };

  const contactChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp Inmediato",
      value: "+1 (800) 123-4567",
      actionText: "Iniciar Chat Directo",
      href: "https://wa.me/?text=Hola%20GadgetHub,%20necesito%20asistencia",
      bg: "bg-emerald-50 text-emerald-600 border-emerald-200",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
      icon: Mail,
      title: "Correo de Soporte",
      value: "soporte@gadgethub.com",
      actionText: "Enviar Correo",
      href: "mailto:soporte@gadgethub.com",
      bg: "bg-blue-50 text-blue-600 border-blue-200",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      icon: Phone,
      title: "Línea Telefónica",
      value: "+1 (800) 456-7890",
      actionText: "Llamar Ahora",
      href: "tel:+18004567890",
      bg: "bg-orange-50 text-store-primary border-orange-200",
      btnClass: "bg-store-primary hover:bg-store-primary-hover text-white",
    },
  ];

  const faqs = [
    {
      q: "¿Cuánto tiempo demora la entrega de mi pedido?",
      a: "Para envíos urbanos y principales ciudades el tiempo de entrega promedio es de 24 a 48 horas hábiles con número de seguimiento en tiempo real.",
    },
    {
      q: "¿Qué medios de pago están disponibles?",
      a: "Aceptamos tarjetas de débito/crédito (Visa, Mastercard), transferencias bancarias directas, PayPal y pago contra entrega en zonas habilitadas.",
    },
    {
      q: "¿Cómo aplico la garantía de mi producto?",
      a: "Todos nuestros productos cuentan con 12 meses de garantía. Solo necesitas escribirnos por WhatsApp o correo con tu comprobante y coordinamos la revisión o reemplazo inmediato.",
    },
    {
      q: "¿Puedo recoger mi compra en el almacén?",
      a: "¡Sí! Puedes coordinar la recogida en nuestro centro de distribución de lunes a sábado previa confirmación de tu pedido.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col pb-20 md:pb-0">
      <StoreHeader />

      {/* Cabecera de Contacto */}
      <section className="bg-slate-900 text-white py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-store-primary bg-orange-500/10 px-4 py-1.5 rounded-full border border-store-primary/30 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            CENTRO DE ATENCIÓN AL CLIENTE
          </span>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            ¿Cómo podemos ayudarte hoy?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            ¿Tienes dudas con un producto, necesitas cotizar por mayor o rastrear tu envío? Estamos disponibles para resolver cualquier duda.
          </p>
        </div>
      </section>

      {/* Canales Rápidos */}
      <section className="max-w-7xl w-full mx-auto px-4 -mt-6 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contactChannels.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shrink-0 ${c.bg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {c.title}
                    </h3>
                    <p className="font-black text-sm text-slate-900">{c.value}</p>
                  </div>
                </div>

                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black text-center uppercase tracking-wider transition-all block ${c.btnClass}`}
                >
                  {c.actionText}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Formulario de Mensaje + Información de Almacén */}
      <section className="max-w-7xl w-full mx-auto p-4 md:py-12 space-y-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulario (7 columnas) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                Envíanos un Mensaje Directo
              </h2>
              <p className="text-xs text-slate-500">
                Completa el formulario y te responderemos a la brevedad.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Carlos Mendoza"
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="carlos@correo.com"
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Teléfono / WhatsApp
                  </label>
                  <Input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Motivo de Consulta
                  </label>
                  <select
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 text-xs px-3 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-store-primary"
                  >
                    <option value="consulta-general">Consulta General</option>
                    <option value="asesoria-compra">Asesoría antes de Comprar</option>
                    <option value="estado-pedido">Estado de mi Pedido</option>
                    <option value="garantia-soporte">Garantía o Devolución</option>
                    <option value="compras-mayor">Ventas Corporativas / Por Mayor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Tu Mensaje <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  placeholder="Detalla tu consulta o requerimiento para darte la mejor respuesta..."
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-store-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-store-primary hover:bg-store-primary-hover text-white text-xs font-black h-12 rounded-2xl shadow-md shadow-store-primary/25 gap-2 uppercase tracking-wide"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? "Enviando mensaje..." : "Enviar Mensaje"}</span>
              </Button>
            </form>
          </div>

          {/* Información del Almacén y Horarios (5 columnas) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight">
                Almacén y Distribución Central
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 text-slate-600">
                  <MapPin className="h-5 w-5 text-store-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Dirección Principal:</span>
                    <span>Av. Tecnológica 1240, Parque Industrial y Logístico, Edificio B, Nivel 2.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-600">
                  <Clock className="h-5 w-5 text-store-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Horario de Despacho y Atención:</span>
                    <span>Lunes a Viernes: 08:30 AM - 07:00 PM</span> <br />
                    <span>Sábados: 09:00 AM - 02:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Banner WhatsApp directo */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 fill-white" />
                  <h4 className="font-black text-xs uppercase tracking-wider">
                    ¿Prefieres una respuesta en minutos?
                  </h4>
                </div>
                <p className="text-[11px] text-white/90">
                  Escríbenos directamente a nuestra línea de WhatsApp para asesoramiento en tiempo real sobre stock y envíos.
                </p>
                <a
                  href="https://wa.me/?text=Hola%20GadgetHub,%20quiero%20hacer%20una%20consulta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white text-emerald-800 text-[11px] font-black px-3.5 py-2 rounded-xl mt-1 shadow-xs hover:bg-slate-100 transition-colors"
                >
                  <span>Abrir WhatsApp Ahora</span>
                </a>
              </div>
            </div>

            {/* FAQs Rápidas */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <HelpCircle className="h-5 w-5 text-store-primary" />
                <h3 className="font-black text-sm uppercase tracking-tight">
                  Preguntas Frecuentes
                </h3>
              </div>

              <div className="space-y-3">
                {faqs.map((f, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <h5 className="font-extrabold text-xs text-slate-900">{f.q}</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
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
