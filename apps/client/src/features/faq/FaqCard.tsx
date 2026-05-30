import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Eye, Loader, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { PublicFaq, UserRole } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { FlagFaqButton } from '../flag/FlagFaqDialog';
import { useFaqFeedback, useRecordFaqView } from './queries';

const STATUS_COLOR = {
  draft: 'default', published: 'success', outdated: 'warning', archived: 'default',
} as const;

interface FaqCardProps { faq: PublicFaq; role: UserRole; }

export function FaqCard({ faq, role }: FaqCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRating, setSelectedRating] = useState<'helpful' | 'unhelpful' | null>(null);
  const recordView = useRecordFaqView();
  const feedback = useFaqFeedback(faq.id);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && role === 'student') recordView.mutate(faq.id);
  };

  const handleVote = (rating: 'helpful' | 'unhelpful') => {
    if (feedback.isPending) return;
    setSelectedRating(rating);
    feedback.mutate(rating);
  };

  const showRawCounts = role === 'moderator' || role === 'admin';
  const studentMayVote = role === 'student' && !faq.hasUserFeedback;
  const voteConfirmed = feedback.isSuccess || !studentMayVote;

  const cardColor = faq.status === 'published' ? 'mod-card-blue'
    : faq.status === 'outdated' ? 'mod-card-orange'
    : faq.status === 'archived' ? 'mod-card-red'
    : 'mod-card-blue';

  return (
    <div className={`mod-card ${cardColor} interactive`}>
      {/* Collapsed header */}
      <div style={{ padding: '14px 18px', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <button
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`faq-${faq.id}-body`}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flex: 1 }}>{faq.title}</span>
            {expanded ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {faq.categories.slice(0, 1).map((c) => <Badge key={c.id} color="accent">{c.name}</Badge>)}
            {faq.tags.slice(0, 3).map((t) => <Badge key={t.id}>#{t.name}</Badge>)}
          </div>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <Badge color={STATUS_COLOR[faq.status]}>{faq.status}</Badge>
          {showRawCounts && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
              {faq.viewCount !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={11} />{faq.viewCount}</span>
              )}
              <span>{faq.helpfulCount ?? 0} helpful · {faq.unhelpfulCount ?? 0} unhelpful</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Updated {timeAgo(faq.updatedAt)}</div>
        </div>
      </div>

      {/* Expanded answer */}
      {expanded && (
        <div
          id={`faq-${faq.id}-body`}
          style={{ padding: '0 18px 18px', borderTop: '1px solid var(--color-border)', paddingTop: 14, fontSize: 14, color: 'var(--color-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}
        >
          {faq.answer}

          {role === 'student' && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
              {voteConfirmed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: selectedRating === 'unhelpful' ? 'var(--color-danger)' : 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={12} color="white" strokeWidth={3} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Thanks for your feedback!</span>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: 500 }}>Was this helpful?</span>
                  <FeedbackButton label="Helpful" icon={<ThumbsUp size={13} />} color="#16a34a" state={selectedRating === 'helpful' ? (feedback.isPending ? 'loading' : 'selected') : selectedRating !== null || feedback.isPending ? 'dimmed' : 'default'} onClick={() => handleVote('helpful')} />
                  <FeedbackButton label="Not helpful" icon={<ThumbsDown size={13} />} color="#dc2626" state={selectedRating === 'unhelpful' ? (feedback.isPending ? 'loading' : 'selected') : selectedRating !== null || feedback.isPending ? 'dimmed' : 'default'} onClick={() => handleVote('unhelpful')} />
                </>
              )}
              <span style={{ flex: 1 }} />
              <FlagFaqButton faqId={faq.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type FeedbackState = 'default' | 'loading' | 'selected' | 'dimmed';

function FeedbackButton({ label, icon, color, state, onClick }: {
  label: string; icon: React.ReactNode; color: string; state: FeedbackState; onClick: () => void;
}) {
  const filled = state === 'loading' || state === 'selected';
  const disabled = state === 'loading' || state === 'dimmed';
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px',
      border: `1.5px solid ${filled ? color : state === 'dimmed' ? 'var(--color-border)' : color}`,
      borderRadius: 20, background: filled ? color : 'transparent',
      color: filled ? 'white' : state === 'dimmed' ? 'var(--color-text-muted)' : color,
      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
      cursor: disabled ? 'default' : 'pointer',
      opacity: state === 'dimmed' ? 0.45 : 1, transition: 'all 0.18s ease',
      outline: 'none', userSelect: 'none',
    }}>
      {state === 'loading' ? <Loader size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
        : state === 'selected' ? <Check size={12} strokeWidth={3} />
        : icon}
      {label}
    </button>
  );
}

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const sec = Math.floor(diffMs / 1000);
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
