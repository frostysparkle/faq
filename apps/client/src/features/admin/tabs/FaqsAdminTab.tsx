// FAQ list inside FAQ Management.
//
// Columns: Question · Category · Status · Updated · Action (eye icon to reveal answer).
// Filters: All / Helpful / Flagged.
// Inline-create: a "New FAQ" button toggles a row at the top of the table.
import { useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Edit, Archive } from 'lucide-react';
import type { PublicFaq, FaqCreateInput, FaqStatus } from '@samagama/shared';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useArchiveFaq, useCategories, useFaqList, useTags } from '../../faq/queries';
import { InlineFaqEditor } from './InlineFaqEditor';
import { FlagInbox } from './FlagInbox';

type Filter = 'all' | 'helpful' | 'flagged';

export function FaqsAdminTab({ flaggedCount }: { flaggedCount: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const q: { filter?: 'helpful' | 'flagged'; pageSize?: number } = { pageSize: 50 };
    if (filter === 'helpful') q.filter = 'helpful';
    if (filter === 'flagged') q.filter = 'flagged';
    return q;
  }, [filter]);

  const { data, isLoading } = useFaqList(queryParams);
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterChip>
          <FilterChip active={filter === 'helpful'} onClick={() => setFilter('helpful')}>
            Helpful FAQs
          </FilterChip>
          <FilterChip active={filter === 'flagged'} onClick={() => setFilter('flagged')}>
            Flagged FAQs{' '}
            {flaggedCount > 0 && (
              <span
                style={{
                  background: 'var(--color-danger)',
                  color: 'white',
                  borderRadius: 10,
                  padding: '0 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  marginLeft: 4,
                }}
              >
                {flaggedCount}
              </span>
            )}
          </FilterChip>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus size={14} /> {creating ? 'Cancel' : 'New FAQ'}
        </Button>
      </div>

      {creating && categories && tags && (
        <div style={{ marginBottom: 12 }}>
          <InlineFaqEditor categories={categories} tags={tags} onClose={() => setCreating(false)} />
        </div>
      )}

      {filter === 'flagged' && <FlagInbox />}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 0.8fr 110px',
            gap: 12,
            padding: '10px 18px',
            background: 'var(--color-input)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
          }}
        >
          <div>Question</div>
          <div>Category</div>
          <div>Status</div>
          <div>Updated</div>
          <div>Action</div>
        </div>

        {isLoading && <div style={{ padding: 18, fontSize: 13 }}>Loading…</div>}
        {!isLoading && data?.items.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            No FAQs match this filter.
          </div>
        )}

        {data?.items.map((faq, i) => (
          <FaqRow
            key={faq.id}
            faq={faq}
            isLast={i === data.items.length - 1}
            expanded={expandedId === faq.id}
            onToggleExpand={() => setExpandedId((id) => (id === faq.id ? null : faq.id))}
            editing={editingId === faq.id}
            onEdit={() => setEditingId(faq.id)}
            onCancelEdit={() => setEditingId(null)}
            categories={categories ?? []}
            tags={tags ?? []}
          />
        ))}
      </Card>
    </div>
  );
}

function FaqRow({
  faq,
  isLast,
  expanded,
  onToggleExpand,
  editing,
  onEdit,
  onCancelEdit,
  categories,
  tags,
}: {
  faq: PublicFaq;
  isLast: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  categories: { _id: string; name: string }[];
  tags: { _id: string; name: string }[];
}) {
  const archive = useArchiveFaq();

  if (editing) {
    return (
      <div
        style={{
          padding: 18,
          borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        }}
      >
        <InlineFaqEditor
          categories={categories}
          tags={tags}
          existing={{
            id: faq.id,
            title: faq.title,
            answer: faq.answer,
            summary: faq.summary,
            status: faq.status,
            categories: faq.categories.map((c) => c.id),
            tags: faq.tags.map((t) => t.id),
          }}
          onClose={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 0.8fr 110px',
          gap: 12,
          padding: '13px 18px',
          borderBottom: isLast && !expanded ? 'none' : '1px solid var(--color-border)',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500 }}>{faq.title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-primary-text)' }}>
          {faq.categories[0]?.name ?? '—'}
        </div>
        <div>
          <Badge color={statusColor(faq.status)}>{faq.status}</Badge>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {timeAgo(faq.updatedAt)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconButton ariaLabel={expanded ? 'Hide answer' : 'View answer'} onClick={onToggleExpand}>
            {expanded ? <EyeOff size={12} /> : <Eye size={12} />}
          </IconButton>
          <IconButton ariaLabel="Edit" onClick={onEdit}>
            <Edit size={12} />
          </IconButton>
          <IconButton
            ariaLabel="Archive"
            danger
            onClick={() => archive.mutate(faq.id)}
            disabled={archive.isPending || faq.status === 'archived'}
          >
            <Archive size={12} />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--color-input)',
            borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
            fontSize: 13,
            color: 'var(--color-text)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {faq.answer}
        </div>
      )}
    </>
  );
}

function FilterChip({
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
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '6px 14px',
        borderRadius: 20,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      style={{
        background: danger ? 'var(--color-danger-bg)' : 'var(--color-pill)',
        color: danger ? 'var(--color-danger)' : 'var(--color-text)',
        border: 'none',
        borderRadius: 6,
        padding: '4px 8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function statusColor(status: FaqStatus): 'success' | 'warning' | 'default' | 'danger' {
  switch (status) {
    case 'published':
      return 'success';
    case 'outdated':
      return 'warning';
    case 'draft':
      return 'danger';
    default:
      return 'default';
  }
}

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Re-export the FaqCreateInput type so the editor doesn't import from deep paths.
export type { FaqCreateInput };
