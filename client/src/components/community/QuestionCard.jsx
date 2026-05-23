import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, GitBranch, MessageCircle, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils.js";

const statusTone = {
  open: "border-accentBlue/20 bg-accentBlue/10 text-accentBlue",
  answered: "border-warning/20 bg-warning/10 text-warning",
  resolved: "border-success/20 bg-success/10 text-success",
  duplicate: "border-white/10 bg-white/5 text-textMuted",
  archived: "border-danger/20 bg-danger/10 text-danger"
};

const relativeTime = (value) => {
  if (!value) return "Recently";

  const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const divisions = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.345, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" }
  ];
  let duration = diffSeconds;

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return "Recently";
};

const getDuplicateId = (question) => question.duplicateOf?._id ?? question.duplicateOf;

export default function QuestionCard({ question, compact = false, className }) {
  const category = question.categoryId;
  const duplicateId = getDuplicateId(question);
  const answerCount = question.answerCount ?? 0;

  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={cn("premium-card group p-5 outline-none focus-within:ring-2 focus-within:ring-accentBlue", compact && "p-4", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        {category?.name && (
          <span className="rounded-full border border-accentBlue/20 bg-accentBlue/10 px-3 py-1 text-xs font-semibold text-accentBlue">
            {category.name}
          </span>
        )}
        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold capitalize", statusTone[question.status] ?? statusTone.open)}>
          {question.status?.replace("_", " ")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-textMuted">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {answerCount} {answerCount === 1 ? "answer" : "answers"}
        </span>
        {question.status === "resolved" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Resolved
          </span>
        )}
      </div>

      <Link
        to={`/community/questions/${question._id}`}
        className={cn("mt-4 block font-display leading-tight text-textPrimary transition-colors hover:text-accentBlue", compact ? "text-xl" : "text-2xl")}
      >
        {question.title}
      </Link>

      {!compact && question.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-textMuted">{question.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {question.tags?.slice(0, compact ? 2 : 5).map((tag) => (
          <span key={tag._id ?? tag} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-textMuted">
            {tag.name ?? "Tagged"}
          </span>
        ))}
      </div>

      {question.status === "duplicate" && duplicateId && (
        <Link
          to={`/community/questions/${duplicateId}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accentBlue hover:underline"
        >
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          View original answer
        </Link>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-textMuted">
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          Asked {relativeTime(question.createdAt)}
        </span>
        <Link to={`/community/questions/${question._id}`} className="inline-flex items-center gap-1 font-semibold text-textPrimary group-hover:text-accentBlue">
          View
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
}
