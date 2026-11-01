"use client";

import { useState, useEffect, Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFormSkeleton } from "@/components/admin/product-form-skeleton";
import { getInventoryFormData } from "@/app/admin/actions/products";

function NuevoProductoContent() {
  const [formData, setFormData] = useState<{
    categories: { id: number; name: string }[];
    brands: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
  }>({ categories: [], brands: [], suppliers: [] });
  const [loading, setLoading] = useState(true);

  // Key dinámico forzado al montar para garantizar que el formulario siempre se inicialice de cero
  const [formKey, setFormKey] = useState(() => Date.now());

  useEffect(() => {
    setFormKey(Date.now());
    getInventoryFormData().then((data) => {
      setFormData(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <ProductFormSkeleton isEdit={false} />;
  }

  return (
    <ProductForm
      key={formKey}
      isEdit={false}
      categories={formData.categories}
      brands={formData.brands}
      suppliers={formData.suppliers}
    />
  );
}

export default function NuevoProductoPage() {
  return (
    <Suspense fallback={<ProductFormSkeleton isEdit={false} />}>
      <NuevoProductoContent />
    </Suspense>
  );
}
