import { cn } from "@/lib/utils.js";

export const Skeleton = ({ className, ...props }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-xl bg-white/[0.04] before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-[linear-gradient(90deg,transparent,rgba(79,142,247,0.12),transparent)]",
      className
    )}
    {...props}
  />
);
