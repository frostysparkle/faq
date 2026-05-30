import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Plus,
  Pencil,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Folder,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Columns3,
  Check,
  Search,
  X,
} from 'lucide-react';
import type { PublicFaq, FaqCreateInput, FaqStatus } from '@samagama/shared';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { useArchiveFaq, useCategories, useFaqList, useTags } from '../../faq/queries';
import { InlineFaqEditor } from './InlineFaqEditor';
import { FlagInbox } from './FlagInbox';

type Filter = 'all' | 'helpful' | 'flagged';
type ColKey = 'details' | 'engagement' | 'flag' | 'actions';
const PAGE_SIZES = [5, 10, 20, 50];

const COL_LABELS: Record<ColKey, string> = {
  details:    'Details',
  engagement: 'Engagement',
  flag:       'Flag',
  actions:    'Actions',
};
const DEFAULT_VISIBLE: Record<ColKey, boolean> = {
  details: true, engagement: true, flag: true, actions: true,
};

function buildGrid(vis: Record<ColKey, boolean>): string {
  const cols = ['52px', 'minmax(0,1fr)'];
  if (vis.details)    cols.push('minmax(0,1.4fr)');
  if (vis.engagement) cols.push('160px');
  if (vis.flag)       cols.push('140px');
  if (vis.actions)    cols.push('130px');
  return cols.join(' ');
}

// ─── Colours (hardcoded so they work in both themes) ──────────────────────
const C = {
  badge:     { bg: '#ede9fe', fg: '#7c3aed' },
  catText:   '#4f46e5',
  dotPublished: '#16a34a',
  dotOutdated:  '#d97706',
  dotDraft:     '#9ca3af',
  dotArchived:  '#9ca3af',
  pillPublished: { bg: '#dcfce7', fg: '#15803d' },
  pillOutdated:  { bg: '#fef9c3', fg: '#92400e' },
  pillDraft:     { bg: '#f3f4f6', fg: '#6b7280' },
  pillArchived:  { bg: '#f3f4f6', fg: '#6b7280' },
  thumbUp:   '#16a34a',
  thumbDown: '#dc2626',
  flagBadge: { bg: '#fee2e2', fg: '#dc2626' },
  flagNone:  '#9ca3af',
  divider:   '#e5e7eb',
  header:    '#f9fafb',
  rowHover:  '#fafafa',
  border:    '#f0f0f0',
  muted:     '#9ca3af',
  mutedLabel:'#6b7280',
  text:      '#111827',
  actionEye:  { bg: '#f3f4f6', fg: '#374151', border: '#e5e7eb' },
  actionEdit: { bg: '#eff6ff', fg: '#2563eb', border: '#bfdbfe' },
  actionDel:  { bg: '#fff1f2', fg: '#dc2626', border: '#fecaca' },
};

