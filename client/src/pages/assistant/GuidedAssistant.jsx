import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, MessageSquarePlus, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.jsx";
import { Card } from "@/components/ui/card.jsx";
import { toast } from "@/lib/toast.js";
import { api } from "@/lib/api.js";
import { staggerContainer, staggerItem } from "@/lib/motion.js";
import { cn } from "@/lib/utils.js";

const searchAssistant = async (payload) => {
  const response = await api.post("/assistant/search", payload);
  return response.data.data;
};

export default function GuidedAssistant() {
  const [query, setQuery] = useState("");
  const [previousQuery, setPreviousQuery] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const assistantSearch = useMutation({
    mutationFn: searchAssistant,
    onSuccess: (data, variables) => {
      setPreviousQuery(result?.query ?? "");
      setResult(data);
      setQuery(variables.query);
    }
  });

  const submit = (event) => {
    event.preventDefault();
    if (query.trim().length < 3) return;
    assistantSearch.mutate({ query: query.trim() });
  };

  const markHelped = async () => {
    const top = result?.results?.[0];
    if (!top) return;
    if (top.type === "faq") await api.post(`/faqs/${top._id}/feedback`, { value: "helpful" });
    if (top.type === "answer") await api.post(`/answers/${top._id}/feedback`, { value: "helpful" });
    toast.success("Feedback recorded", { description: "We will rank this verified answer higher for similar searches." });
  };

  const askCommunity = () => {
    navigate("/community/ask", { state: { prefill: { title: query } } });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col justify-center py-10">
      <header className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-display text-5xl leading-tight text-textPrimary">Guided Assistant</h1>
        <p className="mt-3 text-sm leading-6 text-textMuted">
          Focused search across verified institutional answers. No generated responses, no hallucinations.
        </p>
      </header>

      <form onSubmit={submit} className="mt-8">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-2 shadow-xl focus-within:border-accent/40">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you need help with?"
            className="min-w-0 flex-1 bg-transparent px-3 text-lg text-textPrimary outline-none placeholder:text-textMuted"
            aria-label="Search verified answers"
          />
          <Button type="submit" size="lg" loading={assistantSearch.isPending}>
            Search
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      {previousQuery && (
        <div className="mt-4 text-center">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-textMuted">
            You also searched: {previousQuery}
          </span>
        </div>
      )}

      {result && (
        <section className="mt-8">
          <div className={cn("rounded-xl border p-4 text-sm", result.confidenceBand === "strong" ? "border-success/20 bg-success/10 text-success" : result.confidenceBand === "weak" ? "border-warning/20 bg-warning/10 text-warning" : "border-accent/20 bg-accent/10 text-accent")}>
            {result.confidenceBand === "strong"
              ? `Best match - ${result.results[0]?.title}`
              : result.confidenceBand === "weak"
                ? "We did not find a strong match. Here is what is closest:"
                : "These verified answers are most likely to help."}
          </div>

          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mt-4 space-y-3">
            {result.results.map((item) => (
              <motion.div key={`${item.type}-${item._id}`} variants={staggerItem}>
                <Card interactive className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                        {item.type === "faq" ? "Verified FAQ" : "Verified Answer"}
                      </span>
                      <h2 className="mt-3 font-display text-2xl text-textPrimary">{item.title}</h2>
                    </div>
                    <div className="min-w-28 text-right">
                      <p className="text-xs text-textMuted">Relevance</p>
                      <div className="mt-1 h-1.5 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-success" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-textMuted">{item.preview}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-textMuted">This might answer your question - {item.relevanceLabel}</span>
                    <Button asChild variant="outline" size="sm">
                      <Link to={item.href}>Open answer</Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 md:grid-cols-3">
            <Button type="button" variant="secondary" onClick={markHelped}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              This helped
            </Button>
            <Button type="button" variant="outline" onClick={askCommunity}>
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Ask the Community
            </Button>
            <Button type="button" variant="ghost" onClick={() => setContactOpen((value) => !value)}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Contact a Moderator
            </Button>
          </div>

          {contactOpen && (
            <div className="mt-3 rounded-xl border border-white/5 bg-surface p-4 text-sm leading-6 text-textMuted">
              Moderator support: moderator@samagama.edu. Include your question title, category, and any deadline pressure.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
