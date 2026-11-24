import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Metadata } from "next";
import { getStoreCategories, getStoreProductBySlug, getStoreProducts, getStoreVariants } from "@/app/actions/store";
import { STORE_NAME } from "@/lib/store-config";
import { ProductDetailClient } from "./product-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    return {
      title: `Producto no encontrado | ${STORE_NAME}`,
    };
  }

  return {
    title: `${product.name} | ${STORE_NAME}`,
    description:
      product.description ||
      `Compra ${product.name} al mejor precio en Bolivia con garantía y entrega inmediata.`,
  };
}

async function ProductDataLoader({ params }: PageProps) {
  await connection();
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [allProducts, categories, variants] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
    product.modelCode ? getStoreVariants(product.modelCode) : [],
  ]);
  const relatedCandidates = allProducts.filter(
    (p) => p.id !== product.id && (!product.modelCode || p.modelCode !== product.modelCode)
  );
  const sameCategory = relatedCandidates.filter(
    (p) => p.category?.id && p.category.id === product.category?.id
  );
  const fallbackOthers = relatedCandidates.filter(
    (p) => !p.category?.id || p.category.id !== product.category?.id
  );
  const relatedProducts = [...sameCategory, ...fallbackOthers].slice(0, 4);

  return <ProductDetailClient product={product} variants={variants} relatedProducts={relatedProducts} categories={categories} />;
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-store-bg flex items-center justify-center p-8 font-store">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-store-border border-t-store-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-store-muted">
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
