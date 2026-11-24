import { Suspense } from "react";
import { connection } from "next/server";
import { getStoreProducts, getStoreCategories } from "@/app/actions/store";
import { HomeClient } from "./home-client";

async function HomeDataLoader() {
  await connection();
  const [products, categories] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
  ]);

  return <HomeClient products={products} categories={categories} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-store-bg flex items-center justify-center p-8 font-store">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-store-border border-t-store-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-store-muted">
              Cargando tienda...
            </p>
          </div>
        </div>
      }
    >
      <HomeDataLoader />
    </Suspense>
  );
}
