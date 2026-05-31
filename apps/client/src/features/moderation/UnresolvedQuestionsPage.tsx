// Unresolved Questions — Dashboard Spec moderator entry point.
//
// Two subsections:
//   1. Personal Questions  → all personal-type questions regardless of status
//   2. Community Questions → ALL open community questions; questions with pending peer
//      answers show an inline review section (approve/reject with Spurti Points).
//
// Community subsection adds Dashboard Spec ergonomics:
//   - Multi-asker badge + click-to-reveal student names (taggedStudents from the API)
//   - "Prioritize multi-asker first" toggle
//   - Show More cycle: 1 → 3 → 10 answers (per-card)
import { useMemo, useState } from 'react';
import { CheckCircle, Edit, Users, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import {
  useApproveAnswer,
  usePendingAnswers,
  usePendingAnswersForQuestion,
  useQuestions,
  useRejectAnswer,
  useRespondToPersonal,
} from '../qna/queries';
import type { PendingAnswerSummary } from '../qna/api';
import type { PublicQuestion } from '@samagama/shared';

type Section = 'personal' | 'community';

export function UnresolvedQuestionsPage() {
  const [section, setSection] = useState<Section>('community');

  return (
    <div>
      <SectionHeader
        title="Unresolved Questions"
        sub="Personal questions from students · All community questions with inline answer review."
      />

      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <TabBtn active={section === 'personal'} onClick={() => setSection('personal')}>
          Personal Questions
        </TabBtn>
        <TabBtn active={section === 'community'} onClick={() => setSection('community')}>
          Community Questions
        </TabBtn>
      </div>

      {section === 'personal' && <PersonalQuestionsList />}
      {section === 'community' && <CommunityQueue />}
    </div>
  );
}

function PersonalQuestionsList() {
  // No status filter — moderators should see all personal questions regardless of status.
  // (Filtering to 'open' hid questions that had already been responded to or resolved.)
  const { data, isLoading } = useQuestions({ type: 'personal' });
  if (isLoading) return <Card>Loading…</Card>;
  if (!data || data.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No personal questions waiting.</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Direct messages from students appear here.
        </div>
      </Card>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((q) => (
        <PersonalQuestionRow key={q.id} question={q} />
      ))}
    </div>
  );
}

