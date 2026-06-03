import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, ThumbsDown, ThumbsUp } from 'lucide-react';
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
  const [answersOpen, setAnswersOpen] = useState(true);

  const visibleAnswers = useMemo(() => {
    if (!answers) return [];
    if (reveal === 'top') return answers.slice(0, 1);
    if (reveal === 'three') return answers.slice(0, 3);
    return answers.slice(0, COMMUNITY_ANSWER_CAP);
  }, [answers, reveal]);

  const totalAnswers = answers?.length ?? 0;
  const capReached = totalAnswers >= COMMUNITY_ANSWER_CAP;

  if (qLoading) return <div className="mod-card mod-card-blue" style={{ padding: 16 }}>Loading…</div>;
  if (!question) return <div className="mod-card mod-card-red" style={{ padding: 16 }}>Question not found.</div>;

  const isOwnQuestion = user?.id === question.author.id;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 10, fontFamily: 'inherit' }}>
        <ChevronLeft size={14} /> Back
      </button>

      {/* ── Question card (prominent) ── */}
      <div className="mod-card mod-card-blue" style={{ padding: '16px 18px', marginBottom: 10 }}>
        {/* Badges row — category, tags, type, status */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          {question.category && <Badge color="accent">{question.category.name}</Badge>}
          {question.tags.map((t) => <Badge key={t.id}>#{t.name}</Badge>)}
          <Badge color={question.type === 'personal' ? 'warning' : 'default'}>{question.type}</Badge>
          <Badge color={statusColor(question.status)}>{question.status}</Badge>
        </div>

        {/* Question title */}
        {question.title && (
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.01em' }}>
            {question.title}
          </div>
        )}

        {/* Question description — only shown when non-empty and differs from the title */}
        {question.description &&
         question.description.trim() &&
         question.description.trim().toLowerCase() !== question.title.trim().toLowerCase() && (
          <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
            {question.description}
          </div>
        )}

        {/* Uploaded screenshot */}
        {question.screenshotUrl && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Attached image
            </div>
            <img
              src={question.screenshotUrl}
              alt="Question attachment"
              style={{
                maxWidth: '100%', maxHeight: 360, borderRadius: 10,
                border: '1px solid var(--color-border)',
                objectFit: 'contain', display: 'block',
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Meta */}
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          Asked by <strong>{question.author.name}</strong>
        </div>
      </div>

      {question.type === 'personal' ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '10px 14px', background: 'var(--color-input)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          Personal questions are answered directly by moderators. Peer answers are not enabled for this thread.
        </div>
      ) : (
        <>
          {/* ── Answers section ── */}
          <div className="mod-card mod-card-green" style={{ padding: '12px 16px', marginBottom: 10 }}>
            {/* Compact header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: answersOpen ? 10 : 0 }}>
              <button onClick={() => setAnswersOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                  Answers ({totalAnswers}/{COMMUNITY_ANSWER_CAP})
                </span>
                {answersOpen ? <ChevronUp size={14} color="var(--color-text-muted)" /> : <ChevronDown size={14} color="var(--color-text-muted)" />}
              </button>
              {/* Show more controls inline */}
              {answersOpen && totalAnswers > 1 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {reveal !== 'three' && totalAnswers > 1 && totalAnswers <= 3 || (reveal === 'top' && totalAnswers > 1) ? (
                    <Button variant="ghost" size="sm" onClick={() => setReveal('three')}>Show top 3</Button>
                  ) : null}
                  {(reveal === 'top' || reveal === 'three') && totalAnswers > 3 && (
                    <Button variant="ghost" size="sm" onClick={() => setReveal('all')}>Show all ({totalAnswers})</Button>
                  )}
                  {reveal !== 'top' && (
                    <Button variant="ghost" size="sm" onClick={() => setReveal('top')}>Show less</Button>
                  )}
                </div>
              )}
            </div>

            {answersOpen && (
              <>
                {aLoading && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>Loading answers…</div>}
                {!aLoading && totalAnswers === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '6px 0' }}>
                    No answers yet — be the first to share what worked for you.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {visibleAnswers.map((a) => (
                    <AnswerCard key={a.id} answer={a} questionId={question.id} canVote={!!user?.id && user.id !== a.author.id} voteMutationKey={question.id} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Answer this question ── */}
          {!isOwnQuestion && question.status !== 'resolved' && question.status !== 'archived' && (
            capReached ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 12px', background: 'var(--color-input)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 8 }}>
                Max {COMMUNITY_ANSWER_CAP} answers reached — you can still vote on existing answers.
              </div>
            ) : !showAnswerForm ? (
              <button onClick={() => setShowAnswerForm(true)} style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: 'var(--color-success)', color: 'white',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Answer this question
              </button>
            ) : (
              <AnswerPopup questionId={question.id} showConfirmation={totalAnswers > 0} onClose={() => setShowAnswerForm(false)} />
            )
          )}
        </>
      )}
    </div>
  );
}

function AnswerCard({ answer, questionId, canVote, voteMutationKey }: {
  answer: import('@samagama/shared').PublicAnswer;
  questionId: string;
  canVote: boolean;
  voteMutationKey: string;
}) {
  const vote = useVoteAnswer(voteMutationKey);
  return (
    <div style={{
      background: 'var(--color-input)', border: '1px solid var(--color-border)',
      borderLeft: '3px solid var(--color-success)',
      borderRadius: 8, padding: '10px 12px',
    }}>
      {/* Author + status + votes all on one row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {answer.author.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{answer.author.name}</span>
        <Badge color={answer.status === 'approved' ? 'success' : 'default'}>{answer.status}</Badge>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <VoteButton disabled={!canVote || vote.isPending} active={answer.myVote === 'up'} onClick={() => vote.mutate({ answerId: answer.id, direction: 'up' })}>
            <ThumbsUp size={11} /> {answer.upvoteCount}
          </VoteButton>
          <VoteButton disabled={!canVote || vote.isPending} active={answer.myVote === 'down'} onClick={() => vote.mutate({ answerId: answer.id, direction: 'down' })}>
            <ThumbsDown size={11} /> {answer.downvoteCount}
          </VoteButton>
        </div>
      </div>
      {/* Body */}
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{answer.body}</div>
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
    <div className="mod-card mod-card-green" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>Your Answer</div>
      {showConfirmation && !confirmedAnswersInadequate ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Are you sure the existing answers are not up to the mark?</div>
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
            style={{ width: '100%', background: 'var(--color-input)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={assumeCorrect} onChange={(e) => setAssumeCorrect(e.target.checked)} style={{ accentColor: 'var(--color-success)' }} />
            I believe my answer is correct.
          </label>
          {bodyError && <div role="alert" style={{ marginTop: 6, fontSize: 12, color: 'var(--color-danger)' }}>{bodyError}</div>}
          {submit.isError && <div role="alert" style={{ marginTop: 6, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>{submit.error instanceof Error ? submit.error.message : 'Could not submit answer'}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
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

function VoteButton({ children, active, disabled, onClick }: { children: React.ReactNode; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20,
      background: active ? 'var(--color-success-bg)' : 'transparent',
      color: active ? 'var(--color-success)' : 'var(--color-text-muted)',
      border: `1.5px solid ${active ? 'var(--color-success)' : 'var(--color-border)'}`,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
      fontSize: 11, fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
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
