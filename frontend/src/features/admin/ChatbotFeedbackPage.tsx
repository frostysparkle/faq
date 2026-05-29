// Chatbot Feedback dashboard.
//
// Dashboard Spec: two cards (Helpful, Flagged) + filterable chat list + total count.
// The chatbot itself ships in Phase 6, but the feedback collection is wired now so the
// dashboard renders real rows once seeded.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Flag, ThumbsUp } from 'lucide-react';
import type { ApiSuccess, ChatbotFeedbackStats, PublicChatFeedback } from '@samagama/shared';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { apiClient } from '../../lib/api-client';

type Filter = 'all' | 'helpful' | 'flagged';

export function ChatbotFeedbackPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const stats = useQuery<ChatbotFeedbackStats>({
    queryKey: ['chatbot', 'feedback', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<ChatbotFeedbackStats>>('/api/chat/feedback/stats');
      return res.data.data;
    },
  });

  const list = useQuery<PublicChatFeedback[]>({
    queryKey: ['chatbot', 'feedback', filter],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<PublicChatFeedback[]>>('/api/chat/feedback', {
        params: { filter },
      });
      return res.data.data;
    },
  });

  return (
    <div>
      <SectionHeader
        title="Chatbot Feedback"
        sub="Helpful and flagged responses from both chat surfaces."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <FeedbackStat
          label="Helpful Responses"
          value={stats.data?.helpful ?? (stats.isLoading ? '…' : 0)}
          icon={ThumbsUp}
          color="var(--color-success)"
        />
        <FeedbackStat
          label="Flagged Responses"
          value={stats.data?.flagged ?? (stats.isLoading ? '…' : 0)}
          icon={Flag}
          color="var(--color-danger)"
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            All chats
          </Chip>
          <Chip active={filter === 'helpful'} onClick={() => setFilter('helpful')}>
            Helpful
          </Chip>
          <Chip active={filter === 'flagged'} onClick={() => setFilter('flagged')}>
            Flagged
          </Chip>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Total chats: <strong>{stats.data?.total ?? '…'}</strong>
        </div>
      </div>

      {list.isLoading && <Card>Loading…</Card>}

      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <Card style={{ textAlign: 'center', padding: 36 }}>
          <Bot size={32} color="var(--color-border)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No chat feedback yet</div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginTop: 4,
              maxWidth: 360,
              marginInline: 'auto',
            }}
          >
            The Yaksha chatbot ships in a later phase. Once students start using it, conversations
            and feedback will appear here.
          </div>
        </Card>
      )}

      {list.data && list.data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.data.map((row) => (
            <FeedbackRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackRow({ row }: { row: PublicChatFeedback }) {
  const ratingColor = row.rating === 'helpful' ? 'var(--color-success)' : 'var(--color-danger)';
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: ratingColor,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.5px',
          marginBottom: 6,
        }}
      >
        {row.rating === 'helpful' ? <ThumbsUp size={12} /> : <Flag size={12} />}
        {row.rating}
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          · {row.user.name} · {timeAgo(row.createdAt)}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{row.query}</div>
      <div
        style={{
          fontSize: 13,
          background: 'var(--color-input)',
          padding: 10,
          borderRadius: 8,
          borderLeft: '3px solid var(--color-primary)',
          color: 'var(--color-text)',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.55,
        }}
      >
        {row.answer}
      </div>
      {row.comment && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--color-text-muted)',
          }}
        >
          “{row.comment}”
        </div>
      )}
    </Card>
  );
}

function FeedbackStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof ThumbsUp;
  color: string;
}) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

function Chip({
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
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '6px 14px',
        borderRadius: 20,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
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
