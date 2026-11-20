import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Metadata } from "next";
import { getStoreProductBySlug, getStoreProducts } from "@/app/actions/store";
import { ProductDetailClient } from "./product-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    return {
      title: "Producto no encontrado | Tienda Oficial",
    };
  }

  return {
    title: `${product.name} | Tienda Online Bolivia`,
    description:
      product.description ||
      `Compra ${product.name} al mejor precio en Bolivia con garantía y entrega inmediata.`,
  };
}

async function ProductDataLoader({ params }: PageProps) {
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await getStoreProducts();
  const relatedProducts = allProducts.filter(
    (p) => p.id !== product.id && p.category?.id === product.category?.id
  );

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 border-4 border-store-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cargando producto...
            </p>
          </div>
        </div>
      }
    >
      <ProductDataLoader params={params} />
    </Suspense>
  );
}
