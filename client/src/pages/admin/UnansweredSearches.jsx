import { Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import { useUnansweredSearches } from "@/hooks/useAdminAnalytics.js";
import { cn } from "@/lib/utils.js";

const sortOptions = [
  { value: "common", label: "Most Common" },
  { value: "recent", label: "Most Recent" },
  { value: "impact", label: "Highest Impact" }
];

const SearchSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="h-[620px] rounded-xl bg-surface" />
  </div>
);

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)) : "Unknown");

function UnansweredSearchesContent() {
  const [sortBy, setSortBy] = useState("common");
  const { data } = useUnansweredSearches(50);
  const sorted = useMemo(() => {
    const rows = [...data.clusters];
    if (sortBy === "recent") return rows.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
    if (sortBy === "impact") return rows.sort((a, b) => (b.count * (b.relatedCategory ? 1.2 : 1)) - (a.count * (a.relatedCategory ? 1.2 : 1)));
    return rows.sort((a, b) => b.count - a.count);
  }, [data.clusters, sortBy]);
  const total = data.clusters.reduce((sum, cluster) => sum + cluster.count, 0);
  const repeatReduction = total > 0 ? Math.min(80, Math.round((sorted.slice(0, 5).reduce((sum, row) => sum + row.count, 0) / total) * 100)) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">Knowledge Gaps</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Unanswered Searches</h1>
          <p className="mt-2 max-w-3xl text-sm text-textMuted">
            These {data.clusters.length} search terms represent knowledge gaps affecting {total} students. Resolving the top five could eliminate roughly {repeatReduction}% of repeat questions.
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {sortOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setSortBy(option.value)} className={cn("rounded-lg px-3 py-2 text-sm text-textMuted", sortBy === option.value && "bg-accentBlue text-white")}>
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="premium-card overflow-hidden">
        <div className="grid grid-cols-[1.2fr_110px_110px_1.3fr_160px_140px] gap-3 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
          <span>Search Query</span>
          <span>Occurrences</span>
          <span>Last Seen</span>
          <span>Suggested FAQ Title</span>
          <span>Category</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-white/5">
          {sorted.length === 0 && (
            <div className="p-4">
              <EmptyState title="No unanswered search clusters" description="Search coverage is currently holding; no repeated no-result query has crossed the action threshold." variant="success" />
            </div>
          )}
          {sorted.map((cluster) => (
            <div key={cluster.query} className="grid grid-cols-[1.2fr_110px_110px_1.3fr_160px_140px] items-center gap-3 px-4 py-3 text-sm">
              <span className="truncate font-semibold text-textPrimary">{cluster.query}</span>
              <span className="text-textMuted">{cluster.count}</span>
              <span className="text-textMuted">{formatDate(cluster.lastSeenAt)}</span>
              <span className="truncate text-textPrimary">{cluster.suggestedFaqTitle}</span>
              <span className="truncate text-textMuted">{cluster.relatedCategory?.name ?? "Unassigned"}</span>
              <Button asChild size="sm">
                <Link
                  to="/admin/faqs/new"
                  state={{
                    prefill: {
                      title: cluster.suggestedFaqTitle,
                      summary: `Troubleshooting guidance for ${cluster.query}.`,
                      answer: `Provide the official process, eligibility checks, escalation path, and expected resolution timeline for ${cluster.query}.`,
                      categories: cluster.relatedCategory?.id ? [cluster.relatedCategory.id] : []
                    }
                  }}
                >
                  Create FAQ
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function UnansweredSearches() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <UnansweredSearchesContent />
    </Suspense>
  );
}
