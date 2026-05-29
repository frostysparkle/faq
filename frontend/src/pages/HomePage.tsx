// Student / role-aware home page.
//
// For students:
//   - Welcome header.
//   - 4 stat cards: Open Q&A, Unanswered Q&A, Questions You Answered, Spurti Points.
//   - 3 content tabs: Recently Added FAQs · Recently Updated FAQs · Recent Community Questions.
//     Each tab shows up to 5 items with a "View All" link to the full surface.
//
// Moderators / admins keep a simpler welcome card — their dashboards live elsewhere.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import type { PublicFaq } from '@samagama/shared';
import { useAuth } from '../features/auth/AuthProvider';
import { useStudentHomeStats } from '../features/stats/queries';
import { IdleBucketCards } from '../features/stats/IdleBucketCards';
import { useFaqList, useFaqFeedback } from '../features/faq/queries';
import { FlagFaqButton } from '../features/flag/FlagFaqDialog';
import { useQuestions } from '../features/qna/queries';

type ContentTab = 'recent-added-faqs' | 'recent-updated-faqs' | 'recent-questions';

export function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, #0891b2, #0f2744)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>Welcome back,</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{user.name} 👋</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          Samagama Internship Portal · Signed in as <strong>{user.role}</strong>
        </div>
      </div>

      {user.role === 'student' ? (
        <StudentHome />
      ) : user.role === 'moderator' ? (
        <Navigate to="/moderation" replace />
      ) : (
        <Navigate to="/admin" replace />
      )}
    </div>
  );
}

function StudentHome() {
  const { data: stats, isLoading: statsLoading } = useStudentHomeStats();

  return (
    <>
      {/* Stat cards + idle bucket card — single unified row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) minmax(0, 1.1fr)',
          gap: 12,
          marginBottom: 24,
          alignItems: 'stretch',
        }}
      >
        <StatCard
          label="Open Community Q&A"
          value={stats?.openCommunityQuestions ?? (statsLoading ? '…' : 0)}
          sub="Answered + unanswered"
          icon={MessagesSquare}
          color="var(--color-primary)"
        />
        <StatCard
          label="Unanswered Q&A"
          value={stats?.unansweredCommunityQuestions ?? (statsLoading ? '…' : 0)}
          sub="No answer yet"
          icon={HelpCircle}
          color="var(--color-warning)"
        />
        <StatCard
          label="Questions You Answered"
          value={stats?.questionsYouAnswered ?? (statsLoading ? '…' : 0)}
          sub="Approved answers, all-time"
          icon={MessageCircle}
          color="var(--color-success)"
        />
        <StatCard
          label="Spurti Points"
          value={stats?.spurtiPoints ?? (statsLoading ? '…' : 0)}
          sub="Earned via Community Q&A"
          icon={Sparkles}
          color="#7c3aed"
        />
        <IdleBucketCards style={{ marginBottom: 0 }} />
      </div>

      <ContentTabs />
    </>
  );
}


function ContentTabs() {
  const [tab, setTab] = useState<ContentTab>('recent-added-faqs');

  return (
    <div>
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <TabBtn active={tab === 'recent-added-faqs'} onClick={() => setTab('recent-added-faqs')}>
          Recently Added FAQs
        </TabBtn>
        <TabBtn
          active={tab === 'recent-updated-faqs'}
          onClick={() => setTab('recent-updated-faqs')}
        >
          Recently Updated FAQs
        </TabBtn>
        <TabBtn active={tab === 'recent-questions'} onClick={() => setTab('recent-questions')}>
          Recent Community Questions
        </TabBtn>
      </div>

      {tab === 'recent-added-faqs' && <RecentFaqsList sort="added" />}
      {tab === 'recent-updated-faqs' && <RecentFaqsList sort="recent" />}
      {tab === 'recent-questions' && <RecentQuestionsList />}
    </div>
  );
}

const STATUS_COLOR = {
  draft: 'default',
  published: 'success',
  outdated: 'warning',
  archived: 'default',
} as const;

function RecentFaqsList({ sort }: { sort: 'added' | 'recent' }) {
  const navigate = useNavigate();
  const { data, isLoading } = useFaqList({ sort, pageSize: 5 });

  if (isLoading) return <Card>Loading…</Card>;
  if (!data || data.items.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No FAQs yet.</div>
      </Card>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {data.items.slice(0, 5).map((faq) => (
          <FaqRowCard key={faq.id} faq={faq} />
        ))}
      </div>
      <ViewAll onClick={() => navigate('/faqs')} />
    </>
  );
}

function FaqRowCard({ faq }: { faq: PublicFaq }) {
  const [expanded, setExpanded] = useState(false);
  const feedback = useFaqFeedback(faq.id);
  const studentMayVote = !faq.hasUserFeedback;

  return (
    <Card>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
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
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flex: 1 }}>{faq.title}</span>
            {expanded ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {faq.categories.slice(0, 1).map((c) => (
              <Badge key={c.id} color="accent">{c.name}</Badge>
            ))}
          </div>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <Badge color={STATUS_COLOR[faq.status as keyof typeof STATUS_COLOR] ?? 'default'}>{faq.status}</Badge>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Updated {timeAgo(faq.updatedAt)}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {faq.answer}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            {studentMayVote ? (
              <>
                <span>Was this helpful?</span>
                <button
                  type="button"
                  onClick={() => feedback.mutate('helpful')}
                  disabled={feedback.isPending}
                  style={feedbackBtnStyle('var(--color-success)')}
                >
                  <ThumbsUp size={12} /> Helpful
                </button>
                <button
                  type="button"
                  onClick={() => feedback.mutate('unhelpful')}
                  disabled={feedback.isPending}
                  style={feedbackBtnStyle('var(--color-danger)')}
                >
                  <ThumbsDown size={12} /> Not Helpful
                </button>
              </>
            ) : (
              <span>Thanks for your feedback.</span>
            )}
            <span style={{ flex: 1 }} />
            <FlagFaqButton faqId={faq.id} />
          </div>
        </div>
      )}
    </Card>
  );
}

function feedbackBtnStyle(color: string): React.CSSProperties {
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

function RecentQuestionsList() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuestions({ type: 'community' });

  if (isLoading) return <Card>Loading…</Card>;
  if (!data || data.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          No community questions yet.
        </div>
      </Card>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {data.slice(0, 5).map((q) => (
          <Card key={q.id} as="button" onClick={() => navigate(`/community/${q.id}`)}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{q.title}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {q.category && <Badge color="accent">{q.category.name}</Badge>}
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {q.answerCount} answer{q.answerCount === 1 ? '' : 's'} · by {q.author.name}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <ViewAll onClick={() => navigate('/community')} />
    </>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-primary)',
        fontSize: 13,
        fontFamily: 'inherit',
        padding: 0,
      }}
    >
      View all <ChevronRight size={14} />
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof MessagesSquare;
  color: string;
}) {
  return (
    <Card style={{ padding: '16px 18px', height: '100%', boxSizing: 'border-box' }}>
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </Card>
  );
}

function TabBtn({
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

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