export function FaqsAdminTab({ flaggedCount }: { flaggedCount: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_VISIBLE);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleCol = (col: ColKey) =>
    setVisibleCols((v) => ({ ...v, [col]: !v[col] }));

  const grid = buildGrid(visibleCols);

  // Close column menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(value.trim());
      setPage(1);
    }, 350);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const queryParams = useMemo(() => {
    const q: { filter?: 'helpful' | 'flagged'; page: number; pageSize: number; q?: string; sort?: 'relevance' | 'recent' | 'added' | 'popular' | 'helpful' } = { page, pageSize };
    if (filter === 'helpful') q.filter = 'helpful';
    if (filter === 'flagged') q.filter = 'flagged';
    if (searchQuery) { q.q = searchQuery; q.sort = 'relevance'; }
    return q;
  }, [filter, page, pageSize, searchQuery]);

  // Poll every 30 s so engagement counts stay in sync with student votes
  // submitted in other sessions without requiring a manual reload.
  const { data, isLoading } = useFaqList(queryParams, { refetchInterval: 30_000 });
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const total = (data?.meta as { total?: number } | undefined)?.total ?? data?.items.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem   = Math.min(page * pageSize, total);

  const switchFilter = (f: Filter) => { setFilter(f); setPage(1); };

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'helpful', 'flagged'] as Filter[]).map((f) => (
            <FilterChip key={f} active={filter === f} onClick={() => switchFilter(f)}>
              {f === 'all' ? 'All' : f === 'helpful' ? 'Helpful FAQs' : (
                <>
                  Flagged FAQs
                  {flaggedCount > 0 && (
                    <span style={{ background: C.thumbDown, color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 700, marginLeft: 5 }}>
                      {flaggedCount}
                    </span>
                  )}
                </>
              )}
            </FilterChip>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
          <Search
            size={15}
            color={searchInput ? '#6366f1' : C.muted}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search FAQs by keyword…"
            style={{
              width: '100%',
              padding: '8px 36px 8px 36px',
              fontSize: 13,
              border: `1px solid ${searchInput ? '#6366f1' : '#e5e7eb'}`,
              borderRadius: 8,
              outline: 'none',
              background: '#fff',
              color: C.text,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              transition: 'border-color .15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.target.style.borderColor = searchInput ? '#6366f1' : '#e5e7eb')}
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                display: 'flex', alignItems: 'center', color: C.muted,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Column visibility picker */}
          <div ref={colMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setColMenuOpen((v) => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${colMenuOpen ? '#6366f1' : '#e5e7eb'}`,
                background: colMenuOpen ? '#f0f0ff' : '#fff',
                color: colMenuOpen ? '#6366f1' : '#374151',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Columns3 size={14} /> Columns
              {Object.values(visibleCols).some((v) => !v) && (
                <span style={{
                  background: '#6366f1', color: '#fff',
                  borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700,
                }}>
                  {Object.values(visibleCols).filter((v) => !v).length}
                </span>
              )}
            </button>

            {colMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.10)',
                minWidth: 180, padding: '6px 0',
              }}>
                {/* header */}
                <div style={{
                  padding: '8px 14px 6px',
                  fontSize: 10, fontWeight: 700, letterSpacing: '.5px',
                  color: '#9ca3af', textTransform: 'uppercase',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  Toggle columns
                </div>
                {/* Question — always locked */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px', opacity: 0.45,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Question</span>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, background: '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </div>
                </div>
                <div style={{ borderBottom: '1px solid #f3f4f6' }} />
                {/* Toggleable columns */}
                {(Object.keys(COL_LABELS) as ColKey[]).map((col) => (
                  <button
                    key={col}
                    onClick={() => toggleCol(col)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: visibleCols[col] ? '#111827' : '#9ca3af' }}>
                      {COL_LABELS[col]}
                    </span>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: visibleCols[col] ? '#6366f1' : '#f3f4f6',
                      border: visibleCols[col] ? 'none' : '1px solid #e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {visibleCols[col] && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                  </button>
                ))}
                {/* Reset link */}
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '6px 14px' }}>
                  <button
                    onClick={() => setVisibleCols(DEFAULT_VISIBLE)}
                    style={{
                      fontSize: 12, color: '#6366f1', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: 0,
                    }}
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            )}
          </div>

          <Button onClick={() => setCreating((v) => !v)}>
            <Plus size={14} /> {creating ? 'Cancel' : 'New FAQ'}
          </Button>
        </div>
      </div>

      {creating && categories && tags && (
        <div style={{ marginBottom: 14 }}>
          <InlineFaqEditor categories={categories} tags={tags} onClose={() => setCreating(false)} />
        </div>
      )}
      {filter === 'flagged' && <FlagInbox />}

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: grid,
          alignItems: 'center',
          padding: '14px 20px',
          background: C.header,
          borderBottom: `1px solid ${C.divider}`,
          gap: 0,
        }}>
          <ColHead>#</ColHead>
          <ColHead>Question</ColHead>
          {visibleCols.details && (
            <ColHead>
              <span>Details</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 8 }}>
                Category · Status · Updated
              </span>
            </ColHead>
          )}
          {visibleCols.engagement && (
            <ColHead>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                Engagement <Info size={13} color={C.muted} />
              </span>
            </ColHead>
          )}
          {visibleCols.flag && (
            <ColHead>
              <Flag size={14} color={C.muted} />
            </ColHead>
          )}
          {visibleCols.actions && <ColHead>Actions</ColHead>}
        </div>

        {/* Body */}
        {isLoading && (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: C.muted }}>Loading…</div>
        )}
        {!isLoading && data?.items.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: C.muted }}>
            {searchQuery
              ? <>No FAQs matched <strong>"{searchQuery}"</strong>. Try different keywords.</>
              : 'No FAQs match this filter.'}
          </div>
        )}

        {data?.items.map((faq, i) => {
          const isLast = i === (data?.items.length ?? 0) - 1;
          const rowNum = String((page - 1) * pageSize + i + 1).padStart(2, '0');
          return (
            <FaqRow
              key={faq.id}
              faq={faq}
              rowNum={rowNum}
              isLast={isLast}
              expanded={expandedId === faq.id}
              onToggleExpand={() => setExpandedId((id) => (id === faq.id ? null : faq.id))}
              editing={editingId === faq.id}
              onEdit={() => setEditingId(faq.id)}
              onCancelEdit={() => setEditingId(null)}
              categories={categories ?? []}
              tags={tags ?? []}
              visibleCols={visibleCols}
              grid={grid}
            />
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
        {/* Count */}
        <span style={{ fontSize: 13, color: C.mutedLabel }}>
          {total === 0
            ? 'No FAQs found'
            : `Showing ${startItem} to ${endItem} of ${total} FAQ${total === 1 ? '' : 's'}`}
          {searchQuery && total > 0 && (
            <span style={{
              marginLeft: 8, fontSize: 12, fontWeight: 600,
              background: '#ede9fe', color: '#6366f1',
              borderRadius: 6, padding: '2px 8px',
            }}>
              "{searchQuery}"
            </span>
          )}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Page-size picker */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{
                fontSize: 13, padding: '7px 32px 7px 12px', borderRadius: 8,
                border: '1px solid #e5e7eb', background: '#fff',
                color: C.text, fontFamily: 'inherit', cursor: 'pointer',
                appearance: 'none', outline: 'none',
              }}
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} per page</option>)}
            </select>
            <ChevronRight size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', rotate: '90deg', color: C.muted }} />
          </div>

          {/* Page buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14} />
            </PgBtn>
            {buildPages(page, totalPages).map((p, idx) =>
              p === '…'
                ? <span key={`e${idx}`} style={{ padding: '0 4px', color: C.muted, fontSize: 13 }}>…</span>
                : <PgBtn key={p} active={page === p} onClick={() => setPage(p as number)}>{p}</PgBtn>
            )}
            <PgBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight size={14} />
            </PgBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function FaqRow({
  faq, rowNum, isLast, expanded, onToggleExpand,
  editing, onEdit, onCancelEdit, categories, tags,
  visibleCols, grid,
}: {
  faq: PublicFaq; rowNum: string; isLast: boolean;
  expanded: boolean; onToggleExpand: () => void;
  editing: boolean; onEdit: () => void; onCancelEdit: () => void;
  categories: { _id: string; name: string }[];
  tags: { _id: string; name: string }[];
  visibleCols: Record<ColKey, boolean>;
  grid: string;
}) {
  const archive   = useArchiveFaq();
  const flagCount = faq.flagCount ?? 0;
  const { dotColor, pill } = statusTokens(faq.status);

  if (editing) {
    return (
      <div style={{ padding: 20, borderBottom: isLast ? 'none' : `1px solid ${C.border}` }}>
        <InlineFaqEditor
          categories={categories} tags={tags}
          existing={{
            id: faq.id, title: faq.title, answer: faq.answer,
            summary: faq.summary, status: faq.status,
            categories: faq.categories.map((c) => c.id),
            tags: faq.tags.map((t) => t.id),
            helpfulCount: faq.helpfulCount,
            unhelpfulCount: faq.unhelpfulCount,
            flagCount: faq.flagCount,
          }}
          onClose={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: grid,
          alignItems: 'center',
          padding: '20px 20px',
          borderBottom: isLast && !expanded ? 'none' : `1px solid ${C.border}`,
          gap: 0,
          transition: 'background .12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = C.rowHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* # Badge */}
        <div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 10,
            background: C.badge.bg, color: C.badge.fg,
            fontSize: 13, fontWeight: 700,
          }}>
            {rowNum}
          </span>
        </div>

        {/* Question */}
        <div style={{ paddingRight: 16, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.45 }}>
            {faq.title}
          </p>
        </div>

        {/* Details — stacked: Category on top, Status + Updated below */}
        {visibleCols.details && (
          <div style={{ paddingRight: 20, minWidth: 0 }}>
            {/* Row 1: Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, minWidth: 0 }}>
              <Folder size={13} color={C.muted} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 500, flexShrink: 0 }}>Category</span>
              <span style={{
                fontSize: 13, fontWeight: 600, color: C.catText,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginLeft: 4,
              }}>
                {faq.categories[0]?.name ?? '—'}
              </span>
            </div>
            {/* Row 2: Status + Updated */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                background: pill.bg, color: pill.fg, whiteSpace: 'nowrap',
              }}>
                {faq.status.charAt(0).toUpperCase() + faq.status.slice(1)}
              </span>
              <span style={{ width: 1, height: 14, background: C.divider, flexShrink: 0 }} />
              <CalendarDays size={13} color={C.muted} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: C.mutedLabel, whiteSpace: 'nowrap' }}>
                {timeAgo(faq.updatedAt)}
              </span>
            </div>
          </div>
        )}

        {/* Engagement */}
        {visibleCols.engagement && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThumbsUp size={20} color={C.thumbUp} strokeWidth={1.8} />
              <span style={{ fontSize: 15, fontWeight: 700, color: C.thumbUp }}>{faq.helpfulCount ?? 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThumbsDown size={20} color={C.thumbDown} strokeWidth={1.8} />
              <span style={{ fontSize: 15, fontWeight: 700, color: C.thumbDown }}>{faq.unhelpfulCount ?? 0}</span>
            </div>
          </div>
        )}

        {/* Flag */}
        {visibleCols.flag && (
          <div>
            {flagCount > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <Flag size={13} color={C.flagBadge.fg} strokeWidth={2} />
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: C.flagBadge.bg, color: C.flagBadge.fg,
                  }}>
                    Flagged
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                  by {flagCount} student{flagCount === 1 ? '' : 's'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flag size={14} color={C.flagNone} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: C.flagNone }}>—</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {visibleCols.actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ABtn
              label={expanded ? 'Hide answer' : 'View answer'}
              onClick={onToggleExpand}
              bg={C.actionEye.bg} fg={C.actionEye.fg} border={C.actionEye.border}
            >
              <Eye size={15} strokeWidth={1.8} />
            </ABtn>
            <ABtn label="Edit" onClick={onEdit} bg={C.actionEdit.bg} fg={C.actionEdit.fg} border={C.actionEdit.border}>
              <Pencil size={15} strokeWidth={1.8} />
            </ABtn>
            <ABtn
              label="Archive"
              onClick={() => archive.mutate(faq.id)}
              disabled={archive.isPending || faq.status === 'archived'}
              bg={C.actionDel.bg} fg={C.actionDel.fg} border={C.actionDel.border}
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </ABtn>
          </div>
        )}
      </div>

      {/* Expanded answer */}
      {expanded && (
        <div style={{
          padding: '16px 20px 16px 80px',
          background: '#f9fafb',
          borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
          fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap',
        }}>
          {faq.answer}
        </div>
      )}
    </>
  );
}

// ─── Tiny shared components ───────────────────────────────────────────────────

function ColHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  );
}

function ABtn({ children, label, onClick, bg, fg, border, disabled }: {
  children: React.ReactNode; label: string; onClick: () => void;
  bg: string; fg: string; border: string; disabled?: boolean;
}) {
  return (
    <button
      aria-label={label} onClick={onClick} disabled={disabled}
      style={{
        width: 36, height: 36, borderRadius: 9, border: `1px solid ${border}`,
        background: bg, color: fg, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 500, padding: '7px 16px', borderRadius: 20,
        border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
        background: active ? '#6366f1' : '#fff',
        color: active ? '#fff' : '#6b7280',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function PgBtn({ children, onClick, active, disabled }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        minWidth: 36, height: 36, padding: '0 8px', borderRadius: 8,
        border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
        background: active ? '#6366f1' : '#fff',
        color: active ? '#fff' : disabled ? '#d1d5db' : '#374151',
        fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusTokens(status: FaqStatus) {
  const map: Record<FaqStatus, { dotColor: string; pill: { bg: string; fg: string } }> = {
    published: { dotColor: C.dotPublished, pill: C.pillPublished },
    outdated:  { dotColor: C.dotOutdated,  pill: C.pillOutdated  },
    draft:     { dotColor: C.dotDraft,     pill: C.pillDraft     },
    archived:  { dotColor: C.dotArchived,  pill: C.pillArchived  },
  };
  return map[status] ?? map.draft;
}

function buildPages(cur: number, total: number): (number | '…')[] {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const arr: (number | '…')[] = [1];
  if (cur > 3) arr.push('…');
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) arr.push(p);
  if (cur < total - 2) arr.push('…');
  arr.push(total);
  return arr;
}

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

const labelStyle: React.CSSProperties = {
  margin: 0, fontSize: 10, color: C.muted, marginBottom: 3, letterSpacing: '.2px',
};
const valueStyle: React.CSSProperties = {
  margin: 0, fontSize: 13, fontWeight: 600, color: C.text,
};
const vDivider: React.CSSProperties = {
  width: 1, alignSelf: 'stretch', background: C.divider, margin: '0 0',
};

export type { FaqCreateInput };
