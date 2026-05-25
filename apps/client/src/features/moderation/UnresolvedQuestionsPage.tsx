// Unresolved Questions — Dashboard Spec moderator entry point.
//
// Two subsections:
//   1. Personal Questions  → personal-type, status open/answered, asked by students directly
//   2. Community Questions → pending peer answers awaiting review (the old "Pending Answers" view)
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
        sub="Personal questions for moderators · Community answers awaiting approval."
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
  const { data, isLoading } = useQuestions({ type: 'personal', status: 'open' });
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
  const { data, isLoading } = usePendingAnswers();
  const [prioritize, setPrioritize] = useState(true);

  const sorted = useMemo(() => {
    if (!data) return [];
    if (!prioritize) return data;
    return [...data].sort((a, b) => b.taggedStudents.length - a.taggedStudents.length);
  }, [data, prioritize]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {data ? `${data.length} pending peer answer${data.length === 1 ? '' : 's'}` : ''}
        </div>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
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
          <div style={{ fontSize: 14, fontWeight: 600 }}>Inbox zero 🎉</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            No pending peer answers right now.
          </div>
        </Card>
      )}
      {sorted.map((a) => (
        <ReviewCard key={a.id} answer={a} />
      ))}
    </div>
  );
}

function ReviewCard({ answer }: { answer: PendingAnswerSummary }) {
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
  const [showStudents, setShowStudents] = useState(false);

  const multiAsker = answer.taggedStudents.length > 0;

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
        Answer on:
      </div>
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
        <div style={{ fontSize: 15, fontWeight: 600 }}>{answer.questionTitle}</div>
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
                  ? { id: answer.id, editedBody, note: note || undefined }
                  : { id: answer.id, note: note || undefined },
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
