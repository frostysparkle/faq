// Community board — public list of community-type questions for all roles.
//
// Filters:
//   - Status row (All / open / answered / resolved / duplicate / archived)
//   - Idle row (Active 24h / Idle > 3d / Idle > 1w) with live counts that mirror the
//     dashboard cards so the two surfaces never drift.
//
// Deep linking: dashboard cards push `/community?idle=…`; we read it on mount.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Flame, MessageSquare, AlertTriangle } from 'lucide-react';
import { QUESTION_STATUSES } from '@samagama/shared';
import type { QuestionStatus } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useCommunityIdleBuckets } from '../stats/queries';
import type { IdleBucket } from '../stats/api';
import { useQuestions } from './queries';

const STATUS_FILTERS: Array<'All' | QuestionStatus> = [
  'All',
  ...QUESTION_STATUSES.filter((s) => s !== 'duplicate' && s !== 'archived'),
];

export function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIdle = readIdleParam(searchParams.get('idle'));

  const [statusFilter, setStatusFilter] = useState<'All' | QuestionStatus>('All');
  const [idleFilter, setIdleFilter] = useState<IdleBucket | null>(initialIdle);

  // If the user navigates here with ?idle=… set, the filter follows. Removing it from the
  // URL when they switch chips keeps the link shareable and the back button intuitive.
  useEffect(() => {
    setIdleFilter(readIdleParam(searchParams.get('idle')));
  }, [searchParams]);

  const updateIdleFilter = (next: IdleBucket | null) => {
    setIdleFilter(next);
    if (next) setSearchParams({ idle: next });
    else {
      const params = new URLSearchParams(searchParams);
      params.delete('idle');
      setSearchParams(params);
    }
  };

  const { data: idle } = useCommunityIdleBuckets();
  const { data, isLoading } = useQuestions({
    type: 'community',
    status: statusFilter === 'All' ? undefined : statusFilter,
    idle: idleFilter ?? undefined,
  });
  const navigate = useNavigate();

  return (
    <div>
      <SectionHeader
        title="Community Q&A"
        sub="Student questions · Peer answers · Moderator approved"
      />

      {/* Idle bucket filters — counts are live and match the dashboard cards. */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            marginRight: 4,
          }}
        >
          Idle
        </span>
        <IdleChip
          active={idleFilter === null}
          onClick={() => updateIdleFilter(null)}
        >
          All open ({idle?.totalOpen ?? '…'})
        </IdleChip>
        <IdleChip
          active={idleFilter === 'last24h'}
          onClick={() => updateIdleFilter('last24h')}
          icon={<Flame size={11} />}
          color="var(--color-success)"
        >
          Active in 24h ({idle?.last24h ?? '…'})
        </IdleChip>
        <IdleChip
          active={idleFilter === 'over3days'}
          onClick={() => updateIdleFilter('over3days')}
          icon={<Clock size={11} />}
          color="var(--color-warning)"
        >
          Idle &gt; 3 days ({idle?.over3days ?? '…'})
        </IdleChip>
        <IdleChip
          active={idleFilter === 'over1week'}
          onClick={() => updateIdleFilter('over1week')}
          icon={<AlertTriangle size={11} />}
          color="var(--color-danger)"
        >
          Idle &gt; 1 week ({idle?.over1week ?? '…'})
        </IdleChip>
      </div>

      {/* Status filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${statusFilter === f ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background:
                statusFilter === f ? 'var(--color-primary)' : 'var(--color-card)',
              color: statusFilter === f ? 'white' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && <Card>Loading…</Card>}

      {data && data.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <MessageSquare
            size={32}
            color="var(--color-border)"
            aria-hidden="true"
            style={{ marginBottom: 8 }}
          />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No questions match that filter.</div>
        </Card>
      )}

      {data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((q) => (
            <Card key={q.id} as="button" onClick={() => navigate(`/community/${q.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Spec: hide the title; show the description verbatim (clamped to 3 lines). */}
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      marginBottom: 8,
                      color: 'var(--color-text)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {q.description}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {q.category && <Badge color="accent">{q.category.name}</Badge>}
                    {q.tags.map((t) => (
                      <Badge key={t.id}>#{t.name}</Badge>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <Badge color={statusColor(q.status)}>{q.status}</Badge>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {q.answerCount} answer{q.answerCount === 1 ? '' : 's'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    by {q.author.name}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function IdleChip({
  active,
  onClick,
  icon,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '6px 12px',
        borderRadius: 20,
        border: `1px solid ${active ? color ?? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? (color ? `${color}22` : 'var(--color-primary)') : 'var(--color-card)',
        color: active ? color ?? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function readIdleParam(raw: string | null): IdleBucket | null {
  if (raw === 'last24h' || raw === 'over3days' || raw === 'over1week') return raw;
  return null;
}

function statusColor(status: QuestionStatus): 'accent' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'open':
      return 'accent';
    case 'answered':
      return 'warning';
    case 'resolved':
      return 'success';
    default:
      return 'default';
  }
}
