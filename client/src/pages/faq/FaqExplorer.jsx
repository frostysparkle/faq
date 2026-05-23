import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, SearchX, SlidersHorizontal, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useDebouncedCallback } from "use-debounce";
import FaqCard from "@/components/faq/FaqCard.jsx";
import SearchBar from "@/components/faq/SearchBar.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useCategories } from "@/hooks/useCategories.js";
import { useCurrentUser, useFaqSearch } from "@/hooks/useFaqs.js";
import { useTags } from "@/hooks/useTags.js";
import { rememberFaqSearch } from "@/lib/recentSearches.js";
import { cn } from "@/lib/utils.js";

const statuses = ["draft", "published", "needs_review", "archived"];

const FaqExplorerSkeleton = () => (
  <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
    <div className="hidden h-[560px] rounded-xl border border-white/5 bg-surface lg:block" />
    <div className="space-y-5">
      <div className="h-14 rounded-xl border border-white/5 bg-surface" />
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-full bg-surface" />
        <div className="h-9 w-20 rounded-full bg-surface" />
        <div className="h-9 w-28 rounded-full bg-surface" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[260px] rounded-xl border border-white/5 bg-surface" />
        ))}
      </div>
    </div>
  </div>
);

const parseTagIds = (searchParams) => searchParams.get("tagIds")?.split(",").filter(Boolean) ?? [];

function CategoryRail({ categories, counts, activeCategoryId, onSelect }) {
  return (
    <aside className="premium-card h-fit p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-textMuted">Knowledge Areas</p>
        <Filter className="h-4 w-4 text-textMuted" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onSelect("")}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
            !activeCategoryId ? "bg-accentBlue/15 text-accentBlue" : "text-textMuted hover:bg-white/5 hover:text-textPrimary"
          )}
        >
          All categories
          <span>{Object.values(counts).reduce((sum, count) => sum + count, 0)}</span>
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category._id}
            onClick={() => onSelect(category._id)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
              activeCategoryId === category._id ? "bg-accentBlue/15 text-accentBlue" : "text-textMuted hover:bg-white/5 hover:text-textPrimary"
            )}
          >
            <span className="truncate">{category.name}</span>
            <span>{counts[category._id] ?? 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function FaqExplorerContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("query") ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const tagIds = parseTagIds(searchParams);
  const categoryId = searchParams.get("categoryId") ?? "";
  const status = searchParams.get("status") ?? "";
  const { data: user } = useCurrentUser();
  const { data: categories } = useCategories(false);
  const { data: tags } = useTags(false);
  const searchState = {
    query: searchParams.get("query") ?? "",
    categoryId,
    tagIds,
    status: user.role === "student" ? "" : status,
    limit: 12
  };
  const faqQuery = useFaqSearch(searchState);
  const faqs = faqQuery.data.pages.flatMap((page) => page.faqs);
  const total = faqQuery.data.pages[0]?.total ?? 0;

  useEffect(() => {
    setSearchValue(searchParams.get("query") ?? "");
  }, [searchParams]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        next.delete(key);
      } else {
        next.set(key, Array.isArray(value) ? value.join(",") : value);
      }
    }

    setSearchParams(next);
  };

  const debouncedSearch = useDebouncedCallback((value) => updateParams({ query: value.trim() }), 300);

  const counts = useMemo(() => {
    const next = {};
    for (const faq of faqs) {
      for (const category of faq.categories ?? []) {
        next[category._id] = (next[category._id] ?? 0) + 1;
      }
    }
    return next;
  }, [faqs]);

  const toggleTag = (tagId) => {
    const next = tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : [...tagIds, tagId];
    updateParams({ tagIds: next });
  };

  const filters = (
    <>
      <CategoryRail categories={categories} counts={counts} activeCategoryId={categoryId} onSelect={(id) => updateParams({ categoryId: id })} />
      <div className="premium-card p-4 lg:hidden">
        <p className="mb-3 text-sm font-semibold text-textPrimary">Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              type="button"
              key={tag._id}
              onClick={() => toggleTag(tag._id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                tagIds.includes(tag._id) ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted"
              )}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
      <div className="hidden lg:block">{filters}</div>

      <main className="min-w-0 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accentBlue">Institutional Intelligence</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-textPrimary md:text-5xl">FAQ Explorer</h1>
        </div>

        <SearchBar
          value={searchValue}
          onChange={(value) => {
            setSearchValue(value);
            debouncedSearch(value);
          }}
          onSubmit={(value) => {
            rememberFaqSearch(value);
            updateParams({ query: value.trim() });
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="border-white/10 bg-white/5 lg:hidden" onClick={() => setMobileFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </Button>
          {tags.slice(0, 8).map((tag) => (
            <button
              key={tag._id}
              type="button"
              onClick={() => toggleTag(tag._id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                tagIds.includes(tag._id) ? "border-accentBlue bg-accentBlue/15 text-accentBlue" : "border-white/10 text-textMuted hover:text-textPrimary"
              )}
            >
              {tag.name}
            </button>
          ))}
          {user.role !== "student" && (
            <select
              aria-label="Filter by FAQ status"
              value={status}
              onChange={(event) => updateParams({ status: event.target.value })}
              className="h-9 rounded-full border border-white/10 bg-surface px-3 text-sm text-textPrimary outline-none"
            >
              <option value="">All statuses</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item.replace("_", " ")}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-textMuted">
          <span>{total} results</span>
          <span>{faqQuery.data.pages[0]?.searchMode ?? "filter"} mode</span>
        </div>

        {faqs.length === 0 ? (
          <div className="premium-card grid min-h-[360px] place-items-center p-8 text-center">
            <div>
              <SearchX className="mx-auto h-12 w-12 text-accentBlue" aria-hidden="true" />
              <h2 className="mt-5 font-display text-3xl text-textPrimary">No FAQs found in this category.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-textMuted">
                Try a broader search or ask the community. Nothing found. Start a new question instead.
              </p>
              <Button asChild className="mt-6">
                <Link to="/community/ask">Ask the Community</Link>
              </Button>
            </div>
          </div>
        ) : (
          <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {faqs.map((faq) => (
                <FaqCard key={faq._id} faq={faq} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {faqQuery.hasNextPage && (
          <div className="flex justify-center pt-3">
            <Button type="button" variant="outline" className="border-white/10 bg-white/5" onClick={() => faqQuery.fetchNextPage()} disabled={faqQuery.isFetchingNextPage}>
              {faqQuery.isFetchingNextPage ? "Loading" : "Load more"}
            </Button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-auto rounded-t-2xl bg-deep p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl text-textPrimary">Filters</h2>
                <Button variant="ghost" size="icon" aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {filters}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqExplorer() {
  return (
    <Suspense fallback={<FaqExplorerSkeleton />}>
      <FaqExplorerContent />
    </Suspense>
  );
}
