import type { ReactNode } from "react";

export function Badge({
  tone = "gray",
  children
}: {
  tone?: "green" | "amber" | "red" | "blue" | "gray";
  children: ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
