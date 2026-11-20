import Link from "next/link";
import { Activity, Truck, ShieldCheck, QrCode, Headphones } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StoreTrustBadges() {
  return (
    <section className="bg-white py-8 border-y border-slate-200/90 px-4 mt-8">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 text-store-primary shrink-0 border border-orange-100">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Envíos a toda Bolivia</h4>
            <p className="text-[11px] text-slate-500">Despachos rápidos en 24/48h</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Garantía Directa</h4>
            <p className="text-[11px] text-slate-500">Respaldo técnico de fábrica</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 shrink-0 border border-sky-100">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Pago QR Simple</h4>
            <p className="text-[11px] text-slate-500">Sin comisiones bancarias</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0 border border-purple-100">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Atención WhatsApp</h4>
            <p className="text-[11px] text-slate-500">Asesoría directa en español</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--admin-brand)] to-sky-500 text-white shadow-md">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black text-white">
              Aura <span className="text-store-primary">Store</span>
            </span>
          </div>
          <p className="text-[12px] leading-relaxed max-w-sm text-slate-400">
            Plataforma oficial de comercio electrónico y tecnología en Bolivia. Stock verificado en almacén, facturación legal con código QR y envíos departamentales.
          </p>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Catálogo</h5>
          <ul className="space-y-2 text-[12px]">
            <li>
              <Link href="/catalogo" className="hover:text-white transition-colors">
                Ver Todo el Catálogo
              </Link>
            </li>
            <li>
              <Link href="/catalogo?cat=audio-sonido-pro" className="hover:text-white transition-colors">
                Audio & Sonido Pro
              </Link>
            </li>
            <li>
              <Link href="/catalogo?cat=gaming-perifericos" className="hover:text-white transition-colors">
                Gaming & Periféricos
              </Link>
            </li>
            <li>
              <Link href="/catalogo?cat=accesorios-wearables" className="hover:text-white transition-colors">
                Accesorios & Wearables
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Empresa</h5>
          <ul className="space-y-2 text-[12px]">
            <li>
              <Link href="/nosotros" className="hover:text-white transition-colors">
                Quiénes Somos
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-white transition-colors">
                Contacto & Soporte
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-store-primary font-bold hover:underline">
                Panel Administrativo
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4 space-y-3">
          <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Boletín Oficial</h5>
          <p className="text-[12px] text-slate-400">
            Entérate de nuevos arribos de inventario y ofertas exclusivas en Bolivia.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Ingresa tu correo"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs rounded-xl"
            />
            <Button className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-bold h-10 px-4 rounded-xl shrink-0 cursor-pointer">
              Suscribirme
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/80 py-4 px-4 text-center text-slate-500 text-[11px]">
        © 2026 Aura Store Bolivia • Sistema POS & E-Commerce Integrado.
      </div>
    </footer>
  );
}
