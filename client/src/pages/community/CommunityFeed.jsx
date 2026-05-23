import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MessageCircleQuestion, Plus, RadioTower, SearchX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import QuestionCard from "@/components/community/QuestionCard.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useCategories } from "@/hooks/useCategories.js";
import { useQuestions } from "@/hooks/useCommunity.js";
import { useCurrentUser } from "@/hooks/useFaqs.js";
import { cn } from "@/lib/utils.js";

const tabs = [
  { key: "all", label: "All Questions" },
  { key: "unanswered", label: "Unanswered" },
  { key: "mine", label: "My Questions" },
  { key: "resolved", label: "Resolved" }
];

const statusChips = ["open", "answered", "resolved", "duplicate", "archived"];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "priority", label: "Highest Priority" },
  { value: "popular", label: "Most Discussed" }
];

const skeletonCards = Array.from({ length: 5 });

const FeedSkeleton = () => (
  <div className="mx-auto max-w-6xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="grid gap-4">
      {skeletonCards.map((_, index) => (
        <div key={index} className="h-48 rounded-xl bg-surface" />
      ))}
    </div>
  </div>
);

const emptyCopy = {
  all: {
    icon: RadioTower,
    title: "No community questions yet.",
    body: "The first good question usually becomes the map for everyone after it."
  },
  unanswered: {
    icon: CheckCircle2,
    title: "No unanswered questions.",
    body: "The community is caught up. That is a small operational victory."
  },
  mine: {
    icon: MessageCircleQuestion,
    title: "You haven't asked any questions yet.",
    body: "Start with the guided flow so existing answers get checked before you wait."
  },
  resolved: {
    icon: SearchX,
    title: "No resolved questions yet.",
    body: "Resolved threads will collect here as the community turns uncertainty into answers."
  }
};

function CommunityFeedContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFab, setShowFab] = useState(false);
  const { data: user } = useCurrentUser();
  const { data: categories } = useCategories(false);
  const activeTab = searchParams.get("tab") ?? "all";
  const status = searchParams.get("status") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const sortBy = searchParams.get("sortBy") ?? (activeTab === "unanswered" ? "unanswered" : "newest");
  const queryParams = {
    status: activeTab === "unanswered" ? "open" : activeTab === "resolved" ? "resolved" : status,
    categoryId,
    sortBy,
    limit: 60
  };
  const { data } = useQuestions(queryParams);

  useEffect(() => {
    const container = document.querySelector("[data-app-scroll]");
    const target = container ?? window;
    const readScrollTop = () => (container ? container.scrollTop : window.scrollY);
    const handleScroll = () => setShowFab(readScrollTop() > 100);

    handleScroll();
    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, []);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }

    setSearchParams(next);
  };

  const questions = useMemo(() => {
    let next = data.questions;

    if (user.role === "student") {
      next = next.filter((question) => !["archived"].includes(question.status));
    }

    if (activeTab === "mine") {
      next = next.filter((question) => (question.askedBy?._id ?? question.askedBy)?.toString() === user.id);
    }

    return next;
  }, [activeTab, data.questions, user.id, user.role]);
  const empty = emptyCopy[activeTab] ?? emptyCopy.all;
  const EmptyIcon = empty.icon;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accentBlue">Community Intelligence</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-textPrimary md:text-5xl">Questions That Become Answers</h1>
      </div>

      <section className="premium-card space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => updateParams({ tab: tab.key, status: "" })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                activeTab === tab.key ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted hover:text-textPrimary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusChips
            .filter((item) => user.role !== "student" || item !== "archived")
            .map((item) => (
              <button
                key={item}
                type="button"
                disabled={activeTab === "unanswered" || activeTab === "resolved"}
                onClick={() => updateParams({ status: status === item ? "" : item })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm capitalize",
                  status === item ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted hover:text-textPrimary",
                  (activeTab === "unanswered" || activeTab === "resolved") && "opacity-40"
                )}
              >
                {item}
              </button>
            ))}

          <select
            aria-label="Filter by category"
            value={categoryId}
            onChange={(event) => updateParams({ categoryId: event.target.value })}
            className="h-10 rounded-full border border-white/10 bg-surface px-3 text-sm text-textPrimary outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort questions"
            value={sortBy}
            onChange={(event) => updateParams({ sortBy: event.target.value })}
            className="h-10 rounded-full border border-white/10 bg-surface px-3 text-sm text-textPrimary outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {questions.length === 0 ? (
        <div className="premium-card grid min-h-[320px] place-items-center p-8 text-center">
          <div>
            <EmptyIcon className="mx-auto h-12 w-12 text-accentBlue" aria-hidden="true" />
            <h2 className="mt-5 font-display text-3xl text-textPrimary">{empty.title}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-textMuted">{empty.body}</p>
            <Button asChild className="mt-6">
              <Link to="/community/ask">Ask a Question</Link>
            </Button>
          </div>
        </div>
      ) : (
        <motion.div layout className="grid gap-4">
          <AnimatePresence>
            {questions.map((question) => (
              <QuestionCard key={question._id} question={question} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {showFab && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 right-6 z-40">
            <Button asChild className="h-12 rounded-full bg-accentBlue px-5 shadow-xl shadow-accentBlue/20">
              <Link to="/community/ask">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ask a Question
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CommunityFeed() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CommunityFeedContent />
    </Suspense>
  );
}
