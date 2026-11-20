import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando el resumen">
      <div className="admin-page-header grid gap-2">
        <Skeleton className="h-7 w-56 max-w-full bg-admin-raised" />
        <Skeleton className="h-4 w-72 max-w-full bg-admin-raised" />
      </div>
      <section className="admin-metrics">
        {[1, 2, 3, 4].map((metric) => (
          <div key={metric} className="admin-metric">
            <Skeleton className="h-4 w-24 max-w-full bg-admin-card-border" />
            <Skeleton className="h-7 w-32 max-w-full bg-admin-card-border" />
            <Skeleton className="h-3 w-36 max-w-full bg-admin-card-border" />
          </div>
        ))}
      </section>
      <div className="rounded-xl border border-admin-card-border bg-admin-raised p-4">
        <Skeleton className="h-5 w-44 max-w-full bg-admin-card-border" />
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          <Skeleton className="h-44 w-full bg-admin-card-bg" />
          <Skeleton className="h-44 w-full bg-admin-card-bg" />
        </div>
      </div>
    </div>
  );
}
