import Link from "next/link";
import { Zap, Truck, ShieldCheck, CreditCard, Headphones } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StoreTrustBadges() {
  return (
    <section className="bg-white py-8 border-y border-slate-200 px-4 mt-8">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-store-primary shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Envío Gratis</h4>
            <p className="text-[11px] text-slate-500">En pedidos mayores a $50</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-store-primary shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Garantía Directa</h4>
            <p className="text-[11px] text-slate-500">30 días de cambio fácil</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-store-primary shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Pago 100% Seguro</h4>
            <p className="text-[11px] text-slate-500">Transacciones cifradas</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-store-primary shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Soporte 24/7</h4>
            <p className="text-[11px] text-slate-500">Siempre listos para ayudarte</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreFooter() {
  return (
    <footer className="bg-store-header-bg text-slate-400 text-xs border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-store-primary text-white">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xl font-black text-white">
              Gadget<span className="text-store-primary">Hub</span>
            </span>
          </div>
          <p className="text-[12px] leading-relaxed max-w-sm text-slate-400">
            Tu tienda especializada en tecnología y estilo de vida con despacho rápido,
            garantía oficial y atención directa en español.
          </p>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Tienda</h5>
          <ul className="space-y-2 text-[12px]">
            <li>
              <Link href="/catalogo" className="hover:text-white transition-colors">
                Todos los Productos
              </Link>
            </li>
            <li>
              <Link href="/catalogo?cat=Smartphones" className="hover:text-white transition-colors">
                Smartphones
              </Link>
            </li>
            <li>
              <Link href="/catalogo?cat=Laptops" className="hover:text-white transition-colors">
                Laptops
              </Link>
            </li>
            <li>
              <Link href="/catalogo?cat=Audífonos" className="hover:text-white transition-colors">
                Audífonos
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2 space-y-3">
          <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Empresa</h5>
          <ul className="space-y-2 text-[12px]">
            <li>
              <Link href="/nosotros" className="hover:text-white transition-colors">
                Sobre Nosotros
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-white transition-colors">
                Contacto y Soporte
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-store-primary font-bold hover:underline">
                Acceso Panel Admin
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4 space-y-3">
          <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Boletín Exclusivo</h5>
          <p className="text-[12px] text-slate-400">
            Recibe cupones de descuento y lanzamientos antes que nadie.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Ingresa tu correo"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-10 text-xs rounded-xl"
            />
            <Button className="bg-store-primary hover:bg-store-primary-hover text-white text-xs font-bold h-10 px-4 rounded-xl shrink-0">
              Suscribirme
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/80 py-4 px-4 text-center text-slate-500 text-[11px]">
        © 2026 GadgetHub. Todos los derechos reservados.
      </div>
    </footer>
  );
}
