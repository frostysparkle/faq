import { cn } from "@/lib/utils.js";

const getTone = (score = 0) => {
  if (score > 0.7) return "bg-danger";
  if (score >= 0.4) return "bg-warning";
  return "bg-success";
};

const getFactors = (score = 0) => {
  if (score > 0.7) return "High demand category · Aging · Unresolved search match";
  if (score >= 0.4) return "Moderate demand · Awaiting review";
  return "Low pressure · Fresh item";
};

export default function PriorityDot({ score = 0, className }) {
  const normalized = Number(score) || 0;

  return (
    <span
      className={cn("inline-flex h-2.5 w-2.5 rounded-full", getTone(normalized), className)}
      title={`Priority: ${normalized.toFixed(2)} - ${getFactors(normalized)}`}
      aria-label={`Priority ${normalized.toFixed(2)}`}
    />
  );
}
