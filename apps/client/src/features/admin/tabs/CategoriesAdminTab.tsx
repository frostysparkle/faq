// Inline category management embedded inside FAQ Management.
import { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  useDeleteCategory,
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
        <Button onClick={() => { setCreating((v) => !v); setEditingId(null); }}>
          <Plus size={14} /> {creating ? 'Cancel' : 'Add Category'}
        </Button>
      </div>

      {creating && (
        <div style={{ marginBottom: 16 }}>
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
            // Span all columns so the editor gets full width
            <div key={c._id} style={{ gridColumn: '1 / -1' }}>
              <CategoryForm existing={c} onClose={() => setEditingId(null)} />
            </div>
          ) : (
            <Card
              key={c._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                outline: editingId && editingId !== c._id ? '2px solid transparent' : undefined,
                opacity: editingId && editingId !== c._id ? 0.45 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {c.slug}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                <IconBtn ariaLabel="Edit" onClick={() => { setEditingId(c._id); setCreating(false); }}>
                  <Edit size={12} />
                </IconBtn>
                <DeleteBtn id={c._id} />
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

// ─── CategoryForm ─────────────────────────────────────────────────────────────

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
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!existing;

  // Auto-focus when the form mounts
  useEffect(() => {
    inputRef.current?.focus();
    // Place cursor at end of existing text
    if (existing?.name) {
      inputRef.current?.setSelectionRange(existing.name.length, existing.name.length);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    if (isEdit) {
      await update.mutateAsync({ id: existing._id, input: { name: name.trim() } });
    } else {
      await create.mutateAsync({ name: name.trim(), keywords: [] });
    }
    onClose();
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Card style={{ padding: '18px 20px' }}>
      <form onSubmit={submit}>
        {/* Title row */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>
          {isEdit ? `Editing: ${existing.name}` : 'New Category'}
        </div>

        {/* Full-width input */}
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="category-name-input"
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}
          >
            Category Name
          </label>
          <input
            id="category-name-input"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Internship Process"
            style={{
              width: '100%',
              background: 'var(--color-input)',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--color-text)',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: '0 0 0 3px var(--color-primary-bg)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-bg)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{ marginTop: 5, fontSize: 11, color: 'var(--color-text-muted)' }}>
            Press <kbd style={kbdStyle}>Enter</kbd> to save · <kbd style={kbdStyle}>Esc</kbd> to cancel
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              fontSize: 12,
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-danger)',
            }}
          >
            {error instanceof Error ? error.message : 'Could not save category'}
          </div>
        )}

        {/* Button row — right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending || name.trim().length < 2}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── DeleteBtn ────────────────────────────────────────────────────────────────

function DeleteBtn({ id }: { id: string }) {
  const deleteCat = useDeleteCategory();
  return (
    <IconBtn
      ariaLabel="Delete"
      danger
      disabled={deleteCat.isPending}
      onClick={() => deleteCat.mutate(id)}
    >
      <Trash2 size={12} />
    </IconBtn>
  );
}

// ─── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({
  children, onClick, ariaLabel, danger, disabled,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  fontSize: 10,
  fontFamily: 'inherit',
  background: 'var(--color-pill)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  color: 'var(--color-text-muted)',
};
