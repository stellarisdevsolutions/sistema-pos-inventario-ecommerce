"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFormSkeleton } from "@/components/admin/product-form-skeleton";
import { getProductById, getInventoryFormData } from "@/app/admin/actions/products";
import { ModelSiblings } from "@/components/admin/model-siblings";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";

type LoadedProduct = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

function EditarProductoContent() {
  const params = useParams();
  const router = useRouter();
  const idStr = params?.id as string;
  const productId = parseInt(idStr, 10);

  const [product, setProduct] = useState<LoadedProduct | null>(null);
  const [formData, setFormData] = useState<{
    categories: { id: number; name: string }[];
    brands: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
  }>({ categories: [], brands: [], suppliers: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProduct = useCallback(() => {
    if (isNaN(productId)) {
      router.push("/admin/inventario");
      return;
    }

    setLoading(true);
    setLoadError(null);
    Promise.all([getProductById(productId), getInventoryFormData()])
      .then(([prod, data]) => {
        if (!prod) {
          router.push("/admin/inventario");
          return;
        }
        setProduct(prod);
        setFormData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoadError("No se pudieron cargar los datos del producto. Verifica tu conexión e inténtalo nuevamente.");
        setLoading(false);
      });
  }, [productId, router]);

  useEffect(() => {
    const id = setTimeout(() => loadProduct(), 0);
    return () => clearTimeout(id);
  }, [loadProduct]);

  if (loading) {
    return <ProductFormSkeleton isEdit={true} />;
  }

  if (loadError || !product) {
    return (
      <div className="max-w-xl mx-auto mt-12 admin-panel p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-admin-text">{loadError || "Producto no disponible."}</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/admin/inventario" className={buttonVariants({ variant: "outline", size: "sm" })}>Volver a Inventario
          </Link>
          <Button size="sm" onClick={loadProduct}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
    <ProductForm key={`${product.id}-${product.isActive}`}
      isEdit={true}
      initialData={{
        id: product.id,
        name: product.model?.name ?? product.name,
        sku: product.sku,
        barcode: product.barcode,
        modelCode: product.modelCode,
        variant: product.variant,
        variantSelector: product.variantSelector,
        variantColor: product.variantColor,
        attributes: product.attributes ?? null,
        description: product.description,
        mainImage: product.imageUrl,
        additionalImages: product.images || [],
        price: product.price,
        costPrice: product.costPrice,
        categoryId: product.categoryId,
        brandId: product.brandId,
        supplierId: product.supplierId,
        stock: product.stock,
        minStock: product.minStock,
        isActive: product.isActive,
        isVisibleWeb: product.isVisibleWeb,
        isFeatured: product.isFeatured,
      }}
      categories={formData.categories}
      brands={formData.brands}
      suppliers={formData.suppliers}
    />
    <ModelSiblings product={product} onChanged={async () => {
      const updated = await getProductById(product.id);
      if (updated) setProduct(updated);
      else router.replace("/admin/inventario");
    }} />
    </div>
  );
}

export default function EditarProductoPage() {
  return (
    <Suspense fallback={<ProductFormSkeleton isEdit={true} />}>
      <EditarProductoContent />
    </Suspense>
  );
}
