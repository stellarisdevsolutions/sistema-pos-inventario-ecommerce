import { Suspense } from "react";
import { getStoreProducts, getStoreCategories } from "@/app/actions/store";
import { HomeClient } from "./home-client";

async function HomeDataLoader() {
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
        <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 border-4 border-store-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cargando tienda online...
            </p>
          </div>
        </div>
      }
    >
      <HomeDataLoader />
    </Suspense>
  );
}
