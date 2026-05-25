// Browse FAQs — student-default page.
// - Default sort: recent + viewCount (server-enforced)
// - Search debounced 300ms to avoid spamming the server
// - Category and status chips
// - Role-aware feedback baked into each FaqCard
import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import type { FaqListQuery, FaqStatus } from '@samagama/shared';
import { FAQ_STATUSES } from '@samagama/shared';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAuth } from '../auth/AuthProvider';
import { FaqCard } from './FaqCard';
import { useCategories, useFaqList, useTags } from './queries';

const DEBOUNCE_MS = 300;

export function FaqsPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [status, setStatus] = useState<FaqStatus | undefined>();

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const query = useMemo<Partial<FaqListQuery>>(() => {
    const q: Partial<FaqListQuery> = {
      sort: debouncedSearch ? 'relevance' : 'recent',
    };
    if (debouncedSearch) q.q = debouncedSearch;
    if (categoryId) q.category = categoryId;
    if (tagId) q.tag = tagId;
    if (status) q.status = status;
    return q;
  }, [debouncedSearch, categoryId, tagId, status]);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data, isLoading, isError, error } = useFaqList(query);

  if (!user) return null;

  return (
    <div>
      <SectionHeader
        title="Browse FAQs"
        sub={data?.meta.total !== undefined ? `${data.meta.total} knowledge articles` : undefined}
      />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: 240,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <Search size={15} color="var(--color-text-muted)" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search FAQs by title or keyword..."
              aria-label="Search FAQs"
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: 14,
                flex: 1,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {(user.role === 'moderator' || user.role === 'admin') && (
            <select
              value={status ?? ''}
              onChange={(e) => setStatus((e.target.value as FaqStatus) || undefined)}
              aria-label="Filter by status"
              style={selectStyle}
            >
              <option value="">All statuses</option>
              {FAQ_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {categories && categories.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <ChipButton active={!categoryId} onClick={() => setCategoryId(undefined)}>
              All
            </ChipButton>
            {categories.map((c) => (
              <ChipButton
                key={c._id}
                active={categoryId === c._id}
                onClick={() => setCategoryId(c._id)}
              >
                {c.name}
              </ChipButton>
            ))}
          </div>
        )}

        {tags && tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                marginRight: 4,
                alignSelf: 'center',
              }}
            >
              Tags
            </span>
            <ChipButton active={!tagId} onClick={() => setTagId(undefined)}>
              All
            </ChipButton>
            {tags.map((t) => (
              <ChipButton key={t._id} active={tagId === t._id} onClick={() => setTagId(t._id)}>
                #{t.name}
              </ChipButton>
            ))}
          </div>
        )}
      </Card>

      {isLoading && <Card>Loading FAQs…</Card>}

      {isError && (
        <Card style={{ borderColor: 'var(--color-danger)' }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Couldn't load FAQs.</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Card>
      )}

      {data && data.items.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <BookOpen
            size={36}
            color="var(--color-border)"
            style={{ marginBottom: 12 }}
            aria-hidden="true"
          />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No FAQs found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Try a different search term or category filter.
          </div>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.items.map((faq) => (
            <FaqCard key={faq.id} faq={faq} role={user.role} />
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--color-input)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--color-text)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  outline: 'none',
};

function ChipButton({
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
        padding: '5px 13px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
        background: active ? 'var(--color-primary)' : 'var(--color-pill)',
        color: active ? 'white' : 'var(--color-pill-text)',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}
