import { Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AgingIndicator from "@/components/moderation/AgingIndicator.jsx";
import PriorityDot from "@/components/moderation/PriorityDot.jsx";
import { Button } from "@/components/ui/button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import { useBulkModeration, usePendingQueue } from "@/hooks/useModeration.js";
import { cn } from "@/lib/utils.js";

const filters = [
  { value: "all", label: "All" },
  { value: "pending_answers", label: "Pending Answers" },
  { value: "unresolved", label: "Unresolved" },
  { value: "duplicate_candidates", label: "Duplicate Candidates" },
  { value: "faq_candidates", label: "FAQ Candidates" }
];

const QueueSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-4">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="h-[560px] rounded-xl bg-surface" />
  </div>
);

function ReviewQueueContent() {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [selected, setSelected] = useState([]);
  const [bulkReason, setBulkReason] = useState("");
  const { data } = usePendingQueue({ filter, sortBy, limit: 100 });
  const bulk = useBulkModeration();
  const navigate = useNavigate();

  const answerIds = useMemo(
    () => data.items.filter((item) => selected.includes(item.id) && item.answerId).map((item) => item.answerId),
    [data.items, selected]
  );
  const questionIds = useMemo(
    () => data.items.filter((item) => selected.includes(item.id) && item.type === "open_question").map((item) => item.questionId),
    [data.items, selected]
  );

  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const runBulk = async (action) => {
    const ids = action === "resolve" ? questionIds : answerIds;
    if (ids.length === 0) return;
    if (action === "reject" && !bulkReason.trim()) return;

    await bulk.mutateAsync({ action, ids, reason: bulkReason });
    setSelected([]);
    setBulkReason("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accentBlue">Moderator Queue</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Review Queue</h1>
        </div>
        <Button asChild>
          <Link to="/moderator/console">Open Console</Link>
        </Button>
      </div>

      <section className="premium-card space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn("rounded-full border px-3 py-1.5 text-sm", filter === item.value ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted")}
            >
              {item.label}
            </button>
          ))}
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-9 rounded-full border border-white/10 bg-surface px-3 text-sm text-textPrimary">
            <option value="priority">Priority</option>
            <option value="age">Age</option>
            <option value="category">Category</option>
          </select>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-sm text-textMuted">{selected.length} selected</span>
            <Button type="button" size="sm" onClick={() => runBulk("approve")} disabled={answerIds.length === 0 || bulk.isPending}>Bulk approve</Button>
            <input
              value={bulkReason}
              onChange={(event) => setBulkReason(event.target.value)}
              placeholder="Reason for bulk rejection"
              className="h-8 min-w-64 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-textPrimary outline-none"
            />
            <Button type="button" size="sm" variant="destructive" onClick={() => runBulk("reject")} disabled={answerIds.length === 0 || !bulkReason.trim() || bulk.isPending}>Bulk reject</Button>
            <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={() => runBulk("resolve")} disabled={questionIds.length === 0 || bulk.isPending}>Bulk resolve</Button>
          </div>
        )}
      </section>

      <section className="premium-card overflow-hidden">
        <div className="grid grid-cols-[44px_110px_1fr_140px_100px_90px_100px] gap-3 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-textMuted">
          <span />
          <span>Type</span>
          <span>Title</span>
          <span>Category</span>
          <span>Priority</span>
          <span>Age</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-white/5">
          {data.items.length === 0 && (
            <div className="p-4">
              <EmptyState title="Queue is clear" description="You're ahead of the curve." variant="success" />
            </div>
          )}
          {data.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[44px_110px_1fr_140px_100px_90px_100px] items-center gap-3 px-4 py-3 text-sm">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.title}`} />
              <span className="capitalize text-textMuted">{item.type.replace("_", " ")}</span>
              <button type="button" className="truncate text-left font-semibold text-textPrimary hover:text-accentBlue" onClick={() => navigate(`/moderator/console?item=${item.id}`)}>
                {item.title}
              </button>
              <span className="truncate text-textMuted">{item.category?.name ?? "Uncategorized"}</span>
              <span className={cn("inline-flex w-fit items-center gap-2 rounded-full border px-2 py-1", item.priorityScore > 0.7 ? "border-danger/20 text-danger" : item.priorityScore >= 0.4 ? "border-warning/20 text-warning" : "border-success/20 text-success")}>
                <PriorityDot score={item.priorityScore} />
                {item.priorityScore.toFixed(2)}
              </span>
              <AgingIndicator value={item.createdAt} />
              <Button asChild size="sm" variant="outline" className="w-fit border-white/10 bg-white/5">
                <Link to={`/moderator/console?item=${item.id}`}>Review</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ReviewQueue() {
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <ReviewQueueContent />
    </Suspense>
  );
}
