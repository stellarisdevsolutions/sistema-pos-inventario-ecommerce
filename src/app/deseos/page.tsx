import { Suspense } from "react";
import { connection } from "next/server";
import { getSavedOptions } from "@/app/actions/store";
import { StorePage } from "@/components/store/store-page";
import { Deseos } from "./deseos";

async function SavedProducts() {
  await connection();
  const products = await getSavedOptions();
  return <Deseos products={products} />;
}

export default function DeseosPage() {
  return (
    <StorePage>
      <h1 className="store-title mb-8">Lista de deseos</h1>
      <Suspense fallback={<p>Cargando productos…</p>}>
        <SavedProducts />
      </Suspense>
    </StorePage>
  );
}
