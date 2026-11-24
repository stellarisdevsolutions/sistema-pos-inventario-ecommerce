"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFormSkeleton } from "@/components/admin/product-form-skeleton";
import { getInventoryFormData, getProductModelsForForm } from "@/app/admin/actions/products";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function NuevoProductoContent() {
  const [formData, setFormData] = useState<{
    categories: { id: number; name: string }[];
    brands: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
  }>({ categories: [], brands: [], suppliers: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [models, setModels] = useState<Awaited<ReturnType<typeof getProductModelsForForm>>>([]);
  const [formKey, setFormKey] = useState(1);

  const loadForm = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([getInventoryFormData(), getProductModelsForForm().catch(() => [])])
      .then(([data, existingModels]) => {
        setFormData(data);
        setModels(existingModels);
        setFormKey((k) => k + 1);
        setLoading(false);
      })
      .catch(() => {
        setLoadError("No se pudieron cargar categorías y proveedores. Intenta nuevamente.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => loadForm(), 0);
    return () => clearTimeout(id);
  }, [loadForm]);

  if (loading) {
    return <ProductFormSkeleton isEdit={false} />;
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto mt-12 admin-panel p-6 text-center space-y-4">
        <p className="text-sm font-semibold text-admin-text">{loadError}</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/admin/inventario">
            <Button variant="outline" size="sm">Volver a Inventario</Button>
          </Link>
          <Button size="sm" onClick={loadForm}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      key={formKey}
      isEdit={false}
      models={models}
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
