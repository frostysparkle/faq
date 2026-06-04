import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Eye, Folder, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { PublicFaq, UserRole } from '@samagama/shared';
import { FlagFaqButton } from '../flag/FlagFaqDialog';
import { useFaqFeedback, useRecordFaqView } from './queries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  published: '#16a34a',
  draft: '#6b7280',
  outdated: '#d97706',
};

const CARD_COLOR: Record<string, string> = {
  published: 'mod-card-blue',
  outdated: 'mod-card-orange',
  draft: 'mod-card-blue',
};

function timeAgo(isoDate: string): string {
  const sec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  return `${Math.floor(month / 12)}y ago`;
}

/** Compact number display: 1234 → "1.2K". */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Pipe() {
  return (
    <span style={{ margin: '0 8px', color: 'var(--color-border)', userSelect: 'none' }}>|</span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FaqCardProps {
  faq: PublicFaq;
  role: UserRole;
  expanded?: boolean;
  onToggle?: () => void;
}

// ─── FaqCard ──────────────────────────────────────────────────────────────────

export function FaqCard({ faq, role, expanded: expandedProp, onToggle }: FaqCardProps) {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;

  // Which vote button is currently in-flight.
  const [pendingRating, setPendingRating] = useState<'helpful' | 'unhelpful' | null>(null);
  // Which button should play the spring-pop animation (cleared after 350 ms).
  const [popping, setPopping] = useState<'helpful' | 'unhelpful' | null>(null);

  const recordView = useRecordFaqView();
  const feedback = useFaqFeedback(faq.id);

  const toggle = () => {
    const isOpening = !expanded;
    if (onToggle) {
      onToggle();
    } else {
      setExpandedInternal(isOpening);
    }
    if (isOpening && role === 'student') recordView.mutate(faq.id);
  };

  const handleVote = (rating: 'helpful' | 'unhelpful') => {
    if (feedback.isPending) return;
    // Trigger spring-pop on the clicked button.
    setPopping(rating);
    setTimeout(() => setPopping(null), 350);
    setPendingRating(rating);
    feedback.mutate(rating, {
      onSettled: () => setPendingRating(null),
    });
  };

  const showRawCounts = role === 'moderator' || role === 'admin';
  const currentVote = faq.userVote ?? null;
  const helpfulCount = faq.helpfulCount ?? 0;
  const unhelpfulCount = faq.unhelpfulCount ?? 0;
  const cardColor = CARD_COLOR[faq.status] ?? 'mod-card-blue';
  const dotColor = STATUS_DOT[faq.status] ?? '#6b7280';
  const firstCategory = faq.categories[0];

  return (
    <div className={`mod-card ${cardColor}`}>
      {/* ── Always-visible header — single row ───────────────────────── */}
      {/* alignItems:flex-start pins metadata + chevron to the top line when the title wraps */}
      <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Title — grows to fill space, wraps to multiple lines if needed */}
        <button
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`faq-${faq.id}-body`}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-text)',
              lineHeight: 1.45,
            }}
          >
            {faq.title}
          </span>
        </button>

        {/* Metadata — Category → Status (mods) → Timestamp → Views (mods) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {firstCategory && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  maxWidth: 120,
                  overflow: 'hidden',
                }}
              >
                <Folder size={12} style={{ flexShrink: 0 }} />
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {firstCategory.name}
                </span>
              </span>
              <Pipe />
            </>
          )}

          {/* Status — mods/admins only */}
          {role !== 'student' && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{ color: dotColor, fontWeight: 600, textTransform: 'capitalize' as const }}
                >
                  {faq.status}
                </span>
              </span>
              <Pipe />
            </>
          )}

          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
          >
            <Clock size={12} />
            {timeAgo(faq.updatedAt)}
          </span>

          {showRawCounts && faq.viewCount !== undefined && (
            <>
              <Pipe />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  whiteSpace: 'nowrap',
                }}
              >
                <Eye size={12} />
                {faq.viewCount} views
              </span>
            </>
          )}
        </div>

        {/* Expand / collapse chevron */}
        <button
          onClick={toggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            padding: '4px 6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.13s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-input)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          {expanded ? (
            <ChevronUp size={15} color="var(--color-text-muted)" />
          ) : (
            <ChevronDown size={15} color="var(--color-text-muted)" />
          )}
        </button>
      </div>

      {/* ── Expanded section ─────────────────────────────────────────── */}
      {expanded && (
        <div id={`faq-${faq.id}-body`}>
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 18px' }} />

          {/* Answer text */}
          <div
            style={{
              padding: '14px 18px 12px',
              fontSize: 14,
              color: 'var(--color-text)',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {faq.answer}
          </div>

          {/* Vote bar — interactive for students, read-only for mods/admins */}
          <div
            style={{
              padding: '10px 18px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <YtVoteBar
              helpfulCount={helpfulCount}
              unhelpfulCount={unhelpfulCount}
              currentVote={currentVote}
              pendingRating={pendingRating}
              popping={popping}
              isPending={feedback.isPending}
              onVote={role === 'student' ? handleVote : null}
            />
            {role === 'student' && <FlagFaqButton faqId={faq.id} faqUpdatedAt={faq.updatedAt} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── YtVoteBar ────────────────────────────────────────────────────────────────
// YouTube-style split-pill 👍 | 👎 bar.
// Pass onVote=null to render in read-only mode (mods/admins).

function YtVoteBar({
  helpfulCount,
  unhelpfulCount,
  currentVote,
  pendingRating,
  popping,
  isPending,
  onVote,
}: {
  helpfulCount: number;
  unhelpfulCount: number;
  currentVote: 'helpful' | 'unhelpful' | null;
  pendingRating: 'helpful' | 'unhelpful' | null;
  popping: 'helpful' | 'unhelpful' | null;
  isPending: boolean;
  onVote: ((r: 'helpful' | 'unhelpful') => void) | null;
}) {
  const likeActive = currentVote === 'helpful';
  const dislikeActive = currentVote === 'unhelpful';
  const readOnly = onVote === null;

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 16px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
    transition: 'background 0.18s ease, color 0.18s ease',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 24,
        border: '1.5px solid var(--color-border)',
        background: 'var(--color-input)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── 👍 Like ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={readOnly || isPending ? undefined : () => onVote!('helpful')}
        disabled={readOnly || isPending}
        aria-label={`Helpful — ${helpfulCount}`}
        aria-pressed={likeActive}
        style={{
          ...btnBase,
          cursor: readOnly ? 'default' : isPending ? 'default' : 'pointer',
          background: likeActive ? 'rgba(22, 163, 74, 0.13)' : 'transparent',
          color: likeActive
            ? '#16a34a'
            : isPending && pendingRating !== 'helpful'
              ? 'var(--color-text-muted)'
              : 'var(--color-text)',
          opacity: isPending && pendingRating !== 'helpful' ? 0.55 : 1,
        }}
        onMouseEnter={(e) => {
          if (!readOnly && !isPending)
            (e.currentTarget as HTMLButtonElement).style.background = likeActive
              ? 'rgba(22, 163, 74, 0.22)'
              : 'var(--color-card)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = likeActive
            ? 'rgba(22, 163, 74, 0.13)'
            : 'transparent';
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            transform: popping === 'helpful' ? 'scale(1.45)' : 'scale(1)',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            opacity: likeActive ? 1 : 0.75,
          }}
        >
          <ThumbsUp
            size={16}
            strokeWidth={likeActive ? 2.5 : 1.8}
            fill={likeActive ? '#16a34a' : 'none'}
            color={likeActive ? '#16a34a' : 'currentColor'}
          />
        </span>
        <span>{formatCount(helpfulCount)}</span>
      </button>

      {/* ── Divider ─────────────────────────────────────── */}
      <div
        style={{
          width: 1,
          height: 22,
          background: 'var(--color-border)',
          flexShrink: 0,
        }}
      />

      {/* ── 👎 Dislike ───────────────────────────────────── */}
      <button
        type="button"
        onClick={readOnly || isPending ? undefined : () => onVote!('unhelpful')}
        disabled={readOnly || isPending}
        aria-label={`Not helpful — ${unhelpfulCount}`}
        aria-pressed={dislikeActive}
        style={{
          ...btnBase,
          cursor: readOnly ? 'default' : isPending ? 'default' : 'pointer',
          background: dislikeActive ? 'rgba(220, 38, 38, 0.10)' : 'transparent',
          color: dislikeActive
            ? '#dc2626'
            : isPending && pendingRating !== 'unhelpful'
              ? 'var(--color-text-muted)'
              : 'var(--color-text)',
          opacity: isPending && pendingRating !== 'unhelpful' ? 0.55 : 1,
        }}
        onMouseEnter={(e) => {
          if (!readOnly && !isPending)
            (e.currentTarget as HTMLButtonElement).style.background = dislikeActive
              ? 'rgba(220, 38, 38, 0.18)'
              : 'var(--color-card)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = dislikeActive
            ? 'rgba(220, 38, 38, 0.10)'
            : 'transparent';
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            transform: popping === 'unhelpful' ? 'scale(1.45)' : 'scale(1)',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            opacity: dislikeActive ? 1 : 0.75,
          }}
        >
          <ThumbsDown
            size={16}
            strokeWidth={dislikeActive ? 2.5 : 1.8}
            fill={dislikeActive ? '#dc2626' : 'none'}
            color={dislikeActive ? '#dc2626' : 'currentColor'}
          />
        </span>
        <span>{formatCount(unhelpfulCount)}</span>
      </button>
    </div>
  );
}
