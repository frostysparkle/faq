import { Suspense, useState } from "react";
import CategoryHeatmap from "@/components/charts/CategoryHeatmap.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useIssueHeatmap } from "@/hooks/useAdminAnalytics.js";
import { cn } from "@/lib/utils.js";

const ranges = [7, 14, 30, 90];

const HeatmapSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="h-[520px] rounded-xl bg-surface" />
    <div className="grid gap-3 md:grid-cols-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-40 rounded-xl bg-surface" />)}
    </div>
  </div>
);

function IssueHeatmapContent() {
  const [days, setDays] = useState(30);
  const { data } = useIssueHeatmap(days);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">Issue Heatmap</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Confusion by Category</h1>
          <p className="mt-2 max-w-3xl text-sm text-textMuted">{data.narrative}</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={cn("rounded-lg px-3 py-2 text-sm text-textMuted", days === range && "bg-accentBlue text-white")}
            >
              {range}d
            </button>
          ))}
        </div>
      </header>

      <section className="premium-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-textPrimary">Category by Day Volume</h2>
            <p className="mt-1 text-sm text-textMuted">Cell intensity combines search and question volume; hover to inspect unresolved pressure.</p>
          </div>
          <Button asChild size="sm">
            <a href="#category-narratives">Read narratives</a>
          </Button>
        </div>
        <CategoryHeatmap categories={data.categories} />
      </section>

      <section id="category-narratives" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.categories.slice(0, 9).map((category) => (
          <article key={category.id} className="premium-card p-4">
            <h3 className="font-display text-xl text-textPrimary">{category.name}</h3>
            <p className="mt-2 text-sm leading-6 text-textMuted">{category.narrative}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export default function IssueHeatmap() {
  return (
    <Suspense fallback={<HeatmapSkeleton />}>
      <IssueHeatmapContent />
    </Suspense>
  );
}
