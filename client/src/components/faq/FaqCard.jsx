import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.js";

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(new Date(value))
    : "Not updated";

const getHelpfulness = (helpfulCount = 0, notHelpfulCount = 0) => {
  const total = helpfulCount + notHelpfulCount;
  return total === 0 ? 0.5 : helpfulCount / total;
};

export default function FaqCard({ faq, compact = false }) {
  const navigate = useNavigate();
  const helpfulness = getHelpfulness(faq.helpfulCount, faq.notHelpfulCount);
  const primaryCategory = faq.categories?.[0];

  const openFaq = () => navigate(`/faqs/${faq._id}`);

  return (
    <motion.article
      layout
      tabIndex={0}
      role="link"
      aria-label={`Open FAQ: ${faq.title}`}
      onClick={openFaq}
      onKeyDown={(event) => {
        if (event.key === "Enter") openFaq();
      }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={cn(
        // MICROINTERACTION: FAQ card hover adds accent glow and a 1px lift.
        "premium-card group cursor-pointer outline-none transition-all hover:-translate-y-px hover:border-accent/20 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-accentBlue",
        compact ? "p-4" : "min-h-[260px] p-5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {primaryCategory && (
            <span className="mb-3 inline-flex rounded-full border border-accentBlue/20 bg-accentBlue/10 px-2.5 py-1 text-xs font-semibold text-accentBlue">
              {primaryCategory.name}
            </span>
          )}
          <h3 className={cn("font-display leading-tight text-textPrimary", compact ? "text-xl" : "text-2xl")}>
            {faq.title}
          </h3>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-textMuted transition-colors group-hover:text-accentBlue" aria-hidden="true" />
      </div>

      {!compact && <p className="mt-3 line-clamp-2 text-sm leading-6 text-textMuted">{faq.summary}</p>}

      <div className={cn("flex flex-wrap gap-2", compact ? "mt-4" : "mt-5")}>
        {faq.tags?.slice(0, compact ? 2 : 4).map((tag) => (
          <span key={tag._id ?? tag} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-textMuted">
            {tag.name ?? tag}
          </span>
        ))}
      </div>

      <div className={cn("space-y-3", compact ? "mt-4" : "mt-6")}>
        <div className="h-1.5 overflow-hidden rounded-full bg-danger/25" aria-label="Helpfulness ratio">
          <div className="h-full bg-success" style={{ width: `${Math.round(helpfulness * 100)}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-textMuted">
          <span className="truncate">{faq.resultExplanation ?? "Verified institutional answer"}</span>
          <span className="flex shrink-0 items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(faq.updatedAt)}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
