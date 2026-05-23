import { Loader2 } from "lucide-react";
import { Skeleton } from "./Skeleton.jsx";
import { cn } from "@/lib/utils.js";

const layouts = {
  card: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  list: "space-y-3",
  table: "space-y-2",
  detail: "space-y-4"
};

export default function LoadingState({ variant = "skeleton", layout = "card", className }) {
  if (variant === "spinner") {
    return (
      <div className={cn("grid min-h-48 place-items-center", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }

  if (variant === "pulse") {
    return <div className={cn("h-24 rounded-xl border border-white/5 bg-accent/10 animate-pulse", className)} />;
  }

  const count = layout === "detail" ? 4 : layout === "table" ? 8 : 6;

  return (
    <div className={cn(layouts[layout], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            layout === "card" && "h-64",
            layout === "list" && "h-24",
            layout === "table" && "h-12",
            layout === "detail" && (index === 0 ? "h-16" : "h-36")
          )}
        />
      ))}
    </div>
  );
}
