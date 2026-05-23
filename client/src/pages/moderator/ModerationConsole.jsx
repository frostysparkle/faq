import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, CheckCircle2, GitBranch, Inbox, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ActionBar from "@/components/moderation/ActionBar.jsx";
import AgingIndicator from "@/components/moderation/AgingIndicator.jsx";
import PriorityDot from "@/components/moderation/PriorityDot.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAnswers } from "@/hooks/useCommunity.js";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts.js";
import {
  useApproveAnswer,
  useMarkDuplicate,
  usePendingQueue,
  useRecommendFaqConversion,
  useRejectAnswer,
  useRequestChanges,
  useResolveQuestion
} from "@/hooks/useModeration.js";
import { cn } from "@/lib/utils.js";

const filters = [
  { value: "all", label: "All" },
  { value: "pending_answers", label: "Pending Answers" },
  { value: "unresolved", label: "Unresolved" },
  { value: "duplicate_candidates", label: "Duplicate Candidates" },
  { value: "faq_candidates", label: "FAQ Candidates" }
];

const ConsoleSkeleton = () => (
  <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[360px_1fr]">
    <div className="rounded-xl bg-surface" />
    <div className="rounded-xl bg-surface" />
  </div>
);

function QueueItem({ item, active, onSelect }) {
  return (
    <motion.button
      layout
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        active ? "border-accentBlue bg-accentBlue/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold text-textPrimary">{item.title}</span>
        <PriorityDot score={item.priorityScore} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.category?.name && <span className="rounded-full bg-accentBlue/10 px-2 py-0.5 text-[11px] text-accentBlue">{item.category.name}</span>}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-textMuted">{item.answerCount} answers</span>
        <AgingIndicator value={item.createdAt} />
      </div>
    </motion.button>
  );
}

