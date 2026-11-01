import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. Header Superior & Selector de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
      </div>

      {/* 2. Grid de 4 KPIs Principales */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between min-h-[220px]"
          >
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>

              {/* Valor numérico principal */}
              <div className="mt-3.5 space-y-2">
                <Skeleton className="h-9 w-40 rounded-xl" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>

            {/* Bloque inferior de métrica secundaria / desglose */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {i === 4 ? (
                // Tarjeta 4: Dos píldoras (Efectivo y QR) + Botón Arqueo
                <div className="flex items-center gap-2 justify-between">
                  <Skeleton className="flex-1 h-11 rounded-xl" />
                  <Skeleton className="flex-1 h-11 rounded-xl" />
                  <Skeleton className="h-9 w-16 rounded-xl" />
                </div>
              ) : i === 3 ? (
                // Tarjeta 3: Barra de progreso de meta
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ) : (
                // Tarjetas 1 y 2: Sub-desglose lineal
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* 3. Bento Grid Central: Gráfico de Rendimiento (2 cols) + Transacciones en Vivo (1 col) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna Izquierda: Monitor / Gráfico Financiero */}
        <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between min-h-[460px]">
          <div>
            {/* Cabecera del gráfico con pestañas */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-48 rounded-lg" />
                <Skeleton className="h-3.5 w-64 rounded-md" />
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit">
                <Skeleton className="h-8 w-14 rounded-xl" />
                <Skeleton className="h-8 w-16 rounded-xl" />
                <Skeleton className="h-8 w-14 rounded-xl" />
              </div>
            </div>

            {/* Métricas destacadas en cabecera */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              {[1, 2, 3, 4].map((k) => (
                <div
                  key={k}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5"
                >
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
              ))}
            </div>

            {/* Canvas simulado de barras y curvas de ventas */}
            <div className="h-48 pt-6 flex items-end gap-3 sm:gap-4 px-2">
              {[45, 65, 30, 85, 55, 95, 70, 80, 60, 90, 75, 88].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <Skeleton
                    className="w-full rounded-t-xl"
                    style={{ height: `${height}%` }}
                  />
                  <Skeleton className="h-2.5 w-5 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Footer del monitor */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Skeleton className="h-4 w-44 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>

        {/* Columna Derecha: Feed en Vivo de Ventas Recientes */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            {/* Lista de 5 tickets recientes */}
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                      <Skeleton className="h-2.5 w-16 rounded-md" />
                    </div>
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-4 w-14 rounded-md ml-auto" />
                    <Skeleton className="h-3 w-10 rounded-full ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <Skeleton className="h-10 w-full rounded-2xl" />
          </div>
        </div>
      </section>

      {/* 4. Bento Grid Inferior: Stock Crítico + Mermas/Ajustes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Alertas de Stock */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-3.5 w-56 rounded-md" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-36 rounded-md" />
                    <Skeleton className="h-2.5 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-7 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        {/* Registro de Mermas y Pérdidas */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-60 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-40 rounded-md" />
                  <Skeleton className="h-2.5 w-28 rounded-md" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-3.5 w-16 rounded-md ml-auto" />
                  <Skeleton className="h-2.5 w-12 rounded-md ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
