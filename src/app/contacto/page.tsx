"use client";

import { useState } from "react";
import { StorePage } from "@/components/store/store-page";
import {
  STORE_NAME,
  STORE_ADDRESS,
  STORE_EMAIL,
  STORE_PHONE_DISPLAY,
  STORE_WHATSAPP_NUMBER,
} from "@/lib/store-config";

export default function ContactoPage() {
  const [message, setMessage] = useState("");
  return (
    <StorePage>
      <h1 className="store-title">Contacto</h1>
      <div className="mt-9 grid gap-10 md:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">{STORE_NAME}</h2>
          {STORE_PHONE_DISPLAY && (
            <p>
              <a
                className="store-text-action"
                href={`tel:${STORE_PHONE_DISPLAY.replace(/[^+\d]/g, "")}`}
              >
                {STORE_PHONE_DISPLAY}
              </a>
            </p>
          )}
          {STORE_EMAIL && (
            <p>
              <a className="store-text-action" href={`mailto:${STORE_EMAIL}`}>
                {STORE_EMAIL}
              </a>
            </p>
          )}
          {STORE_ADDRESS && <address>{STORE_ADDRESS}</address>}
          {!STORE_WHATSAPP_NUMBER &&
            !STORE_PHONE_DISPLAY &&
            !STORE_EMAIL &&
            !STORE_ADDRESS && (
              <p>La tienda aún no ha publicado sus datos de contacto.</p>
            )}
        </section>
        {STORE_WHATSAPP_NUMBER && (
          <section className="space-y-4 rounded-xl bg-store-surface p-6">
            <h2 className="text-2xl font-semibold">Consultar por WhatsApp</h2>
            <label htmlFor="consulta" className="block">
              Tu consulta
            </label>
            <textarea
              id="consulta"
              value={message}
              maxLength={1500}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-store-border bg-store-bg p-3"
            />
            <a
              className="store-button"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message.trim() || `Hola, ${STORE_NAME}.`)}`}
            >
              Abrir WhatsApp →
            </a>
            <p className="text-sm text-store-muted">
              Puedes revisar y enviar el mensaje en WhatsApp.
            </p>
          </section>
        )}
      </div>
    </StorePage>
  );
}