function PersonalQuestionRow({ question }: { question: PublicQuestion }) {
  const respond = useRespondToPersonal();
  const [body, setBody] = useState('');
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (body.trim().length < 10) return;
    await respond.mutateAsync({ questionId: question.id, body });
    setBody('');
    setOpen(false);
  };

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{question.title}</div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-text)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          marginBottom: 10,
        }}
      >
        {question.description}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          by {question.author.name}
        </div>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Respond
          </Button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your response. The student will see it appear under My Questions as 'Responded'."
            rows={5}
            minLength={10}
            maxLength={4000}
            style={{
              width: '100%',
              background: 'var(--color-input)',
              border: '1px solid var(--color-primary)',
              borderRadius: 8,
              padding: 10,
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--color-text)',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {respond.error && (
            <div
              role="alert"
              style={{
                marginTop: 6,
                fontSize: 12,
                color: 'var(--color-danger)',
              }}
            >
              {respond.error instanceof Error ? respond.error.message : 'Could not submit response'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setBody('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={respond.isPending || body.trim().length < 10}
            >
              {respond.isPending ? 'Sending…' : 'Send response'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CommunityQueue() {
  // Fetch all community questions (not just ones with pending answers) so the
  // moderator can see every question posted by students, including those with
  // no peer answers yet. Pending answers are fetched alongside to enable inline
  // review without a separate navigation step.
  const { data: questions, isLoading: qLoading } = useQuestions({ type: 'community' });
  const { data: pendingAnswers, isLoading: pLoading } = usePendingAnswers();
  const [prioritize, setPrioritize] = useState(true);

  // Group pending answers by questionId so each question card knows its queue.
  const pendingByQuestion = useMemo(() => {
    const map = new Map<string, PendingAnswerSummary[]>();
    (pendingAnswers ?? []).forEach((a) => {
      const list = map.get(a.questionId) ?? [];
      list.push(a);
      map.set(a.questionId, list);
    });
    return map;
  }, [pendingAnswers]);

  const sorted = useMemo(() => {
    if (!questions) return [];
    return [...questions].sort((a, b) => {
      if (prioritize) {
        // Multi-asker questions (most taggedStudents) first, then by pending answers, then date.
        const aTagged = pendingByQuestion.get(a.id)?.[0]?.taggedStudents.length ?? 0;
        const bTagged = pendingByQuestion.get(b.id)?.[0]?.taggedStudents.length ?? 0;
        if (aTagged !== bTagged) return bTagged - aTagged;
        const aPending = pendingByQuestion.has(a.id) ? 1 : 0;
        const bPending = pendingByQuestion.has(b.id) ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [questions, pendingByQuestion, prioritize]);

  const isLoading = qLoading || pLoading;
  const pendingCount = pendingAnswers?.length ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {questions ? `${questions.length} question${questions.length === 1 ? '' : 's'}` : ''}
          {pendingCount > 0 ? ` · ${pendingCount} pending peer answer${pendingCount === 1 ? '' : 's'} awaiting review` : ''}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={prioritize}
            onChange={(e) => setPrioritize(e.target.checked)}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          Prioritize questions asked by multiple students
        </label>
      </div>

      {isLoading && <Card>Loading…</Card>}
      {!isLoading && sorted.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No community questions yet.</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Questions posted by students will appear here.
          </div>
        </Card>
      )}
      {sorted.map((q) => (
        <CommunityQuestionCard
          key={q.id}
          question={q}
          pendingAnswers={pendingByQuestion.get(q.id) ?? []}
        />
      ))}
    </div>
  );
}

/** Characters shown before a "Read more" link appears (~2–3 lines at card width). */
const PREVIEW_LENGTH = 220;

function CommunityQuestionCard({
  question,
  pendingAnswers,
}: {
  question: PublicQuestion;
  pendingAnswers: PendingAnswerSummary[];
}) {
  const hasPending = pendingAnswers.length > 0;
  const [showAnswers, setShowAnswers] = useState(hasPending);
  const [showModAnswer, setShowModAnswer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modBody, setModBody] = useState('');
  const respond = useRespondToPersonal();

  // Show the full description as a single unified block — no separate title.
  const fullText = question.description;
  const isLong = fullText.length > PREVIEW_LENGTH;
  const displayText = isLong && !expanded ? fullText.slice(0, PREVIEW_LENGTH).trimEnd() : fullText;

  const submitModAnswer = async () => {
    if (modBody.trim().length < 10) return;
    await respond.mutateAsync({ questionId: question.id, body: modBody });
    setModBody('');
    setShowModAnswer(false);
  };

  return (
    <Card style={{ marginBottom: 10 }}>
      {/* ── Unified question text (no split title / description) ── */}
      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 8 }}>
        {displayText}
        {isLong && !expanded && (
          <span>
            {'… '}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              Read more
            </button>
          </span>
        )}
        {isLong && expanded && (
          <span>
            {' '}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              Show less
            </button>
          </span>
        )}
      </div>

      {/* ── Metadata + action buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          by {question.author.name} · {timeAgo(question.createdAt)} · {question.answerCount} peer answer{question.answerCount === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {hasPending && (
            <button
              type="button"
              onClick={() => setShowAnswers((v) => !v)}
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: showAnswers ? 'var(--color-primary)' : 'var(--color-input)', color: showAnswers ? 'white' : 'var(--color-text-muted)', border: '1px solid var(--color-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {showAnswers ? 'Hide' : 'Review'} {pendingAnswers.length} pending answer{pendingAnswers.length === 1 ? '' : 's'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowModAnswer((v) => !v)}
            style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: showModAnswer ? '#16a34a' : 'var(--color-input)', color: showModAnswer ? 'white' : 'var(--color-text-muted)', border: '1px solid #16a34a', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {showModAnswer ? 'Cancel' : 'Answer as moderator'}
          </button>
        </div>
      </div>

      {/* ── Moderator direct answer ── */}
      {showModAnswer && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Moderator answer — posted immediately, visible to all students
          </div>
          <textarea
            value={modBody}
            onChange={(e) => setModBody(e.target.value)}
            placeholder="Write your answer here. It will be approved immediately and visible to students."
            rows={5}
            maxLength={4000}
            style={{ width: '100%', background: 'var(--color-input)', border: '1px solid #16a34a', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          {respond.error && (
            <div role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>
              {respond.error instanceof Error ? respond.error.message : 'Could not submit answer'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => { setShowModAnswer(false); setModBody(''); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitModAnswer} disabled={respond.isPending || modBody.trim().length < 10}>
              {respond.isPending ? 'Posting…' : 'Post answer'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Inline pending-answer review ── */}
      {hasPending && showAnswers && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pendingAnswers.map((a) => (
            <ReviewCard key={a.id} answer={a} hideQuestionTitle />
          ))}
        </div>
      )}
    </Card>
  );
}

function ReviewCard({ answer, hideQuestionTitle = false }: { answer: PendingAnswerSummary; hideQuestionTitle?: boolean }) {
  const approve = useApproveAnswer();
  const reject = useRejectAnswer();

  // Show More cycle (Dashboard Spec): 1 (this card only) → 3 → 10 → back to 1.
  // When `reveal` is > 1, we fetch the additional pending answers on the same question.
  const [reveal, setReveal] = useState<1 | 3 | 10>(1);
  const cycleReveal = () => setReveal((n) => (n === 1 ? 3 : n === 3 ? 10 : 1));
  const fetchExtras = usePendingAnswersForQuestion(answer.questionId, reveal, reveal > 1);
  // The extras query returns ALL pending answers up to `limit`, including the one already
  // shown on this card. Filter that out so we only render the *additional* ones.
  const extras = (fetchExtras.data ?? []).filter((a) => a.id !== answer.id);

  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(answer.body);
  const [note, setNote] = useState('');
  const [spurtiPoints, setSpurtiPoints] = useState(5);
  const [showStudents, setShowStudents] = useState(false);

  const multiAsker = answer.taggedStudents.length > 0;

  return (
    <Card style={{ marginBottom: 0 }}>
      {!hideQuestionTitle && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
          Answer on:
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        {!hideQuestionTitle && (
          <div style={{ fontSize: 15, fontWeight: 600 }}>{answer.questionTitle}</div>
        )}
        {multiAsker && (
          <button
            type="button"
            onClick={() => setShowStudents((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 12,
              background: 'var(--color-primary-bg)',
              color: 'var(--color-primary-text)',
              border: '1px solid var(--color-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Users size={11} /> {answer.taggedStudents.length} student
            {answer.taggedStudents.length === 1 ? '' : 's'} asked
          </button>
        )}
      </div>

      {showStudents && multiAsker && (
        <div
          style={{
            background: 'var(--color-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}
        >
          {answer.taggedStudents.map((s) => s.name).join(', ')}
        </div>
      )}

      {editing ? (
        <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            background: 'var(--color-input)',
            border: '1px solid var(--color-primary)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
            fontSize: 13,
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      ) : (
        <div
          style={{
            background: 'var(--color-input)',
            border: '1px solid var(--color-border)',
            borderLeft: '3px solid var(--color-primary)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            color: 'var(--color-text)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {answer.body}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
        by {answer.author.name} · {timeAgo(answer.createdAt)}
      </div>

      {reveal > 1 && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              marginBottom: 8,
            }}
          >
            Other pending answers on this question
          </div>
          {fetchExtras.isLoading && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading…</div>
          )}
          {!fetchExtras.isLoading && extras.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              No other pending answers.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {extras.map((extra) => (
              <div
                key={extra.id}
                style={{
                  background: 'var(--color-input)',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--color-text)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    marginBottom: 4,
                  }}
                >
                  by {extra.author.name} · {timeAgo(extra.createdAt)}
                </div>
                {extra.body}
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (shown to author on rejection)"
        style={{
          width: '100%',
          background: 'var(--color-input)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 10,
          fontSize: 12,
          color: 'var(--color-text)',
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <label
          style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
        >
          Spurti Points on approval:
        </label>
        <input
          type="number"
          min={-1}
          max={5}
          step={1}
          value={spurtiPoints}
          onChange={(e) => setSpurtiPoints(Math.max(-1, Math.min(5, parseInt(e.target.value, 10) || 0)))}
          style={{
            width: 64,
            background: 'var(--color-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 13,
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            outline: 'none',
            textAlign: 'center',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>(-1 to 5)</span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <Button variant="ghost" size="sm" onClick={cycleReveal}>
          Show {reveal === 1 ? '+2 answers' : reveal === 3 ? 'all 10 answers' : 'top answer only'}
        </Button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="success"
            size="sm"
            disabled={approve.isPending}
            onClick={() =>
              approve.mutate(
                editing
                  ? { id: answer.id, editedBody, note: note || undefined, spurtiPoints }
                  : { id: answer.id, note: note || undefined, spurtiPoints },
              )
            }
          >
            <CheckCircle size={13} /> {editing ? 'Edit & Approve' : 'Approve'}
          </Button>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit size={13} /> Edit
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            disabled={reject.isPending}
            onClick={() => reject.mutate({ id: answer.id, note: note || undefined })}
          >
            <XCircle size={13} /> Reject
          </Button>
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
