// Admin overview. A high-level "Intelligence" dashboard: system-wide KPIs, a short
// action-required quality-alerts list, and quick navigation. Detailed moderation queue
// breakdowns live on their own pages (Moderation Load, FAQ Management) to keep this view scannable.
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  Flag,
  MessageSquare,
  Shield,
  ThumbsUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAdminIntelligence } from './queries';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminIntelligence();

  const kpis: {
    label: string;
    value: number | string;
    icon: LucideIcon;
    color: string;
    to: string;
  }[] = [
    {
      label: 'Unresolved Questions',
      value: data?.unresolvedQuestions ?? 0,
      icon: MessageSquare,
      color: 'var(--color-primary)',
      to: '/moderation/unresolved',
    },
    {
      label: 'Pending Moderation',
      value: data?.pendingModerationItems ?? 0,
      icon: Shield,
      color: 'var(--color-warning)',
      to: '/admin/moderation-load',
    },
    {
      label: 'FAQs Needing Review',
      value: data?.faqsNeedingReview ?? 0,
      icon: BookOpen,
      color: 'var(--color-purple)',
      to: '/admin/faq-quality',
    },
    {
      label: 'Flagged FAQs',
      value: data?.flaggedCount ?? 0,
      icon: Flag,
      color: 'var(--color-danger)',
      to: '/admin/faqs',
    },
    {
      label: 'Helpful Rate',
      value: `${data?.helpfulPercentage ?? 0}%`,
      icon: ThumbsUp,
      color: 'var(--color-success)',
      to: '/admin/faq-quality',
    },
    {
      label: 'Avg Resolution',
      value: `${data?.avgResolutionTimeHours ?? 0}h`,
      icon: Clock,
      color: 'var(--color-text-muted)',
      to: '/admin/moderation-load',
    },
  ];

  const alerts = data?.qualityAlerts ?? [];

  return (
    <div>
      <SectionHeader title="Admin Overview" sub="Portal health at a glance." />

      {/* 1. KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {kpis.map((k) => (
          <KpiTile key={k.label} {...k} loading={isLoading} onClick={() => navigate(k.to)} />
        ))}
      </div>

      {/* 2. Needs attention — quality alerts */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          margin: '0 0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <AlertTriangle size={16} color="var(--color-warning)" />
        Needs Attention
      </div>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        {isLoading && (
          <div style={{ padding: 18, fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</div>
        )}
        {!isLoading && alerts.length === 0 && (
          <div style={{ padding: 18, fontSize: 13, color: 'var(--color-text-muted)' }}>
            Nothing needs attention — no low-quality or heavily flagged FAQs right now. 🎉
          </div>
        )}
        {!isLoading &&
          alerts.slice(0, 5).map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate('/admin/faq-quality')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  i < Math.min(alerts.length, 5) - 1 ? '1px solid var(--color-border)' : 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Quality {Math.round(a.qualityScore)} · {Math.round(a.helpfulRatio * 100)}% helpful
                  {a.flagCount > 0 ? ` · ${a.flagCount} flag${a.flagCount === 1 ? '' : 's'}` : ''}
                </div>
              </div>
              <ScorePill score={a.qualityScore} />
              <ChevronRight size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            </button>
          ))}
      </Card>

      {/* 3. Quick Actions */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--color-text)',
          letterSpacing: '-0.01em',
          margin: '0 0 14px',
        }}
      >
        Quick Actions
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <QuickNavCard
          label="User Management"
          subtitle="Manage users and roles"
          icon={Users}
          iconColor="var(--color-primary)"
          cardBg="var(--color-primary-bg)"
          onClick={() => navigate('/admin/users')}
        />
        <QuickNavCard
          label="FAQ Quality"
          subtitle="Review and improve FAQs"
          icon={BarChart3}
          iconColor="var(--color-purple)"
          cardBg="var(--color-purple-bg)"
          onClick={() => navigate('/admin/faq-quality')}
        />
        <QuickNavCard
          label="Moderation Load"
          subtitle="View workload and queues"
          icon={Shield}
          iconColor="var(--color-success)"
          cardBg="var(--color-success-bg)"
          onClick={() => navigate('/admin/moderation-load')}
        />
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      as="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        textAlign: 'left',
        padding: '16px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: 'var(--color-text)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {loading ? '…' : value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</div>
    </Card>
  );
}

function ScorePill({ score }: { score: number }) {
  const rounded = Math.round(score);
  const color =
    rounded < 50 ? 'var(--color-danger)' : rounded < 70 ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <span
      style={{
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 700,
        color,
        background: `${color}1a`,
        borderRadius: 8,
        padding: '4px 10px',
      }}
    >
      {rounded}
    </span>
  );
}

function QuickNavCard({
  label,
  subtitle,
  icon: Icon,
  iconColor,
  cardBg,
  onClick,
}: {
  label: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  cardBg: string;
  onClick: () => void;
}) {
  return (
    <Card
      as="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        textAlign: 'left',
        borderRadius: 16,
        background: cardBg,
      }}
    >
      {/* Icon container — slightly elevated against the tinted card bg */}
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <Icon size={22} color={iconColor} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 3,
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>
          {subtitle}
        </div>
      </div>

      <ChevronRight size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
    </Card>
  );
}
