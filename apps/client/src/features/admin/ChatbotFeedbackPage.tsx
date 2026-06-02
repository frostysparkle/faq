import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, ChevronDown, ChevronUp, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ApiSuccess, ChatbotFeedbackStats, PublicChatFeedback } from '@samagama/shared';
import { apiClient } from '../../lib/api-client';

type Filter = 'all' | 'helpful' | 'unhelpful';

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
      const res = await apiClient.get<ApiSuccess<PublicChatFeedback[]>>('/api/chat/feedback', { params: { filter } });
      return res.data.data;
    },
  });

  const v = (n: number | undefined) => stats.isLoading ? '…' : (n ?? 0);

  const FILTER_LABELS: Record<Filter, string> = { all: 'All', helpful: 'Helpful', unhelpful: 'Unhelpful' };
  const FILTER_COLORS: Record<Filter, string> = {
    all: 'var(--color-primary)',
    helpful: 'var(--color-success)',
    unhelpful: 'var(--color-danger)',
  };

  return (
    <div>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={18} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Chatbot Feedback</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div className="mod-card mod-card-blue" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={22} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats.data?.total)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 3 }}>Total Chats</div>
            <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 2 }}>All sessions</div>
          </div>
        </div>

        <div className="mod-card mod-card-green" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ThumbsUp size={22} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats.data?.helpful)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 3 }}>Helpful</div>
            <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600, marginTop: 2 }}>Positive feedback</div>
          </div>
        </div>

        <div className="mod-card mod-card-red" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ThumbsDown size={22} color="var(--color-danger)" />
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats.data?.unhelpful)}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 3 }}>Unhelpful</div>
            <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 2 }}>Negative feedback</div>
          </div>
        </div>
      </div>

      {/* Filter + list card */}
      <div className="mod-card mod-card-blue">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={17} color="var(--color-primary)" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>Chat Sessions</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'helpful', 'unhelpful'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${filter === f ? FILTER_COLORS[f] : 'var(--color-border)'}`,
                background: filter === f ? FILTER_COLORS[f] : 'var(--color-card)',
                color: filter === f ? 'white' : 'var(--color-text-muted)',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>{FILTER_LABELS[f]}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 20px 20px' }}>
          {list.isLoading && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '16px 0' }}>Loading…</div>}

          {!list.isLoading && (list.data?.length ?? 0) === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Bot size={24} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No chat feedback yet</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320, margin: '0 auto' }}>
                Once students use Yaksha, conversations and feedback will appear here.
              </div>
            </div>
          )}

          {list.data && list.data.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.data.map((row) => <FeedbackRow key={row.id} row={row} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackRow({ row }: { row: PublicChatFeedback }) {
  const [expanded, setExpanded] = useState(false);
  const isHelpful = row.rating === 'helpful';
  const color = isHelpful ? 'var(--color-success)' : 'var(--color-danger)';
  const hasFullHistory = row.messages && row.messages.length > 0;

  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 14, border: `1px solid var(--color-border)`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isHelpful ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isHelpful
              ? <ThumbsUp size={15} color="var(--color-success)" />
              : <ThumbsDown size={15} color="var(--color-danger)" />}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.rating}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>by {row.user.name} · {timeAgo(row.createdAt)}</span>
          </div>
          {/* View conversation button */}
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
              background: expanded ? 'var(--color-primary)' : 'var(--color-input)',
              color: expanded ? 'white' : 'var(--color-text-muted)',
              border: `1px solid ${expanded ? 'var(--color-primary)' : 'var(--color-border)'}`,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : (hasFullHistory ? 'View Chat' : 'View Response')}
          </button>
        </div>

        {/* Rated query (always visible) */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{row.query}</div>
        <div style={{ fontSize: 13, background: 'var(--color-input)', padding: '10px 14px', borderRadius: 10, borderLeft: `3px solid ${color}`, color: 'var(--color-text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{row.answer}</div>
        {row.comment && <div style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-muted)' }}>"{row.comment}"</div>}
      </div>

      {/* Full conversation thread */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)', padding: '16px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            {hasFullHistory ? 'Full Conversation' : 'Rated Exchange'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasFullHistory
              ? row.messages!.map((msg, i) => <ChatBubble key={i} msg={msg} isRated={i === (row.messages!.length - 1)} />)
              : (
                <>
                  <ChatBubble msg={{ role: 'user', content: row.query }} isRated={false} />
                  <ChatBubble msg={{ role: 'assistant', content: row.answer }} isRated={true} />
                </>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ msg, isRated }: { msg: { role: 'user' | 'assistant'; content: string }; isRated: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-start' }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Bot size={14} color="white" />
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--color-primary)' : 'var(--color-card)',
        color: isUser ? 'white' : 'var(--color-text)',
        border: isUser ? 'none' : `1px solid ${isRated ? 'var(--color-primary)' : 'var(--color-border)'}`,
        fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
        boxShadow: isRated ? '0 0 0 2px var(--color-primary-bg)' : 'none',
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>
          S
        </div>
      )}
    </div>
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
