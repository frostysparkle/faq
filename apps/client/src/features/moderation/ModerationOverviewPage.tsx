// Moderation dashboard. Dashboard Spec: only TWO cards (Unresolved Questions, Flagged FAQs).
// The pending-answer card and duplicate-candidates card are removed.
import { useNavigate } from 'react-router-dom';
import { Flag, MessageSquare, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useModeratorStats } from '../faq/queries';

export function ModerationOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useModeratorStats();

  return (
    <div>
      <SectionHeader title="Moderation Dashboard" sub="Items requiring your attention." />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
        }}
      >
        <DashboardCard
          label="Unresolved Questions"
          value={data?.unresolvedQuestions ?? (isLoading ? '…' : 0)}
          icon={MessageSquare}
          color="var(--color-warning)"
          onClick={() => navigate('/moderation/unresolved')}
        />
        <DashboardCard
          label="Flagged FAQs"
          value={data?.flaggedFaqs ?? (isLoading ? '…' : 0)}
          icon={Flag}
          color="var(--color-danger)"
          sub={data ? `${data.flaggedFaqPercentage.toFixed(1)}% of published` : undefined}
          onClick={() => navigate('/admin/faqs')}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: typeof MessageSquare;
  color: string;
  sub?: string;
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
