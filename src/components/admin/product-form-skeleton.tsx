import { Skeleton } from "@/components/ui/skeleton";

interface ProductFormSkeletonProps {
  isEdit?: boolean;
}

export function ProductFormSkeleton({ isEdit = false }: ProductFormSkeletonProps) {
  return (
    <div
      aria-label={isEdit ? "Cargando editor de producto" : "Cargando formulario de nuevo producto"}
      className="space-y-6 max-w-5xl mx-auto animate-in fade-in-50 duration-300 pb-16"
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-admin-card-border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48 rounded-xl" />
            <Skeleton className="h-3.5 w-64 max-w-full rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Sección 1: Información General (Fotos izquierda + Datos derecha) */}
      <div className="rounded-2xl bg-admin-card-bg border border-admin-card-border p-5 sm:p-6 space-y-5">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-5 space-y-4">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          <div className="md:col-span-7 space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Sección 2: Variantes del Producto */}
      <div className="rounded-2xl bg-admin-card-bg border border-admin-card-border p-5 sm:p-6 space-y-4">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>

      {/* Sección 3: Precios y Rentabilidad */}
      <div className="rounded-2xl bg-admin-card-bg border border-admin-card-border p-5 sm:p-6 space-y-4">
        <Skeleton className="h-5 w-52 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      {/* Sección 4: Existencias y Proveedor + Canales y Visibilidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-admin-card-bg border border-admin-card-border p-5 sm:p-6 space-y-4">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div className="rounded-2xl bg-admin-card-bg border border-admin-card-border p-5 sm:p-6 space-y-3">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
