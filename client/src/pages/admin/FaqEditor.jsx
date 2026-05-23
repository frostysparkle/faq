import { Suspense, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Search, ShieldAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import ReactQuill from "react-quill";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useCategories } from "@/hooks/useCategories.js";
import {
  useChangeFaqStatus,
  useCheckSimilarity,
  useCreateFaq,
  useCurrentUser,
  useFaqLazy,
  useUpdateFaq
} from "@/hooks/useFaqs.js";
import { useTags } from "@/hooks/useTags.js";
import { cn } from "@/lib/utils.js";

const faqEditorSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  summary: z.string().trim().min(5, "Summary is required").max(300, "Summary must stay under 300 characters"),
  answer: z.string().trim().min(20, "Answer must be at least 20 characters"),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  tags: z.array(z.string()).min(1, "Select at least one tag"),
  status: z.enum(["draft", "published", "needs_review", "archived"]),
  duplicateOverrideReason: z.string().trim().optional()
});

const statusHelp = {
  draft: "Draft can be published after review.",
  published: "Published can move to needs review or archived.",
  needs_review: "Needs review can be republished or archived.",
  archived: "Archived can return to draft for revision."
};

const FaqEditorSkeleton = () => (
  <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="h-[720px] rounded-xl bg-surface" />
    <div className="h-[520px] rounded-xl bg-surface" />
  </div>
);

