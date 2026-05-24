import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Panel({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <h2>
        {Icon ? <Icon aria-hidden="true" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}
