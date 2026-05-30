import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, ChevronUp,
  HelpCircle, MessageCircle, MessagesSquare, Sparkles,
  ThumbsDown, ThumbsUp,
} from 'lucide-react';
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
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 60%, #4c1d95 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 24,
        color: 'white', position: 'relative', overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(124,58,237,0.22)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -50, right: 120, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Welcome back</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>{user.name} 👋</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Samagama Internship Portal · <strong>Signed in as {user.role}</strong></div>
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
  const v = (n: number | undefined) => statsLoading ? '…' : (n ?? 0);

  return (
    <>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1.1fr', gap: 14, marginBottom: 24, alignItems: 'stretch' }}>

        <div className="mod-card mod-card-blue interactive" style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', minHeight: 130 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessagesSquare size={20} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.openCommunityQuestions)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Open Community Q&A</div>
          <div style={{ fontSize: 11, color: 'var(--color-primary-text)', fontWeight: 600 }}>Answered + unanswered</div>
          <MessagesSquare size={80} color="var(--color-primary)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06 }} />
        </div>

        <div className="mod-card mod-card-orange interactive" style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', minHeight: 130 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={20} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.unansweredCommunityQuestions)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Unanswered Q&A</div>
          <div style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 600 }}>No answer yet</div>
          <HelpCircle size={80} color="var(--color-warning)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06 }} />
        </div>

        <div className="mod-card mod-card-green interactive" style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', minHeight: 130 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.questionsYouAnswered)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Questions Answered</div>
          <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>Approved answers, all-time</div>
          <MessageCircle size={80} color="var(--color-success)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06 }} />
        </div>

        <div className="mod-card mod-card-purple interactive" style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden', minHeight: 130 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--color-purple)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.spurtiPoints)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Spurti Points</div>
          <div style={{ fontSize: 11, color: 'var(--color-purple)', fontWeight: 600 }}>Earned via Community Q&A</div>
          <Sparkles size={80} color="var(--color-purple)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06 }} />
        </div>

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
      {/* Tab header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Knowledge Feed</span>
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {([
          ['recent-added-faqs', 'Recently Added FAQs'],
          ['recent-updated-faqs', 'Recently Updated FAQs'],
          ['recent-questions', 'Recent Community Questions'],
        ] as [ContentTab, string][]).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            style={{
              fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 10,
              border: `1.5px solid ${tab === id ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: tab === id ? 'var(--color-primary)' : 'var(--color-card)',
              color: tab === id ? 'white' : 'var(--color-text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >{label}</button>
        ))}
      </div>

      {tab === 'recent-added-faqs' && <RecentFaqsList sort="added" />}
      {tab === 'recent-updated-faqs' && <RecentFaqsList sort="recent" />}
      {tab === 'recent-questions' && <RecentQuestionsList />}
    </div>
  );
}

const STATUS_COLOR = {
  draft: 'default', published: 'success', outdated: 'warning', archived: 'default',
} as const;

function RecentFaqsList({ sort }: { sort: 'added' | 'recent' }) {
  const navigate = useNavigate();
  const { data, isLoading } = useFaqList({ sort, pageSize: 5 });

  if (isLoading) return <div className="mod-card mod-card-blue" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>;
  if (!data || data.items.length === 0) return (
    <div className="mod-card mod-card-blue" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No FAQs yet.</div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {data.items.slice(0, 5).map((faq) => <FaqRowCard key={faq.id} faq={faq} />)}
      </div>
      <ViewAll onClick={() => navigate('/faqs')} />
    </>
  );
}

function FaqRowCard({ faq }: { faq: PublicFaq }) {
  const [expanded, setExpanded] = useState(false);
  const [localVote, setLocalVote] = useState<'helpful' | 'unhelpful' | null>(null);
  const [counts, setCounts] = useState({ helpful: faq.helpfulCount ?? 0, unhelpful: faq.unhelpfulCount ?? 0 });
  const feedback = useFaqFeedback(faq.id);

  const handleVote = (rating: 'helpful' | 'unhelpful') => {
    if (feedback.isPending) return;
    const isToggleOff = localVote === rating;
    const wasOpposite = localVote !== null && localVote !== rating;
    setCounts((prev) => {
      const next = { ...prev };
      if (isToggleOff) { next[rating] = Math.max(0, next[rating] - 1); }
      else { next[rating] = next[rating] + 1; if (wasOpposite) { const opp = rating === 'helpful' ? 'unhelpful' : 'helpful'; next[opp] = Math.max(0, next[opp] - 1); } }
      return next;
    });
    setLocalVote(isToggleOff ? null : rating);
    feedback.mutate(rating);
  };

  return (
    <div className="mod-card mod-card-blue">
      <div style={{ padding: '14px 18px 14px', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flex: 1 }}>{faq.title}</span>
            {expanded ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {faq.categories.slice(0, 1).map((c) => <Badge key={c.id} color="accent">{c.name}</Badge>)}
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: localVote === 'helpful' ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: localVote === 'helpful' ? 700 : 400 }}>
            <ThumbsUp size={12} /> {counts.helpful}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: localVote === 'unhelpful' ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: localVote === 'unhelpful' ? 700 : 400 }}>
            <ThumbsDown size={12} /> {counts.unhelpful}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <Badge color={STATUS_COLOR[faq.status as keyof typeof STATUS_COLOR] ?? 'default'}>{faq.status}</Badge>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Updated {timeAgo(faq.updatedAt)}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--color-border)', paddingTop: 14, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {faq.answer}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <span>Was this helpful?</span>
            <VoteButton rating="helpful" selected={localVote === 'helpful'} disabled={feedback.isPending} count={counts.helpful} onClick={() => handleVote('helpful')} />
            <VoteButton rating="unhelpful" selected={localVote === 'unhelpful'} disabled={feedback.isPending} count={counts.unhelpful} onClick={() => handleVote('unhelpful')} />
            <span style={{ flex: 1 }} />
            <FlagFaqButton faqId={faq.id} faqUpdatedAt={faq.updatedAt} />
          </div>
        </div>
      )}
    </div>
  );
}

function VoteButton({ rating, selected, disabled, count, onClick }: {
  rating: 'helpful' | 'unhelpful'; selected: boolean; disabled: boolean; count: number; onClick: () => void;
}) {
  const color = rating === 'helpful' ? 'var(--color-success)' : 'var(--color-danger)';
  const label = rating === 'helpful' ? 'Helpful' : 'Not Helpful';
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={selected ? `Click to remove your ${label} vote` : undefined} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
      border: `1px solid ${color}`, background: selected ? color : 'transparent',
      borderRadius: 16, color: selected ? 'white' : color, fontSize: 12,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      fontWeight: selected ? 700 : 400, opacity: disabled ? 0.6 : 1, transition: 'all 0.15s ease',
    }}>
      {rating === 'helpful' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
      {label} {count > 0 && <span style={{ fontWeight: 400, opacity: 0.8 }}>({count})</span>}
    </button>
  );
}

function RecentQuestionsList() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuestions({ type: 'community' });

  if (isLoading) return <div className="mod-card mod-card-green" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>;
  if (!data || data.length === 0) return (
    <div className="mod-card mod-card-green" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No community questions yet.</div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {data.slice(0, 5).map((q) => (
          <button key={q.id} onClick={() => navigate(`/community/${q.id}`)} style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}>
            <div className="mod-card mod-card-green" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--color-text)' }}>{q.title}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {q.category && <Badge color="accent">{q.category.name}</Badge>}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {q.answerCount} answer{q.answerCount === 1 ? '' : 's'} · by {q.author.name}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <ViewAll onClick={() => navigate('/community')} />
    </>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontFamily: 'inherit', fontWeight: 600, padding: 0 }}>
      View all <ChevronRight size={14} />
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
