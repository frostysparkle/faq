import React from "react";
import { cn } from "@/lib/utils.js";

export const Card = React.forwardRef(({ className, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-white/5 bg-surface text-textPrimary shadow-xl",
      interactive && "transition-all duration-150 hover:-translate-y-px hover:border-accent/20 hover:shadow-glow",
      className
    )}
    {...props}
  />
));

Card.displayName = "Card";

export const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("font-display text-xl leading-tight text-textPrimary", className)} {...props} />
);

export const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm leading-6 text-textMuted", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => <div className={cn("p-5 pt-0", className)} {...props} />;
