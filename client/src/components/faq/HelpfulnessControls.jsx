import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { useFaqFeedback } from "@/hooks/useFaqs.js";
import { cn } from "@/lib/utils.js";

export default function HelpfulnessControls({ faqId, helpfulCount = 0, notHelpfulCount = 0 }) {
  const [selected, setSelected] = useState(null);
  const feedbackMutation = useFaqFeedback();
  const counts = {
    helpful: helpfulCount,
    notHelpful: notHelpfulCount
  };

  const vote = (value) => {
    if (selected || feedbackMutation.isPending) return;
    setSelected(value);
    feedbackMutation.mutate({ faqId, value });
  };

  return (
    <div className="premium-card p-5">
      <p className="text-sm font-semibold text-textPrimary">Was this helpful?</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {[
          { value: "helpful", label: "Helpful", count: counts.helpful, icon: ThumbsUp },
          { value: "not_helpful", label: "Not helpful", count: counts.notHelpful, icon: ThumbsDown }
        ].map((item) => {
          const Icon = item.icon;
          const active = selected === item.value;

          return (
            <motion.div
              key={item.value}
              // MICROINTERACTION: helpfulness button scales 1.3 to 1.0 with spring easing after click.
              animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 18 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(selected) || feedbackMutation.isPending}
                aria-label={`${item.label}. Current count ${item.count}`}
                onClick={() => vote(item.value)}
                className={cn(
                  "border-white/10 bg-white/5 text-textPrimary hover:bg-white/10",
                  active && "border-accentBlue bg-accentBlue/15 text-accentBlue"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{item.count}</span>
              </Button>
            </motion.div>
          );
        })}
      </div>
      {selected && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-success">Thanks for your feedback.</motion.p>}
    </div>
  );
}
