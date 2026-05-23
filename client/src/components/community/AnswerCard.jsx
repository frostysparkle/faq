import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { useAnswerFeedback } from "@/hooks/useCommunity.js";
import { cn } from "@/lib/utils.js";

const statusCopy = {
  approved: "Official moderator approval",
  pending: "Pending moderator review",
  rejected: "Rejected",
  needs_changes: "Needs changes"
};

export default function AnswerCard({ answer, currentUserId }) {
  const [selected, setSelected] = useState(null);
  const feedback = useAnswerFeedback();
  const isAuthor = (answer.answeredBy?._id ?? answer.answeredBy)?.toString() === currentUserId;
  const canVote = answer.status === "approved";

  const vote = (value) => {
    if (!canVote || selected || feedback.isPending) return;
    setSelected(value);
    feedback.mutate({ answerId: answer._id, value });
  };

  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-textPrimary">{answer.answeredBy?.name ?? "Community member"}</p>
          <p className="mt-1 text-xs text-textMuted">{new Date(answer.createdAt).toLocaleDateString()}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
            answer.status === "approved" && "border-success/20 bg-success/10 text-success",
            answer.status === "pending" && "border-warning/20 bg-warning/10 text-warning",
            answer.status === "rejected" && "border-danger/20 bg-danger/10 text-danger",
            answer.status === "needs_changes" && "border-warning/20 bg-warning/10 text-warning"
          )}
        >
          {answer.status === "approved" ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
          {statusCopy[answer.status] ?? answer.status}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-textPrimary">{answer.body}</p>

      {answer.moderationNote && isAuthor && answer.status !== "approved" && (
        <div className="mt-4 rounded-xl border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
          Moderator note: {answer.moderationNote}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {[
          { value: "helpful", label: "Helpful", count: answer.helpfulCount ?? 0, icon: ThumbsUp },
          { value: "not_helpful", label: "Not helpful", count: answer.notHelpfulCount ?? 0, icon: ThumbsDown }
        ].map((item) => {
          const Icon = item.icon;
          const active = selected === item.value;

          return (
            <Button
              key={item.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={!canVote || Boolean(selected) || feedback.isPending}
              aria-label={`${item.label}. Current count ${item.count}`}
              onClick={() => vote(item.value)}
              className={cn("border-white/10 bg-white/5 text-textPrimary", active && "border-accentBlue bg-accentBlue/15 text-accentBlue")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{item.count}</span>
            </Button>
          );
        })}
        {selected && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-1 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Thanks for the signal.
          </motion.span>
        )}
      </div>
    </motion.article>
  );
}
