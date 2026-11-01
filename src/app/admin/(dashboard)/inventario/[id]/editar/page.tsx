"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFormSkeleton } from "@/components/admin/product-form-skeleton";
import { getProductById, getInventoryFormData } from "@/app/admin/actions/products";

function EditarProductoContent() {
  const params = useParams();
  const router = useRouter();
  const idStr = params?.id as string;
  const productId = parseInt(idStr, 10);

  const [product, setProduct] = useState<any>(null);
  const [formData, setFormData] = useState<{
    categories: { id: number; name: string }[];
    brands: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
  }>({ categories: [], brands: [], suppliers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(productId)) {
      router.push("/admin/inventario");
      return;
    }

    Promise.all([getProductById(productId), getInventoryFormData()]).then(([prod, data]) => {
      if (!prod) {
        router.push("/admin/inventario");
        return;
      }
      setProduct(prod);
      setFormData(data);
      setLoading(false);
    });
  }, [productId, router]);

  if (loading || !product) {
    return <ProductFormSkeleton isEdit={true} />;
  }

  return (
    <ProductForm
      isEdit={true}
      initialData={{
        id: product.id,
        name: product.name,
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
  );
}

export default function EditarProductoPage() {
  return (
    <Suspense fallback={<ProductFormSkeleton isEdit={true} />}>
      <EditarProductoContent />
    </Suspense>
  );
}
