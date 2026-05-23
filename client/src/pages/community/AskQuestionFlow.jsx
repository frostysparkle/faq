import { Suspense, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Link } from "react-router-dom";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Button } from "@/components/ui/button.jsx";
import { useCategories } from "@/hooks/useCategories.js";
import { useCheckExistingAnswers, useCreateQuestion, useQuestionLazy } from "@/hooks/useCommunity.js";
import { useFaqLazy } from "@/hooks/useFaqs.js";
import { useTags } from "@/hooks/useTags.js";
import { cn } from "@/lib/utils.js";

const questionSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters.").max(300, "Title must stay under 300 characters."),
  description: z.string().trim().min(20, "Description must be at least 20 characters."),
  categoryId: z.string().min(1, "Choose a category."),
  tags: z.array(z.string()).default([])
});

const FlowSkeleton = () => (
  <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
    <div className="h-80 rounded-xl bg-surface" />
    <div className="h-[680px] rounded-xl bg-surface" />
  </div>
);

function StepSidebar({ step }) {
  const steps = ["Describe", "Check", "Submit"];

  return (
    <aside className="premium-card hidden h-fit p-5 lg:block">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Guided Flow</p>
      <h2 className="mt-2 font-display text-2xl text-textPrimary">Ask once. Search first.</h2>
      <div className="mt-6 space-y-4">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <motion.span
              // MICROINTERACTION: completed step indicator animates into a checked state.
              animate={step > index + 1 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className={cn("grid h-8 w-8 place-items-center rounded-full border text-sm", step >= index + 1 ? "border-accentBlue bg-accentBlue text-white" : "border-white/10 text-textMuted")}
            >
              {step > index + 1 ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </motion.span>
            <span className={step === index + 1 ? "text-textPrimary" : "text-textMuted"}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MultiTagSelect({ tags, selected, onChange }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag._id}
          type="button"
          aria-pressed={selected.includes(tag._id)}
          onClick={() => toggle(tag._id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm",
            selected.includes(tag._id) ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted hover:text-textPrimary"
          )}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}

function ExistingAnswerPanel({ selected, onClose }) {
  const faqQuery = useFaqLazy(selected?.type === "faq" ? selected._id : null, { enabled: selected?.type === "faq" });
  const questionQuery = useQuestionLazy(selected?.type === "question" ? selected._id : null, { enabled: selected?.type === "question" });
  const faq = faqQuery.data?.faq;
  const question = questionQuery.data;

  return (
    <AnimatePresence>
      {selected && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close existing answer preview" className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute bottom-0 right-0 top-0 w-full max-w-xl overflow-auto border-l border-white/10 bg-deep p-6"
          >
            <Button type="button" variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to check
            </Button>
            <div className="mt-6">
              <span className="rounded-full border border-accentBlue/20 bg-accentBlue/10 px-3 py-1 text-xs font-semibold text-accentBlue">
                {selected.type === "faq" ? "Official FAQ" : "Community Resolved"}
              </span>
              <h2 className="mt-4 font-display text-4xl leading-tight text-textPrimary">{faq?.title ?? question?.title ?? selected.title}</h2>
              <p className="mt-4 text-sm leading-7 text-textMuted">{faq?.summary ?? question?.description ?? selected.preview}</p>
              {faq?.answer && (
                <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <ReactMarkdown className="faq-prose" rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                    {faq.answer}
                  </ReactMarkdown>
                </div>
              )}
              <Button asChild className="mt-6">
                <Link to={selected.type === "faq" ? `/faqs/${selected._id}` : `/community/questions/${selected._id}`}>
                  Open full record
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AskQuestionFlowContent() {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [checkedAt, setCheckedAt] = useState(null);
  const [checkSnapshot, setCheckSnapshot] = useState(null);
  const [proceedUnlocked, setProceedUnlocked] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [submittedQuestion, setSubmittedQuestion] = useState(null);
  const { data: categories } = useCategories(false);
  const { data: tags } = useTags(false);
  const createQuestion = useCreateQuestion();
  const form = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      tags: []
    }
  });
  const values = form.watch();
  const checkPayload = useMemo(
    () => ({
      query: debouncedQuery.trim(),
      categoryId: values.categoryId || undefined,
      tags: values.tags ?? []
    }),
    [debouncedQuery, values.categoryId, values.tags]
  );
  const existingCheck = useCheckExistingAnswers(checkPayload, { enabled: step === 2 && debouncedQuery.trim().length >= 3 });
  const matches = existingCheck.data?.matches ?? [];

  useEffect(() => {
    if (step === 2 && !searchQuery) {
      setSearchQuery(values.title);
    }
  }, [searchQuery, step, values.title]);

  useEffect(() => {
    if (step !== 2 || matches.length === 0) {
      setProceedUnlocked(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setProceedUnlocked(true), 5000);
    return () => window.clearTimeout(timer);
  }, [matches.length, step]);

  const goToCheck = async () => {
    const valid = await form.trigger(["title", "description", "categoryId", "tags"]);

    if (!valid) return;
    setSearchQuery(values.title);
    setStep(2);
  };

  const proceedToReview = () => {
    const snapshot = existingCheck.data ?? {
      matches: [],
      checkedAt: new Date().toISOString(),
      searchMode: "keyword_only"
    };

    setCheckedAt(snapshot.checkedAt);
    setCheckSnapshot(snapshot);
    setStep(3);
  };

  const submit = async () => {
    const matchedFaqs = (checkSnapshot?.matches ?? []).filter((match) => match.type === "faq").map((match) => match._id);
    const matchedQuestions = (checkSnapshot?.matches ?? []).filter((match) => match.type === "question").map((match) => match._id);
    const created = await createQuestion.mutateAsync({
      ...form.getValues(),
      existingAnswerCheck: {
        checkedAt,
        matchedFaqs,
        matchedQuestions
      }
    });

    setSubmittedQuestion(created);
  };

  if (submittedQuestion) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center py-12">
        <div className="premium-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
          <h1 className="mt-5 font-display text-4xl text-textPrimary">Your question is live.</h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">The community will be notified. Track it in My Questions.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/student/questions">My Questions</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/10 bg-white/5">
              <Link to={`/community/questions/${submittedQuestion._id}`}>View Question</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
      <StepSidebar step={step} />
      <section className="premium-card p-5 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Step {step} of 3</p>
            <h1 className="mt-1 font-display text-3xl text-textPrimary md:text-4xl">
              {step === 1 && "Describe your question"}
              {step === 2 && "Let's find your answer before you wait."}
              {step === 3 && "Review and submit"}
            </h1>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-textMuted sm:block">{Math.round((step / 3) * 100)}%</div>
        </div>

        {step === 1 && (
          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="title" className="text-sm font-semibold text-textPrimary">Title</label>
                <span className="text-xs text-textMuted">{values.title.length}/300</span>
              </div>
              <input
                id="title"
                {...form.register("title")}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
                placeholder="What are you trying to resolve?"
              />
              {form.formState.errors.title && <p className="text-sm text-danger">{form.formState.errors.title.message}</p>}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="categoryId" className="text-sm font-semibold text-textPrimary">Category</label>
                <select
                  id="categoryId"
                  {...form.register("categoryId")}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
                {form.formState.errors.categoryId && <p className="text-sm text-danger">{form.formState.errors.categoryId.message}</p>}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-textPrimary">Tags</p>
                <MultiTagSelect tags={tags} selected={values.tags} onChange={(next) => form.setValue("tags", next, { shouldValidate: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-semibold text-textPrimary">Description</label>
              <textarea
                id="description"
                {...form.register("description")}
                rows={8}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
                placeholder="Add the context someone needs to answer well."
              />
              {form.formState.errors.description && <p className="text-sm text-danger">{form.formState.errors.description.message}</p>}
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={goToCheck}>
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-accentBlue/20 bg-accentBlue/10 p-4">
              <div className="flex gap-3">
                <Sparkles className="mt-1 h-5 w-5 shrink-0 text-accentBlue" aria-hidden="true" />
                <p className="text-sm leading-6 text-textPrimary">This check catches official answers and resolved community threads, including paraphrases. If something here answers it, you get help now instead of waiting.</p>
              </div>
            </div>

            <label className="premium-card flex h-14 items-center gap-3 px-4 shadow-none">
              <Search className="h-5 w-5 text-textMuted" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Existing answer search"
                className="min-w-0 flex-1 bg-transparent text-base text-textPrimary outline-none placeholder:text-textMuted"
                placeholder="Search existing answers"
              />
            </label>

            {existingCheck.isFetching && <div className="h-28 rounded-xl bg-white/5" />}

            {!existingCheck.isFetching && existingCheck.data && matches.length === 0 && (
              <div className="premium-card p-6 text-center shadow-none">
                <ShieldCheck className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
                <h2 className="mt-4 font-display text-2xl text-textPrimary">We found no existing answers.</h2>
                <p className="mt-2 text-sm text-textMuted">You're about to fill a knowledge gap.</p>
                <Button type="button" className="mt-5" onClick={proceedToReview}>Proceed to review</Button>
              </div>
            )}

            {matches.length > 0 && (
              <div className="space-y-3">
                {matches.map((match) => (
                  <motion.article key={`${match.type}:${match._id}`} layout className="premium-card p-4 shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", match.type === "faq" ? "border-accentBlue/20 bg-accentBlue/10 text-accentBlue" : "border-success/20 bg-success/10 text-success")}>
                        {match.type === "faq" ? "Official FAQ" : "Community Resolved"}
                      </span>
                      <span className="text-xs text-textMuted">{Math.round(match.finalScore * 100)}% relevance</span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl text-textPrimary">{match.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-textMuted">{match.preview}</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-accentBlue" style={{ width: `${Math.round(match.finalScore * 100)}%` }} />
                    </div>
                    <Button type="button" variant="ghost" className="mt-4 px-0 text-accentBlue hover:bg-transparent" onClick={() => setSelectedResult(match)}>
                      This might answer your question
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </motion.article>
                ))}
                {proceedUnlocked && (
                  <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={proceedToReview}>
                    None of these answer my question
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-5">
            <div className="grid gap-4">
              {[
                { label: "Title", value: values.title, step: 1 },
                { label: "Description", value: values.description, step: 1 },
                { label: "Existing answer check", value: `${checkSnapshot?.matches?.length ?? 0} matches reviewed`, step: 2 }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">{item.label}</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(item.step)}>Edit</Button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-textPrimary">{item.value}</p>
                </div>
              ))}
            </div>
            {createQuestion.isError && <p className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger">We could not submit your question. Please retry.</p>}
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button type="button" disabled={createQuestion.isPending} onClick={submit}>
                {createQuestion.isPending ? "Submitting" : "Submit Question"}
              </Button>
            </div>
          </div>
        )}
      </section>
      <ExistingAnswerPanel selected={selectedResult} onClose={() => setSelectedResult(null)} />
    </div>
  );
}

export default function AskQuestionFlow() {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <AskQuestionFlowContent />
    </Suspense>
  );
}
