import { Skeleton } from "@/components/ui/skeleton";

interface ProductFormSkeletonProps {
  isEdit?: boolean;
}

export function ProductFormSkeleton({ isEdit = false }: ProductFormSkeletonProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none animate-in fade-in-50 duration-300 pb-12">
      {/* =========================================================================
          CABECERA DE ACCIÓN Y TÍTULO (SKELETON)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-56 rounded-xl" />
            <Skeleton className="h-3.5 w-80 max-w-full rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* =========================================================================
          FILA 1: INFORMACIÓN PRINCIPAL (SKELETON)
          ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--admin-brand)]/50" />
            <Skeleton className="h-5 w-44 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-48 rounded-md" />
        </div>

        {/* SPLIT FOTOS (COL 5) / DATOS (COL 7) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Lado izquierdo: Portada y secundarias */}
          <div className="md:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-3 w-10 rounded-md" />
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Lado derecho: Nombre, Categoría y Descripción */}
          <div className="md:col-span-7 space-y-4">
            {/* Nombre del Producto */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>

            {/* Categoría */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
              <Skeleton className="h-11 w-full rounded-2xl" />
              <Skeleton className="h-3 w-72 rounded-md" />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILA 2: PRECIOS & RENTABILIDAD COMERCIAL (SKELETON)
          ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-5 w-60 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
        </div>

        {/* Widget Financiero */}
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>

      {/* =========================================================================
          FILA 3: INVENTARIO & OPERACIÓN (SKELETON)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bloque Izquierdo: Inventario & Abastecimiento */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>
          </div>
        </div>

        {/* Bloque Derecho: Operación & Canales */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>

          <div className="space-y-4">
            {/* Estado Operativo */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>

            {/* Canales Web */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BARRA INFERIOR (SKELETON)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <Skeleton className="h-4 w-64 rounded-md" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
