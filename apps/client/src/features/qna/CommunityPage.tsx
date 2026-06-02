import { useEffect, useRef, useState, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Flame,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import { QUESTION_STATUSES } from '@samagama/shared';
import type { QuestionStatus } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { useCommunityIdleBuckets } from '../stats/queries';
import type { IdleBucket, IdleBuckets } from '../stats/api';
import { useQuestions } from './queries';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusOption = 'All' | QuestionStatus;

const STATUS_OPTIONS: StatusOption[] = [
  'All',
  ...QUESTION_STATUSES.filter((s) => s !== 'duplicate' && s !== 'archived'),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readIdleParam(raw: string | null): IdleBucket | null {
  if (raw === 'last24h' || raw === 'over3days' || raw === 'over1week') return raw;
  return null;
}

function statusColor(status: QuestionStatus): 'accent' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'open':     return 'accent';
    case 'answered': return 'warning';
    case 'resolved': return 'success';
    default:         return 'default';
  }
}

/** Human-readable summary shown inside the trigger button. */
function triggerLabel(status: StatusOption, idle: IdleBucket | null): string {
  const sLabel = status !== 'All'
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : null;
  const iLabel =
    idle === 'last24h'   ? 'Active in 24h'   :
    idle === 'over3days' ? 'Idle > 3 days'   :
    idle === 'over1week' ? 'Idle > 1 week'   :
    null;

  if (sLabel && iLabel) return `${sLabel} · ${iLabel}`;
  if (sLabel) return sLabel;
  if (iLabel) return iLabel;
  return 'All';
}

// ─── CommunityPage ────────────────────────────────────────────────────────────

