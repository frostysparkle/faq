import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, ChevronLeft, ChevronRight,
  Clock, ThumbsDown, ThumbsUp, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import { COMMUNITY_ANSWER_CAP } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../auth/AuthProvider';
import { useAnswers, useQuestion, useSubmitAnswer, useVoteAnswer } from './queries';

const ANSWERS_PER_PAGE = 5;

// ─── Avatar colour palette (picked by name hash) ──────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#EDE9FE', fg: '#7C3AED' },
  { bg: '#D1FAE5', fg: '#059669' },
  { bg: '#FEF3C7', fg: '#D97706' },
  { bg: '#DBEAFE', fg: '#2563EB' },
  { bg: '#FEE2E2', fg: '#DC2626' },
  { bg: '#FCE7F3', fg: '#DB2777' },
  { bg: '#E0F2FE', fg: '#0284C7' },
];

function avatarColor(name: string) {
  const idx = ((name.charCodeAt(0) ?? 0) + (name.charCodeAt(1) ?? 0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}hr${hr === 1 ? '' : 's'} ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} at ${time}`;
}

function statusTextColor(status: string): string {
  switch (status) {
    case 'resolved': return 'var(--color-success)';
    case 'answered': return '#d97706';
    case 'open':     return 'var(--color-primary)';
    default:         return 'var(--color-text-muted)';
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── QuestionDetailPage ───────────────────────────────────────────────────────

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: question, isLoading: qLoading } = useQuestion(id);
  const { data: answers, isLoading: aLoading } = useAnswers(id);
  const [page, setPage] = useState(1);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const totalAnswers = answers?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalAnswers / ANSWERS_PER_PAGE));
  const pagedAnswers = (answers ?? []).slice((page - 1) * ANSWERS_PER_PAGE, page * ANSWERS_PER_PAGE);
  const capReached = totalAnswers >= COMMUNITY_ANSWER_CAP;
  const alreadyAnswered = answers?.some((a) => a.author.id === user?.id) ?? false;

  // Reset to page 1 whenever answers list changes
  useEffect(() => { setPage(1); }, [totalAnswers]);

  if (qLoading) return <div className="mod-card mod-card-blue" style={{ padding: 16 }}>Loading…</div>;
  if (!question) return <div className="mod-card mod-card-red" style={{ padding: 16 }}>Question not found.</div>;

  const isOwnQuestion = user?.id === question.author.id;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Back ── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)', fontSize: 13,
          marginBottom: 28, fontFamily: 'inherit', fontWeight: 500,
          padding: '4px 0',
        }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* ── Title ── */}
      <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text)', marginBottom: 14, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
        {question.title}
      </h1>

      {/* ── Meta row: Asked by · Date · Type · Status ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 14, color: 'var(--color-text-muted)', flexWrap: 'wrap', marginBottom: 20, rowGap: 4 }}>
        <span>Asked by&nbsp;<strong style={{ color: 'var(--color-text)' }}>{question.author.name}</strong></span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>{formatDate(question.createdAt)}</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{capitalize(question.type)}</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span style={{ color: statusTextColor(question.status), fontWeight: 600 }}>{capitalize(question.status)}</span>
        {question.category && (
          <>
            <span style={{ margin: '0 8px' }}>·</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{question.category.name}</span>
          </>
        )}
      </div>

      {/* ── Description (if distinct from title) ── */}
      {question.description &&
       question.description.trim() &&
       question.description.trim().toLowerCase() !== question.title.trim().toLowerCase() && (
        <div style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
          {question.description}
        </div>
      )}

      {/* ── Screenshot ── */}
      {question.screenshotUrl && (
        <div style={{ marginBottom: 20 }}>
          <ImageThumbnail src={question.screenshotUrl} onClick={() => { setZoom(1); setLightboxOpen(true); }} />
        </div>
      )}
      {lightboxOpen && question.screenshotUrl && (
        <ImageLightbox
          src={question.screenshotUrl}
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 3))}
          onZoomOut={() => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25))}
          onClose={() => { setLightboxOpen(false); setZoom(1); }}
        />
      )}

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 28 }} />

      {/* ── Personal question answers ── */}
      {question.type === 'personal' ? (
        <>
          {aLoading && (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', paddingBottom: 24 }}>Loading response…</div>
          )}
          {!aLoading && answers && answers.filter((a) => a.status === 'approved').length > 0
            ? answers.filter((a) => a.status === 'approved').map((a) => (
                <AnswerCard key={a.id} answer={a} questionId={question.id} canVote={false} voteMutationKey={question.id} />
              ))
            : !aLoading && (
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)', paddingBottom: 28 }}>
                  Personal questions are answered directly by moderators. A response will appear here once a moderator replies.
                </div>
              )
          }
        </>
      ) : (
        <>
          {/* ── Community answers ── */}
          {aLoading && (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', paddingBottom: 24 }}>Loading answers…</div>
          )}
          {!aLoading && totalAnswers === 0 && (
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)', paddingBottom: 28 }}>
              No answers yet — be the first to share what worked for you.
            </div>
          )}
          {pagedAnswers.map((a) => (
            <AnswerCard
              key={a.id}
              answer={a}
              questionId={question.id}
              canVote={!!user?.id && user.id !== a.author.id}
              voteMutationKey={question.id}
            />
          ))}
          {totalPages > 1 && (
            <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
          )}

          {/* ── Submit answer ── */}
          {!isOwnQuestion && question.status !== 'resolved' && question.status !== 'archived' && (
            alreadyAnswered ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-success)', padding: '10px 14px', background: 'var(--color-success-bg, #f0fdf4)', borderRadius: 8, border: '1px solid var(--color-success)', marginBottom: 8, fontWeight: 600 }}>
                <Clock size={14} />
                You've already submitted an answer — it's pending moderation.
              </div>
            ) : capReached ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 12px', background: 'var(--color-input)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 8 }}>
                Max {COMMUNITY_ANSWER_CAP} answers reached — you can still vote on existing answers.
              </div>
            ) : !showAnswerForm ? (
              <button
                onClick={() => setShowAnswerForm(true)}
                style={{
                  marginTop: 8, padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: 'var(--color-success)', color: 'white',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                Answer this question
              </button>
            ) : (
              <AnswerPopup
                questionId={question.id}
                showConfirmation={totalAnswers > 0}
                onClose={() => setShowAnswerForm(false)}
              />
            )
          )}
        </>
      )}
    </div>
  );
}

// ─── AnswerCard ───────────────────────────────────────────────────────────────

function AnswerCard({ answer, questionId: _questionId, canVote, voteMutationKey }: {
  answer: import('@samagama/shared').PublicAnswer;
  questionId: string;
  canVote: boolean;
  voteMutationKey: string;
}) {
  const vote = useVoteAnswer(voteMutationKey);
  const color = avatarColor(answer.author.name);
  const isApproved = answer.status === 'approved';

  return (
    <div style={{ paddingBottom: 28 }}>
      {/* ── Answer body ── */}
      <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text)', whiteSpace: 'pre-wrap', marginBottom: 18 }}>
        {answer.body}
      </div>

      {/* ── Attribution row: avatar · Answered by Name · ✓ Approved · time ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 14, color: 'var(--color-text-muted)', flexWrap: 'wrap', rowGap: 4 }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: color.bg, color: color.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, marginRight: 8,
        }}>
          {answer.author.name.charAt(0).toUpperCase()}
        </div>

        <span>Answered by&nbsp;<strong style={{ color: 'var(--color-text)' }}>{answer.author.name}</strong></span>

        {isApproved ? (
          <>
            <span style={{ margin: '0 8px' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-success)', fontWeight: 600 }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
              Approved by Moderator
            </span>
          </>
        ) : (
          <>
            <span style={{ margin: '0 8px' }}>·</span>
            <Badge color="default">{capitalize(answer.status)}</Badge>
            {canVote && (
              <>
                <span style={{ margin: '0 8px' }}>·</span>
                <button
                  onClick={() => !vote.isPending && vote.mutate({ answerId: answer.id, direction: 'up' })}
                  disabled={vote.isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', color: answer.myVote === 'up' ? 'var(--color-success)' : 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, transition: 'color 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-success)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = answer.myVote === 'up' ? 'var(--color-success)' : 'var(--color-text-muted)'; }}
                >
                  <ThumbsUp size={13} strokeWidth={answer.myVote === 'up' ? 2.5 : 1.8} fill={answer.myVote === 'up' ? 'var(--color-success)' : 'none'} />
                  {answer.upvoteCount}
                </button>
                <button
                  onClick={() => !vote.isPending && vote.mutate({ answerId: answer.id, direction: 'down' })}
                  disabled={vote.isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', color: answer.myVote === 'down' ? 'var(--color-danger)' : 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, transition: 'color 0.15s', marginLeft: 8 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = answer.myVote === 'down' ? 'var(--color-danger)' : 'var(--color-text-muted)'; }}
                >
                  <ThumbsDown size={13} strokeWidth={answer.myVote === 'down' ? 2.5 : 1.8} fill={answer.myVote === 'down' ? 'var(--color-danger)' : 'none'} />
                  {answer.downvoteCount}
                </button>
              </>
            )}
          </>
        )}

        <span style={{ margin: '0 8px' }}>·</span>
        <span>{timeAgo(answer.createdAt)}</span>
      </div>

      {/* ── Bottom divider ── */}
      <div style={{ height: 1, background: 'var(--color-border)', marginTop: 28 }} />
    </div>
  );
}

// ─── PaginationBar ────────────────────────────────────────────────────────────

function PaginationBar({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 8, border: '1px solid var(--color-border)',
    background: 'var(--color-card)', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', color: 'var(--color-text-muted)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
      {/* Prev */}
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1 }}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} style={{ ...btnBase, cursor: 'default', border: 'none', background: 'none' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            style={{
              ...btnBase,
              background: page === p ? 'var(--color-primary)' : 'var(--color-card)',
              color: page === p ? 'white' : 'var(--color-text-muted)',
              borderColor: page === p ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{ ...btnBase, opacity: page === totalPages ? 0.4 : 1 }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── AnswerPopup ──────────────────────────────────────────────────────────────

function AnswerPopup({ questionId, showConfirmation, onClose }: { questionId: string; showConfirmation: boolean; onClose: () => void }) {
  const [confirmedAnswersInadequate, setConfirmedAnswersInadequate] = useState(!showConfirmation);
  const [assumeCorrect, setAssumeCorrect] = useState(false);
  const submit = useSubmitAnswer(questionId);
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (body.trim().length < 10) { setBodyError('Please write at least 10 characters.'); return; }
    if (!assumeCorrect) { setBodyError('Please confirm that you believe your answer is correct.'); return; }
    setBodyError(null);
    await submit.mutateAsync({ body });
    setBody('');
    onClose();
  };

  return (
    <div
      style={{
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 14, padding: '18px 20px',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>Your Answer</div>
      {showConfirmation && !confirmedAnswersInadequate ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text)' }}>
            Are you sure the existing answers are not up to the mark?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>No, existing are fine</Button>
            <Button size="sm" onClick={() => setConfirmedAnswersInadequate(true)}>Yes, I'll add one</Button>
          </div>
        </div>
      ) : (
        <div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Share what worked for you. Be specific and link to official sources where possible."
            style={{
              width: '100%', background: 'var(--color-input)',
              border: '1.5px solid var(--color-border)', borderRadius: 8,
              padding: '8px 12px', color: 'var(--color-text)',
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={assumeCorrect} onChange={(e) => setAssumeCorrect(e.target.checked)} style={{ accentColor: 'var(--color-success)' }} />
            I believe my answer is correct.
          </label>
          {bodyError && <div role="alert" style={{ marginTop: 6, fontSize: 12, color: 'var(--color-danger)' }}>{bodyError}</div>}
          {submit.isError && (
            <div role="alert" style={{ marginTop: 6, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>
              {submit.error instanceof Error ? submit.error.message : 'Could not submit answer'}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Visible immediately · reviewed by moderator</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submit.isPending || !assumeCorrect || body.trim().length < 10}>
                {submit.isPending ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Image thumbnail ──────────────────────────────────────────────────────────

function ImageThumbnail({ src, onClick }: { src: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', display: 'inline-block', cursor: 'zoom-in',
        borderRadius: 10, overflow: 'hidden',
        border: '1.5px solid var(--color-border)',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.14)' : '0 1px 4px rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.15s',
      }}
    >
      <img
        src={src} alt="Question attachment"
        style={{ display: 'block', width: 'auto', height: 110, maxWidth: 180, objectFit: 'cover', transition: 'opacity 0.15s', opacity: hovered ? 0.85 : 1 }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).closest('div')!.style.display = 'none'; }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.28)', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: 'none' }}>
        <ZoomIn size={22} color="white" />
      </div>
    </div>
  );
}

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, zoom, onZoomIn, onZoomOut, onClose }: {
  src: string; zoom: number;
  onZoomIn: () => void; onZoomOut: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') onZoomIn();
      if (e.key === '-') onZoomOut();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, onZoomIn, onZoomOut]);

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38, borderRadius: 10,
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.15s',
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ position: 'fixed', top: 18, right: 20, display: 'flex', alignItems: 'center', gap: 8, zIndex: 9001 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button style={btnStyle} title="Zoom out (−)" onClick={onZoomOut} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}><ZoomOut size={17} /></button>
        <button style={btnStyle} title="Zoom in (+)" onClick={onZoomIn} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.28)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}><ZoomIn size={17} /></button>
        <button style={{ ...btnStyle, background: 'rgba(220,38,38,0.5)', border: '1px solid rgba(220,38,38,0.6)' }} title="Close (Esc)" onClick={onClose} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.75)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.5)'; }}><X size={17} /></button>
      </div>
      <div style={{ overflow: 'auto', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={src} alt="Attachment preview" draggable={false}
          style={{ display: 'block', maxWidth: '85vw', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
        />
      </div>
    </div>
  );
}
