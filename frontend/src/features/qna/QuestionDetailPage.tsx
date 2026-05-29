// Question detail (community thread).
//
// Behavior:
//  - Loads question + answers.
//  - Students see only approved answers, sorted by upvoteCount desc.
//  - Progressive reveal (Change Spec §5.5): show top 1 by default, "Show more" → top 3, "Show all" → up to 10.
//  - Pre-answer prompt (Change Spec §5.5): asks "Is the top answer correct?" before opening the form.
//  - Server-side cap of 10 enforced; UI also disables the form once reached.
//  - Upvote/downvote on approved answers (own answers can't be voted on; server enforces).
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp, ThumbsDown, ThumbsUp } from 'lucide-react';
import { COMMUNITY_ANSWER_CAP } from '@samagama/shared';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthProvider';
import { useAnswers, useQuestion, useSubmitAnswer, useVoteAnswer } from './queries';

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: question, isLoading: qLoading } = useQuestion(id);
  const { data: answers, isLoading: aLoading } = useAnswers(id);

  // Progressive reveal state.
  const [reveal, setReveal] = useState<'top' | 'three' | 'all'>('top');

  // Pre-answer prompt state.
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

  if (qLoading) {
    return <Card>Loading…</Card>;
  }
  if (!question) {
    return <Card>Question not found.</Card>;
  }

  const isOwnQuestion = user?.id === question.author.id;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          marginBottom: 12,
          fontFamily: 'inherit',
        }}
      >
        <ChevronLeft size={14} /> Back
      </button>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          {question.category && <Badge color="accent">{question.category.name}</Badge>}
          <Badge color={question.type === 'personal' ? 'warning' : 'default'}>
            {question.type}
          </Badge>
          <Badge color={statusColor(question.status)}>{question.status}</Badge>
        </div>
        {/* Spec: hide the title; show the description verbatim. */}
        <div
          style={{
            fontSize: 15,
            color: 'var(--color-text)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            fontWeight: 500,
          }}
        >
          {question.description}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Asked by {question.author.name}
        </div>
      </Card>

      {question.type === 'personal' ? (
        <Card>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Personal questions are answered directly by moderators. Peer answers are not enabled for
            this thread.
          </div>
        </Card>
      ) : (
        <>
          {/* Answers — only visible when answers exist; behind a dropdown toggle (Spec). */}
          {!aLoading && allApprovedCount === 0 ? (
            <Card style={{ textAlign: 'center', padding: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                No approved answers yet
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Be the first to share what worked for you.
              </div>
            </Card>
          ) : (
            <AnswerDropdown
              count={allApprovedCount}
              cap={COMMUNITY_ANSWER_CAP}
              isLoading={aLoading}
              answers={visibleAnswers}
              questionId={question.id}
              userId={user?.id}
              hiddenCount={allApprovedCount - visibleAnswers.length}
              reveal={reveal}
              setReveal={setReveal}
            />
          )}

          {/* Answer authoring */}
          {!isOwnQuestion && question.status !== 'resolved' && question.status !== 'archived' && (
            <div style={{ marginTop: 16 }}>
              {capReached ? (
                <Card>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    This question has reached the maximum number of answers ({COMMUNITY_ANSWER_CAP}
                    ). You can still upvote or downvote existing answers.
                  </div>
                </Card>
              ) : !showAnswerForm ? (
                <Button onClick={() => setShowAnswerForm(true)}>Answer</Button>
              ) : (
                <AnswerPopup
                  questionId={question.id}
                  showConfirmation={allApprovedCount > 0}
                  onClose={() => {
                    setShowAnswerForm(false);
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnswerDropdown({
  count,
  cap,
  isLoading,
  answers,
  questionId,
  userId,
  hiddenCount,
  reveal,
  setReveal,
}: {
  count: number;
  cap: number;
  isLoading: boolean;
  answers: import('@samagama/shared').PublicAnswer[];
  questionId: string;
  userId: string | undefined;
  hiddenCount: number;
  reveal: 'top' | 'three' | 'all';
  setReveal: (r: 'top' | 'three' | 'all') => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          marginBottom: open ? 12 : 16,
        }}
      >
        <span>
          {count}/{cap} approved answer{count === 1 ? '' : 's'}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <>
          {isLoading && <Card>Loading answers…</Card>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {answers.map((a) => (
              <AnswerCard
                key={a.id}
                answer={a}
                questionId={questionId}
                canVote={!!userId && userId !== a.author.id}
              />
            ))}
          </div>
          {hiddenCount > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {reveal === 'top' && count > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setReveal('three')}>
                  Show top 3
                </Button>
              )}
              {(reveal === 'top' || reveal === 'three') && count > 3 && (
                <Button variant="ghost" size="sm" onClick={() => setReveal('all')}>
                  Show all ({count})
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnswerPopup({
  questionId,
  showConfirmation,
  onClose,
}: {
  questionId: string;
  showConfirmation: boolean;
  onClose: () => void;
}) {
  const [confirmedAnswersInadequate, setConfirmedAnswersInadequate] = useState(!showConfirmation);
  const [assumeCorrect, setAssumeCorrect] = useState(false);
  const submit = useSubmitAnswer(questionId);
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (body.trim().length < 10) {
      setBodyError('Please write at least 10 characters.');
      return;
    }
    if (!assumeCorrect) {
      setBodyError('Please confirm that you believe your answer is correct.');
      return;
    }
    setBodyError(null);
    await submit.mutateAsync({ body });
    setBody('');
    onClose();
  };

  return (
    <Card
      style={{
        borderColor: 'var(--color-primary)',
        background: 'var(--color-card)',
      }}
    >
      {/* Spec: confirmation popup before allowing the answer form. */}
      {showConfirmation && !confirmedAnswersInadequate && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            Are you sure the existing answers are not up to the mark?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              No, the existing answers are fine
            </Button>
            <Button size="sm" onClick={() => setConfirmedAnswersInadequate(true)}>
              Yes, I'll add a new answer
            </Button>
          </div>
        </div>
      )}

      {confirmedAnswersInadequate && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Your answer
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Share what worked for you. Be specific and link to official sources where possible."
            style={{
              width: '100%',
              background: 'var(--color-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 12px',
              color: 'var(--color-text)',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              fontSize: 12,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={assumeCorrect}
              onChange={(e) => setAssumeCorrect(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            I assume that the answer I provided is correct.
          </label>

          {bodyError && (
            <div role="alert" style={{ marginTop: 8, fontSize: 12, color: 'var(--color-danger)' }}>
              {bodyError}
            </div>
          )}
          {submit.isError && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
              }}
            >
              {submit.error instanceof Error ? submit.error.message : 'Could not submit answer'}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
            Your answer will be reviewed by a moderator before it appears publicly.
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submit.isPending || !assumeCorrect || body.trim().length < 10}
            >
              {submit.isPending ? 'Submitting…' : 'Submit answer'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function AnswerCard({
  answer,
  questionId,
  canVote,
}: {
  answer: import('@samagama/shared').PublicAnswer;
  questionId: string;
  canVote: boolean;
}) {
  const vote = useVoteAnswer(questionId);
  return (
    <Card>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text)',
        }}
      >
        {answer.body}
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          by {answer.author.name}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <VoteButton
            disabled={!canVote || vote.isPending}
            active={answer.myVote === 'up'}
            onClick={() => vote.mutate({ answerId: answer.id, direction: 'up' })}
          >
            <ThumbsUp size={12} /> {answer.upvoteCount}
          </VoteButton>
          <VoteButton
            disabled={!canVote || vote.isPending}
            active={answer.myVote === 'down'}
            onClick={() => vote.mutate({ answerId: answer.id, direction: 'down' })}
          >
            <ThumbsDown size={12} /> {answer.downvoteCount}
          </VoteButton>
        </div>
      </div>
    </Card>
  );
}

function VoteButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 16,
        background: active ? 'var(--color-primary-bg)' : 'transparent',
        color: active ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontSize: 11,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function statusColor(
  status: import('@samagama/shared').QuestionStatus,
): 'accent' | 'warning' | 'success' | 'default' {
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
