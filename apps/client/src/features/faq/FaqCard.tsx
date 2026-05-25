// FaqCard — single source of truth for how an FAQ row renders.
//
// Behavior summary (Change Spec §7):
//  - Default state: question-only row + status/category badges.
//  - Click the chevron to expand the answer.
//  - Once expanded, students see Helpful/Unhelpful buttons (one vote per user).
//  - Moderators/admins see raw helpful + unhelpful counts.
//  - Vote counts are NEVER shown to students (Change Spec §7.3).
import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { PublicFaq, UserRole } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { FlagFaqButton } from '../flag/FlagFaqDialog';
import { useFaqFeedback, useRecordFaqView } from './queries';

const STATUS_COLOR = {
  draft: 'default',
  published: 'success',
  outdated: 'warning',
  archived: 'default',
} as const;

interface FaqCardProps {
  faq: PublicFaq;
  role: UserRole;
}

export function FaqCard({ faq, role }: FaqCardProps) {
  const [expanded, setExpanded] = useState(false);
  const recordView = useRecordFaqView();
  const feedback = useFaqFeedback(faq.id);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && role === 'student') {
      // Best-effort view tracking — failures don't block UI.
      recordView.mutate(faq.id);
    }
  };

  const showRawCounts = role === 'moderator' || role === 'admin';
  const studentMayVote = role === 'student' && !faq.hasUserFeedback;

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <button
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`faq-${faq.id}-body`}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 6,
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ flex: 1 }}>{faq.title}</span>
            {expanded ? (
              <ChevronUp size={16} color="var(--color-text-muted)" />
            ) : (
              <ChevronDown size={16} color="var(--color-text-muted)" />
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {faq.categories.slice(0, 1).map((c) => (
              <Badge key={c.id} color="accent">
                {c.name}
              </Badge>
            ))}
            {faq.tags.slice(0, 3).map((t) => (
              <Badge key={t.id}>#{t.name}</Badge>
            ))}
          </div>
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <Badge color={STATUS_COLOR[faq.status]}>{faq.status}</Badge>
          {(showRawCounts || faq.viewCount !== undefined) && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              {showRawCounts && faq.viewCount !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Eye size={11} />
                  {faq.viewCount}
                </span>
              )}
              {showRawCounts && (
                <span>
                  {faq.helpfulCount ?? 0} helpful · {faq.unhelpfulCount ?? 0} unhelpful
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Updated {timeAgo(faq.updatedAt)}
          </div>
        </div>
      </div>

      {expanded && (
        <div
          id={`faq-${faq.id}-body`}
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--color-border)',
            fontSize: 13,
            color: 'var(--color-text)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {faq.answer}

          {role === 'student' && (
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                color: 'var(--color-text-muted)',
                flexWrap: 'wrap',
              }}
            >
              {studentMayVote ? (
                <>
                  <span>Was this helpful?</span>
                  <button
                    type="button"
                    onClick={() => feedback.mutate('helpful')}
                    disabled={feedback.isPending}
                    style={feedbackButtonStyle('var(--color-success)')}
                  >
                    <ThumbsUp size={12} /> Helpful
                  </button>
                  <button
                    type="button"
                    onClick={() => feedback.mutate('unhelpful')}
                    disabled={feedback.isPending}
                    style={feedbackButtonStyle('var(--color-danger)')}
                  >
                    <ThumbsDown size={12} /> Not helpful
                  </button>
                </>
              ) : (
                <span>Thanks for your feedback.</span>
              )}
              <span style={{ flex: 1 }} />
              <FlagFaqButton faqId={faq.id} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function feedbackButtonStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    border: `1px solid ${color}`,
    background: 'transparent',
    borderRadius: 16,
    color,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
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
