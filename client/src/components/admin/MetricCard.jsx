import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils.js";

const directionConfig = {
  up: { icon: ArrowUpRight, className: "border-danger/20 bg-danger/10 text-danger" },
  down: { icon: ArrowDownRight, className: "border-success/20 bg-success/10 text-success" },
  flat: { icon: ArrowRight, className: "border-white/10 bg-white/5 text-textMuted" }
};

export default function MetricCard({ label, value, trend, trendDirection = "flat", implication }) {
  const config = directionConfig[trendDirection] ?? directionConfig.flat;
  const Icon = config.icon;

  return (
    <section className="premium-card flex min-h-32 flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textMuted">{label}</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs", config.className)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {trend}
        </span>
      </div>
      <div>
        <p className="font-display text-4xl leading-none text-textPrimary">{value}</p>
        <p className="mt-2 truncate text-sm text-textMuted">{implication}</p>
      </div>
    </section>
  );
}
