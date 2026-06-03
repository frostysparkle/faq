import { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock, Eye, Folder, Loader, ThumbsDown, ThumbsUp } from 'lucide-react';
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

function Pipe() {
  return <span style={{ margin: '0 8px', color: 'var(--color-border)', userSelect: 'none' }}>|</span>;
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

  // pendingRating: the vote currently in-flight (cleared after server responds).
  const [pendingRating, setPendingRating] = useState<'helpful' | 'unhelpful' | null>(null);
  // confirmedRating: the last successfully cast vote (used for thanks-badge color).
  const [confirmedRating, setConfirmedRating] = useState<'helpful' | 'unhelpful' | null>(null);
  const [showThanks, setShowThanks] = useState(false);
  const thanksTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordView = useRecordFaqView();
  const feedback = useFaqFeedback(faq.id);

  const toggle = () => {
    const isOpening = !expanded;
    if (onToggle) { onToggle(); } else { setExpandedInternal(isOpening); }
    if (isOpening && role === 'student') recordView.mutate(faq.id);
  };

  const handleVote = (rating: 'helpful' | 'unhelpful') => {
    if (feedback.isPending) return;
    setPendingRating(rating);
    setShowThanks(false);
    if (thanksTimer.current) clearTimeout(thanksTimer.current);
    feedback.mutate(rating, {
      onSuccess: () => {
        setConfirmedRating(rating);
        setShowThanks(true);
        thanksTimer.current = setTimeout(() => setShowThanks(false), 2000);
      },
      onSettled: () => setPendingRating(null),
    });
  };

  const showRawCounts = role === 'moderator' || role === 'admin';
  // faq.userVote comes from the server (or optimistic cache); null means "no vote yet".
  const currentVote = faq.userVote ?? null;

  const helpfulCount = faq.helpfulCount ?? 0;
  const unhelpfulCount = faq.unhelpfulCount ?? 0;
  const cardColor = CARD_COLOR[faq.status] ?? 'mod-card-blue';
  const dotColor = STATUS_DOT[faq.status] ?? '#6b7280';
  const firstCategory = faq.categories[0];

  return (
    <div className={`mod-card ${cardColor}`}>

      {/* ── Always-visible header ─────────────────────────────────────── */}
      <div style={{ padding: '14px 18px 12px' }}>

        {/* Row 1: Title + Chevron button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
          <button
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={`faq-${faq.id}-body`}
            style={{
              flex: 1, background: 'transparent', border: 'none', padding: 0,
              textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.45 }}>
              {faq.title}
            </span>
          </button>

          <button
            onClick={toggle}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            style={{
              flexShrink: 0, background: 'transparent',
              border: 'none', borderRadius: 8,
              padding: '4px 6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.13s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-input)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {expanded
              ? <ChevronUp size={15} color="var(--color-text-muted)" />
              : <ChevronDown size={15} color="var(--color-text-muted)" />}
          </button>
        </div>

        {/* Row 2: Compact metadata */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          fontSize: 12, color: 'var(--color-text-muted)', rowGap: 4,
        }}>
          {/* Category */}
          {firstCategory && (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontWeight: 600 }}>
                <Folder size={12} />{firstCategory.name}
              </span>
              <Pipe />
            </>
          )}

          {/* Status */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            <span style={{ color: dotColor, fontWeight: 600, textTransform: 'capitalize' as const }}>{faq.status}</span>
          </span>
          <Pipe />

          {/* Time */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />{timeAgo(faq.updatedAt)}
          </span>
          <Pipe />

          {/* Helpful count */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <ThumbsUp size={12} />{helpfulCount}
          </span>
          <span style={{ margin: '0 6px', opacity: 0.35 }}>·</span>

          {/* Unhelpful count */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <ThumbsDown size={12} />{unhelpfulCount}
          </span>

          {/* View count — mods/admins only */}
          {showRawCounts && faq.viewCount !== undefined && (
            <>
              <Pipe />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Eye size={12} />{faq.viewCount} views
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Expanded section ─────────────────────────────────────────── */}
      {expanded && (
        <div id={`faq-${faq.id}-body`}>
          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 18px' }} />

          {/* Answer */}
          <div style={{
            padding: '14px 18px 12px',
            fontSize: 14, color: 'var(--color-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
          }}>
            {faq.answer}
          </div>

          {/* Action bar */}
          {role === 'student' && (
            <>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 18px' }} />
              <div style={{ padding: '10px 18px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {showThanks ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: confirmedRating === 'unhelpful' ? '#dc2626' : '#16a34a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} color="white" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>Thanks for your feedback!</span>
                  </div>
                ) : (
                  <>
                    <FeedbackButton
                      label="Helpful" count={helpfulCount}
                      icon={<ThumbsUp size={13} />} color="#16a34a"
                      state={
                        feedback.isPending
                          ? (pendingRating === 'helpful' ? 'loading' : 'dimmed')
                          : currentVote === 'helpful' ? 'selected' : 'default'
                      }
                      onClick={() => handleVote('helpful')}
                    />
                    <FeedbackButton
                      label="Not Helpful" count={unhelpfulCount}
                      icon={<ThumbsDown size={13} />} color="#dc2626"
                      state={
                        feedback.isPending
                          ? (pendingRating === 'unhelpful' ? 'loading' : 'dimmed')
                          : currentVote === 'unhelpful' ? 'selected' : 'default'
                      }
                      onClick={() => handleVote('unhelpful')}
                    />
                  </>
                )}
                <FlagFaqButton faqId={faq.id} faqUpdatedAt={faq.updatedAt} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FeedbackButton ───────────────────────────────────────────────────────────

type FeedbackState = 'default' | 'loading' | 'selected' | 'dimmed';

function FeedbackButton({ label, count, icon, color, state, onClick }: {
  label: string; count: number; icon: React.ReactNode; color: string;
  state: FeedbackState; onClick: () => void;
}) {
  const filled = state === 'loading' || state === 'selected';
  const disabled = state === 'loading' || state === 'dimmed';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 14px', borderRadius: 20,
        border: `1.5px solid ${filled ? color : state === 'dimmed' ? 'var(--color-border)' : color}`,
        background: filled ? color : 'transparent',
        color: filled ? 'white' : state === 'dimmed' ? 'var(--color-text-muted)' : color,
        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        opacity: state === 'dimmed' ? 0.45 : 1,
        transition: 'all 0.18s ease',
        outline: 'none', userSelect: 'none',
      }}
    >
      {state === 'loading' ? <Loader size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
        : state === 'selected' ? <Check size={12} strokeWidth={3} />
          : icon}
      {label} ({count})
    </button>
  );
}