export function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusOption>('All');
  const [idleFilter,   setIdleFilter]   = useState<IdleBucket | null>(
    readIdleParam(searchParams.get('idle')),
  );

  useEffect(() => {
    setIdleFilter(readIdleParam(searchParams.get('idle')));
  }, [searchParams]);

  const updateIdleFilter = (next: IdleBucket | null) => {
    setIdleFilter(next);
    if (next) {
      setSearchParams({ idle: next });
    } else {
      const p = new URLSearchParams(searchParams);
      p.delete('idle');
      setSearchParams(p);
    }
  };

  const { data: idle } = useCommunityIdleBuckets();

  // Both filters are sent to the API simultaneously — the backend supports
  // the intersection (status AND time-window) natively via MongoDB AND-ing.
  const { data, isLoading } = useQuestions({
    type:   'community',
    status: statusFilter === 'All' ? undefined : statusFilter,
    idle:   idleFilter ?? undefined,
  });
  const navigate = useNavigate();

  const hasActiveFilter = statusFilter !== 'All' || idleFilter !== null;
  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (idleFilter !== null ? 1 : 0);

  const clearAll = () => { setStatusFilter('All'); updateIdleFilter(null); };

  return (
    <div>
      {/* ── Heading row ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={18} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Community Q&A</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Student questions · Peer answers · Moderator approved</div>
          </div>
        </div>

        <FilterDropdown
          statusFilter={statusFilter}
          idleFilter={idleFilter}
          idle={idle ?? null}
          activeFilterCount={activeFilterCount}
          onStatusChange={setStatusFilter}
          onIdleChange={updateIdleFilter}
          onClearAll={clearAll}
        />
      </div>

      {/* ── Active filter summary ────────────────────────────────────── */}
      {hasActiveFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Filtering by:</span>

          {statusFilter !== 'All' && (
            <FilterChip
              label={statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              onRemove={() => setStatusFilter('All')}
            />
          )}

          {idleFilter && (
            <FilterChip
              label={
                idleFilter === 'last24h'   ? 'Active in 24h'   :
                idleFilter === 'over3days' ? 'Idle > 3 days'   :
                'Idle > 1 week'
              }
              onRemove={() => updateIdleFilter(null)}
            />
          )}

          {activeFilterCount > 1 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-pill)', padding: '2px 8px', borderRadius: 20 }}>
              Combined (AND)
            </span>
          )}

          <button
            onClick={clearAll}
            aria-label="Clear all filters"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
              color: 'var(--color-text-muted)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px 6px', borderRadius: 20, fontFamily: 'inherit',
            }}
          >
            <X size={12} /> Clear all
          </button>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="mod-card mod-card-green" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!isLoading && data && data.length === 0 && (
        <div className="mod-card mod-card-green" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <MessageSquare size={26} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            No questions match {activeFilterCount > 1 ? 'this combination of filters' : 'that filter'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {activeFilterCount > 1
              ? `No ${statusFilter !== 'All' ? statusFilter : ''} questions found in the selected activity window.`
              : 'Try a different status or activity window.'}
          </div>
          <button
            onClick={clearAll}
            style={{ marginTop: 14, fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Question list ────────────────────────────────────────────── */}
      {!isLoading && data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((q) => {
            const cardColor =
              q.status === 'resolved' ? 'mod-card-green' :
              q.status === 'answered' ? 'mod-card-blue' :
              'mod-card-green';
            return (
              <button
                key={q.id}
                onClick={() => navigate(`/community/${q.id}`)}
                style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
              >
                <div className={`mod-card ${cardColor}`} style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45, marginBottom: q.description ? 6 : 10, color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {q.title}
                      </div>
                      {q.description && (
                        <div style={{ fontSize: 12, lineHeight: 1.55, marginBottom: 10, color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {q.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {q.category && <Badge color="accent">{q.category.name}</Badge>}
                        {q.tags.map((t) => <Badge key={t.id}>#{t.name}</Badge>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <Badge color={statusColor(q.status)}>{q.status}</Badge>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MessageSquare size={10} /> {q.answerCount}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>by {q.author.name}</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

interface FilterDropdownProps {
  statusFilter: StatusOption;
  idleFilter: IdleBucket | null;
  idle: IdleBuckets | null;
  activeFilterCount: number;
  onStatusChange: (s: StatusOption) => void;
  onIdleChange: (b: IdleBucket | null) => void;
  onClearAll: () => void;
}

function FilterDropdown({
  statusFilter, idleFilter, idle, activeFilterCount,
  onStatusChange, onIdleChange, onClearAll,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLButtonElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);
  const panelId      = useId();

  const hasActiveFilter = activeFilterCount > 0;
  const label = triggerLabel(statusFilter, idleFilter);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  // Arrow-key navigation inside panel
  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const opts = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    if (!opts.length) return;
    const cur = opts.indexOf(document.activeElement as HTMLElement);
    let next = cur;
    if (e.key === 'ArrowDown') next = Math.min(cur + 1, opts.length - 1);
    if (e.key === 'ArrowUp')   next = Math.max(cur - 1, 0);
    if (e.key === 'Home')      next = 0;
    if (e.key === 'End')       next = opts.length - 1;
    opts[next]?.focus();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Label above trigger */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
        Filter Questions
      </div>

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={`${panelId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Filter Questions: ${label}${activeFilterCount > 1 ? ` (${activeFilterCount} active)` : ''}`}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); }
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); }
        }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 600, padding: '9px 14px',
          borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', minWidth: 160,
          border: `1.5px solid ${open || hasActiveFilter ? 'var(--color-primary)' : 'var(--color-border)'}`,
          background: open || hasActiveFilter ? 'var(--color-primary-bg)' : 'var(--color-card)',
          color: open || hasActiveFilter ? 'var(--color-primary)' : 'var(--color-text)',
          transition: 'all 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
          position: 'relative',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {/* Active filter badge */}
        {activeFilterCount > 1 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%', fontSize: 10, fontWeight: 800,
            background: 'var(--color-primary)', color: '#fff', flexShrink: 0,
          }}>
            {activeFilterCount}
          </span>
        )}
        <ChevronDown
          size={15}
          style={{ flexShrink: 0, transition: 'transform 0.18s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Filter options"
          onKeyDown={handlePanelKeyDown}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 1200,
            minWidth: 230, background: 'var(--color-card)',
            border: '1px solid var(--color-border)', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '10px 0', animation: 'ym-slide-up 0.16s ease-out',
          }}
        >
          {/* STATUS section */}
          <SectionHeader id={`${panelId}-status-label`}>Status</SectionHeader>

          <OptionRow
            selected={statusFilter === 'All'}
            icon={<CheckCircle2 size={15} />}
            iconColor="var(--color-primary)"
            label="All"
            aria-labelledby={`${panelId}-status-label`}
            onClick={() => onStatusChange('All')}
          />
          {(STATUS_OPTIONS.filter(s => s !== 'All') as QuestionStatus[]).map((s) => (
            <OptionRow
              key={s}
              selected={statusFilter === s}
              icon={s === 'open' ? <Circle size={15} /> : <CheckCircle2 size={15} />}
              iconColor={
                s === 'open'     ? 'var(--color-primary)' :
                s === 'answered' ? 'var(--color-warning)'  :
                'var(--color-success)'
              }
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              onClick={() => onStatusChange(s)}
            />
          ))}

          <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} role="separator" />

          {/* ACTIVITY WINDOW section */}
          <SectionHeader id={`${panelId}-activity-label`}>Activity Window</SectionHeader>

          <OptionRow
            selected={idleFilter === null}
            icon={<Users size={15} />}
            iconColor="var(--color-primary)"
            label="All Open"
            count={idle?.totalOpen}
            aria-labelledby={`${panelId}-activity-label`}
            onClick={() => onIdleChange(null)}
          />
          <OptionRow
            selected={idleFilter === 'last24h'}
            icon={<Flame size={15} />}
            iconColor="var(--color-success)"
            label="Active in 24h"
            count={idle?.last24h}
            onClick={() => onIdleChange('last24h')}
          />
          <OptionRow
            selected={idleFilter === 'over3days'}
            icon={<Clock size={15} />}
            iconColor="var(--color-warning)"
            label="Idle > 3 days"
            count={idle?.over3days}
            onClick={() => onIdleChange('over3days')}
          />
          <OptionRow
            selected={idleFilter === 'over1week'}
            icon={<AlertTriangle size={15} />}
            iconColor="var(--color-danger)"
            label="Idle > 1 week"
            count={idle?.over1week}
            onClick={() => onIdleChange('over1week')}
          />

          {/* Clear all link */}
          {(statusFilter !== 'All' || idleFilter !== null) && (
            <>
              <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} role="separator" />
              <div style={{ padding: '4px 14px 6px' }}>
                <button
                  onClick={() => { onClearAll(); setOpen(false); }}
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <X size={12} /> Clear all filters
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FilterChip (active filter tag) ──────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 700,
      background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
      borderRadius: 20, padding: '3px 10px 3px 10px',
    }}>
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0, lineHeight: 1 }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', padding: '6px 14px 4px' }}
    >
      {children}
    </div>
  );
}

// ─── OptionRow ────────────────────────────────────────────────────────────────

interface OptionRowProps {
  selected: boolean;
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  count?: number;
  onClick: () => void;
  'aria-labelledby'?: string;
}

function OptionRow({ selected, icon, iconColor, label, count, onClick, 'aria-labelledby': labelledBy }: OptionRowProps) {
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-labelledby={labelledBy}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', cursor: 'pointer',
        background: selected ? 'var(--color-primary-bg)' : 'transparent',
        transition: 'background 0.12s', outline: 'none',
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--color-sidebar-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selected ? 'var(--color-primary-bg)' : 'transparent'; }}
      onFocus={(e)      => { (e.currentTarget as HTMLElement).style.background = 'var(--color-sidebar-hover)'; }}
      onBlur={(e)       => { (e.currentTarget as HTMLElement).style.background = selected ? 'var(--color-primary-bg)' : 'transparent'; }}
    >
      <span style={{ color: selected ? 'var(--color-primary)' : iconColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? 'var(--color-primary)' : 'var(--color-text)' }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{
          fontSize: 12, fontWeight: 700, minWidth: 22, textAlign: 'center',
          color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)',
          background: selected ? 'rgba(124,58,237,0.12)' : 'var(--color-pill)',
          borderRadius: 20, padding: '1px 7px',
        }}>
          {count}
        </span>
      )}
      {selected && count === undefined && (
        <span style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <CheckCircle2 size={13} />
        </span>
      )}
    </div>
  );
}
