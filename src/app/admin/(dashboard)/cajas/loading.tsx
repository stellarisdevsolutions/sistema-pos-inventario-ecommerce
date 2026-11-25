import { Skeleton } from "@/components/ui/skeleton";

export default function CajasLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8" role="status" aria-label="Cargando cajas y turnos">
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 max-w-full rounded-xl bg-admin-raised" />
          <Skeleton className="h-4 w-72 max-w-full rounded-lg bg-admin-raised" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-admin-raised" />
      </div>

      <section className="admin-metrics">
        {[1, 2, 3, 4].map((metric) => (
          <div key={metric} className="admin-metric">
            <Skeleton className="h-4 w-28 max-w-full rounded-md bg-admin-card-border" />
            <Skeleton className="h-7 w-32 max-w-full rounded-lg bg-admin-card-border" />
            <Skeleton className="h-3 w-40 max-w-full rounded-md bg-admin-card-border" />
          </div>
        ))}
      </section>

      <div className="admin-segments">
        <Skeleton className="h-9 w-52 rounded-lg bg-admin-card-border" />
        <Skeleton className="h-9 w-52 rounded-lg bg-admin-card-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {[1, 2].map((card) => (
          <div
            key={card}
            className="rounded-xl p-6 bg-admin-card-bg border border-admin-card-border space-y-6"
          >
            <div className="flex items-center justify-between border-b border-admin-card-border pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0 bg-admin-card-border" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded-md bg-admin-card-border" />
                  <Skeleton className="h-3 w-32 rounded-md bg-admin-card-border" />
                </div>
              </div>
              <Skeleton className="h-4 w-24 rounded-md bg-admin-card-border" />
            </div>
            <div className="py-6 flex flex-col items-center space-y-3">
              <Skeleton className="h-12 w-12 rounded-full bg-admin-card-border" />
              <Skeleton className="h-4 w-48 rounded-md bg-admin-card-border" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl bg-admin-card-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
