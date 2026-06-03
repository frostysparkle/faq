import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Flame,
  Folder,
  MessageSquare,
  RotateCcw,
  User,
  Users,
} from 'lucide-react';
import type { QuestionStatus } from '@samagama/shared';
import { useCommunityIdleBuckets } from '../stats/queries';
import type { IdleBucket, IdleBuckets } from '../stats/api';
import { useQuestions } from './queries';

// ─── Design tokens (match spec exactly) ──────────────────────────────────────

const T = {
  purple:      '#7C3AED',
  purpleLight: '#F3E8FF',
  purpleHover: '#6D28D9',
  orange:      '#D97706',
  green:       '#059669',
  red:         '#DC2626',
  gray:        '#6B7280',
  dark:        '#111827',
  border:      '#E5E7EB',
  panelBg:     'var(--color-card)',
  rowHover:    '#F9FAFB',
  countBg:     '#F3F4F6',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusOption = 'All' | QuestionStatus;

interface PendingFilters {
  status:   StatusOption;
  category: string;   // 'All' | category id
  activity: string;   // 'all' | 'last24h' | 'over3days' | 'over1week'
}

const DEFAULT_FILTERS: PendingFilters = { status: 'All', category: 'All', activity: 'all' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readIdleParam(raw: string | null): IdleBucket | null {
  if (raw === 'last24h' || raw === 'over3days' || raw === 'over1week') return raw;
  return null;
}

function activityToIdle(a: string): IdleBucket | null {
  if (a === 'last24h' || a === 'over3days' || a === 'over1week') return a;
  return null;
}

function idleToActivity(idle: IdleBucket | null): string {
  return idle ?? 'all';
}

function getStatusMeta(status: QuestionStatus): { icon: React.ReactNode; color: string; label: string } {
  switch (status) {
    case 'open':     return { icon: <Circle size={13} />,       color: T.purple, label: 'Open' };
    case 'answered': return { icon: <CheckCircle2 size={13} />, color: T.orange, label: 'Answered' };
    case 'resolved': return { icon: <CheckCircle2 size={13} />, color: T.green,  label: 'Resolved' };
    default:         return { icon: <Circle size={13} />,       color: T.gray,   label: status };
  }
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}hr${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function questionText(title: string, description?: string): string {
  if (!description || !description.trim()) return title;
  if (description.trim().toLowerCase() === title.trim().toLowerCase()) return title;
  return description;
}

// ─── CommunityPage ────────────────────────────────────────────────────────────

export function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialActivity = idleToActivity(readIdleParam(searchParams.get('idle')));

  // pending = UI selections not yet applied
  const [pending, setPending] = useState<PendingFilters>({ ...DEFAULT_FILTERS, activity: initialActivity });
  // applied = what actually drives the query
  const [applied, setApplied] = useState<PendingFilters>({ ...DEFAULT_FILTERS, activity: initialActivity });

  // Sync ?idle= URL param whenever applied.activity changes
  useEffect(() => {
    const idle = activityToIdle(applied.activity);
    if (idle) {
      setSearchParams({ idle });
    } else {
      const p = new URLSearchParams(searchParams);
      p.delete('idle');
      setSearchParams(p);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied.activity]);

  const { data: idle } = useCommunityIdleBuckets();

  // Unfiltered community questions — used ONLY to derive available categories.
  // When applied has no filters this shares the React Query cache with the main query.
  const { data: allQuestions } = useQuestions({ type: 'community' });

  // Unique categories across ALL community questions (no filter dependency)
  const activeCategories = useMemo(() => {
    if (!allQuestions) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const q of allQuestions) {
      if (q.category) map.set(q.category.id, { id: q.category.id, name: q.category.name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allQuestions]);

  // Build query params — omit undefined keys so React Query deduplicates
  // with the allQuestions query when no filters are active.
  const queryParams = useMemo(() => {
    const p: Parameters<typeof useQuestions>[0] = { type: 'community' };
    if (applied.status !== 'All') p.status = applied.status;
    const idle = activityToIdle(applied.activity);
    if (idle) p.idle = idle;
    return p;
  }, [applied.status, applied.activity]);

  const { data: rawData, isLoading } = useQuestions(queryParams);

  // Category is filtered client-side (API doesn't expose a category param)
  const data = useMemo(() => {
    if (!rawData) return [];
    if (applied.category === 'All') return rawData;
    return rawData.filter(q => q.category?.id === applied.category);
  }, [rawData, applied.category]);

  const handleApply = () => setApplied({ ...pending });
  const handleClear = () => { setPending(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); };

  const hasApplied = applied.status !== 'All' || applied.category !== 'All' || applied.activity !== 'all';
  const hasPendingChanges = JSON.stringify(pending) !== JSON.stringify(applied);

  return (
    <div>
      {/* ── Page heading ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={18} color="var(--color-success)" />
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Community Q&A</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Student questions · Peer answers · Moderator approved</div>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <FilterBar
        pending={pending}
        setPending={setPending}
        onApply={handleApply}
        onClear={handleClear}
        activeCategories={activeCategories}
        idle={idle ?? null}
        hasPendingChanges={hasPendingChanges}
      />

      {/* ── Active filter chips ──────────────────────────────────────── */}
      {hasApplied && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Active:</span>
          {applied.status !== 'All' && (
            <ActiveChip label={applied.status.charAt(0).toUpperCase() + applied.status.slice(1)} />
          )}
          {applied.category !== 'All' && (
            <ActiveChip label={activeCategories.find(c => c.id === applied.category)?.name ?? 'Category'} />
          )}
          {applied.activity !== 'all' && (
            <ActiveChip label={
              applied.activity === 'last24h' ? 'Active in 24h' :
              applied.activity === 'over3days' ? 'Idle > 3 days' :
              'Idle > 1 week'
            } />
          )}
          <button onClick={handleClear} style={{ fontSize: 12, fontWeight: 500, color: T.gray, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'inherit' }}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="mod-card mod-card-green" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!isLoading && data.length === 0 && (
        <div className="mod-card mod-card-green" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <MessageSquare size={26} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No questions match the selected filters</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Try adjusting your filters or clearing them.</div>
          <button onClick={handleClear} style={{ fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 10, border: 'none', background: T.purple, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear filters
          </button>
        </div>
      )}

      {/* ── Question list ─────────────────────────────────────────────── */}
      {!isLoading && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((q) => {
            const sm = getStatusMeta(q.status);
            return (
              <div
                key={q.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/community/${q.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/community/${q.id}`); } }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = T.purple; el.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--color-border)'; el.style.transform = 'none'; }}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.outline = `2px solid ${T.purple}`; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
                  outline: 'none',
                  userSelect: 'none',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, marginBottom: 12, color: T.dark, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {questionText(q.title, q.description)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 4 }}>
                  {q.category && (<><MetaChip icon={<Folder size={13} />} color={T.purple}>{q.category.name}</MetaChip><MetaPipe /></>)}
                  <MetaChip icon={sm.icon} color={sm.color}>{sm.label}</MetaChip>
                  <MetaPipe />
                  <MetaChip icon={<MessageSquare size={13} />} color={T.gray}>{q.answerCount} response{q.answerCount === 1 ? '' : 's'}</MetaChip>
                  <MetaPipe />
                  <MetaChip icon={<User size={13} />} color={T.gray}>by {q.author.name}</MetaChip>
                  <MetaPipe />
                  <MetaChip icon={<Clock size={13} />} color={T.gray}>{timeAgo(q.updatedAt)}</MetaChip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  pending:          PendingFilters;
  setPending:       React.Dispatch<React.SetStateAction<PendingFilters>>;
  onApply:          () => void;
  onClear:          () => void;
  activeCategories: { id: string; name: string }[];
  idle:             IdleBuckets | null;
  hasPendingChanges: boolean;
}

function FilterBar({ pending, setPending, onApply, onClear, activeCategories, idle, hasPendingChanges }: FilterBarProps) {
  const statusOptions: SelectOption[] = [
    { value: 'All',      label: 'All Status' },
    { value: 'open',     label: 'Open',     icon: <Circle size={13} />,       color: T.purple },
    { value: 'answered', label: 'Answered', icon: <CheckCircle2 size={13} />, color: T.orange },
    { value: 'resolved', label: 'Resolved', icon: <CheckCircle2 size={13} />, color: T.green  },
  ];

  const categoryOptions: SelectOption[] = [
    { value: 'All', label: 'All Categories' },
    ...activeCategories.map(c => ({ value: c.id, label: c.name })),
  ];

  const activityOptions: SelectOption[] = [
    { value: 'all',       label: 'All Activity' },
    { value: 'last24h',   label: 'Active in 24h', icon: <Flame size={13} />,         color: T.green,  count: idle?.last24h  },
    { value: 'over3days', label: 'Idle > 3 days', icon: <Clock size={13} />,         color: T.purple, count: idle?.over3days },
    { value: 'over1week', label: 'Idle > 1 week', icon: <AlertTriangle size={13} />, color: T.red,    count: idle?.over1week },
  ];

  return (
    <div style={{ width: '70%', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>

      <FilterSelect
        label="STATUS"
        value={pending.status}
        options={statusOptions}
        onChange={(v) => setPending(p => ({ ...p, status: v as StatusOption }))}
        style={{ flex: '0 0 auto', width: 130 }}
      />

      <FilterSelect
        label="CATEGORY"
        value={pending.category}
        options={categoryOptions}
        onChange={(v) => setPending(p => ({ ...p, category: v }))}
        style={{ flex: '0 0 auto', width: 150 }}
      />

      <FilterSelect
        label="ACTIVITY WINDOW"
        value={pending.activity}
        options={activityOptions}
        onChange={(v) => setPending(p => ({ ...p, activity: v }))}
        style={{ flex: '0 0 auto', width: 160 }}
      />

      {/* Apply */}
      <button
        onClick={onApply}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 34, padding: '0 16px', borderRadius: 8,
          border: `1.5px solid ${T.purple}`,
          background: T.purple, color: 'white',
          fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: hasPendingChanges ? '0 2px 8px rgba(124,58,237,0.28)' : '0 1px 2px rgba(0,0,0,0.06)',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.purpleHover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.purple; }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
      >
        Apply
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          height: 34, padding: '0 12px', borderRadius: 8,
          border: `1.5px solid ${T.border}`, background: 'var(--color-card)',
          color: T.gray, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = T.purple; el.style.color = T.purple; }}
        onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = T.border; el.style.color = T.gray; }}
      >
        <RotateCcw size={12} />
        Clear
      </button>
    </div>
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
  icon?:  React.ReactNode;
  color?: string;
  count?: number;
}

function FilterSelect({
  label, value, options, onChange, style,
}: {
  label:    string;
  value:    string;
  options:  SelectOption[];
  onChange: (v: string) => void;
  style?:   React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  const current  = options.find(o => o.value === value) ?? options[0];
  const isActive = value !== options[0]?.value;

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Label sits outside the card */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: T.gray, marginBottom: 4 }}>
        {label}
      </div>

      {/* Card trigger — value + chevron only */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', height: 34, padding: '0 10px',
          background: isActive ? T.purpleLight : 'var(--color-card)',
          border: `1.5px solid ${isActive ? T.purple : T.border}`,
          borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
          gap: 6, transition: 'all 0.15s',
          outline: 'none', textAlign: 'left',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.purple; }}
        onBlur={(e)  => { (e.currentTarget as HTMLButtonElement).style.borderColor = isActive ? T.purple : T.border; }}
        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = '#C4B5FD'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = isActive ? T.purple : T.border; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden' }}>
          {current.icon && <span style={{ color: current.color, flexShrink: 0 }}>{current.icon}</span>}
          <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? T.purple : T.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {current.label}
          </span>
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'none', color: T.gray }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            minWidth: '100%', zIndex: 1200,
            background: T.panelBg,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
            padding: '6px 0',
            animation: 'ym-slide-up 0.14s ease-out',
          }}
        >
          {options.map((opt) => {
            const sel = value === opt.value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={sel}
                tabIndex={0}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(opt.value); setOpen(false); } }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', cursor: 'pointer', outline: 'none',
                  background: sel ? T.purpleLight : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = T.rowHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = sel ? T.purpleLight : 'transparent'; }}
                onFocus={(e)      => { (e.currentTarget as HTMLElement).style.background = T.rowHover; }}
                onBlur={(e)       => { (e.currentTarget as HTMLElement).style.background = sel ? T.purpleLight : 'transparent'; }}
              >
                {/* Radio + icon + label */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  {/* Radio indicator */}
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${sel ? T.purple : '#D1D5DB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.15s',
                  }}>
                    {sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.purple }} />}
                  </span>
                  {opt.icon && <span style={{ color: opt.color, flexShrink: 0 }}>{opt.icon}</span>}
                  <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? T.purple : T.dark }}>
                    {opt.label}
                  </span>
                </span>
                {/* Count badge */}
                {opt.count !== undefined && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: T.countBg, color: T.gray, flexShrink: 0, marginLeft: 8 }}>
                    {opt.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function ActiveChip({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, background: T.purpleLight, color: T.purple, borderRadius: 20, padding: '3px 10px' }}>
      {label}
    </span>
  );
}

function MetaChip({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color, fontSize: 12, fontWeight: 500 }}>
      {icon}<span>{children}</span>
    </span>
  );
}

function MetaPipe() {
  return <span style={{ margin: '0 10px', color: T.border, userSelect: 'none' }}>|</span>;
}
