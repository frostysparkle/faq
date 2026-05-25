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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ThumbsDown, ThumbsUp } from 'lucide-react';
import { answerCreateSchema, COMMUNITY_ANSWER_CAP, type AnswerCreateInput } from '@samagama/shared';
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
  const [askedPrompt, setAskedPrompt] = useState(false);
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {question.category && <Badge color="accent">{question.category.name}</Badge>}
          <Badge color={question.type === 'personal' ? 'warning' : 'default'}>
            {question.type}
          </Badge>
          <Badge color={statusColor(question.status)}>{question.status}</Badge>
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}>{question.title}</h1>
        <div
          style={{
            fontSize: 13,
            color: 'var(--color-text)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Answers ({allApprovedCount}/{COMMUNITY_ANSWER_CAP})
            </h2>
          </div>

          {aLoading && <Card>Loading answers…</Card>}

          {!aLoading && allApprovedCount === 0 && (
            <Card style={{ textAlign: 'center', padding: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                No approved answers yet
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Be the first to share what worked for you.
              </div>
            </Card>
          )}

          {visibleAnswers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {visibleAnswers.map((a) => (
                <AnswerCard
                  key={a.id}
                  answer={a}
                  questionId={question.id}
                  canVote={!!user && user.id !== a.author.id}
                />
              ))}
            </div>
          )}

          {/* Progressive reveal controls */}
          {allApprovedCount > visibleAnswers.length && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {reveal === 'top' && allApprovedCount > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setReveal('three')}>
                  Show top 3
                </Button>
              )}
              {(reveal === 'top' || reveal === 'three') && allApprovedCount > 3 && (
                <Button variant="ghost" size="sm" onClick={() => setReveal('all')}>
                  Show all ({allApprovedCount})
                </Button>
              )}
            </div>
          )}

          {/* Answer authoring */}
          {!isOwnQuestion && question.status !== 'resolved' && question.status !== 'archived' && (
            <Card style={{ marginTop: 16 }}>
              {capReached ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  This question has reached the maximum number of answers ({COMMUNITY_ANSWER_CAP}).
                  You can still upvote or downvote existing answers.
                </div>
              ) : !askedPrompt && allApprovedCount > 0 ? (
                <PreAnswerPrompt
                  onYes={() => {
                    setAskedPrompt(true);
                    setShowAnswerForm(false);
                  }}
                  onNo={() => {
                    setAskedPrompt(true);
                    setShowAnswerForm(true);
                  }}
                />
              ) : showAnswerForm || allApprovedCount === 0 ? (
                <AnswerForm questionId={question.id} />
              ) : (
                <Button onClick={() => setShowAnswerForm(true)}>Add an answer</Button>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PreAnswerPrompt({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
        Is the top-voted answer correct?
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="success" size="sm" onClick={onYes}>
          Yes, it answered my question
        </Button>
        <Button variant="ghost" size="sm" onClick={onNo}>
          No, I have a different answer
        </Button>
      </div>
    </div>
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

function AnswerForm({ questionId }: { questionId: string }) {
  const submit = useSubmitAnswer(questionId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnswerCreateInput>({ resolver: zodResolver(answerCreateSchema) });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await submit.mutateAsync(values);
        reset();
      })}
    >
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
        Your answer
      </label>
      <textarea
        rows={4}
        {...register('body')}
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
      {errors.body && (
        <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>
          {errors.body.message}
        </div>
      )}
      {submit.isError && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            borderRadius: 8,
            padding: '8px 12px',
            marginTop: 8,
            fontSize: 13,
          }}
        >
          {submit.error instanceof Error ? submit.error.message : 'Could not submit answer'}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Your answer will be reviewed by a moderator before it appears publicly.
      </div>
      <Button type="submit" disabled={isSubmitting || submit.isPending} style={{ marginTop: 10 }}>
        {submit.isPending ? 'Submitting…' : 'Submit answer'}
      </Button>
    </form>
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
