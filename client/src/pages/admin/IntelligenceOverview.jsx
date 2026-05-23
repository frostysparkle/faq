import { Suspense } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, FileSearch, ShieldCheck } from "lucide-react";
import CategoryHeatmap from "@/components/charts/CategoryHeatmap.jsx";
import InsightCard from "@/components/admin/InsightCard.jsx";
import MetricCard from "@/components/admin/MetricCard.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useFaqQuality, useIssueHeatmap, useOverview, useUnansweredSearches } from "@/hooks/useAdminAnalytics.js";
import { cn } from "@/lib/utils.js";

const OverviewSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-20 rounded-xl bg-surface" />
    <div className="grid gap-3 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-xl bg-surface" />)}
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      {[0, 1, 2].map((item) => <div key={item} className="h-36 rounded-xl bg-surface" />)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr_0.9fr]">
      <div className="h-96 rounded-xl bg-surface" />
      <div className="h-96 rounded-xl bg-surface" />
      <div className="h-96 rounded-xl bg-surface" />
    </div>
  </div>
);

const directionFromTrend = (trend = "") => {
  if (trend.startsWith("+")) return "up";
  if (trend.startsWith("-")) return "down";
  return "flat";
};

const actionLabel = (type) => {
  if (type === "FAQ_GAP") return "Create FAQ";
  if (type === "STALE_FAQ" || type === "FAQ_REVIEW") return "Review FAQ";
  if (type === "MODERATION_LOAD" || type === "UNRESOLVED_QUESTIONS") return "Assign Moderator";
  return "Open Decision";
};

function IntelligenceOverviewContent() {
  const { data: overview } = useOverview();
  const { data: heatmap } = useIssueHeatmap(14);
  const { data: unanswered } = useUnansweredSearches(5);
  const { data: quality } = useFaqQuality("worst", 5);

  const metrics = [
    {
      label: "Unresolved Questions",
      value: overview.unresolvedQuestions.count,
      trend: overview.unresolvedQuestions.trend,
      trendDirection: directionFromTrend(overview.unresolvedQuestions.trend),
      implication: overview.unresolvedQuestions.count > 10 ? "Question backlog needs moderation attention" : "Backlog is within operating range"
    },
    {
      label: "No-Result Searches This Week",
      value: overview.noResultSearches.count,
      trend: overview.noResultSearches.trend,
      trendDirection: directionFromTrend(overview.noResultSearches.trend),
      implication: overview.noResultSearches.count > 20 ? "Knowledge gaps are becoming visible" : "Search coverage is holding"
    },
    {
      label: "FAQs Needing Review",
      value: overview.faqsNeedingReview.count,
      trend: "editorial",
      trendDirection: overview.faqsNeedingReview.count > 0 ? "up" : "flat",
      implication: overview.faqsNeedingReview.count > 0 ? "Policy answers need ownership" : "No flagged content risk"
    },
    {
      label: "Avg Resolution Time",
      value: `${overview.avgResolutionTime.hours}h`,
      trend: overview.avgResolutionTime.trend,
      trendDirection: directionFromTrend(overview.avgResolutionTime.trend),
      implication: overview.avgResolutionTime.hours > 48 ? "Resolution time growing - queue may be bottlenecked" : "Resolution tempo is healthy"
    }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">Admin Intelligence</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Mission Control</h1>
          <p className="mt-2 max-w-3xl text-sm text-textMuted">{overview.narrative}</p>
        </div>
        <Button asChild variant="outline" className="border-white/10 bg-white/5">
          <Link to="/admin/audit-logs">Open Audit Trail</Link>
        </Button>
      </header>

      <section className="grid gap-3 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          <h2 className="font-display text-2xl text-textPrimary">Action Required</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {overview.actionRequired.map((action, index) => (
            <InsightCard
              key={`${action.type}-${action.message}`}
              type={action.type}
              severity={action.severity}
              category={action.type.replaceAll("_", " ")}
              message={action.message}
              action={{ label: actionLabel(action.type), href: action.link ?? "/admin" }}
              delay={index * 0.06}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr_0.9fr]">
        <article className="premium-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-textPrimary">Issue Heatmap</h2>
              <p className="mt-1 text-sm text-textMuted">Where searches and questions are concentrating by category and day.</p>
            </div>
            <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/5">
              <Link to="/admin/issue-heatmap">Open full heatmap</Link>
            </Button>
          </div>
          <CategoryHeatmap categories={heatmap.categories} compact />
        </article>

        <article className="premium-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-textPrimary">Top Unanswered Searches</h2>
            <FileSearch className="h-5 w-5 text-accentBlue" aria-hidden="true" />
          </div>
          <p className="mb-4 text-sm text-textMuted">{unanswered.narrative}</p>
          <div className="space-y-3">
            {unanswered.clusters.slice(0, 5).map((cluster) => (
              <Link key={cluster.query} to={`/admin/faqs/new?query=${encodeURIComponent(cluster.query)}`} className="block rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-accentBlue/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-textPrimary">{cluster.query}</p>
                  <span className="rounded-full bg-accentBlue/10 px-2 py-1 text-xs text-accentBlue">{cluster.count}</span>
                </div>
                <p className="mt-1 truncate text-xs text-textMuted">{cluster.suggestedFaqTitle}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="premium-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-textPrimary">FAQ Quality Alerts</h2>
            <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
          </div>
          <p className="mb-4 text-sm text-textMuted">{quality.narrative}</p>
          <div className="space-y-3">
            {quality.faqs.slice(0, 5).map((faq) => (
              <Link key={faq.faqId} to={`/admin/faqs/${faq.faqId}/edit`} className="block rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-accentBlue/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-textPrimary">{faq.title}</p>
                  <span className={cn("rounded-full px-2 py-1 text-xs uppercase", faq.action === "rewrite" ? "bg-danger/10 text-danger" : faq.action === "archive" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{faq.action}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-accentBlue" style={{ width: `${Math.round((faq.qualityScore ?? 0) * 100)}%` }} />
                </div>
              </Link>
            ))}
          </div>
          <Button asChild size="sm" variant="ghost" className="mt-4 w-full">
            <Link to="/admin/faq-quality">Review all quality alerts <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </article>
      </section>
    </div>
  );
}

export default function IntelligenceOverview() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <IntelligenceOverviewContent />
    </Suspense>
  );
}
