// Unresolved Questions — redesigned to match Browse FAQs layout.
//
// Structure mirrors FaqsPage:
//   - Icon heading + count
//   - Single search bar + section-chip row
//   - Accordion cards (collapsed header / expandable body) like FaqCard
//
// Sections: Personal · Community (open/answered) · Resolved · Trash
import { useMemo, useState } from 'react';
import {
  BookOpen, CheckCircle, CheckCircle2, ChevronDown, ChevronUp,
  Clock, Edit, Folder, MessageCircle, RotateCcw, Search,
  ThumbsDown, ThumbsUp, Trash2, User, Users, XCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankAnswers(answers: PublicAnswer[]): PublicAnswer[] {
  return [...answers].sort((a, b) => {
    if (b.upvoteCount !== a.upvoteCount) return b.upvoteCount - a.upvoteCount;
    if (a.downvoteCount !== b.downvoteCount) return a.downvoteCount - b.downvoteCount;
    return 0;
  });
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

function Pipe() {
  return <span style={{ margin: '0 7px', color: 'var(--color-border)', userSelect: 'none' }}>|</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UnresolvedQuestionsPage() {
  const [section, setSection] = useState<Section>('community');
  const [search, setSearch] = useState('');
  const [prioritize, setPrioritize] = useState(true);

  // Eagerly load all sections so chip counts are always visible.
  const { data: personalQ,  isLoading: pQL  } = useQuestions({ type: 'personal' });
  const { data: communityQ, isLoading: cQL  } = useQuestions({ type: 'community', status: 'open,answered' });
  const { data: resolvedQ,  isLoading: rQL  } = useQuestions({ type: 'community', status: 'resolved' });
  const { data: trashItems, isLoading: tL   } = useTrash();
  const { data: pendingAnswers, isLoading: paL } = usePendingAnswers();

  // Group pending answers by questionId.
  const pendingByQuestion = useMemo(() => {
    const map = new Map<string, PendingAnswerSummary[]>();
    (pendingAnswers ?? []).forEach((a) => {
      const list = map.get(a.questionId) ?? [];
      list.push(a);
      map.set(a.questionId, list);
    });
    return map;
  }, [pendingAnswers]);

  // Active-section loading gate.
  const isLoading =
    section === 'personal'  ? pQL :
    section === 'community' ? (cQL || paL) :
    section === 'resolved'  ? rQL :
    tL;

  // Client-side search filter.
  const q = search.toLowerCase().trim();
  const filteredPersonal = useMemo(() => {
    if (!personalQ) return [];
    if (!q) return personalQ;
    return personalQ.filter((x) =>
      x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
  }, [personalQ, q]);

  const filteredCommunity = useMemo(() => {
    if (!communityQ) return [];
    const list = q
      ? communityQ.filter((x) => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q))
      : communityQ;
    return [...list].sort((a, b) => {
      if (prioritize) {
        const aT = pendingByQuestion.get(a.id)?.[0]?.taggedStudents.length ?? 0;
        const bT = pendingByQuestion.get(b.id)?.[0]?.taggedStudents.length ?? 0;
        if (aT !== bT) return bT - aT;
        const aP = pendingByQuestion.has(a.id) ? 1 : 0;
        const bP = pendingByQuestion.has(b.id) ? 1 : 0;
        if (aP !== bP) return bP - aP;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [communityQ, q, prioritize, pendingByQuestion]);

  const filteredResolved = useMemo(() => {
    if (!resolvedQ) return [];
    if (!q) return resolvedQ;
    return resolvedQ.filter((x) =>
      x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
  }, [resolvedQ, q]);

  const filteredTrash = useMemo(() => {
    if (!trashItems) return [];
    if (!q) return trashItems;
    return trashItems.filter((x) =>
      x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
  }, [trashItems, q]);

  const pendingCount  = pendingAnswers?.length ?? 0;
  const currentCount  =
    section === 'personal'  ? filteredPersonal.length :
    section === 'community' ? filteredCommunity.length :
    section === 'resolved'  ? filteredResolved.length :
    filteredTrash.length;

  const CHIPS: Array<{
    key: Section;
    label: string;
    count: number | undefined;
    Icon: typeof MessageCircle;
  }> = [
    { key: 'personal',  label: 'Personal',  count: personalQ?.length,  Icon: User },
    { key: 'community', label: 'Community', count: communityQ?.length, Icon: Users },
    { key: 'resolved',  label: 'Resolved',  count: resolvedQ?.length,  Icon: CheckCircle2 },
    { key: 'trash',     label: 'Trash',     count: trashItems?.length, Icon: Trash2 },
  ];

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'var(--color-card)',
          boxShadow: '0 2px 8px rgba(59,130,246,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={18} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          Unresolved Questions
          {!isLoading && (
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: 8 }}>
              {currentCount} question{currentCount === 1 ? '' : 's'}
              {section === 'community' && pendingCount > 0 && (
                <> · <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{pendingCount} pending review</span></>
              )}
            </span>
          )}
        </span>
      </div>

      {/* ── Search + section chips ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>

        {/* Search bar — same style as Browse FAQs */}
        <div className="topbar-search" style={{ flex: '1 1 200px', minWidth: 0 }}>
          <Search size={15} color={search ? 'var(--color-primary)' : 'var(--color-text-muted)'} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by title or keyword…"
            style={{ border: 'none', background: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 14, flex: 1, fontFamily: 'inherit', minWidth: 0 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: 'var(--color-text-muted)' }}
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>

        {/* Section chips */}
        {CHIPS.map(({ key, label, count, Icon }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => { setSection(key); setSearch(''); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 36, padding: '0 14px', borderRadius: 8, flexShrink: 0,
                border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-purple-bg)' : 'var(--color-input)',
                color: active ? 'var(--color-purple)' : 'var(--color-text-muted)',
                fontSize: 13, fontWeight: active ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={13} />
              {label}
              {count !== undefined && (
                <span style={{
                  fontSize: 11, fontWeight: 700, lineHeight: '18px',
                  background: active ? 'var(--color-purple)' : 'var(--color-border)',
                  color: active ? 'white' : 'var(--color-text-muted)',
                  borderRadius: 10, padding: '0 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Prioritise multi-asker toggle — community only */}
        {section === 'community' && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={prioritize}
              onChange={(e) => setPrioritize(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            Prioritise multi-asker
          </label>
        )}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="mod-card mod-card-blue" style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>
          Loading questions…
        </div>
      )}

      {/* ── Personal ─────────────────────────────────────────────────── */}
      {!isLoading && section === 'personal' && (
        filteredPersonal.length === 0 ? (
          <EmptyState
            Icon={User}
            message={search ? `No personal questions matched "${search}"` : 'No personal questions at the moment.'}
            sub={search ? 'Try a different keyword.' : 'Direct messages from students appear here.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredPersonal.map((q) => <PersonalCard key={q.id} question={q} />)}
          </div>
        )
      )}

      {/* ── Community ────────────────────────────────────────────────── */}
      {!isLoading && section === 'community' && (
        filteredCommunity.length === 0 ? (
          <EmptyState
            Icon={Users}
            message={search ? `No community questions matched "${search}"` : 'No community questions need attention.'}
            sub={search ? 'Try a different keyword.' : 'Open and answered questions from students appear here.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCommunity.map((q) => (
              <CommunityCard key={q.id} question={q} pendingAnswers={pendingByQuestion.get(q.id) ?? []} />
            ))}
          </div>
        )
      )}

      {/* ── Resolved ─────────────────────────────────────────────────── */}
      {!isLoading && section === 'resolved' && (
        filteredResolved.length === 0 ? (
          <EmptyState
            Icon={CheckCircle}
            message={search ? `No resolved questions matched "${search}"` : 'No resolved questions yet.'}
            sub={search ? 'Try a different keyword.' : 'Community questions appear here once a peer answer is approved.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredResolved.map((q) => <ResolvedCard key={q.id} question={q} />)}
          </div>
        )
      )}

      {/* ── Trash ────────────────────────────────────────────────────── */}
      {!isLoading && section === 'trash' && (
        filteredTrash.length === 0 ? (
          <EmptyState
            Icon={Trash2}
            message={search ? `No trashed questions matched "${search}"` : 'Trash is empty.'}
            sub={search ? 'Try a different keyword.' : 'Expired community posts appear here and can be restored.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredTrash.map((q) => <TrashCard key={q.id} question={q} />)}
          </div>
        )
      )}
    </div>
  );
}

// ─── Shared header row helpers ────────────────────────────────────────────────

function CardHeader({
  title,
  meta,
  expanded,
  onToggle,
  extra,
}: {
  title: React.ReactNode;
  meta: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ padding: '13px 18px 11px' }}>
      {/* Row 1 — question title (full width) + optional action + chevron */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <button
          onClick={onToggle}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.45 }}>
            {title}
          </span>
        </button>

        {extra}

        <button
          onClick={onToggle}
          style={{ flexShrink: 0, background: 'transparent', border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.13s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-input)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          {expanded
            ? <ChevronUp size={15} color="var(--color-text-muted)" />
            : <ChevronDown size={15} color="var(--color-text-muted)" />}
        </button>
      </div>

      {/* Row 2 — metadata strip */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-muted)' }}>
        {meta}
      </div>
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 18px' }} />
      <div style={{ padding: '14px 18px' }}>{children}</div>
    </div>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color, fontWeight: 600, textTransform: 'capitalize' as const }}>{label}</span>
    </span>
  );
}

// ─── Personal card ────────────────────────────────────────────────────────────

function PersonalCard({ question }: { question: PublicQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState('');
  const respond = useRespondToPersonal();

  const submit = async () => {
    if (body.trim().length < 10) return;
    await respond.mutateAsync({ questionId: question.id, body });
    setBody('');
    setExpanded(false);
  };

  const statusColor = question.status === 'resolved' ? '#16a34a' : question.status === 'answered' ? '#d97706' : '#3b82f6';

  const meta = (
    <>
      {question.category && (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontWeight: 600, maxWidth: 110 }}>
            <Folder size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{question.category.name}</span>
          </span>
          <Pipe />
        </>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        <User size={12} /> {question.author.name}
      </span>
      <Pipe />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        <Clock size={12} /> {timeAgo(question.createdAt)}
      </span>
      <Pipe />
      <StatusDot color={statusColor} label={question.status} />
    </>
  );

  return (
    <div className="mod-card mod-card-blue">
      <CardHeader title={question.title} meta={meta} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      {expanded && (
        <CardBody>
          {question.description && question.description.trim() !== question.title.trim() && (
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.65, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
              {question.description}
            </div>
          )}
          {question.screenshotUrl && (
            <div style={{ marginBottom: 14 }}>
              <img
                src={question.screenshotUrl} alt="Question attachment"
                style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, border: '1px solid var(--color-border)', objectFit: 'contain', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your response. The student will see it under My Questions as 'Responded'."
            rows={4} maxLength={4000}
            style={{ width: '100%', background: 'var(--color-input)', border: '1px solid var(--color-primary)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          {respond.error && (
            <div role="alert" style={{ marginTop: 4, fontSize: 12, color: 'var(--color-danger)' }}>
              {respond.error instanceof Error ? respond.error.message : 'Could not submit response'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => { setExpanded(false); setBody(''); }}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={respond.isPending || body.trim().length < 10}>
              {respond.isPending ? 'Sending…' : 'Send response'}
            </Button>
          </div>
        </CardBody>
      )}
    </div>
  );
}

// ─── Community card ───────────────────────────────────────────────────────────

function CommunityCard({ question, pendingAnswers }: { question: PublicQuestion; pendingAnswers: PendingAnswerSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showModAnswer, setShowModAnswer] = useState(false);
  const [modBody, setModBody] = useState('');
  const [showStudents, setShowStudents] = useState(false);

  const hasPending = pendingAnswers.length > 0;
  const taggedStudents = pendingAnswers[0]?.taggedStudents ?? [];
  const multiAsker = taggedStudents.length > 0;
  const respond = useRespondToPersonal();

  const submitModAnswer = async () => {
    if (modBody.trim().length < 10) return;
    await respond.mutateAsync({ questionId: question.id, body: modBody });
    setModBody('');
    setShowModAnswer(false);
  };

  const cardClass = hasPending ? 'mod-card mod-card-orange' : 'mod-card mod-card-blue';
  const statusColor = question.status === 'answered' ? '#d97706' : '#3b82f6';

  const meta = (
    <>
      {multiAsker && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowStudents((v) => !v); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--color-primary)', fontWeight: 700, whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, padding: 0 }}
          >
            <Users size={11} /> {taggedStudents.length + 1} students
          </button>
          <Pipe />
        </>
      )}
      {question.category && (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontWeight: 600, maxWidth: 100 }}>
            <Folder size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{question.category.name}</span>
          </span>
          <Pipe />
        </>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <User size={12} /> {question.author.name}
      </span>
      <Pipe />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <Clock size={12} /> {timeAgo(question.createdAt)}
      </span>
      <Pipe />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <MessageCircle size={11} /> {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
      </span>
      <Pipe />
      <StatusDot color={statusColor} label={question.status} />
    </>
  );

  return (
    <div className={cardClass}>
      <CardHeader title={question.title} meta={meta} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      {expanded && (
        <CardBody>
          {/* Tagged students list */}
          {showStudents && taggedStudents.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, padding: '6px 10px', background: 'var(--color-input)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              Also asked by: {taggedStudents.map((s) => s.name).join(', ')}
            </div>
          )}

          {/* Description */}
          {question.description && question.description.trim() && question.description.trim().toLowerCase() !== question.title.trim().toLowerCase() && (
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.65, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
              {question.description}
            </div>
          )}

          {/* Screenshot */}
          {question.screenshotUrl && (
            <div style={{ marginBottom: 14 }}>
              <img
                src={question.screenshotUrl} alt="Question attachment"
                style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, border: '1px solid var(--color-border)', objectFit: 'contain', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Pending answer review */}
          {hasPending && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Pending answers — select &amp; review
              </div>
              <ReviewPanel answers={pendingAnswers} />
            </div>
          )}

          {/* Answer as moderator */}
          <div>
            {!showModAnswer ? (
              <button
                type="button"
                onClick={() => setShowModAnswer(true)}
                style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: 'none', border: '1px solid #16a34a', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Answer as moderator
              </button>
            ) : (
              <div>
                <textarea
                  value={modBody}
                  onChange={(e) => setModBody(e.target.value)}
                  placeholder="Write your answer here. It will be approved immediately and visible to students."
                  rows={4} maxLength={4000}
                  style={{ width: '100%', background: 'var(--color-input)', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
                {respond.error && (
                  <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>
                    {respond.error instanceof Error ? respond.error.message : 'Could not post answer'}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <Button size="sm" variant="ghost" onClick={() => { setShowModAnswer(false); setModBody(''); }}>Cancel</Button>
                  <Button size="sm" onClick={submitModAnswer} disabled={respond.isPending || modBody.trim().length < 10}>
                    {respond.isPending ? 'Posting…' : 'Post answer'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      )}
    </div>
  );
}

// ─── Resolved card ────────────────────────────────────────────────────────────

function ResolvedCard({ question }: { question: PublicQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rawAnswers, isLoading: aLoading } = useAnswers(expanded ? question.id : undefined);

  const rankedAnswers = useMemo(() => {
    if (!rawAnswers) return [];
    return rankAnswers(rawAnswers.filter((a) => a.status === 'approved'));
  }, [rawAnswers]);

  const meta = (
    <>
      {question.category && (
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontWeight: 600, maxWidth: 110 }}>
            <Folder size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{question.category.name}</span>
          </span>
          <Pipe />
        </>
      )}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <User size={12} /> {question.author.name}
      </span>
      <Pipe />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <Clock size={12} /> {timeAgo(question.createdAt)}
      </span>
      <Pipe />
      <StatusDot color="#16a34a" label="Resolved" />
      <Pipe />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <MessageCircle size={11} /> {question.answerCount} answer{question.answerCount === 1 ? '' : 's'}
      </span>
    </>
  );

  return (
    <div className="mod-card mod-card-green">
      <CardHeader title={question.title} meta={meta} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      {expanded && (
        <CardBody>
          {question.description && question.description.trim() && question.description.trim().toLowerCase() !== question.title.trim().toLowerCase() && (
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.65, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
              {question.description}
            </div>
          )}
          {aLoading && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading answers…</div>}
          {!aLoading && rankedAnswers.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No approved answers.</div>
          )}
          {rankedAnswers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rankedAnswers.map((a, i) => <RankedAnswerRow key={a.id} answer={a} rank={i + 1} />)}
            </div>
          )}
        </CardBody>
      )}
    </div>
  );
}

// ─── Trash card ───────────────────────────────────────────────────────────────

function TrashCard({ question }: { question: TrashedQuestionRow }) {
  const [expanded, setExpanded] = useState(false);
  const restore = useRestoreQuestion();

  const meta = (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <User size={12} /> {question.author.name}
      </span>
      <Pipe />
      <StatusDot color="#dc2626" label={`Trashed ${timeAgo(question.trashedAt)}`} />
      {question.visibilityExpiresAt && (
        <>
          <Pipe />
          <span style={{ whiteSpace: 'nowrap' }}>Expired {timeAgo(question.visibilityExpiresAt)}</span>
        </>
      )}
      <Pipe />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
        <MessageCircle size={11} /> {question.answerCount}
      </span>
    </>
  );

  const restoreBtn = (
    <Button
      size="sm" variant="success"
      disabled={restore.isPending}
      onClick={(e) => { (e as React.MouseEvent).stopPropagation(); restore.mutate(question.id); }}
      style={{ flexShrink: 0 }}
    >
      Restore
    </Button>
  );

  return (
    <div className="mod-card mod-card-red" style={{ opacity: 0.92 }}>
      <CardHeader title={question.title} meta={meta} expanded={expanded} onToggle={() => setExpanded((v) => !v)} extra={restoreBtn} />

      {expanded && (
        <CardBody>
          {question.description && question.description.trim() && question.description.trim().toLowerCase() !== question.title.trim().toLowerCase() && (
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.65, marginBottom: 14 }}>
              {question.description}
            </div>
          )}
          {question.answers.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No answers recorded.</div>
          )}
          {question.answers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {question.answers.map((a, i) => (
                <div key={a.id} style={{ background: 'var(--color-input)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{a.author.name}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)' }}><ThumbsUp size={10} /> {a.upvoteCount}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)' }}><ThumbsDown size={10} /> {a.downvoteCount}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', paddingLeft: 26 }}>{a.body}</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ Icon, message, sub }: {
  Icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  message: string;
  sub?: string;
}) {
  return (
    <div className="mod-card mod-card-blue" style={{ padding: 40, textAlign: 'center' }}>
      <Icon size={36} color="var(--color-border)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{message}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ─── Ranked answer row (Resolved section) ─────────────────────────────────────

function RankedAnswerRow({ answer, rank }: { answer: PublicAnswer; rank: number }) {
  const isTop = rank === 1;
  return (
    <div style={{
      background: isTop ? 'var(--color-success-bg)' : 'var(--color-input)',
      border: `1px solid ${isTop ? 'var(--color-success)' : 'var(--color-border)'}`,
      borderLeft: `3px solid ${isTop ? 'var(--color-success)' : 'var(--color-border)'}`,
      borderRadius: 8, padding: '9px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: isTop ? 'var(--color-success)' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: isTop ? 'white' : 'var(--color-text-muted)' }}>
          {rank}
        </div>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {answer.author.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{answer.author.name}</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>· {timeAgo(answer.createdAt)}</span>
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
      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', paddingLeft: 26 }}>
        {answer.body}
      </div>
    </div>
  );
}

// ─── Review panel (Community — pending answer approval) ───────────────────────

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

  const firstGroup  = answers.slice(0, 1);
  const secondGroup = answers.slice(1, 3);
  const restGroup   = answers.slice(3);

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
      {/* Post as FAQ prompt */}
      {justApproved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 8, padding: '9px 12px', marginBottom: 10 }}>
          <CheckCircle size={14} color="var(--color-success)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>
            Answer approved — post it as an FAQ so it's searchable by all students?
          </span>
          {convertToFaq.error && (
            <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>
              {convertToFaq.error instanceof Error ? convertToFaq.error.message : 'Could not post as FAQ'}
            </span>
          )}
          <Button size="sm" variant="success" disabled={convertToFaq.isPending} onClick={async () => { await convertToFaq.mutateAsync(justApproved.id); setJustApproved(null); }}>
            <BookOpen size={12} /> {convertToFaq.isPending ? 'Posting…' : 'Post as FAQ'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setJustApproved(null)}>Dismiss</Button>
        </div>
      )}

      {/* Answer rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {firstGroup.map(renderRow)}
        {secondGroup.length > 0 && (
          <>
            <button type="button" onClick={() => setShowSecond((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}>
              {showSecond ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showSecond ? 'Hide' : `Show ${secondGroup.length} more answer${secondGroup.length === 1 ? '' : 's'}`}
            </button>
            {showSecond && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {secondGroup.map(renderRow)}
                {restGroup.length > 0 && (
                  <>
                    <button type="button" onClick={() => setShowRest((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}>
                      {showRest ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {showRest ? 'Hide remaining' : `Show ${restGroup.length} remaining answer${restGroup.length === 1 ? '' : 's'}`}
                    </button>
                    {showRest && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{restGroup.map(renderRow)}</div>}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button
            variant="success" size="sm" disabled={approve.isPending}
            onClick={() => {
              const payload = editing
                ? { id: selected.id, editedBody, spurtiPoints, visibilityDays }
                : { id: selected.id, spurtiPoints, visibilityDays };
              approve.mutate(payload, { onSuccess: () => setJustApproved({ id: selected.id }) });
            }}
          >
            <CheckCircle size={12} /> {editing ? 'Edit & Approve' : 'Approve'}
          </Button>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={startEditing}><Edit size={12} /> Edit</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancel edit</Button>
          )}
          <Button variant="danger" size="sm" disabled={reject.isPending} onClick={() => reject.mutate({ id: selected.id })}>
            <XCircle size={12} /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
