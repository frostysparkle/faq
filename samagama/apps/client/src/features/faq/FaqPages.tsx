import { Bot, Clock, HelpCircle, MessageCircleQuestion, Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { FaqCard } from "../../components/ui/FaqCard";
import { Panel } from "../../components/ui/Panel";
import { StatCard } from "../../components/ui/StatCard";
import { demoStats, faqs as fallbackFaqs } from "../../data/mockData";
import {
  useCategories,
  useFaqs,
  useRecentlyUpdatedFaqs,
  useRecentlyViewedFaqs,
  useRecordFaqView,
  type FaqViewModel
} from "./faqApi";

export function FaqBrowsePage({ home = false }: { home?: boolean }) {
  const [queryInput, setQueryInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const categoriesQuery = useCategories();
  const faqsQuery = useFaqs({
    query: submittedQuery || undefined,
    categoryId: selectedCategoryId,
    status: selectedStatus
  });
  const recentlyUpdatedQuery = useRecentlyUpdatedFaqs();
  const recordView = useRecordFaqView();

  const faqResults = faqsQuery.data ?? fallbackFaqs;
  const recentlyUpdated = recentlyUpdatedQuery.data ?? fallbackFaqs;
  const categories = categoriesQuery.data ?? [];

  if (home) {
    return (
      <>
        <PageHeader
          title="Welcome back, Riya!"
          subtitle="Here is what is happening on the Samagama portal today."
        />
        <div className="statsGrid">
          <StatCard
            label="Total FAQs"
            value={demoStats.totalFaqs}
            note="12 added this week"
            icon={HelpCircle}
          />
          <StatCard
            label="Open Questions"
            value={demoStats.openQuestions}
            note="3 need input"
            icon={MessageCircleQuestion}
          />
          <StatCard
            label="Chatbot Queries"
            value={demoStats.chatbotQueries}
            note="Today"
            icon={Bot}
          />
          <StatCard
            label="Avg. Resolution"
            value={demoStats.avgResolution}
            note="Down 18% vs last week"
            icon={Clock}
          />
        </div>
        <div className="twoColumn">
          <Panel title="Recently Updated FAQs" icon={Clock}>
            <FaqRows items={recentlyUpdated} />
          </Panel>
          <Panel title="Popular FAQs This Week" icon={TrendingUp}>
            <FaqRows items={faqResults} popular />
          </Panel>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Browse FAQs"
        subtitle="Search, filter, and explore official FAQs across internship categories."
      />
      <div className="searchRow">
        <label className="searchBox">
          <Search aria-hidden="true" />
          <input
            placeholder="Search FAQs by keyword or topic"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setSubmittedQuery(queryInput);
            }}
          />
        </label>
        <button className="primaryButton" onClick={() => setSubmittedQuery(queryInput)}>
          Search
        </button>
      </div>
      <div className="filterLine" aria-label="Category filters">
        <button
          className={`chip ${selectedCategoryId === undefined ? "selected" : ""}`}
          onClick={() => setSelectedCategoryId(undefined)}
        >
          All
        </button>
        {categories.map((filter) => (
          <button
            className={`chip ${selectedCategoryId === filter.id ? "selected" : ""}`}
            key={filter.id}
            onClick={() => setSelectedCategoryId(filter.id)}
          >
            {filter.name}
          </button>
        ))}
      </div>
      <div className="filterLine compact">
        <span>Status:</span>
        <button
          className={`chip ${selectedStatus === undefined ? "selected" : ""}`}
          onClick={() => setSelectedStatus(undefined)}
        >
          Active
        </button>
        <button
          className={`chip ${selectedStatus === "published" ? "selected" : ""}`}
          onClick={() => setSelectedStatus("published")}
        >
          Published
        </button>
        <button
          className={`chip ${selectedStatus === "outdated" ? "selected" : ""}`}
          onClick={() => setSelectedStatus("outdated")}
        >
          Outdated
        </button>
        <button
          className={`chip ${selectedStatus === "archived" ? "selected" : ""}`}
          onClick={() => setSelectedStatus("archived")}
        >
          Archived
        </button>
        <span className="pushRight">Sort: Most Relevant</span>
      </div>
      {faqsQuery.isLoading ? <div className="notice info">Loading FAQs...</div> : null}
      {faqsQuery.isError ? (
        <div className="notice warn">Unable to load live FAQs. Showing local demo content.</div>
      ) : null}
      {faqResults.map((faq) => (
        <FaqCard
          key={faq.id}
          {...faq}
          onOpen={(faqId) => {
            recordView.mutate(faqId);
          }}
        />
      ))}
      {faqResults.length === 0 ? (
        <div className="emptyState">
          <strong>No FAQs matched your filters.</strong>
          <button className="primaryButton">Ask a Question</button>
        </div>
      ) : null}
    </>
  );
}

export function RecentlyViewedPage() {
  const recentlyViewedQuery = useRecentlyViewedFaqs();
  const recentlyViewed = recentlyViewedQuery.data ?? [];
  const groupedItems = useMemo(() => recentlyViewed, [recentlyViewed]);

  return (
    <>
      <PageHeader title="Recently Viewed" subtitle="FAQs opened from your account history." />
      <Panel title="Today" icon={Clock}>
        {recentlyViewedQuery.isLoading ? (
          <div className="notice info">Loading recently viewed FAQs...</div>
        ) : null}
        {groupedItems.length > 0 ? (
          <FaqRows items={groupedItems} />
        ) : (
          <div className="emptyState">
            <strong>No recently viewed FAQs yet.</strong>
            <span>Open an FAQ from Browse FAQs to build your history.</span>
          </div>
        )}
      </Panel>
    </>
  );
}

function FaqRows({ items, popular = false }: { items: FaqViewModel[]; popular?: boolean }) {
  return (
    <div className="rowList">
      {items.slice(0, 4).map((faq) => (
        <div className="rowItem" key={faq.id}>
          <span>{faq.title}</span>
          <Badge tone={faq.status === "Outdated" ? "amber" : "blue"}>{faq.category}</Badge>
          <small>{popular ? `${faq.views} views` : faq.updated}</small>
        </div>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="pageHeader">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
