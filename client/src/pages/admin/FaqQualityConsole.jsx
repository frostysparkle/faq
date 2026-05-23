import { Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, CheckCircle2, Pencil } from "lucide-react";
import QualitySparkline from "@/components/charts/QualitySparkline.jsx";
import { Button } from "@/components/ui/button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import { useChangeFaqStatus, useUpdateFaq } from "@/hooks/useFaqs.js";
import { useFaqQuality } from "@/hooks/useAdminAnalytics.js";
import { cn } from "@/lib/utils.js";

const filterOptions = [
  { value: "all", label: "All" },
  { value: "rewrite", label: "Rewrite Candidates" },
  { value: "archive", label: "Archive Candidates" }
];

const QualitySkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="h-[640px] rounded-xl bg-surface" />
      <div className="h-[640px] rounded-xl bg-surface" />
    </div>
  </div>
);

const actionClass = {
  rewrite: "bg-danger/10 text-danger",
  archive: "bg-warning/10 text-warning",
  ok: "bg-success/10 text-success"
};

const sparklineData = (faq) =>
  [0.72, 0.66, 0.58, 0.51, faq.qualityScore ?? 0].map((score, index) => ({ label: `T-${4 - index}`, score: Number(score.toFixed(2)) }));

function FaqQualityConsoleContent() {
  const [filter, setFilter] = useState("all");
  const { data } = useFaqQuality("worst", 50);
  const [selectedId, setSelectedId] = useState(data.faqs[0]?.faqId);
  const changeStatus = useChangeFaqStatus();
  const updateFaq = useUpdateFaq();
  const visibleFaqs = useMemo(() => data.faqs.filter((faq) => filter === "all" || faq.action === filter), [data.faqs, filter]);
  const selected = visibleFaqs.find((faq) => faq.faqId === selectedId) ?? visibleFaqs[0];
  const breakdown = selected
    ? [
        { label: "Helpfulness", value: selected.helpfulnessRatio ?? 0, weight: "35%" },
        { label: "Click Resolution", value: Math.min((selected.viewCount ?? 0) / 1000, 1), weight: "25%" },
        { label: "Freshness", value: 0.72, weight: "20%" },
        { label: "Low Repeat Questions", value: Math.max(0, 1 - (selected.repeatQuestionCount ?? 0) / 10), weight: "10%" },
        { label: "Moderator Review", value: selected.action === "ok" ? 0.8 : 0.25, weight: "10%" }
      ]
    : [];

  const archiveFaq = () => {
    if (selected) changeStatus.mutate({ id: selected.faqId, status: "archived" });
  };

  const markReviewed = () => {
    if (selected) updateFaq.mutate({ id: selected.faqId, payload: { reviewState: "none", lastReviewedAt: new Date().toISOString() } });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">FAQ Quality</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Editorial Risk Console</h1>
          <p className="mt-2 max-w-3xl text-sm text-textMuted">{data.narrative}</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {filterOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={cn("rounded-lg px-3 py-2 text-sm text-textMuted", filter === option.value && "bg-accentBlue text-white")}>
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
        <section className="premium-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_130px_100px_110px] gap-3 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
            <span>FAQ</span>
            <span>Quality</span>
            <span>Helpfulness</span>
            <span>Views</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-white/5">
            {visibleFaqs.length === 0 && (
              <div className="p-4">
                <EmptyState title="No FAQ quality records" description="No records match this editorial risk filter." variant="search" />
              </div>
            )}
            {visibleFaqs.map((faq) => (
              <button key={faq.faqId} type="button" onClick={() => setSelectedId(faq.faqId)} className={cn("grid w-full grid-cols-[1fr_120px_130px_100px_110px] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/[0.03]", selected?.faqId === faq.faqId && "bg-accentBlue/10")}>
                <span className="truncate font-semibold text-textPrimary">{faq.title}</span>
                <span>
                  <span className="mb-1 block text-xs text-textMuted">{Math.round((faq.qualityScore ?? 0) * 100)}%</span>
                  <span className="block h-1.5 rounded-full bg-white/5"><span className="block h-full rounded-full bg-accentBlue" style={{ width: `${Math.round((faq.qualityScore ?? 0) * 100)}%` }} /></span>
                </span>
                <span className={cn("w-fit rounded-full px-2 py-1 text-xs", (faq.helpfulnessRatio ?? 0) < 0.4 ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>{Math.round((faq.helpfulnessRatio ?? 0) * 100)}%</span>
                <span className="text-textMuted">{faq.viewCount}</span>
                <span className={cn("w-fit rounded-full px-2 py-1 text-xs uppercase", actionClass[faq.action])}>{faq.action}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="premium-card flex min-h-[640px] flex-col p-5">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Selected FAQ</p>
                  <h2 className="mt-2 font-display text-2xl text-textPrimary">{selected.title}</h2>
                </div>
                <span className={cn("rounded-full px-2 py-1 text-xs uppercase", actionClass[selected.action])}>{selected.action}</span>
              </div>
              <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm leading-6 text-textMuted">{selected.narrative}</p>

              <div className="mt-5 space-y-3">
                {breakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-xs text-textMuted"><span>{item.label} - {item.weight}</span><span>{Math.round(item.value * 100)}%</span></div>
                    <div className="h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-accentBlue" style={{ width: `${Math.round(item.value * 100)}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="mt-6 h-24">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-textMuted">Quality Trend</p>
                <QualitySparkline data={sparklineData(selected)} />
              </div>

              <div className="mt-auto grid gap-2">
                <Button asChild><Link to={`/admin/faqs/${selected.faqId}/edit`}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit FAQ</Link></Button>
                <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={archiveFaq}><Archive className="h-4 w-4" aria-hidden="true" /> Archive FAQ</Button>
                <Button type="button" variant="ghost" onClick={markReviewed}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Mark Reviewed</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-textMuted">No FAQ quality records match this filter.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function FaqQualityConsole() {
  return (
    <Suspense fallback={<QualitySkeleton />}>
      <FaqQualityConsoleContent />
    </Suspense>
  );
}
