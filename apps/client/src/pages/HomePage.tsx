import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, ChevronRight,
  Circle, Clock, Folder, HelpCircle, MessageCircle, MessageSquare,
  MessagesSquare, Sparkles, User,
} from 'lucide-react';
import type React from 'react';
import { useAuth } from '../features/auth/AuthProvider';
import { useStudentHomeStats } from '../features/stats/queries';
import { IdleBucketCards } from '../features/stats/IdleBucketCards';
import { useFaqList } from '../features/faq/queries';
import { FaqCard } from '../features/faq/FaqCard';
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
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useStudentHomeStats();
  const v = (n: number | undefined) => statsLoading ? '…' : (n ?? 0);

  const statCardBase: React.CSSProperties = {
    padding: '20px 20px 16px',
    display: 'flex', flexDirection: 'column', gap: 10,
    position: 'relative', overflow: 'hidden', minHeight: 130,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    userSelect: 'none',
    outline: 'none',
  };

  const onHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'translateY(-3px)';
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
  };
  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'none';
    el.style.boxShadow = '';
  };
  const onKeyNav = (e: React.KeyboardEvent<HTMLDivElement>, dest: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(dest); }
  };

  return (
    <>
      {/* Stat cards — 3-column layout: left & middle each have 2 stacked cards, right spans both rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gridTemplateRows: 'auto auto', gap: 14, marginBottom: 24 }}>

        {/* Col 1 · Row 1 — Open Community Q&A → /community */}
        <div
          className="mod-card mod-card-blue interactive"
          style={statCardBase}
          role="button" tabIndex={0}
          onClick={() => navigate('/community')}
          onKeyDown={(e) => onKeyNav(e, '/community')}
          onMouseEnter={onHover} onMouseLeave={onLeave}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessagesSquare size={20} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.openCommunityQuestions)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Open Community Q&A</div>
          <div style={{ fontSize: 11, color: 'var(--color-primary-text)', fontWeight: 600 }}>Answered + unanswered</div>
          <MessagesSquare size={80} color="var(--color-primary)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06, pointerEvents: 'none' }} />
          <ChevronRight size={14} color="var(--color-primary)" style={{ position: 'absolute', top: 14, right: 14, opacity: 0.5 }} />
        </div>

        {/* Col 2 · Row 1 — Unanswered Q&A → /community (open, no answers) */}
        <div
          className="mod-card mod-card-orange interactive"
          style={statCardBase}
          role="button" tabIndex={0}
          onClick={() => navigate('/community')}
          onKeyDown={(e) => onKeyNav(e, '/community')}
          onMouseEnter={onHover} onMouseLeave={onLeave}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={20} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.unansweredCommunityQuestions)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Unanswered Q&A</div>
          <div style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 600 }}>No answer yet</div>
          <HelpCircle size={80} color="var(--color-warning)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06, pointerEvents: 'none' }} />
          <ChevronRight size={14} color="var(--color-warning)" style={{ position: 'absolute', top: 14, right: 14, opacity: 0.5 }} />
        </div>

        {/* Col 3 · Rows 1–2 — Idle bucket panel spanning full height */}
        <IdleBucketCards style={{ marginBottom: 0, gridColumn: 3, gridRow: '1 / 3' }} />

        {/* Col 1 · Row 2 — Questions Answered → /my-questions */}
        <div
          className="mod-card mod-card-green interactive"
          style={statCardBase}
          role="button" tabIndex={0}
          onClick={() => navigate('/my-questions')}
          onKeyDown={(e) => onKeyNav(e, '/my-questions')}
          onMouseEnter={onHover} onMouseLeave={onLeave}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.questionsYouAnswered)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Questions Answered</div>
          <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>Approved answers, all-time</div>
          <MessageCircle size={80} color="var(--color-success)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06, pointerEvents: 'none' }} />
          <ChevronRight size={14} color="var(--color-success)" style={{ position: 'absolute', top: 14, right: 14, opacity: 0.5 }} />
        </div>

        {/* Col 2 · Row 2 — Spurti Points → /analytics */}
        <div
          className="mod-card mod-card-purple interactive"
          style={statCardBase}
          role="button" tabIndex={0}
          onClick={() => navigate('/analytics')}
          onKeyDown={(e) => onKeyNav(e, '/analytics')}
          onMouseEnter={onHover} onMouseLeave={onLeave}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--color-purple)" />
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{v(stats?.spurtiPoints)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>Spurti Points</div>
          <div style={{ fontSize: 11, color: 'var(--color-purple)', fontWeight: 600 }}>Earned via Community Q&A</div>
          <Sparkles size={80} color="var(--color-purple)" style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.06, pointerEvents: 'none' }} />
          <ChevronRight size={14} color="var(--color-purple)" style={{ position: 'absolute', top: 14, right: 14, opacity: 0.5 }} />
        </div>

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


function RecentFaqsList({ sort }: { sort: 'added' | 'recent' }) {
  const navigate = useNavigate();
  const { data, isLoading } = useFaqList({ sort, pageSize: 5 });
  // Single-expand: matches Browse FAQs accordion behaviour
  const [openId, setOpenId] = useState<string | null>(null);
  const toggleFaq = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  if (isLoading) return <div className="mod-card mod-card-blue" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>;
  if (!data || data.items.length === 0) return (
    <div className="mod-card mod-card-blue" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No FAQs yet.</div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {data.items.slice(0, 5).map((faq) => (
          <FaqCard
            key={faq.id}
            faq={faq}
            role="student"
            expanded={openId === faq.id}
            onToggle={() => toggleFaq(faq.id)}
          />
        ))}
      </div>
      <ViewAll onClick={() => navigate('/faqs')} />
    </>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {data.slice(0, 5).map((q) => {
          const qText = (!q.description || q.description.trim() === '' || q.description.trim().toLowerCase() === q.title.trim().toLowerCase()) ? q.title : q.description;
          const smIcon = q.status === 'open' ? <Circle size={12} /> : <CheckCircle2 size={12} />;
          const smColor = q.status === 'open' ? 'var(--color-primary)' : 'var(--color-success)';
          const smLabel = q.status.charAt(0).toUpperCase() + q.status.slice(1);
          const hrsSince = Math.floor((Date.now() - new Date(q.updatedAt).getTime()) / 3600000);
          const ago = hrsSince < 1 ? 'just now' : hrsSince < 24 ? `${hrsSince}hr${hrsSince === 1 ? '' : 's'} ago` : `${Math.floor(hrsSince / 24)}d ago`;
          return (
            <div
              key={q.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/community/${q.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/community/${q.id}`); } }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.borderColor = 'var(--color-primary)'; el.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--color-border)'; el.style.transform = 'none'; }}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '14px 18px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.15s',
                outline: 'none',
                userSelect: 'none',
              }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid var(--color-primary)'; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, marginBottom: 10, color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {qText}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 4 }}>
                {q.category && (
                  <><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontSize: 12, fontWeight: 500 }}><Folder size={12} /><span>{q.category.name}</span></span><span style={{ margin: '0 8px', color: 'var(--color-border)' }}>|</span></>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: smColor, fontSize: 12, fontWeight: 500 }}>{smIcon}<span>{smLabel}</span></span>
                <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>|</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}><MessageSquare size={12} /><span>{q.answerCount} response{q.answerCount === 1 ? '' : 's'}</span></span>
                <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>|</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}><User size={12} /><span>by {q.author.name}</span></span>
                <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>|</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}><Clock size={12} /><span>{ago}</span></span>
              </div>
            </div>
          );
        })}
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
