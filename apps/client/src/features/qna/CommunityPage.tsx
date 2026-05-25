// Community board — the public list of community-type questions for all roles.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { QUESTION_STATUSES } from '@samagama/shared';
import type { QuestionStatus } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useQuestions } from './queries';

const FILTERS: Array<'All' | QuestionStatus> = ['All', ...QUESTION_STATUSES];

export function CommunityPage() {
  const [filter, setFilter] = useState<'All' | QuestionStatus>('All');
  const { data, isLoading } = useQuestions({
    type: 'community',
    status: filter === 'All' ? undefined : filter,
  });
  const navigate = useNavigate();

  return (
    <div>
      <SectionHeader
        title="Community Q&A"
        sub="Student questions · Peer answers · Moderator approved"
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${filter === f ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: filter === f ? 'var(--color-primary)' : 'var(--color-card)',
              color: filter === f ? 'white' : 'var(--color-text-muted)',
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{q.title}</div>
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
