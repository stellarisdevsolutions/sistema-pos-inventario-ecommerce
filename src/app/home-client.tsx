import Link from "next/link";
import Image from "next/image";
import type { StoreCategory, StoreProduct } from "@/app/actions/store";
import { StorePage } from "@/components/store/store-page";
import { StoreProductCard } from "@/components/store/product-card";
import { formatCurrency } from "@/lib/currency";

export function HomeClient({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: StoreCategory[];
}) {
  const lead =
    products.find((p) => p.isFeatured && (p.totalStock ?? p.stock) > 0) ??
    products[0];
  return (
    <StorePage>
      {lead ? (
        <section className="store-cover">
          <div className="p-7 sm:p-12 self-center space-y-5">
            {lead.category && (
              <Link
                className="store-text-action"
                href={`/catalogo?cat=${encodeURIComponent(lead.category.slug)}`}
              >
                {lead.category.name}
              </Link>
            )}
            <h1 className="store-title">{lead.name}</h1>
            <p>
              {lead.minPrice !== lead.maxPrice ? "Desde " : ""}
              {formatCurrency(lead.minPrice ?? lead.price)}
            </p>
            <Link className="store-button" href={`/producto/${lead.slug}`}>
              Ver producto →
            </Link>
          </div>
          <Link
            href={`/producto/${lead.slug}`}
            className="relative min-h-56 sm:min-h-80"
          >
            <Image
              src={lead.imageUrl}
              alt={lead.name}
              fill
              unoptimized
              loading="eager"
              className="object-contain p-6"
            />
          </Link>
        </section>
      ) : (
        <h1 className="store-title">Catálogo de la tienda</h1>
      )}
      <nav
        aria-label="Categorías del catálogo"
        className="flex flex-wrap gap-2 my-7"
      >
        {categories
          .filter((c) => c.count > 0)
          .map((c) => (
            <Link
              className="store-chip"
              key={c.id}
              href={`/catalogo?cat=${encodeURIComponent(c.slug)}`}
            >
              {c.name}
            </Link>
          ))}
      </nav>
      <section className="my-10">
        <div className="flex justify-between items-baseline gap-3 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            En el catálogo
          </h2>
          <Link className="store-text-action" href="/catalogo">
            Ver todo →
          </Link>
        </div>
        {products.length ? (
          <div className="store-grid">
            {products.slice(0, 8).map((p) => (
              <StoreProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <p>Todavía no hay productos para mostrar.</p>
        )}
      </section>
    </StorePage>
  );
}
