// Browse FAQs — student-default page.
// - Default sort: recent + viewCount (server-enforced)
// - Search debounced 300ms to avoid spamming the server
// - Collapsible Filters panel with Categories, Tags, Show all, Reset all
// - Role-aware feedback baked into each FaqCard
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  BookOpen,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag,
  LayoutGrid,
} from 'lucide-react';
import type { FaqListQuery, FaqStatus } from '@samagama/shared';
import { FAQ_STATUSES } from '@samagama/shared';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthProvider';
import { FaqCard } from './FaqCard';
import { useCategories, useFaqList, useTags } from './queries';

const DEBOUNCE_MS = 300;
const CAT_SHOW_DEFAULT = 8;
const TAG_SHOW_DEFAULT = 8;

// ── Category icon map (best-effort) ──────────────────────────────────────────
// Falls back to a generic folder icon for unmapped names.
const CATEGORY_ICONS: Record<string, string> = {
  'All Categories': '⊞',
};

export function FaqsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [status, setStatus] = useState<FaqStatus | undefined>();

  // Filters panel
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const query = useMemo<Partial<FaqListQuery>>(() => {
    const q: Partial<FaqListQuery> = {
      sort: debouncedSearch ? 'relevance' : 'recent',
    };
    if (debouncedSearch) q.q = debouncedSearch;
    if (categoryId) q.category = categoryId;
    if (tagId) q.tag = tagId;
    if (status) q.status = status;
    return q;
  }, [debouncedSearch, categoryId, tagId, status]);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data, isLoading, isError, error } = useFaqList(query);

  // Active filter count (excluding search — that's visible in the bar)
  const activeCount = [categoryId, tagId, status].filter(Boolean).length;

  const resetAll = () => {
    setCategoryId(undefined);
    setTagId(undefined);
    setStatus(undefined);
  };

  const visibleCats = showAllCats ? (categories ?? []) : (categories ?? []).slice(0, CAT_SHOW_DEFAULT);
  const visibleTags = showAllTags ? (tags ?? []) : (tags ?? []).slice(0, TAG_SHOW_DEFAULT);

  if (!user) return null;

  return (
    <div>
      <SectionHeader
        title="Browse FAQs"
        sub={data?.meta.total !== undefined ? `${data.meta.total} knowledge articles` : undefined}
      />

      {/* ── Search + Filters toggle row ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {/* Search bar */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#fff',
          border: '1.5px solid #e5e7eb',
          borderRadius: 12,
          padding: '10px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search FAQs by title or keyword..."
            aria-label="Search FAQs"
            style={{
              border: 'none', background: 'none', outline: 'none',
              color: 'var(--color-text)', fontSize: 14, flex: 1,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Filters toggle button */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
            border: '1.5px solid #e5e7eb',
            background: filtersOpen ? '#f0f0ff' : '#fff',
            color: filtersOpen ? '#6366f1' : '#374151',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Filters panel ──────────────────────────────────────────────── */}
      {filtersOpen && (
        <div style={{
          background: '#fff',
          border: '1.5px solid #e5e7eb',
          borderRadius: 16,
          marginBottom: 16,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,.05)',
        }}>
          {/* Status row (mod/admin only) */}
          {(user.role === 'moderator' || user.role === 'admin') && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <select
                value={status ?? ''}
                onChange={(e) => setStatus((e.target.value as FaqStatus) || undefined)}
                aria-label="Filter by status"
                style={{
                  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
                  padding: '7px 12px', color: 'var(--color-text)', fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                }}
              >
                <option value="">All statuses</option>
                {FAQ_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: '#6b7280', textTransform: 'uppercase' }}>
                  Categories
                </span>
                {categories.length > CAT_SHOW_DEFAULT && (
                  <button
                    onClick={() => setShowAllCats((v) => !v)}
                    style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
                  >
                    {showAllCats ? 'Show less' : 'Show all'} <ChevronDown size={13} style={{ rotate: showAllCats ? '180deg' : '0deg' }} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {/* All Categories pill */}
                <CategoryPill
                  active={!categoryId}
                  onClick={() => setCategoryId(undefined)}
                  icon={<LayoutGrid size={13} />}
                  label="All Categories"
                />
                {visibleCats.map((c) => (
                  <CategoryPill
                    key={c._id}
                    active={categoryId === c._id}
                    onClick={() => setCategoryId(c._id)}
                    label={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: '#6b7280', textTransform: 'uppercase' }}>
                  Tags
                </span>
                {tags.length > TAG_SHOW_DEFAULT && (
                  <button
                    onClick={() => setShowAllTags((v) => !v)}
                    style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
                  >
                    {showAllTags ? 'Show less' : 'Show all'} <ChevronDown size={13} style={{ rotate: showAllTags ? '180deg' : '0deg' }} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {/* All Tags pill */}
                <TagPill
                  active={!tagId}
                  onClick={() => setTagId(undefined)}
                  label="All Tags"
                  isAll
                />
                {visibleTags.map((t) => (
                  <TagPill
                    key={t._id}
                    active={tagId === t._id}
                    onClick={() => setTagId(t._id)}
                    label={t.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer: Reset + active count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
            <button
              onClick={resetAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 500, color: '#6b7280',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <RotateCcw size={13} /> Reset all
            </button>

            {activeCount > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 20, padding: '5px 14px',
                fontSize: 13, fontWeight: 600, color: '#15803d',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                {activeCount} active filter{activeCount === 1 ? '' : 's'}
                <ChevronUp size={13} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {isLoading && <Card>Loading FAQs…</Card>}

      {isError && (
        <Card style={{ borderColor: 'var(--color-danger)' }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Couldn't load FAQs.</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {data && data.items.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <BookOpen size={36} color="var(--color-border)" style={{ marginBottom: 12 }} aria-hidden="true" />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No FAQs found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Try a different search term or category filter.
          </div>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.items.map((faq) => (
            <FaqCard key={faq.id} faq={faq} role={user.role} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category pill ──────────────────────────────────────────────────────────────
function CategoryPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        border: `1.5px solid ${active ? '#6366f1' : '#e5e7eb'}`,
        background: active ? '#6366f1' : '#f9fafb',
        color: active ? '#fff' : '#374151',
        transition: 'all .12s',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#f0f0ff'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; } }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Tag pill ───────────────────────────────────────────────────────────────────
function TagPill({
  active,
  onClick,
  label,
  isAll,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  isAll?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        border: `1.5px solid ${active ? '#6366f1' : '#e5e7eb'}`,
        background: active ? '#6366f1' : '#f9fafb',
        color: active ? '#fff' : '#374151',
        transition: 'all .12s',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#f0f0ff'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; } }}
    >
      {isAll ? <Tag size={12} /> : <span style={{ fontWeight: 600, opacity: 0.6 }}>#</span>}
      {label}
    </button>
  );
}
