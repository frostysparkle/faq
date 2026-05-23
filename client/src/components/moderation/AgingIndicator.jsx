import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils.js";

const getAgeHours = (value) => Math.max(0, (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60));

const relativeTime = (value) => {
  const hours = getAgeHours(value);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
};

export default function AgingIndicator({ value, className }) {
  const hours = getAgeHours(value);
  const tone = hours > 72 ? "border-danger/20 bg-danger/10 text-danger" : hours >= 24 ? "border-warning/20 bg-warning/10 text-warning" : "border-success/20 bg-success/10 text-success";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold", tone, className)} title={`${Math.round(hours)} hours old`}>
      <Clock3 className="h-3 w-3" aria-hidden="true" />
      {relativeTime(value)}
    </span>
  );
}
