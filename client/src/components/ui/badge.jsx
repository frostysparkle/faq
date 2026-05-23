import { motion } from "framer-motion";
import { cn } from "@/lib/utils.js";

const variants = {
  default: "border-white/10 bg-white/5 text-textMuted",
  muted: "border-white/10 bg-white/5 text-textMuted",
  secondary: "border-white/10 bg-white/8 text-textPrimary",
  accent: "border-accent/20 bg-accent/10 text-accent",
  draft: "border-white/10 bg-white/5 text-textMuted",
  published: "border-accent/20 bg-accent/10 text-accent",
  needs_review: "border-warning/20 bg-warning/10 text-warning",
  archived: "border-white/10 bg-white/[0.03] text-textMuted",
  approved: "border-success/20 bg-success/10 text-success",
  pending: "border-warning/20 bg-warning/10 text-warning",
  rejected: "border-danger/20 bg-danger/10 text-danger",
  resolved: "border-success/20 bg-success/10 text-success",
  open: "border-accent/20 bg-accent/10 text-accent"
};

export const Badge = ({ className, variant = "default", children, ...props }) => (
  <motion.span
    key={`${variant}-${children}`}
    // MICROINTERACTION: status badges pulse once when status changes.
    initial={{ scale: 0.98 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 320, damping: 20 }}
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
      (variant === "pending" || variant === "resolved" || variant === "approved") && "animate-pulse-once",
      variants[variant] ?? variants.default,
      className
    )}
    {...props}
  >
    {children}
  </motion.span>
);
