import { Suspense, useMemo, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { useQuestions } from "@/hooks/useCommunity.js";
import { useCurrentUser } from "@/hooks/useFaqs.js";
import { cn } from "@/lib/utils.js";

const statuses = ["all", "open", "answered", "resolved", "duplicate"];

const MyQuestionsSkeleton = () => (
  <div className="mx-auto max-w-6xl space-y-4">
    <div className="h-20 rounded-xl bg-surface" />
    <div className="h-96 rounded-xl bg-surface" />
  </div>
);

const badgeTone = {
  open: "border-accentBlue/20 bg-accentBlue/10 text-accentBlue",
  answered: "border-warning/20 bg-warning/10 text-warning",
  resolved: "border-success/20 bg-success/10 text-success",
  duplicate: "border-white/10 bg-white/5 text-textMuted"
};

function MyQuestionsContent() {
  const [status, setStatus] = useState("all");
  const { data: user } = useCurrentUser();
  const { data } = useQuestions({ limit: 100, sortBy: "newest" });
  const questions = useMemo(
    () =>
      data.questions
        .filter((question) => (question.askedBy?._id ?? question.askedBy)?.toString() === user.id)
        .filter((question) => status === "all" || question.status === status),
    [data.questions, status, user.id]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accentBlue">Student Tracker</p>
        <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">My Questions</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold capitalize",
              status === item ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted hover:text-textPrimary"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {questions.length === 0 ? (
        <div className="premium-card grid min-h-[320px] place-items-center p-8 text-center">
          <div>
            <MessageCircleQuestion className="mx-auto h-12 w-12 text-accentBlue" aria-hidden="true" />
            <h2 className="mt-5 font-display text-3xl text-textPrimary">You haven't asked any questions yet.</h2>
            <Button asChild className="mt-6">
              <Link to="/community/ask">Start here</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="premium-card divide-y divide-white/5 overflow-hidden">
          {questions.map((question) => (
            <div key={question._id} className="grid gap-3 p-4 md:grid-cols-[1fr_120px_110px_140px] md:items-center">
              <Link to={`/community/questions/${question._id}`} className="font-semibold text-textPrimary hover:text-accentBlue">
                {question.title}
              </Link>
              <span className={cn("w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize", badgeTone[question.status] ?? badgeTone.open)}>
                {question.status}
              </span>
              <span className="text-sm text-textMuted">{question.answerCount ?? 0} answers</span>
              <Button asChild variant="outline" size="sm" className="w-fit border-white/10 bg-white/5">
                <Link to={`/community/questions/${question._id}`}>Track</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyQuestions() {
  return (
    <Suspense fallback={<MyQuestionsSkeleton />}>
      <MyQuestionsContent />
    </Suspense>
  );
}
