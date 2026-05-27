// Admin overview. Enhanced "Intelligence" dashboard with system-wide KPIs,
// action-required alerts, and quality alerts.
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
  Users,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { IdleBucketCards } from '../stats/IdleBucketCards';
import { useAdminIntelligence } from './queries';
import type { QualityAlert } from './api';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminIntelligence();

  return (
    <div>
      <SectionHeader title="Admin Overview" sub="Portal health at a glance." />

      <IdleBucketCards />

      {/* Main KPI cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Unresolved Questions"
          value={data?.unresolvedQuestions ?? '…'}
          icon={MessageSquare}
          color="var(--color-warning)"
          onClick={() => navigate('/moderation/unresolved')}
        />
        <KPICard
          label="Pending Moderation"
          value={data?.pendingModerationItems ?? '…'}
          icon={Shield}
          color="var(--color-primary)"
          onClick={() => navigate('/moderation')}
        />
        <KPICard
          label="FAQs Needing Review"
          value={data?.faqsNeedingReview ?? '…'}
          sub="Draft + Outdated"
          icon={BookOpen}
          color="var(--color-danger)"
          onClick={() => navigate('/admin/faq-quality')}
        />
        <KPICard
          label="Avg Resolution Time"
          value={data?.avgResolutionTimeHours != null ? `${data.avgResolutionTimeHours}h` : '…'}
          sub="Last 30 days"
          icon={Clock}
          color="var(--color-success)"
        />
      </div>

      {/* Secondary stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Published FAQs"
          value={data?.publishedFaqs ?? '…'}
          sub={data ? `${data.helpfulPercentage.toFixed(1)}% helpful` : undefined}
          icon={BookOpen}
          color="var(--color-primary)"
          onClick={() => navigate('/admin/faqs')}
        />
        <KPICard
          label="Flagged FAQs"
          value={data?.flaggedCount ?? '…'}
          icon={Flag}
          color="var(--color-danger)"
          onClick={() => navigate('/admin/faqs')}
        />
        <KPICard
          label="Total FAQs"
          value={data?.totalFaqs ?? '…'}
          icon={BookOpen}
          color="var(--color-text-muted)"
          onClick={() => navigate('/admin/faqs')}
        />
      </div>

      {/* Quick navigation */}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <QuickNavCard label="User Management" icon={Users} onClick={() => navigate('/admin/users')} />
        <QuickNavCard label="FAQ Quality" icon={BarChart3} onClick={() => navigate('/admin/faq-quality')} />
        <QuickNavCard label="Moderation Load" icon={Shield} onClick={() => navigate('/admin/moderation-load')} />
        <QuickNavCard label="Audit Logs" icon={Clock} onClick={() => navigate('/admin/audit-logs')} />
      </div>

      {/* Quality alerts */}
      {data?.qualityAlerts && data.qualityAlerts.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} color="var(--color-warning)" />
            FAQ Quality Alerts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.qualityAlerts.map((alert) => (
              <QualityAlertRow key={alert.id} alert={alert} onClick={() => navigate('/admin/faq-quality')} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KPICard({
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
  icon: typeof MessageSquare;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      as={onClick ? 'button' : 'div'}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: onClick ? 'pointer' : 'default' }}
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
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>}
      </div>
      {onClick && <ChevronRight size={16} color="var(--color-text-muted)" />}
    </Card>
  );
}

function QuickNavCard({ label, icon: Icon, onClick }: {
  label: string;
  icon: typeof Users;
  onClick: () => void;
}) {
  return (
    <Card as="button" onClick={onClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
      <Icon size={16} color="var(--color-primary)" />
      <span style={{ fontSize: 12, fontWeight: 500, flex: 1, textAlign: 'left' }}>{label}</span>
      <ChevronRight size={14} color="var(--color-text-muted)" />
    </Card>
  );
}

function QualityAlertRow({ alert, onClick }: { alert: QualityAlert; onClick: () => void }) {
  const scoreColor = alert.qualityScore < 30 ? 'var(--color-danger)' : alert.qualityScore < 60 ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <Card as="button" onClick={onClick} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${scoreColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: scoreColor,
          flexShrink: 0,
        }}
      >
        {alert.qualityScore}
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{alert.title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {alert.helpfulRatio}% helpful · {alert.flagCount} flags · {alert.viewCount} views
        </div>
      </div>
      <ChevronRight size={14} color="var(--color-text-muted)" />
    </Card>
  );
}
