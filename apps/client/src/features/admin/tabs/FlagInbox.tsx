// Inline flag inbox shown above the FAQ list when the Flagged filter is active.
// Lists open/under_review flags on FAQs with their reason and reporter so moderators can
// triage without leaving FAQ Management.
import { useMemo } from 'react';
import { Flag, Check, X } from 'lucide-react';
import type { FlagReason } from '@samagama/shared';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useFlagList, useUpdateFlagStatus } from '../../flag/queries';

const REASON_COPY: Record<FlagReason, string> = {
  incorrect: 'Incorrect',
  outdated: 'Outdated',
  duplicate: 'Duplicate',
  unclear: 'Unclear',
  other: 'Other',
};

export function FlagInbox() {
  const { data: open } = useFlagList({ entityType: 'faq', status: 'open' });
  const { data: underReview } = useFlagList({ entityType: 'faq', status: 'under_review' });
  const update = useUpdateFlagStatus();

  const live = useMemo(() => [...(open ?? []), ...(underReview ?? [])], [open, underReview]);

  if (live.length === 0) return null;

  return (
    <Card style={{ marginBottom: 12, borderColor: 'var(--color-warning)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-warning)',
          textTransform: 'uppercase',
          letterSpacing: '.5px',
          marginBottom: 10,
        }}
      >
        <Flag size={13} /> {live.length} open flag{live.length === 1 ? '' : 's'} on FAQs
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {live.map((f) => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: 10,
              borderRadius: 8,
              background: 'var(--color-input)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {f.entityTitle ?? '(deleted FAQ)'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  marginTop: 2,
                }}
              >
                {REASON_COPY[f.reason]} · by {f.reportedBy.name} · {timeAgo(f.createdAt)}
              </div>
              {f.details && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text)',
                    marginTop: 6,
                    fontStyle: 'italic',
                  }}
                >
                  “{f.details}”
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button
                size="sm"
                variant="success"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({
                    id: f.id,
                    input: { status: 'resolved', resolutionNote: 'Marked resolved by moderator.' },
                  })
                }
              >
                <Check size={12} /> Resolve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({
                    id: f.id,
                    input: { status: 'dismissed', resolutionNote: 'Dismissed by moderator.' },
                  })
                }
              >
                <X size={12} /> Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
