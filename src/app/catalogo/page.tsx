import { Suspense } from "react";
import { connection } from "next/server";
import { getStoreProducts, getStoreCategories } from "@/app/actions/store";
import { CatalogoClient } from "./catalogo-client";

async function CatalogoDataLoader() {
  await connection();
  const [products, categories] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
  ]);

  return <CatalogoClient initialProducts={products} categories={categories} />;
}

export default function CatalogoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-store-bg flex items-center justify-center p-8 font-store">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-store-border border-t-store-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-store-muted">
              Cargando catálogo...
            </p>
          </div>
        </div>
      }
    >
      <CatalogoDataLoader />
    </Suspense>
  );
}
