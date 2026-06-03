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
import { BookOpen, CheckCircle, ChevronDown, ChevronUp, Edit, ThumbsDown, ThumbsUp, Users, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import {
  useAnswers,
  useApproveAnswer,
  useConvertAnswerToFaq,
  usePendingAnswers,
  useQuestions,
  useRejectAnswer,
  useRespondToPersonal,
  useRestoreQuestion,
  useTrash,
} from '../qna/queries';
import type { PendingAnswerSummary, TrashedQuestionRow } from '../qna/api';
import type { PublicAnswer, PublicQuestion } from '@samagama/shared';

type Section = 'personal' | 'community' | 'resolved' | 'trash';

/** Stable sort: upvotes desc → downvotes asc → original submission order. */
function rankAnswers(answers: PublicAnswer[]): PublicAnswer[] {
  return [...answers].sort((a, b) => {
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
    if (a.downvoteCount !== b.downvoteCount) return a.downvoteCount - b.downvoteCount;
    return 0;
  });
}

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
        <TabBtn active={section === 'resolved'} onClick={() => setSection('resolved')}>
          Resolved Questions
        </TabBtn>
        <TabBtn active={section === 'trash'} onClick={() => setSection('trash')}>
          Trash
        </TabBtn>
      </div>

      {section === 'personal' && <PersonalQuestionsList />}
      {section === 'community' && <CommunityQueue />}
      {section === 'resolved' && <ResolvedQuestionsSection />}
      {section === 'trash' && <TrashSection />}
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
      {/* Metadata badges */}
      {(question.category || question.tags.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {question.category && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
              {question.category.name}
            </span>
          )}
          {question.tags.map((t) => (
            <span key={t.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--color-input)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              #{t.name}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{question.title}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: question.screenshotUrl ? 10 : 10 }}>
        {question.description}
      </div>

      {/* Screenshot */}
      {question.screenshotUrl && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Attached image</div>
          <img
            src={question.screenshotUrl}
            alt="Question attachment"
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid var(--color-border)', objectFit: 'contain', display: 'block' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
  const [showAnswers, setShowAnswers] = useState(false);
  const [showModAnswer, setShowModAnswer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modBody, setModBody] = useState('');
  const [showStudents, setShowStudents] = useState(false);

  // taggedStudents is question-level data carried on each PendingAnswerSummary
  const taggedStudents = pendingAnswers[0]?.taggedStudents ?? [];
  const multiAsker = taggedStudents.length > 0;
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
      {/* ── Multi-asker badge (question-level) ── */}
      {multiAsker && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setShowStudents((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
              background: 'var(--color-primary-bg)', color: 'var(--color-primary-text)',
              border: '1px solid var(--color-primary)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Users size={11} /> {taggedStudents.length} student{taggedStudents.length === 1 ? '' : 's'} asked
          </button>
          {showStudents && (
            <div style={{
              background: 'var(--color-input)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: 10, marginTop: 6,
              fontSize: 12, color: 'var(--color-text-muted)',
            }}>
              {taggedStudents.map((s) => s.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* ── Category + tags ── */}
      {(question.category || question.tags.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {question.category && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
              {question.category.name}
            </span>
          )}
          {question.tags.map((t) => (
            <span key={t.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--color-input)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Unified question text ── */}
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

      {/* ── Uploaded screenshot ── */}
      {question.screenshotUrl && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Attached image</div>
          <img
            src={question.screenshotUrl}
            alt="Question attachment"
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid var(--color-border)', objectFit: 'contain', display: 'block' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

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
              {showAnswers ? 'Hide answers' : 'Review answers'}
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
        <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          <ReviewPanel answers={pendingAnswers} />
        </div>
      )}
    </Card>
  );
}

/** Selectable list of pending answers with two progressive-reveal dropdowns.
 *  Always shows the first answer; "+2 more" expands answers 2-3;
 *  "remaining N" expands answers 4+. Click any row to select it. */
function ReviewPanel({ answers }: { answers: PendingAnswerSummary[] }) {
  const approve = useApproveAnswer();
  const reject = useRejectAnswer();
  const convertToFaq = useConvertAnswerToFaq();

  const [selectedId, setSelectedId] = useState<string>(answers[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [spurtiPoints, setSpurtiPoints] = useState(5);
  const [visibilityDays, setVisibilityDays] = useState<7 | 3 | 2 | null>(7);
  const [showSecond, setShowSecond] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [justApproved, setJustApproved] = useState<{ id: string } | null>(null);

  const selected = answers.find((a) => a.id === selectedId) ?? answers[0] ?? null;

  const handleSelect = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setEditing(false);
    setEditedBody('');
  };

  const startEditing = () => { setEditedBody(selected?.body ?? ''); setEditing(true); };
  const cancelEditing = () => { setEditing(false); setEditedBody(''); };

  if (!selected) return null;

  const firstGroup = answers.slice(0, 1);
  const secondGroup = answers.slice(1, 3);
  const restGroup = answers.slice(3);

  const renderRow = (a: PendingAnswerSummary) => {
    const isSelected = a.id === selected.id;
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => handleSelect(a.id)}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          background: isSelected ? 'var(--color-primary-bg)' : 'var(--color-input)',
          border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 8, padding: '9px 12px',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'border-color 0.12s, background 0.12s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: isSelected ? 'var(--color-primary)' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isSelected ? 'white' : 'var(--color-text-muted)', flexShrink: 0 }}>
            {a.author.name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{a.author.name}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>· {timeAgo(a.createdAt)}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: a.upvoteCount > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              <ThumbsUp size={11} /> {a.upvoteCount}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: a.downvoteCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
              <ThumbsDown size={11} /> {a.downvoteCount}
            </span>
            {isSelected && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selected</span>
            )}
          </div>
        </div>
        {isSelected && editing ? (
          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={4}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--color-card)', border: '1px solid var(--color-primary)', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{a.body}</div>
        )}
      </button>
    );
  };

  return (
    <div>
      {/* ── Post as FAQ prompt (appears after an answer is approved) ── */}
      {justApproved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'var(--color-success-bg)', border: '1px solid var(--color-success)',
          borderRadius: 8, padding: '9px 12px', marginBottom: 10,
        }}>
          <CheckCircle size={14} color="var(--color-success)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>
            Answer approved — post it as an FAQ so it's searchable by all students?
          </span>
          {convertToFaq.error && (
            <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>
              {convertToFaq.error instanceof Error ? convertToFaq.error.message : 'Could not post as FAQ'}
            </span>
          )}
          <Button
            size="sm" variant="success" disabled={convertToFaq.isPending}
            onClick={async () => {
              await convertToFaq.mutateAsync(justApproved.id);
              setJustApproved(null);
            }}
          >
            <BookOpen size={12} /> {convertToFaq.isPending ? 'Posting…' : 'Post as FAQ'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setJustApproved(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* ── Answer list with progressive reveal ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>

        {/* Group 1 — always visible */}
        {firstGroup.map(renderRow)}

        {/* Dropdown 1 — next 2 answers */}
        {secondGroup.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowSecond((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}
            >
              {showSecond ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showSecond ? 'Hide' : `Show ${secondGroup.length} more answer${secondGroup.length === 1 ? '' : 's'}`}
            </button>
            {showSecond && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {secondGroup.map(renderRow)}

                {/* Dropdown 2 — remaining answers */}
                {restGroup.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRest((v) => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}
                    >
                      {showRest ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showRest ? 'Hide remaining' : `Show ${restGroup.length} remaining answer${restGroup.length === 1 ? '' : 's'}`}
                    </button>
                    {showRest && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {restGroup.map(renderRow)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Action bar ── */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {/* Left: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
            Spurti
            <input
              type="number" min={-1} max={5} step={1} value={spurtiPoints}
              onChange={(e) => setSpurtiPoints(Math.max(-1, Math.min(5, parseInt(e.target.value, 10) || 0)))}
              style={{ width: 48, background: 'var(--color-input)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
            />
          </label>
          <label style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
            Visible
            <select
              value={visibilityDays === null ? 'permanent' : String(visibilityDays)}
              onChange={(e) => {
                const v = e.target.value;
                setVisibilityDays(v === 'permanent' ? null : (Number(v) as 2 | 3 | 7));
              }}
              style={{ background: 'var(--color-input)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none' }}
            >
              <option value="7">7 days (default)</option>
              <option value="3">3 days</option>
              <option value="2">2 days</option>
              <option value="permanent">Permanent</option>
            </select>
          </label>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button
            variant="success" size="sm" disabled={approve.isPending}
            onClick={() => {
              const payload = editing
                ? { id: selected.id, editedBody, spurtiPoints, visibilityDays }
                : { id: selected.id, spurtiPoints, visibilityDays };
              approve.mutate(payload, {
                onSuccess: () => setJustApproved({ id: selected.id }),
              });
            }}
          >
            <CheckCircle size={12} /> {editing ? 'Edit & Approve' : 'Approve'}
          </Button>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Edit size={12} /> Edit
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={cancelEditing}>
              Cancel edit
            </Button>
          )}
          <Button
            variant="danger" size="sm" disabled={reject.isPending}
            onClick={() => reject.mutate({ id: selected.id })}
          >
            <XCircle size={12} /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Resolved Questions ───────────────────────────────────────────────────────

function ResolvedQuestionsSection() {
  const { data, isLoading } = useQuestions({ type: 'community', status: 'resolved' });

  if (isLoading) return <Card>Loading…</Card>;
  if (!data || data.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No resolved questions yet.</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Community questions move here once a peer answer is approved and the question is resolved.
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        {data.length} resolved question{data.length === 1 ? '' : 's'} · Answers ranked by votes
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((q) => (
          <ResolvedQuestionCard key={q.id} question={q} />
        ))}
      </div>
    </div>
  );
}

function ResolvedQuestionCard({ question }: { question: PublicQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);

  const { data: rawAnswers, isLoading: aLoading } = useAnswers(expanded ? question.id : undefined);

  const rankedAnswers = useMemo(() => {
    if (!rawAnswers) return [];
    const approved = rawAnswers.filter((a) => a.status === 'approved');
    return rankAnswers(approved);
  }, [rawAnswers]);

  const fullText = question.description;
  const isLong = fullText.length > 220;
  const displayText = isLong && !textExpanded ? fullText.slice(0, 220).trimEnd() : fullText;

  return (
    <Card>
      {/* Question text */}
      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 8 }}>
        {displayText}
        {isLong && !textExpanded && (
          <span>
            {'… '}
            <button type="button" onClick={() => setTextExpanded(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Read more
            </button>
          </span>
        )}
        {isLong && textExpanded && (
          <span>
            {' '}
            <button type="button" onClick={() => setTextExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Show less
            </button>
          </span>
        )}
      </div>

      {/* Meta + expand toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          by {question.author.name} · {timeAgo(question.createdAt)} · {question.answerCount} peer answer{question.answerCount === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8,
            background: expanded ? 'var(--color-success)' : 'var(--color-input)',
            color: expanded ? 'white' : 'var(--color-text-muted)',
            border: '1px solid var(--color-success)', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide answers' : 'View ranked answers'}
        </button>
      </div>

      {/* Ranked answer list */}
      {expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          {aLoading && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '6px 0' }}>Loading answers…</div>
          )}
          {!aLoading && rankedAnswers.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '6px 0' }}>No approved answers for this question.</div>
          )}
          {rankedAnswers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rankedAnswers.map((answer, index) => (
                <RankedAnswerRow key={answer.id} answer={answer} rank={index + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function RankedAnswerRow({ answer, rank }: { answer: PublicAnswer; rank: number }) {
  const isTop = rank === 1;
  return (
    <div style={{
      background: isTop ? 'var(--color-success-bg)' : 'var(--color-input)',
      border: `1px solid ${isTop ? 'var(--color-success)' : 'var(--color-border)'}`,
      borderLeft: `3px solid ${isTop ? 'var(--color-success)' : 'var(--color-border)'}`,
      borderRadius: 8, padding: '9px 12px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {/* Rank badge */}
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: isTop ? 'var(--color-success)' : 'var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: isTop ? 'white' : 'var(--color-text-muted)',
        }}>
          {rank}
        </div>

        {/* Author avatar */}
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {answer.author.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{answer.author.name}</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>· {timeAgo(answer.createdAt)}</span>

        {/* Votes + badges */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: answer.upvoteCount > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
            <ThumbsUp size={11} /> {answer.upvoteCount}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: answer.downvoteCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            <ThumbsDown size={11} /> {answer.downvoteCount}
          </span>
          {isTop && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-success)' }}>
              Top Answer
            </span>
          )}
        </div>
      </div>

      {/* Answer body */}
      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', paddingLeft: 26 }}>
        {answer.body}
      </div>
    </div>
  );
}

// ─── Trash section ───────────────────────────────────────────────────────────

function TrashSection() {
  const { data, isLoading } = useTrash();

  if (isLoading) return <Card>Loading…</Card>;
  if (!data || data.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Trash is empty.</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Community posts whose visibility period has expired appear here and can be restored.
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
        {data.length} trashed post{data.length === 1 ? '' : 's'} · Restore to make visible again
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((q) => (
          <TrashedQuestionCard key={q.id} question={q} />
        ))}
      </div>
    </div>
  );
}

function TrashedQuestionCard({ question }: { question: TrashedQuestionRow }) {
  const [expanded, setExpanded] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const restore = useRestoreQuestion();

  const fullText = question.description;
  const isLong = fullText.length > 220;
  const displayText = isLong && !textExpanded ? fullText.slice(0, 220).trimEnd() : fullText;

  return (
    <Card style={{ borderLeft: '3px solid var(--color-danger)', opacity: 0.92 }}>
      {/* Trashed-at banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '4px 8px', background: 'var(--color-danger-bg)', borderRadius: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>
          Trashed {timeAgo(question.trashedAt)}
        </span>
        {question.visibilityExpiresAt && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            · Expired {timeAgo(question.visibilityExpiresAt)}
          </span>
        )}
      </div>

      {/* Question text */}
      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 8 }}>
        {displayText}
        {isLong && !textExpanded && (
          <span>
            {'… '}
            <button type="button" onClick={() => setTextExpanded(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Read more
            </button>
          </span>
        )}
        {isLong && textExpanded && (
          <span>
            {' '}
            <button type="button" onClick={() => setTextExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Show less
            </button>
          </span>
        )}
      </div>

      {/* Meta + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          by {question.author.name} · {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {question.answers.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: 'var(--color-input)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Hide answers' : `View ${question.answers.length} answer${question.answers.length === 1 ? '' : 's'}`}
            </button>
          )}
          <Button
            size="sm" variant="success" disabled={restore.isPending}
            onClick={() => restore.mutate(question.id)}
          >
            Restore (7 days)
          </Button>
        </div>
      </div>

      {/* Approved answers */}
      {expanded && question.answers.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.answers.map((a, index) => (
            <div
              key={a.id}
              style={{ background: 'var(--color-input)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {a.author.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{a.author.name}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <ThumbsUp size={10} /> {a.upvoteCount}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <ThumbsDown size={10} /> {a.downvoteCount}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', paddingLeft: 24 }}>{a.body}</div>
            </div>
          ))}
        </div>
      )}
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