function MultiSelect({ label, items, selected, onChange, search, onSearch, error }) {
  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-textPrimary">{label}</label>
      <div className="premium-card flex h-10 items-center gap-2 px-3 shadow-none">
        <Search className="h-4 w-4 text-textMuted" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          aria-label={`Search ${label}`}
          className="min-w-0 flex-1 bg-transparent text-sm text-textPrimary outline-none placeholder:text-textMuted"
          placeholder={`Search ${label.toLowerCase()}`}
        />
      </div>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
        {filtered.map((item) => (
          <button
            key={item._id}
            type="button"
            aria-pressed={selected.includes(item._id)}
            onClick={() => toggle(item._id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              selected.includes(item._id) ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted"
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </div>
  );
}

function SimilarityPanel({ matches, isPending, highSimilarity, overrideReasonField, register, error }) {
  return (
    <section className="premium-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Similarity Check</p>
          <h2 className="mt-1 font-display text-2xl text-textPrimary">Duplicate Risk</h2>
        </div>
        {isPending ? <span className="text-xs text-textMuted">Checking</span> : <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
      </div>

      <AnimatePresence>
        {highSimilarity && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 rounded-xl border border-warning/20 bg-warning/10 p-3 text-sm text-warning"
          >
            <div className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Similar FAQ exists. Review before publishing.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 space-y-4">
        {matches.length === 0 && <p className="text-sm text-textMuted">Blur the title field to run an institutional similarity scan.</p>}
        {matches.map((match) => (
          <div key={match.faqId} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-textPrimary">{match.title}</p>
              <span className="text-xs text-textMuted">{Math.round(match.finalSimilarity * 100)}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-warning" style={{ width: `${Math.round(match.finalSimilarity * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {highSimilarity && (
        <div className="mt-5 space-y-2">
          <label className="text-sm font-semibold text-textPrimary" htmlFor="duplicateOverrideReason">
            Why is this different?
          </label>
          <textarea
            id="duplicateOverrideReason"
            {...register(overrideReasonField)}
            className="min-h-24 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
          />
          {error && <p className="text-sm text-danger">{error.message}</p>}
        </div>
      )}
    </section>
  );
}

function FaqEditorContent() {
  const { id } = useParams();
  const isEditing = Boolean(id && id !== "new");
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = useMemo(() => {
    if (location.state?.prefill) return location.state.prefill;

    const query = new URLSearchParams(location.search).get("query");
    if (!query) return null;

    const title = query
      .replace(/\+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(" ");

    return {
      title: `${title} - Troubleshooting Guide`,
      summary: `Official guidance for ${query.replace(/\+/g, " ")}.`,
      answer: `Document the official process, eligibility rules, escalation path, and expected resolution timeline for ${query.replace(/\+/g, " ")}.`,
      categories: [],
      tags: []
    };
  }, [location.search, location.state]);
  const { data: user } = useCurrentUser();
  const { data: categories } = useCategories(true);
  const { data: tags } = useTags(true);
  const faqQuery = useFaqLazy(id, { enabled: isEditing });
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const changeStatus = useChangeFaqStatus();
  const checkSimilarity = useCheckSimilarity();
  const [categorySearch, setCategorySearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const form = useForm({
    resolver: zodResolver(faqEditorSchema),
    defaultValues: {
      title: "",
      summary: "",
      answer: "",
      categories: [],
      tags: [],
      status: "draft",
      duplicateOverrideReason: ""
    }
  });
  const summary = form.watch("summary");
  const selectedCategories = form.watch("categories");
  const selectedTags = form.watch("tags");
  const currentStatus = form.watch("status");
  const similarityMatches = checkSimilarity.data ?? [];
  const highSimilarity = similarityMatches.some((match) => match.finalSimilarity > 0.5);

  useEffect(() => {
    if (faqQuery.data?.faq) {
      const faq = faqQuery.data.faq;
      form.reset({
        title: faq.title,
        summary: faq.summary,
        answer: faq.answer,
        categories: faq.categories?.map((category) => category._id) ?? [],
        tags: faq.tags?.map((tag) => tag._id) ?? [],
        status: faq.status,
        duplicateOverrideReason: ""
      });
    }
  }, [faqQuery.data, form]);

  useEffect(() => {
    if (!isEditing && prefill) {
      form.reset({
        title: prefill.title ?? "",
        summary: prefill.summary ?? "",
        answer: prefill.answer ?? "",
        categories: prefill.categories ?? [],
        tags: prefill.tags ?? [],
        status: "draft",
        duplicateOverrideReason: ""
      });
    }
  }, [form, isEditing, prefill]);

  const runSimilarityCheck = () => {
    const values = form.getValues();

    if (values.title.trim().length >= 3) {
      checkSimilarity.mutate({
        title: values.title,
        answer: values.answer,
        categories: values.categories,
        tags: values.tags
      });
    }
  };

  const persist = async (values, publish = false) => {
    if (publish && highSimilarity && !values.duplicateOverrideReason?.trim()) {
      form.setError("duplicateOverrideReason", {
        type: "manual",
        message: "Explain why this FAQ is distinct before publishing."
      });
      return;
    }

    const payload = {
      title: values.title,
      summary: values.summary,
      answer: values.answer,
      categories: values.categories,
      tags: values.tags
    };
    const saved = isEditing ? await updateFaq.mutateAsync({ id, payload }) : await createFaq.mutateAsync(payload);

    if (publish && saved.status !== "published") {
      await changeStatus.mutateAsync({ id: saved._id, status: "published" });
    }

    navigate(`/faqs/${saved._id}`);
  };

  if (user.role !== "admin") {
    return (
      <div className="premium-card mx-auto max-w-2xl p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl text-textPrimary">Admin access required</h1>
        <p className="mt-2 text-sm text-textMuted">FAQ publishing controls are restricted to institutional administrators.</p>
      </div>
    );
  }

  if (isEditing && faqQuery.isLoading) {
    return <FaqEditorSkeleton />;
  }

  return (
    <form className="mx-auto grid max-w-7xl gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_360px]" onSubmit={form.handleSubmit((values) => persist(values, false))}>
      <section className="premium-card space-y-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">FAQ Studio</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary">{isEditing ? "Edit FAQ" : "Create FAQ"}</h1>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold text-textPrimary">Title</label>
          <Input
            id="title"
            {...form.register("title")}
            onBlur={runSimilarityCheck}
            className="border-white/10 bg-white/5 text-textPrimary"
          />
          {form.formState.errors.title && <p className="text-sm text-danger">{form.formState.errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="summary" className="text-sm font-semibold text-textPrimary">Summary</label>
            <span className={cn("text-xs", summary.length > 300 ? "text-danger" : "text-textMuted")}>{summary.length}/300</span>
          </div>
          <textarea
            id="summary"
            {...form.register("summary")}
            className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
          />
          {form.formState.errors.summary && <p className="text-sm text-danger">{form.formState.errors.summary.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-textPrimary">Answer</label>
          <Controller
            name="answer"
            control={form.control}
            render={({ field }) => (
              <ReactQuill
                theme="snow"
                value={field.value}
                onChange={field.onChange}
                className="rounded-xl border border-white/10 bg-white text-deep"
                modules={{
                  toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]]
                }}
              />
            )}
          />
          {form.formState.errors.answer && <p className="text-sm text-danger">{form.formState.errors.answer.message}</p>}
        </div>

        <MultiSelect
          label="Categories"
          items={categories}
          selected={selectedCategories}
          onChange={(value) => form.setValue("categories", value, { shouldValidate: true })}
          search={categorySearch}
          onSearch={setCategorySearch}
          error={form.formState.errors.categories}
        />

        <MultiSelect
          label="Tags"
          items={tags}
          selected={selectedTags}
          onChange={(value) => form.setValue("tags", value, { shouldValidate: true })}
          search={tagSearch}
          onSearch={setTagSearch}
          error={form.formState.errors.tags}
        />
      </section>

      <aside className="space-y-5">
        <section className="premium-card p-5">
          <label htmlFor="status" className="text-sm font-semibold text-textPrimary">Status</label>
          <select
            id="status"
            {...form.register("status")}
            className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-textPrimary outline-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="needs_review">Needs review</option>
            <option value="archived">Archived</option>
          </select>
          <p className="mt-3 text-sm leading-6 text-textMuted">{statusHelp[currentStatus]}</p>
        </section>

        <SimilarityPanel
          matches={similarityMatches}
          isPending={checkSimilarity.isPending}
          highSimilarity={highSimilarity}
          overrideReasonField="duplicateOverrideReason"
          register={form.register}
          error={form.formState.errors.duplicateOverrideReason}
        />
      </aside>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-deep/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl justify-end gap-3">
          <Button type="submit" variant="outline" className="border-white/10 bg-white/5" disabled={createFaq.isPending || updateFaq.isPending}>
            Save Draft
          </Button>
          <Button type="button" disabled={createFaq.isPending || updateFaq.isPending || changeStatus.isPending} onClick={form.handleSubmit((values) => persist(values, true))}>
            Publish
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function FaqEditor() {
  return (
    <Suspense fallback={<FaqEditorSkeleton />}>
      <FaqEditorContent />
    </Suspense>
  );
}
