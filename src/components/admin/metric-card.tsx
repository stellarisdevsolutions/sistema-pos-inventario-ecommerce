import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger";
  appearance?: "lead" | "desk";
}

export function MetricCard({ label, value, detail, icon: Icon, tone, appearance }: MetricCardProps) {
  return (
    <article className="admin-metric" data-tone={tone} data-appearance={appearance}>
      <h2 className="admin-metric-label">{label}<Icon size={16} aria-hidden /></h2>
      <div className="admin-metric-value">{value}</div>
      <div className="admin-metric-detail">{detail}</div>
    </article>
  );
}
