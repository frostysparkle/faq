import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, Flame, MessageSquare, Users } from 'lucide-react';
import { QUESTION_STATUSES } from '@samagama/shared';
import type { QuestionStatus } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
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

  useEffect(() => { setIdleFilter(readIdleParam(searchParams.get('idle'))); }, [searchParams]);

  const updateIdleFilter = (next: IdleBucket | null) => {
    setIdleFilter(next);
    if (next) setSearchParams({ idle: next });
    else { const params = new URLSearchParams(searchParams); params.delete('idle'); setSearchParams(params); }
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
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} color="var(--color-success)" />
        </div>
        <div>
          <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Community Q&A</span>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 10 }}>Student questions · Peer answers · Moderator approved</span>
        </div>
      </div>

      {/* Idle bucket filters */}
      <div className="mod-card mod-card-orange" style={{ padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Activity window</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <IdleChip active={idleFilter === null} onClick={() => updateIdleFilter(null)} color="var(--color-primary)">
            All open ({idle?.totalOpen ?? '…'})
          </IdleChip>
          <IdleChip active={idleFilter === 'last24h'} onClick={() => updateIdleFilter('last24h')} icon={<Flame size={11} />} color="var(--color-success)">
            Active in 24h ({idle?.last24h ?? '…'})
          </IdleChip>
          <IdleChip active={idleFilter === 'over3days'} onClick={() => updateIdleFilter('over3days')} icon={<Clock size={11} />} color="var(--color-warning)">
            Idle &gt; 3 days ({idle?.over3days ?? '…'})
          </IdleChip>
          <IdleChip active={idleFilter === 'over1week'} onClick={() => updateIdleFilter('over1week')} icon={<AlertTriangle size={11} />} color="var(--color-danger)">
            Idle &gt; 1 week ({idle?.over1week ?? '…'})
          </IdleChip>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)} style={{
            fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 10,
            border: `1.5px solid ${statusFilter === f ? 'var(--color-success)' : 'var(--color-border)'}`,
            background: statusFilter === f ? 'var(--color-success)' : 'var(--color-card)',
            color: statusFilter === f ? 'white' : 'var(--color-text-muted)',
            cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.15s',
          }}>{f}</button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && <div className="mod-card mod-card-green" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>}

      {/* Empty */}
      {data && data.length === 0 && (
        <div className="mod-card mod-card-green" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <MessageSquare size={26} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No questions match that filter</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Try a different status or activity window.</div>
        </div>
      )}

      {/* Question list */}
      {data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map((q) => {
            const cardColor = q.status === 'resolved' ? 'mod-card-green' : q.status === 'answered' ? 'mod-card-blue' : 'mod-card-green';
            return (
              <button key={q.id} onClick={() => navigate(`/community/${q.id}`)} style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}>
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

function IdleChip({ active, onClick, icon, color = 'var(--color-primary)', children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; color?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
      border: `1.5px solid ${active ? color : 'var(--color-border)'}`,
      background: active ? `${color}22` : 'var(--color-card)',
      color: active ? color : 'var(--color-text-muted)',
      fontFamily: 'inherit', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
    }}>{icon}{children}</button>
  );
}

function readIdleParam(raw: string | null): IdleBucket | null {
  if (raw === 'last24h' || raw === 'over3days' || raw === 'over1week') return raw;
  return null;
}

function statusColor(status: QuestionStatus): 'accent' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'open': return 'accent';
    case 'answered': return 'warning';
    case 'resolved': return 'success';
    default: return 'default';
  }
}
