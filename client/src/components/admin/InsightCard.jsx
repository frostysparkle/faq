import { motion } from "framer-motion";
import { AlertTriangle, Archive, CheckCircle2, FilePlus2, ShieldAlert, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils.js";

const severityStyles = {
  high: "border-l-danger bg-danger/5",
  medium: "border-l-warning bg-warning/5",
  low: "border-l-success bg-success/5"
};

const severityDot = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-success"
};

const iconMap = {
  FAQ_GAP: FilePlus2,
  STALE_FAQ: Archive,
  FAQ_REVIEW: AlertTriangle,
  MODERATION_LOAD: UsersRound,
  UNRESOLVED_QUESTIONS: ShieldAlert,
  default: CheckCircle2
};

export default function InsightCard({ severity = "low", title, message, category, type, action, delay = 0 }) {
  const Icon = iconMap[type] ?? iconMap.default;

  // Anti-pattern guard: severity is semantic state, not a random decorative gradient.
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      className={cn("rounded-xl border border-white/5 border-l-4 p-4 shadow-xl", severityStyles[severity])}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5">
          <Icon className="h-4 w-4 text-textPrimary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", severityDot[severity])} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textMuted">{category ?? title ?? "Action Required"}</p>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-textPrimary">{message}</p>
        </div>
      </div>
      {action?.href && (
        <Button asChild size="sm" className="mt-4 w-full justify-center">
          <Link to={action.href}>{action.label}</Link>
        </Button>
      )}
    </motion.article>
  );
}
