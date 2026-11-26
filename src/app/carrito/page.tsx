import { StorePage } from "@/components/store/store-page";
import { CartContents } from "@/components/layout/store-cart-sheet";

export default function CarritoPage() {
  return (
    <StorePage>
      <h1 className="store-title mb-8">Tu carrito</h1>
      <div className="max-w-3xl overflow-hidden border border-store-border rounded-xl">
        <CartContents />
      </div>
    </StorePage>
  );
}
