import { Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import { useCategories } from "@/hooks/useCategories.js";
import { useAdminFaqList } from "@/hooks/useAdminAnalytics.js";
import { useChangeFaqStatus } from "@/hooks/useFaqs.js";
import { cn } from "@/lib/utils.js";

const statuses = ["all", "draft", "published", "needs_review", "archived"];

const ManagementSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="h-[600px] rounded-xl bg-surface" />
  </div>
);

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)) : "Unknown");

function FaqManagementContent() {
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [qualityThreshold, setQualityThreshold] = useState(0);
  const [selected, setSelected] = useState([]);
  const { data } = useAdminFaqList({ status: status === "all" ? undefined : status });
  const { data: categories } = useCategories(true);
  const changeStatus = useChangeFaqStatus();

  const faqs = useMemo(
    () =>
      (data.faqs ?? [])
        .filter((faq) => !categoryId || faq.categories?.some((category) => category._id === categoryId))
        .filter((faq) => (faq.qualityScore ?? 0) >= Number(qualityThreshold)),
    [categoryId, data.faqs, qualityThreshold]
  );

  const toggle = (id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const runBulk = (nextStatus) => {
    for (const id of selected) changeStatus.mutate({ id, status: nextStatus });
    setSelected([]);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">FAQ Management</p>
          <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Knowledge Base Control</h1>
          <p className="mt-2 max-w-3xl text-sm text-textMuted">Every action preserves audit context; archive before deletion when policy evidence may be needed later.</p>
        </div>
        <Button asChild><Link to="/admin/faqs/new"><FilePlus2 className="h-4 w-4" aria-hidden="true" /> Create New FAQ</Link></Button>
      </header>

      <section className="premium-card space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((item) => (
            <button key={item} type="button" onClick={() => setStatus(item)} className={cn("rounded-full border px-3 py-1.5 text-sm capitalize", status === item ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted")}>
              {item.replace("_", " ")}
            </button>
          ))}
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-9 rounded-full border border-white/10 bg-surface px-3 text-sm text-textPrimary">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-textMuted">
            Min quality
            <input type="number" min="0" max="1" step="0.1" value={qualityThreshold} onChange={(event) => setQualityThreshold(event.target.value)} className="h-9 w-24 rounded-lg border border-white/10 bg-white/5 px-3 text-textPrimary" />
          </label>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <span className="text-sm text-textMuted">{selected.length} selected</span>
            <Button size="sm" onClick={() => runBulk("published")}>Bulk publish selected FAQs</Button>
            <Button size="sm" variant="outline" className="border-white/10 bg-white/5" onClick={() => runBulk("needs_review")}>Bulk mark for review</Button>
            <Button size="sm" variant="destructive" onClick={() => runBulk("archived")}>Bulk archive selected FAQs</Button>
          </div>
        )}
      </section>

      <section className="premium-card overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_120px_170px_110px_110px] gap-3 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
          <span />
          <span>Title</span>
          <span>Status</span>
          <span>Category</span>
          <span>Quality</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-white/5">
          {faqs.length === 0 && (
            <div className="p-4">
              <EmptyState title="No FAQs match these filters" description="Broaden the status, category, or quality filters to find matching records." variant="search" />
            </div>
          )}
          {faqs.map((faq) => (
            <div key={faq._id} className="grid grid-cols-[44px_1fr_120px_170px_110px_110px] items-center gap-3 px-4 py-3 text-sm">
              <input type="checkbox" checked={selected.includes(faq._id)} onChange={() => toggle(faq._id)} aria-label={`Select ${faq.title}`} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-textPrimary">{faq.title}</p>
                <p className="text-xs text-textMuted">Updated {formatDate(faq.updatedAt)}</p>
              </div>
              <span className="w-fit rounded-full bg-white/5 px-2 py-1 text-xs capitalize text-textMuted">{faq.status?.replace("_", " ")}</span>
              <span className="truncate text-textMuted">{faq.categories?.[0]?.name ?? "Uncategorized"}</span>
              <span className="text-textMuted">{Math.round((faq.qualityScore ?? 0) * 100)}%</span>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/5"><Link to={`/admin/faqs/${faq._id}/edit`}>Edit</Link></Button>
                <Button size="sm" variant="ghost" onClick={() => changeStatus.mutate({ id: faq._id, status: "archived" })}>Archive</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-card p-5">
        <div className="flex items-start gap-3">
          <Upload className="h-5 w-5 text-accentBlue" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl text-textPrimary">Import from CSV</h2>
            <p className="mt-1 text-sm text-textMuted">Format: title, summary, answer, category_slug, tag_slugs. Imports should enter as drafts for editorial review before publishing.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function FaqManagement() {
  return (
    <Suspense fallback={<ManagementSkeleton />}>
      <FaqManagementContent />
    </Suspense>
  );
}
