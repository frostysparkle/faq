// My Questions — Change Spec §5.
//
// Two tabs (Personal / Community), each rendering the user's own questions.
// Status display uses tick marks for personal questions:
//   ✓     Posted    (just submitted; no moderator has opened it)
//   ✓✓    Seen      (moderatorViewedAt set; no answer yet)
//   ✓✓ ✅  Responded (an answer exists / question is resolved)
// The displayState comes from the server (computed from moderatorViewedAt + answerCount).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck } from 'lucide-react';
import type { PublicQuestion } from '@samagama/shared';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useQuestions } from './queries';

type Tab = 'personal' | 'community';

export function MyQuestionsPage() {
  const [tab, setTab] = useState<Tab>('personal');
  const { data, isLoading } = useQuestions({ type: tab, mine: true });

  return (
    <div>
      <SectionHeader title="My Questions" sub="Track everything you've submitted." />

      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <TabButton active={tab === 'personal'} onClick={() => setTab('personal')}>
          Personal
        </TabButton>
        <TabButton active={tab === 'community'} onClick={() => setTab('community')}>
          Community
        </TabButton>
      </div>

      {isLoading && <Card>Loading…</Card>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            No {tab} questions yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {tab === 'personal'
              ? 'Personal questions go directly to moderators.'
              : 'Community questions get peer answers — try asking one.'}
          </div>
        </Card>
      )}

      {!isLoading && data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((q) => (
            <QuestionRow key={q.id} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionRow({ q }: { q: PublicQuestion }) {
  const navigate = useNavigate();
  return (
    <Card onClick={() => navigate(`/community/${q.id}`)} as="button">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{q.title}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {q.category && <Badge color="accent">{q.category.name}</Badge>}
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {timeAgo(q.createdAt)}
              {q.answerCount > 0 && ` · ${q.answerCount} answers`}
            </span>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <StatusTick q={q} />
        </div>
      </div>
    </Card>
  );
}

function StatusTick({ q }: { q: PublicQuestion }) {
  if (q.type === 'personal') {
    if (q.displayState === 'responded') {
      return (
        <span style={tickStyle('var(--color-success)')}>
          <CheckCheck size={14} /> Responded
        </span>
      );
    }
    if (q.displayState === 'seen') {
      return (
        <span style={tickStyle('var(--color-text-muted)')}>
          <CheckCheck size={14} /> Seen
        </span>
      );
    }
    return (
      <span style={tickStyle('var(--color-text-muted)')}>
        <Check size={14} /> Posted
      </span>
    );
  }

  // Community questions — fall back to status badge.
  const map: Record<string, 'accent' | 'warning' | 'success' | 'default'> = {
    open: 'accent',
    answered: 'warning',
    resolved: 'success',
    duplicate: 'default',
    archived: 'default',
  };
  return <Badge color={map[q.status] ?? 'default'}>{q.status}</Badge>;
}

function tickStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color,
  };
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: 500,
        padding: '6px 16px',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function timeAgo(isoDate: string): string {
  const sec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
