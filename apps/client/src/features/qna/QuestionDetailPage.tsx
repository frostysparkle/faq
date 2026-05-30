import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, MessageSquare, ThumbsDown, ThumbsUp, Check } from 'lucide-react';
import { COMMUNITY_ANSWER_CAP } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../auth/AuthProvider';
import { useAnswers, useQuestion, useSubmitAnswer, useVoteAnswer } from './queries';

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: question, isLoading: qLoading } = useQuestion(id);
  const { data: answers, isLoading: aLoading } = useAnswers(id);
  const [reveal, setReveal] = useState<'top' | 'three' | 'all'>('top');
  const [showAnswerForm, setShowAnswerForm] = useState(false);

  const visibleAnswers = useMemo(() => {
    if (!answers) return [];
    const approved = answers.filter((a) => a.status === 'approved');
    if (reveal === 'top') return approved.slice(0, 1);
    if (reveal === 'three') return approved.slice(0, 3);
    return approved.slice(0, COMMUNITY_ANSWER_CAP);
  }, [answers, reveal]);

  const allApprovedCount = answers?.filter((a) => a.status === 'approved').length ?? 0;
  const totalAnswers = answers?.length ?? 0;
  const capReached = totalAnswers >= COMMUNITY_ANSWER_CAP;

  if (qLoading) return <div className="mod-card mod-card-blue" style={{ padding: 24 }}>Loading…</div>;
  if (!question) return <div className="mod-card mod-card-red" style={{ padding: 24 }}>Question not found.</div>;

  const isOwnQuestion = user?.id === question.author.id;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 14, fontFamily: 'inherit' }}>
        <ChevronLeft size={14} /> Back
      </button>

      {/* Question card */}
      <div className="mod-card mod-card-blue" style={{ marginBottom: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={17} color="var(--color-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>Community Question</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {question.category && <Badge color="accent">{question.category.name}</Badge>}
            <Badge color={question.type === 'personal' ? 'warning' : 'default'}>{question.type}</Badge>
            <Badge color={statusColor(question.status)}>{question.status}</Badge>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px 20px' }}>
          <div style={{ fontSize: 15, color: 'var(--color-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
            {question.description}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
            Asked by <strong>{question.author.name}</strong>
          </div>
        </div>
      </div>

      {question.type === 'personal' ? (
        <div className="mod-card mod-card-purple" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Personal questions are answered directly by moderators. Peer answers are not enabled for this thread.
          </div>
        </div>
      ) : (
        <>
          {!aLoading && allApprovedCount === 0 ? (
            <div className="mod-card mod-card-green" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <MessageSquare size={22} color="var(--color-success)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No approved answers yet</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Be the first to share what worked for you.</div>
            </div>
          ) : (
            <AnswerDropdown
              count={allApprovedCount} cap={COMMUNITY_ANSWER_CAP}
              isLoading={aLoading} answers={visibleAnswers}
              questionId={question.id} userId={user?.id}
              hiddenCount={allApprovedCount - visibleAnswers.length}
              reveal={reveal} setReveal={setReveal}
            />
          )}

          {!isOwnQuestion && question.status !== 'resolved' && question.status !== 'archived' && (
            <div style={{ marginTop: 16 }}>
              {capReached ? (
                <div className="mod-card mod-card-orange" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    This question has reached the maximum of {COMMUNITY_ANSWER_CAP} answers. You can still upvote or downvote existing answers.
                  </div>
                </div>
              ) : !showAnswerForm ? (
                <button onClick={() => setShowAnswerForm(true)} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'var(--color-success)', color: 'white',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                }}>
                  Answer this question
                </button>
              ) : (
                <AnswerPopup questionId={question.id} showConfirmation={allApprovedCount > 0} onClose={() => setShowAnswerForm(false)} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnswerDropdown({ count, cap, isLoading, answers, questionId, userId, hiddenCount, reveal, setReveal }: {
  count: number; cap: number; isLoading: boolean;
  answers: import('@samagama/shared').PublicAnswer[];
  questionId: string; userId: string | undefined;
  hiddenCount: number; reveal: 'top' | 'three' | 'all';
  setReveal: (r: 'top' | 'three' | 'all') => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={16} color="var(--color-success)" />
        </div>
        <button onClick={() => setOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Answers ({count}/{cap})
          </span>
          {open ? <ChevronUp size={18} color="var(--color-text-muted)" /> : <ChevronDown size={18} color="var(--color-text-muted)" />}
        </button>
      </div>

      {open && (
        <>
          {isLoading && <div className="mod-card mod-card-green" style={{ padding: 20 }}>Loading answers…</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {answers.map((a) => <AnswerCard key={a.id} answer={a} questionId={questionId} canVote={!!userId && userId !== a.author.id} />)}
          </div>
          {hiddenCount > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {reveal === 'top' && count > 1 && <Button variant="ghost" size="sm" onClick={() => setReveal('three')}>Show top 3</Button>}
              {(reveal === 'top' || reveal === 'three') && count > 3 && <Button variant="ghost" size="sm" onClick={() => setReveal('all')}>Show all ({count})</Button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
    <div className="mod-card mod-card-green">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={17} color="var(--color-success)" />
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>Your Answer</span>
      </div>
      <div style={{ padding: '14px 20px 20px' }}>
        {showConfirmation && !confirmedAnswersInadequate ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Are you sure the existing answers are not up to the mark?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={onClose}>No, existing answers are fine</Button>
              <Button size="sm" onClick={() => setConfirmedAnswersInadequate(true)}>Yes, I'll add a new answer</Button>
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 7 }}>Your answer</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Share what worked for you. Be specific and link to official sources where possible."
              style={{ width: '100%', background: 'var(--color-input)', border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={assumeCorrect} onChange={(e) => setAssumeCorrect(e.target.checked)} style={{ accentColor: 'var(--color-success)' }} />
              I assume that the answer I provided is correct.
            </label>
            {bodyError && <div role="alert" style={{ marginTop: 8, fontSize: 12, color: 'var(--color-danger)' }}>{bodyError}</div>}
            {submit.isError && <div role="alert" style={{ marginTop: 8, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>{submit.error instanceof Error ? submit.error.message : 'Could not submit answer'}</div>}
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>Your answer will be reviewed by a moderator before it appears publicly.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submit.isPending || !assumeCorrect || body.trim().length < 10}>
                {submit.isPending ? 'Submitting…' : 'Submit answer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerCard({ answer, questionId, canVote }: { answer: import('@samagama/shared').PublicAnswer; questionId: string; canVote: boolean }) {
  const vote = useVoteAnswer(questionId);
  return (
    <div className="mod-card mod-card-green" style={{ padding: '16px 18px' }}>
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {answer.author.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{answer.author.name}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Badge color="success">approved</Badge>
        </div>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'var(--color-text)', marginBottom: 14 }}>{answer.body}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <VoteButton disabled={!canVote || vote.isPending} active={answer.myVote === 'up'} onClick={() => vote.mutate({ answerId: answer.id, direction: 'up' })}>
          <ThumbsUp size={12} /> {answer.upvoteCount}
        </VoteButton>
        <VoteButton disabled={!canVote || vote.isPending} active={answer.myVote === 'down'} onClick={() => vote.mutate({ answerId: answer.id, direction: 'down' })}>
          <ThumbsDown size={12} /> {answer.downvoteCount}
        </VoteButton>
      </div>
    </div>
  );
}

function VoteButton({ children, active, disabled, onClick }: { children: React.ReactNode; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20,
      background: active ? 'var(--color-success-bg)' : 'transparent',
      color: active ? 'var(--color-success)' : 'var(--color-text-muted)',
      border: `1.5px solid ${active ? 'var(--color-success)' : 'var(--color-border)'}`,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
      fontSize: 12, fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
    }}>{children}</button>
  );
}

function statusColor(status: import('@samagama/shared').QuestionStatus): 'accent' | 'warning' | 'success' | 'default' {
  switch (status) {
    case 'open': return 'accent';
    case 'answered': return 'warning';
    case 'resolved': return 'success';
    default: return 'default';
  }
}
