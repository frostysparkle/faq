import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils.js";

const getSteps = (question) => {
  if (question.status === "duplicate") {
    return [
      { key: "open", label: "Open", date: question.createdAt, complete: true },
      { key: "duplicate", label: "Duplicate", date: question.updatedAt, complete: true }
    ];
  }

  return [
    { key: "open", label: "Open", date: question.createdAt, complete: true },
    { key: "answered", label: "Answered", date: question.status === "answered" || question.status === "resolved" ? question.updatedAt : null, complete: ["answered", "resolved"].includes(question.status) },
    { key: "resolved", label: "Resolved", date: question.resolvedAt, complete: question.status === "resolved" }
  ];
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "Pending");

export default function StatusTimeline({ question }) {
  const steps = getSteps(question);

  return (
    <div className="premium-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Status Timeline</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="relative flex items-start gap-3"
          >
            {index < steps.length - 1 && <span className="absolute left-4 top-8 hidden h-px w-[calc(100%+1rem)] bg-white/10 sm:block" aria-hidden="true" />}
            <span
              className={cn(
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                step.complete ? "border-success bg-success text-deep" : "border-white/10 bg-white/5 text-textMuted"
              )}
            >
              {step.complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-textPrimary">{step.label}</span>
              <span className="mt-1 block text-xs text-textMuted">{formatDate(step.date)}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
