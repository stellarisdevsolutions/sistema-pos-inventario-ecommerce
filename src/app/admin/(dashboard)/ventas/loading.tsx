import { Skeleton } from "@/components/ui/skeleton";

export default function VentasLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8" role="status" aria-label="Cargando punto de venta">
      <div className="admin-page-header flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-44 rounded-xl bg-admin-raised" />
        <div className="admin-segments">
          <Skeleton className="h-8 w-20 rounded-lg bg-admin-card-border" />
          <Skeleton className="h-8 w-24 rounded-lg bg-admin-card-border" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="min-w-0 lg:col-span-7 space-y-4">
          <div className="admin-panel p-3.5 sm:p-4 flex flex-col sm:flex-row gap-2.5">
            <Skeleton className="h-10 flex-1 rounded-xl bg-admin-raised" />
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-10 flex-1 sm:w-56 rounded-xl bg-admin-raised" />
              <Skeleton className="h-10 w-10 rounded-xl shrink-0 bg-admin-raised" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((card) => (
              <div
                key={card}
                className="rounded-xl bg-admin-card-bg border border-admin-card-border p-3 space-y-2.5"
              >
                <Skeleton className="aspect-square w-full rounded-xl bg-admin-raised" />
                <Skeleton className="h-3 w-16 rounded-md bg-admin-card-border" />
                <Skeleton className="h-4 w-3/4 rounded-md bg-admin-card-border" />
                <Skeleton className="h-3 w-1/2 rounded-md bg-admin-card-border" />
                <div className="pt-2 border-t border-admin-card-border flex items-center justify-between">
                  <Skeleton className="h-4 w-16 rounded-md bg-admin-card-border" />
                  <Skeleton className="h-7 w-7 rounded-lg bg-admin-card-border" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="admin-panel p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-admin-card-border pb-3">
              <Skeleton className="h-5 w-16 rounded-md bg-admin-card-border" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg bg-admin-raised" />
            <div className="py-6 space-y-2">
              <Skeleton className="h-4 w-44 mx-auto rounded-md bg-admin-card-border" />
            </div>
            <div className="pt-2 border-t border-admin-card-border space-y-2">
              <Skeleton className="h-3 w-28 rounded-md bg-admin-card-border" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 w-full rounded-xl bg-admin-raised" />
                <Skeleton className="h-9 w-full rounded-xl bg-admin-raised" />
              </div>
            </div>
            <div className="pt-3 border-t border-admin-card-border space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded-md bg-admin-card-border" />
                <Skeleton className="h-7 w-24 rounded-md bg-admin-card-border" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl bg-admin-card-border" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
