// Admin overview. Surfaces the same idle-bucket counts the moderators see, plus the
// FAQ-management quick-stats so an admin gets a single-screen system view.
import { useNavigate } from 'react-router-dom';
import { Flag, MessageSquare, ChevronRight, BookOpen } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useFaqStats, useModeratorStats } from '../faq/queries';
import { IdleBucketCards } from '../stats/IdleBucketCards';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { data: modStats } = useModeratorStats();
  const { data: faqStats } = useFaqStats();

  return (
    <div>
      <SectionHeader title="Admin Overview" sub="Portal health at a glance." />

      <IdleBucketCards />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <OverviewCard
          label="Unresolved Questions"
          value={modStats?.unresolvedQuestions ?? '…'}
          icon={MessageSquare}
          color="var(--color-warning)"
          onClick={() => navigate('/moderation/unresolved')}
        />
        <OverviewCard
          label="Flagged FAQs"
          value={modStats?.flaggedFaqs ?? '…'}
          sub={
            modStats ? `${modStats.flaggedFaqPercentage.toFixed(1)}% of published` : undefined
          }
          icon={Flag}
          color="var(--color-danger)"
          onClick={() => navigate('/admin/faqs')}
        />
        <OverviewCard
          label="Published FAQs"
          value={faqStats?.publishedFaqs ?? '…'}
          sub={
            faqStats ? `${faqStats.helpfulPercentage.toFixed(1)}% helpful overall` : undefined
          }
          icon={BookOpen}
          color="var(--color-primary)"
          onClick={() => navigate('/admin/faqs')}
        />
      </div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: typeof Flag;
  color: string;
  onClick: () => void;
}) {
  return (
    <Card
      as="button"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>}
      </div>
      <ChevronRight size={16} color="var(--color-text-muted)" />
    </Card>
  );
}
