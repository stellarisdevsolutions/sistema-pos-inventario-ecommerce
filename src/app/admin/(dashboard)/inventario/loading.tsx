import { Skeleton } from "@/components/ui/skeleton"

export default function InventarioLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in-50 duration-300">
      {/* 1. Header & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
      </div>

      {/* 2. KPIs de Inventario */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-28 rounded-xl" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          </div>
        ))}
      </section>

      {/* 3. Selector de Pestañas (Catálogo, Kárdex, Mermas) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 w-fit">
        <Skeleton className="h-9 w-44 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>

      {/* 4. Tabla de Inventario / Kárdex */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Barra superior de búsqueda y filtros */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>

        {/* Filas simuladas */}
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-md hidden sm:block" />
              <div className="space-y-1 text-right">
                <Skeleton className="h-4 w-16 rounded-md ml-auto" />
                <Skeleton className="h-3 w-12 rounded-md ml-auto" />
              </div>
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
