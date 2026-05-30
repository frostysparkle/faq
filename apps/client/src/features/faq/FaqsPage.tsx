import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, LayoutGrid, RotateCcw, Search, SlidersHorizontal, Tag } from 'lucide-react';
import type { FaqListQuery, FaqStatus } from '@samagama/shared';
import { FAQ_STATUSES } from '@samagama/shared';
import { useAuth } from '../auth/AuthProvider';
import { FaqCard } from './FaqCard';
import { useCategories, useFaqList, useTags } from './queries';

const DEBOUNCE_MS = 300;
const CAT_SHOW_DEFAULT = 8;
const TAG_SHOW_DEFAULT = 8;

export function FaqsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [status, setStatus] = useState<FaqStatus | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const query = useMemo<Partial<FaqListQuery>>(() => {
    const q: Partial<FaqListQuery> = { sort: debouncedSearch ? 'relevance' : 'recent' };
    if (debouncedSearch) q.q = debouncedSearch;
    if (categoryId) q.category = categoryId;
    if (tagId) q.tag = tagId;
    if (status) q.status = status;
    return q;
  }, [debouncedSearch, categoryId, tagId, status]);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data, isLoading, isError, error } = useFaqList(query);

  const activeCount = [categoryId, tagId, status].filter(Boolean).length;
  const resetAll = () => { setCategoryId(undefined); setTagId(undefined); setStatus(undefined); };

  const visibleCats = showAllCats ? (categories ?? []) : (categories ?? []).slice(0, CAT_SHOW_DEFAULT);
  const visibleTags = showAllTags ? (tags ?? []) : (tags ?? []).slice(0, TAG_SHOW_DEFAULT);

  if (!user) return null;

  return (
    <div>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          Browse FAQs
          {data?.meta.total !== undefined && (
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: 8 }}>
              {data.meta.total} articles
            </span>
          )}
        </span>
      </div>

      {/* Search + Filters toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div className="topbar-search" style={{ flex: 1 }}>
          <Search size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search FAQs by title or keyword…"
            aria-label="Search FAQs"
            style={{ border: 'none', background: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 14, flex: 1, fontFamily: 'inherit' }}
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 18px', borderRadius: 14, cursor: 'pointer',
            border: '1.5px solid var(--color-border)',
            background: filtersOpen ? 'var(--color-purple-bg)' : 'var(--color-card)',
            color: filtersOpen ? 'var(--color-purple)' : 'var(--color-text-muted)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            transition: 'all 0.15s',
          }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span style={{ background: 'var(--color-purple)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{activeCount}</span>
          )}
          {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="mod-card mod-card-purple" style={{ marginBottom: 16 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SlidersHorizontal size={17} color="var(--color-purple)" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>Filters</span>
            {activeCount > 0 && (
              <button onClick={resetAll} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-purple)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <RotateCcw size={12} /> Reset all
              </button>
            )}
          </div>

          {/* Status (mod/admin only) */}
          {(user.role === 'moderator' || user.role === 'admin') && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Status</div>
              <select value={status ?? ''} onChange={(e) => setStatus((e.target.value as FaqStatus) || undefined)} aria-label="Filter by status" style={{ background: 'var(--color-input)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '8px 14px', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">All statuses</option>
                {FAQ_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Categories</span>
                {categories.length > CAT_SHOW_DEFAULT && (
                  <button onClick={() => setShowAllCats((v) => !v)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                    {showAllCats ? 'Show less' : 'Show all'} <ChevronDown size={12} style={{ rotate: showAllCats ? '180deg' : '0deg' }} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <FilterPill active={!categoryId} onClick={() => setCategoryId(undefined)} icon={<LayoutGrid size={13} />} label="All" />
                {visibleCats.map((c) => <FilterPill key={c._id} active={categoryId === c._id} onClick={() => setCategoryId(c._id)} label={c.name} />)}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div style={{ padding: '14px 20px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tags</span>
                {tags.length > TAG_SHOW_DEFAULT && (
                  <button onClick={() => setShowAllTags((v) => !v)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                    {showAllTags ? 'Show less' : 'Show all'} <ChevronDown size={12} style={{ rotate: showAllTags ? '180deg' : '0deg' }} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <TagPill active={!tagId} onClick={() => setTagId(undefined)} label="All Tags" isAll />
                {visibleTags.map((t) => <TagPill key={t._id} active={tagId === t._id} onClick={() => setTagId(t._id)} label={t.name} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading && <div className="mod-card mod-card-blue" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading FAQs…</div>}

      {isError && (
        <div className="mod-card mod-card-red" style={{ padding: 20 }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 700, marginBottom: 4 }}>Couldn't load FAQs.</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{error instanceof Error ? error.message : 'Unknown error'}</div>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="mod-card mod-card-blue" style={{ padding: 40, textAlign: 'center' }}>
          <BookOpen size={36} color="var(--color-border)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No FAQs found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Try a different search term or category filter.</div>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.items.map((faq) => <FaqCard key={faq.id} faq={faq} role={user.role} />)}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      border: `1.5px solid ${active ? 'var(--color-purple)' : 'var(--color-border)'}`,
      background: active ? 'var(--color-purple)' : 'var(--color-card)',
      color: active ? 'white' : 'var(--color-text-muted)',
      transition: 'all .12s',
    }}>{icon}{label}</button>
  );
}

function TagPill({ active, onClick, label, isAll }: { active: boolean; onClick: () => void; label: string; isAll?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      border: `1.5px solid ${active ? 'var(--color-purple)' : 'var(--color-border)'}`,
      background: active ? 'var(--color-purple)' : 'var(--color-card)',
      color: active ? 'white' : 'var(--color-text-muted)',
      transition: 'all .12s',
    }}>
      {isAll ? <Tag size={12} /> : <span style={{ fontWeight: 700, opacity: 0.7 }}>#</span>}
      {label}
    </button>
  );
}
