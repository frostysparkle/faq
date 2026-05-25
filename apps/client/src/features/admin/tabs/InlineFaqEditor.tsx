// Compact in-table editor for FAQs. Renders a card-shaped form so it slots into the
// FAQ Management table without launching a modal.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  faqCreateSchema,
  faqUpdateSchema,
  type FaqCreateInput,
  type FaqStatus,
} from '@samagama/shared';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useCreateFaq, useUpdateFaq } from '../../faq/queries';

interface ExistingFaq {
  id: string;
  title: string;
  answer: string;
  summary?: string;
  status: FaqStatus;
  categories: string[];
  tags: string[];
}

interface Props {
  categories: { _id: string; name: string }[];
  tags: { _id: string; name: string }[];
  existing?: ExistingFaq;
  onClose: () => void;
}

export function InlineFaqEditor({ categories, tags, existing, onClose }: Props) {
  const isEdit = !!existing;
  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();
  const [statsResetNote, setStatsResetNote] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FaqCreateInput>({
    resolver: zodResolver(isEdit ? faqUpdateSchema : faqCreateSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          answer: existing.answer,
          summary: existing.summary,
          status: existing.status,
          categories: existing.categories,
          tags: existing.tags,
        }
      : { status: 'draft', categories: [], tags: [] },
  });

  const selectedCategories = watch('categories') ?? [];
  const selectedTags = watch('tags') ?? [];

  const toggleCategory = (id: string) =>
    setValue(
      'categories',
      selectedCategories.includes(id)
        ? selectedCategories.filter((c) => c !== id)
        : [...selectedCategories, id],
      { shouldValidate: true },
    );

  const toggleTag = (id: string) =>
    setValue(
      'tags',
      selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id],
      { shouldValidate: true },
    );

  const onSubmit = handleSubmit(async (values) => {
    if (isEdit && existing) {
      const result = await updateMutation.mutateAsync({ id: existing.id, input: values });
      if (result.statsReset) setStatsResetNote(true);
      else onClose();
    } else {
      await createMutation.mutateAsync(values);
      onClose();
    }
  });

  const error = createMutation.error ?? updateMutation.error;

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <Field label="Question *" error={errors.title?.message}>
          <input
            {...register('title')}
            placeholder="What's the question students will ask?"
            style={inputStyle}
          />
        </Field>

        <Field label="Answer *" error={errors.answer?.message}>
          <textarea
            {...register('answer')}
            rows={5}
            placeholder="Be specific. Include any links to official sources."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 14,
          }}
        >
          <Field label="Categories *" error={errors.categories?.message}>
            <div style={chipWrapStyle}>
              {categories.map((c) => (
                <ToggleChip
                  key={c._id}
                  active={selectedCategories.includes(c._id)}
                  onClick={() => toggleCategory(c._id)}
                >
                  {c.name}
                </ToggleChip>
              ))}
            </div>
          </Field>

          <Field label="Tags">
            <div style={chipWrapStyle}>
              {tags.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  No tags yet — create some on the Tags tab.
                </span>
              )}
              {tags.map((t) => (
                <ToggleChip
                  key={t._id}
                  active={selectedTags.includes(t._id)}
                  onClick={() => toggleTag(t._id)}
                >
                  #{t.name}
                </ToggleChip>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Status">
          <select {...register('status')} style={inputStyle}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="outdated">Outdated</option>
            <option value="archived">Archived</option>
          </select>
        </Field>

        {statsResetNote && (
          <div
            role="status"
            style={{
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            The answer changed, so helpful/flagged stats were reset to zero. Outstanding flags were
            marked resolved.
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {error instanceof Error ? error.message : 'Could not save FAQ'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create FAQ'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {statsResetNote ? 'Done' : 'Cancel'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

function ToggleChip({
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
      type="button"
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '5px 12px',
        borderRadius: 20,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-pill)',
        color: active ? 'white' : 'var(--color-pill-text)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
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
  padding: '10px 12px',
  color: 'var(--color-text)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const chipWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: '8px 10px',
  background: 'var(--color-input)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
};
