import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  trend?: number[];
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger";
  appearance?: "lead" | "desk";
}

export function MetricCard({ label, value, detail, icon: Icon, tone, appearance, trend }: MetricCardProps) {
  const low = Math.min(0, ...(trend ?? []));
  const range = Math.max(0, ...(trend ?? [])) - low || 1;
  const points = trend?.map((value, i) => `${i * 96 / Math.max(1, trend.length - 1)},${28 - (value - low) * 24 / range}`).join(" ");
  return (
    <article className="admin-metric" data-tone={tone} data-appearance={appearance}>
      <h2 className="admin-metric-label">{label}<Icon size={16} aria-hidden /></h2>
      <div className="admin-metric-value">{value}</div>
      <div className="admin-metric-detail">{detail}</div>
      {trend && trend.length > 1 && <figure className="metric-trend">
        <figcaption>Por día este mes</figcaption>
        <svg viewBox="0 0 96 32" role="img" aria-label={`Evolución diaria: ${label}`}>
          <polygon points={`0,32 ${points} 96,32`} fill="currentColor" opacity=".13" />
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </figure>}
    </article>
  );
}
