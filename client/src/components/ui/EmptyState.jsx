import { CheckCircle2, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./button.jsx";
import { cn } from "@/lib/utils.js";
import { scaleIn } from "@/lib/motion.js";

const variantStyles = {
  default: "text-textMuted",
  success: "text-success",
  search: "text-accent",
  error: "text-danger"
};

export default function EmptyState({ icon, title, description, action, variant = "default" }) {
  const Icon = icon || (variant === "success" ? CheckCircle2 : SearchX);

  return (
    <section className="grid min-h-72 place-items-center rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
      <div className="max-w-md">
        <motion.div
          // MICROINTERACTION: empty queue/check states scale in with spring.
          {...scaleIn}
          className={cn("mx-auto grid h-14 w-14 place-items-center rounded-xl bg-white/5", variantStyles[variant])}
        >
          {typeof Icon === "string" ? <span className="text-2xl">{Icon}</span> : <Icon className="h-7 w-7" aria-hidden="true" />}
        </motion.div>
        <h2 className="mt-4 font-display text-2xl text-textPrimary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-textMuted">{description}</p>
        {action && (
          <Button type="button" className="mt-5" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </section>
  );
}
