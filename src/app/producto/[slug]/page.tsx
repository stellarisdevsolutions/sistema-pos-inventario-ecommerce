import { notFound } from "next/navigation";
import { PRODUCTS_CATALOG, getProductBySlug, getRelatedProducts } from "@/data/mock-products";
import { ProductDetailClient } from "./product-client";

export async function generateStaticParams() {
  return PRODUCTS_CATALOG.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product.category, product.id);

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