function QuestionContext({ item }) {
  const [expanded, setExpanded] = useState(true);
  const question = item.question;

  return (
    <section className="premium-card p-5">
      <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setExpanded((value) => !value)}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Question Context</p>
          <h2 className="mt-1 font-display text-3xl text-textPrimary">{question?.title ?? item.title}</h2>
        </div>
        <span className="text-xs text-textMuted">{expanded ? "Collapse" : "Expand"}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-textMuted">{question?.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.category?.name && <span className="rounded-full border border-accentBlue/20 bg-accentBlue/10 px-3 py-1 text-xs text-accentBlue">{item.category.name}</span>}
              {item.tags?.map((tag) => (
                <span key={tag._id} className="rounded-full bg-white/5 px-3 py-1 text-xs text-textMuted">{tag.name}</span>
              ))}
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-textMuted">{item.viewCount} views</span>
              <AgingIndicator value={question?.createdAt ?? item.createdAt} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function OpenQuestionAnswers({ questionId }) {
  const { data: answers } = useAnswers(questionId);

  if (answers.length === 0) {
    return <p className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-textMuted">No answers have been submitted yet.</p>;
  }

  return (
    <div className="space-y-3">
      {answers.map((answer) => (
        <div key={answer._id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-textPrimary">{answer.answeredBy?.name ?? "Contributor"}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-textMuted">{answer.status}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-textMuted">{answer.body}</p>
        </div>
      ))}
    </div>
  );
}

function ModerationConsoleContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [duplicateInput, setDuplicateInput] = useState("");
  const filter = searchParams.get("filter") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? "priority";
  const requestedItemId = searchParams.get("item");
  const { data: queue } = usePendingQueue({ filter, sortBy, limit: 80 });
  const approve = useApproveAnswer();
  const reject = useRejectAnswer();
  const requestChanges = useRequestChanges();
  const resolveQuestion = useResolveQuestion();
  const markDuplicate = useMarkDuplicate();
  const recommendFaq = useRecommendFaqConversion();
  const items = queue.items;
  const activeItem = items[activeIndex] ?? items[0];

  useEffect(() => {
    if (activeIndex > items.length - 1) {
      setActiveIndex(Math.max(items.length - 1, 0));
    }
  }, [activeIndex, items.length]);

  useEffect(() => {
    if (!requestedItemId) return;
    const index = items.findIndex((item) => item.id === requestedItemId);
    if (index >= 0) setActiveIndex(index);
  }, [items, requestedItemId]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const remaining = Math.max(items.length - 1, 0);
  const advance = (message) => {
    notify(`${message}. ${remaining} items remaining in queue.`);
    setActiveIndex((index) => Math.min(index, Math.max(items.length - 2, 0)));
  };

  const runApprove = () => {
    if (!activeItem?.answerId) return;
    const firstApproval = (activeItem.question?.answerCount ?? 0) <= 1;
    const moderationNote = firstApproval ? "First approved answer on question." : "";
    approve.mutate({ answerId: activeItem.answerId, moderationNote });
    advance("Answer approved");
  };

  const runReject = (reason) => {
    if (!activeItem?.answerId) return;
    reject.mutate({ answerId: activeItem.answerId, reason });
    advance("Answer rejected");
  };

  const runChanges = (note) => {
    if (!activeItem?.answerId) return;
    requestChanges.mutate({ answerId: activeItem.answerId, note });
    advance("Changes requested");
  };

  const runResolve = () => {
    if (!activeItem?.questionId) return;
    resolveQuestion.mutate({ questionId: activeItem.questionId });
    advance("Question resolved");
  };

  const runDuplicate = () => {
    if (!activeItem?.questionId || !duplicateInput.trim()) return;
    markDuplicate.mutate({ questionId: activeItem.questionId, duplicateOf: duplicateInput.trim() });
    setDuplicateInput("");
    advance("Question marked duplicate");
  };

  const runFaqCandidate = () => {
    if (!activeItem?.answerId) return;
    recommendFaq.mutate({ answerId: activeItem.answerId, notes: "Recommended from moderation console." });
    notify("Marked for FAQ conversion.");
  };

  useKeyboardShortcuts(
    [
      { key: "j", onKey: () => setActiveIndex((index) => Math.min(index + 1, items.length - 1)) },
      { key: "k", onKey: () => setActiveIndex((index) => Math.max(index - 1, 0)) },
      { key: "a", onKey: runApprove, disabled: !activeItem?.answerId },
      { key: "r", onKey: () => document.querySelector("[data-action='Reject']")?.click(), disabled: !activeItem?.answerId },
      { key: "c", onKey: () => document.querySelector("[data-action='Request Changes']")?.click(), disabled: !activeItem?.answerId },
      { key: "escape", onKey: () => setActiveIndex(0) }
    ],
    { enableInInputs: false }
  );

  const setFilter = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set("filter", value);
    setSearchParams(next);
    setActiveIndex(0);
  };

  const setSortBy = (value) => {
    const next = new URLSearchParams(searchParams);
    next.set("sortBy", value);
    setSearchParams(next);
  };

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[360px_1fr]">
      <aside className="premium-card flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Priority Queue</p>
              <h1 className="mt-1 font-display text-3xl text-textPrimary">{queue.health.pendingCount} pending</h1>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-textMuted">
              {queue.health.trend === "up" ? <ArrowUp className="h-3 w-3 text-danger" /> : <ArrowDown className="h-3 w-3 text-success" />}
              {queue.health.trend}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort queue" className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-textPrimary outline-none">
              <option value="priority">Priority Score</option>
              <option value="age">Age</option>
              <option value="category">Category</option>
            </select>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((item) => (
                <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={cn("rounded-full border px-2.5 py-1 text-[11px]", filter === item.value ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted")}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {/* MICROINTERACTION: approved/rejected queue items slide out left with fade. */}
          <AnimatePresence>
            {items.map((item, index) => (
              <QueueItem key={item.id} item={item} active={item.id === activeItem?.id} onSelect={() => setActiveIndex(index)} />
            ))}
          </AnimatePresence>
          {items.length === 0 && (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <Sparkles className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
                <h2 className="mt-3 font-display text-2xl text-textPrimary">Queue is clear.</h2>
                <p className="mt-2 text-sm text-textMuted">You're ahead of the curve.</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="premium-card relative min-h-0 overflow-hidden">
        {activeItem ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5 pb-28">
              <QuestionContext item={activeItem} />
              {activeItem.type === "pending_answer" ? (
                <section className="premium-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">Answer Review</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-textPrimary">{activeItem.answer?.answeredBy?.name ?? "Contributor"}</p>
                    <AgingIndicator value={activeItem.answer?.createdAt ?? activeItem.createdAt} />
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-textPrimary">{activeItem.answer?.body}</p>
                </section>
              ) : (
                <section className="premium-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Open Question Review</p>
                  <h2 className="mt-2 font-display text-2xl text-textPrimary">Submitted Answers</h2>
                  <div className="mt-4">
                    <Suspense fallback={<div className="h-28 rounded-xl bg-white/5" />}>
                      <OpenQuestionAnswers questionId={activeItem.questionId} />
                    </Suspense>
                  </div>
                </section>
              )}
              <section className="premium-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Duplicate Link</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={duplicateInput}
                    onChange={(event) => setDuplicateInput(event.target.value)}
                    placeholder="Original question ID"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
                  />
                  <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={runDuplicate}>
                    <GitBranch className="h-4 w-4" aria-hidden="true" />
                    Mark Duplicate
                  </Button>
                </div>
              </section>
            </div>
            <div className="absolute bottom-0 left-0 right-0">
              <ActionBar
                actions={[
                  { label: "Approve", shortcut: "A", color: "green", onClick: runApprove, disabled: !activeItem.answerId },
                  { label: "Reject", shortcut: "R", color: "red", onClick: runReject, requiresInput: true, inputPlaceholder: "Reason for rejection", disabled: !activeItem.answerId },
                  { label: "Request Changes", shortcut: "C", color: "amber", onClick: runChanges, requiresInput: true, inputPlaceholder: "What should change?", disabled: !activeItem.answerId },
                  { label: "Resolve Question", color: "blue", onClick: runResolve },
                  { label: "Mark for FAQ Conversion", color: "neutral", onClick: runFaqCandidate, disabled: !activeItem.answerId }
                ].map((action) => ({
                  ...action,
                  onClick: action.onClick,
                  label: action.label
                }))}
              />
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Inbox className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h2 className="mt-4 font-display text-3xl text-textPrimary">Queue is clear.</h2>
              <p className="mt-2 text-sm text-textMuted">You're ahead of the curve.</p>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-deep/90 px-4 py-2 text-xs text-textMuted shadow-xl backdrop-blur">
        J/K Navigate - A Approve - R Reject - C Request Changes
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed right-5 top-20 z-50 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-textPrimary shadow-xl">
            <CheckCircle2 className="mr-2 inline h-4 w-4 text-success" aria-hidden="true" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ModerationConsole() {
  return (
    <Suspense fallback={<ConsoleSkeleton />}>
      <ModerationConsoleContent />
    </Suspense>
  );
}
