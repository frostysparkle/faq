// "Flag this FAQ" affordance for students. Renders a button that opens an inline form
// (no modal library — same visual idiom as the rest of the app).
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { FLAG_REASONS, type FlagReason } from '@samagama/shared';
import { Button } from '../../components/ui/Button';
import { useCreateFlag } from './queries';

const REASON_LABELS: Record<FlagReason, string> = {
  incorrect: 'Incorrect',
  outdated: 'Outdated',
  duplicate: 'Duplicate',
  unclear: 'Unclear',
  other: 'Other',
};

interface Props {
  faqId: string;
}

export function FlagFaqButton({ faqId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason>('outdated');
  const [details, setDetails] = useState('');
  const flag = useCreateFlag();

  if (flag.isSuccess && !open) {
    return (
      <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>
        ✓ Flagged for review
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 16,
          background: 'transparent',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Flag size={11} /> Flag this FAQ
      </button>
    );
  }

  const submit = async () => {
    flag.reset();
    await flag.mutateAsync({
      entityType: 'faq',
      entityId: faqId,
      reason,
      details: details.trim() || undefined,
    });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Flag this FAQ"
      style={{
        background: 'var(--color-input)',
        border: '1px solid var(--color-warning)',
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-warning)',
          marginBottom: 8,
        }}
      >
        Flag this FAQ
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {FLAG_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            style={{
              fontSize: 11,
              padding: '5px 12px',
              borderRadius: 16,
              border: `1px solid ${reason === r ? 'var(--color-warning)' : 'var(--color-border)'}`,
              background: reason === r ? 'var(--color-warning-bg)' : 'var(--color-card)',
              color: reason === r ? 'var(--color-warning)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {REASON_LABELS[r]}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Optional: add context to help moderators (max 1000 chars)."
        rows={3}
        maxLength={1000}
        style={{
          width: '100%',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 12,
          fontFamily: 'inherit',
          color: 'var(--color-text)',
          resize: 'vertical',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {flag.error && (
        <div role="alert" style={{ marginTop: 6, fontSize: 11, color: 'var(--color-danger)' }}>
          {flag.error instanceof Error ? flag.error.message : 'Could not submit flag'}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" variant="warning" onClick={submit} disabled={flag.isPending}>
          {flag.isPending ? 'Submitting…' : 'Submit flag'}
        </Button>
      </div>
    </div>
  );
}
