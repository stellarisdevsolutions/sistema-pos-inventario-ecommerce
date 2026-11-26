import Link from "next/link";
import { StorePage } from "@/components/store/store-page";
import { STORE_NAME, STORE_ADDRESS } from "@/lib/store-config";

export default function NosotrosPage() {
  return (
    <StorePage>
      <article className="max-w-3xl space-y-7">
        <p className="text-store-muted">Nosotros</p>
        <h1 className="store-title">{STORE_NAME}</h1>
        <p className="text-xl leading-relaxed">
          En nuestro catálogo puedes consultar precios, comparar opciones
          disponibles y armar tu pedido.
        </p>
        <p>
          Al elegir una variante verás su precio y sus existencias. Puedes
          guardar artículos en tu lista de deseos para volver a ellos desde este
          navegador.
        </p>
        {STORE_ADDRESS && (
          <p>
            <strong>Dirección</strong>
            <br />
            {STORE_ADDRESS}
          </p>
        )}
        <div className="flex gap-6">
          <Link className="store-button" href="/catalogo">
            Explorar el catálogo
          </Link>
          <Link className="store-text-action" href="/contacto">
            Contacto →
          </Link>
        </div>
      </article>
    </StorePage>
  );
}
