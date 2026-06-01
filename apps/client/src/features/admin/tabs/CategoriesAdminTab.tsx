// Inline category management embedded inside FAQ Management.
import { useState } from 'react';
import { Plus, Edit, Archive } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '../../faq/queries';

export function CategoriesAdminTab() {
  const { data, isLoading } = useCategories();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus size={14} /> {creating ? 'Cancel' : 'Add Category'}
        </Button>
      </div>

      {creating && (
        <div style={{ marginBottom: 12 }}>
          <CategoryForm onClose={() => setCreating(false)} />
        </div>
      )}

      {isLoading && <Card>Loading…</Card>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
        }}
      >
        {data?.map((c) =>
          editingId === c._id ? (
            <CategoryForm key={c._id} existing={c} onClose={() => setEditingId(null)} />
          ) : (
            <Card
              key={c._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                opacity: c.isActive ? 1 : 0.5,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {c.slug}
                  {c.isActive ? '' : ' · archived'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <IconBtn ariaLabel="Edit" onClick={() => setEditingId(c._id)}>
                  <Edit size={12} />
                </IconBtn>
                <ArchiveBtn id={c._id} disabled={!c.isActive} />
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

function CategoryForm({
  existing,
  onClose,
}: {
  existing?: { _id: string; name: string; description?: string };
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const error = create.error ?? update.error;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existing) {
      await update.mutateAsync({ id: existing._id, input: { name } });
    } else {
      await create.mutateAsync({ name, keywords: [] });
    }
    onClose();
  };

  return (
    <Card>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            style={inputStyle}
          />
        </div>
        <Button type="submit" size="sm" disabled={create.isPending || update.isPending}>
          {existing ? 'Save' : 'Add'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </form>
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            fontSize: 12,
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            padding: '6px 10px',
            borderRadius: 6,
          }}
        >
          {error instanceof Error ? error.message : 'Could not save category'}
        </div>
      )}
    </Card>
  );
}

function ArchiveBtn({ id, disabled }: { id: string; disabled: boolean }) {
  const archive = useArchiveCategory();
  return (
    <IconBtn
      ariaLabel="Archive"
      danger
      disabled={disabled || archive.isPending}
      onClick={() => archive.mutate(id)}
    >
      <Archive size={12} />
    </IconBtn>
  );
}

function IconBtn({
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
        padding: '5px 8px',
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-input)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
