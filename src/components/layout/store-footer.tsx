import Link from "next/link";
import { STORE_NAME } from "@/lib/store-config";

export function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-store-border bg-store-surface">
      <div className="store-width flex flex-wrap items-center justify-between gap-5 py-8">
        <Link href="/" className="store-wordmark">
          {STORE_NAME}
        </Link>
        <nav
          aria-label="Pie de página"
          className="flex flex-wrap gap-5 text-sm"
        >
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/nosotros">Nosotros</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/portal">Acceso al panel</Link>
        </nav>
      </div>
    </footer>
  );
}
