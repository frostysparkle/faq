import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils.js";

const intensityClass = (value, max) => {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) return "bg-accentBlue shadow-[0_0_0_1px_rgba(79,142,247,0.45)]";
  if (ratio >= 0.5) return "bg-accentBlue/70";
  if (ratio >= 0.25) return "bg-accentBlue/35";
  if (ratio > 0) return "bg-accentBlue/15";
  return "bg-white/[0.03]";
};

export default function CategoryHeatmap({ categories = [], compact = false }) {
  const [active, setActive] = useState(null);
  const maxVolume = useMemo(
    () => Math.max(0, ...categories.flatMap((category) => category.data.map((item) => item.volume ?? 0))),
    [categories]
  );
  const visibleCategories = compact ? categories.slice(0, 5) : categories;

  return (
    <div className="relative">
      {/* Anti-pattern guard: no chart appears without adjacent narrative and an explicit action path. */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px] space-y-2">
          {visibleCategories.map((category) => (
            <div key={category.id} className="grid grid-cols-[150px_1fr] items-center gap-3">
              <p className="truncate text-sm font-semibold text-textPrimary">{category.name}</p>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${category.data.length}, minmax(16px, 1fr))` }}>
                {category.data.map((day) => (
                  <Link
                    key={`${category.id}-${day.date}`}
                    to={`/admin/faqs/new?query=${encodeURIComponent(category.name)}`}
                    onMouseEnter={() => setActive({ category: category.name, ...day })}
                    onMouseLeave={() => setActive(null)}
                    aria-label={`${category.name} ${day.date}: ${day.volume} total signals`}
                    className={cn("h-7 rounded-[4px] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accentBlue", intensityClass(day.volume, maxVolume))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 w-72 rounded-xl border border-white/10 bg-deep/95 p-3 text-sm shadow-xl">
          <p className="font-semibold text-textPrimary">{active.category} - {active.date}</p>
          <p className="mt-1 text-textMuted">
            {active.searches ?? 0} searches - {active.questions ?? 0} questions - {active.unresolved ?? 0} unresolved
          </p>
          {(active.volume ?? 0) > 20 && (
            <Button size="sm" className="mt-3 w-full" asChild>
              <Link to={`/admin/faqs/new?query=${encodeURIComponent(active.category)}`}>Create FAQ for this cluster</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
