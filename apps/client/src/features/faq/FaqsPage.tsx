import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, RotateCcw, Search } from 'lucide-react';
import type { FaqListQuery, FaqStatus } from '@samagama/shared';
import { FAQ_STATUSES } from '@samagama/shared';
import { useAuth } from '../auth/AuthProvider';
import { FaqCard } from './FaqCard';
import { useCategories, useFaqList, useTags } from './queries';

const DEBOUNCE_MS = 300;

export function FaqsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ.trim());
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [status, setStatus] = useState<FaqStatus | undefined>();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchInput.trim()), DEBOUNCE_MS);
    return () => clearTimeout(h);
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
  const { data, isLoading, isError, error } = useFaqList(query, { refetchInterval: 30_000 });

  const isMod = user?.role === 'moderator' || user?.role === 'admin';
  const activeCount = [categoryId, tagId, status].filter(Boolean).length;

  const resetAll = () => {
    setCategoryId(undefined);
    setTagId(undefined);
    setStatus(undefined);
    setSearchInput('');
    setDebouncedSearch('');
  };

  const activeCatName = categories?.find((c) => c._id === categoryId)?.name;
  const activeTagName = tags?.find((t) => t._id === tagId)?.name;

  if (!user) return null;

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--color-card)',
            boxShadow: '0 2px 8px rgba(59,130,246,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BookOpen size={18} color="var(--color-primary)" />
        </div>
        <span
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
          }}
        >
          Browse FAQs
          {!isLoading && data && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                marginLeft: 8,
              }}
            >
              {data.meta.total} article{data.meta.total === 1 ? '' : 's'}
              {debouncedSearch && ` for "${debouncedSearch}"`}
            </span>
          )}
        </span>
      </div>

      {/* ── Search + Filter row (single line) ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        {/* Search — grows to fill available space */}
        <div className="topbar-search" style={{ flex: '1 1 200px', minWidth: 0 }}>
          <Search
            size={15}
            color={searchInput ? 'var(--color-primary)' : 'var(--color-text-muted)'}
            style={{ flexShrink: 0 }}
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search FAQs by title or keyword…"
            aria-label="Search FAQs"
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              color: 'var(--color-text)',
              fontSize: 14,
              flex: 1,
              fontFamily: 'inherit',
              minWidth: 0,
            }}
          />
        </div>

        {/* Category */}
        {categories && categories.length > 0 && (
          <FaqFilterSelect
            value={categoryId}
            onChange={setCategoryId}
            placeholder="All Categories"
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            width={150}
          />
        )}

        {/* Tag */}
        {tags && tags.length > 0 && (
          <FaqFilterSelect
            value={tagId}
            onChange={setTagId}
            placeholder="All Tags"
            options={tags.map((t) => ({ value: t._id, label: `#${t.name}` }))}
            width={130}
          />
        )}

        {/* Status — mods/admins only */}
        {isMod && (
          <FaqFilterSelect
            value={status}
            onChange={(v) => setStatus(v as FaqStatus | undefined)}
            placeholder="All Statuses"
            options={FAQ_STATUSES.map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            }))}
            width={130}
          />
        )}

        {/* Reset — only when something is active */}
        {(activeCount > 0 || debouncedSearch) && (
          <button
            onClick={resetAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-card)',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'var(--color-primary)';
              el.style.color = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = 'var(--color-border)';
              el.style.color = 'var(--color-text-muted)';
            }}
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* ── Active filter chips ──────────────────────────────────────── */}
      {(activeCount > 0 || debouncedSearch) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Active:</span>
          {debouncedSearch && <ActiveChip label={`"${debouncedSearch}"`} />}
          {categoryId && activeCatName && <ActiveChip label={activeCatName} />}
          {tagId && activeTagName && <ActiveChip label={`#${activeTagName}`} />}
          {status && <ActiveChip label={status.charAt(0).toUpperCase() + status.slice(1)} />}
          <button
            onClick={resetAll}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              fontFamily: 'inherit',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div
          className="mod-card mod-card-blue"
          style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}
        >
          Loading FAQs…
        </div>
      )}

      {isError && (
        <div className="mod-card mod-card-red" style={{ padding: 20 }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 700, marginBottom: 4 }}>
            Couldn't load FAQs.
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="mod-card mod-card-blue" style={{ padding: 40, textAlign: 'center' }}>
          <BookOpen size={36} color="var(--color-border)" style={{ marginBottom: 12 }} />
          {debouncedSearch ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                No FAQs found for &ldquo;{debouncedSearch}&rdquo;
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Try a different keyword or clear the search.
              </div>
            </>
          ) : activeCount > 0 ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                No FAQs match the selected filters
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Try adjusting or clearing your filters.
              </div>
            </>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 700 }}>No FAQs found</div>
          )}
        </div>
      )}

      {data && data.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.items.map((faq) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              role={user.role}
              expanded={openId === faq.id}
              onToggle={() => toggleFaq(faq.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FaqFilterSelect ──────────────────────────────────────────────────────────
// Custom dropdown capped at ~5 visible rows (≈ 190 px) with internal scrolling.
// Replaces the native <select> so the OS can no longer render an uncapped list.

const ITEM_H = 36; // px per option row
const VISIBLE = 5; // rows visible before scroll kicks in
const MAX_H = ITEM_H * VISIBLE + 8; // +8 for top/bottom panel padding

function FaqFilterSelect({
  value,
  onChange,
  placeholder,
  options,
  width,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = Boolean(value);
  const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  const select = (v: string) => {
    onChange(v || undefined);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0, minWidth: width ?? 130 }}>
      {/* ── Trigger button ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: 36,
          padding: '0 10px',
          borderRadius: 8,
          border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
          background: isActive ? 'var(--color-purple-bg)' : 'var(--color-input)',
          color: isActive ? 'var(--color-purple)' : 'var(--color-text)',
          fontSize: 13,
          fontWeight: isActive ? 600 : 400,
          cursor: 'pointer',
          fontFamily: 'inherit',
          gap: 6,
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          if (!isActive)
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
        }}
        onMouseLeave={(e) => {
          if (!isActive)
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentLabel}</span>
        <ChevronDown
          size={13}
          style={{
            flexShrink: 0,
            transition: 'transform 0.18s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
          color="var(--color-text-muted)"
        />
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────── */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '100%',
            zIndex: 1200,
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            // Cap height at VISIBLE rows — the rest scrolls
            maxHeight: MAX_H,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {/* "All" / reset option */}
          <DropdownOption label={placeholder} selected={!value} onSelect={() => select('')} />
          {options.map((o) => (
            <DropdownOption
              key={o.value}
              label={o.label}
              selected={value === o.value}
              onSelect={() => select(o.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        height: ITEM_H,
        cursor: 'pointer',
        background: selected ? 'var(--color-purple-bg)' : 'transparent',
        color: selected ? 'var(--color-purple)' : 'var(--color-text)',
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        outline: 'none',
        transition: 'background 0.1s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--color-input)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = selected
          ? 'var(--color-purple-bg)'
          : 'transparent';
      }}
    >
      <span>{label}</span>
      {selected && <Check size={13} color="var(--color-purple)" strokeWidth={2.5} />}
    </div>
  );
}

// ─── ActiveChip ───────────────────────────────────────────────────────────────

function ActiveChip({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        background: 'var(--color-purple-bg)',
        color: 'var(--color-purple)',
        borderRadius: 20,
        padding: '3px 10px',
      }}
    >
      {label}
    </span>
  );
}
