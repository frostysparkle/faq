// Admin overview. Enhanced "Intelligence" dashboard with system-wide KPIs,
// action-required alerts, and quality alerts.
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock,
  Shield,
  Users,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { IdleBucketCards } from '../stats/IdleBucketCards';
import { useAdminIntelligence } from './queries';
import { ModerationQueueCards } from '../moderation/ModerationQueueCards';
import type { QualityAlert } from './api';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminIntelligence();

  return (
    <div>
      <SectionHeader title="Admin Overview" sub="Portal health at a glance." />

      {/* 1. Moderation Queue */}
      <div style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={16} color="var(--color-primary)" />
        Moderation Queue
      </div>
      <ModerationQueueCards />

      {/* 2. Quick Actions */}
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em', margin: '28px 0 14px' }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <QuickNavCard
          label="User Management"
          subtitle="Manage users and roles"
          icon={Users}
          iconColor="#0891b2"
          iconBg="var(--color-primary-bg)"
          cardBg="var(--color-primary-bg)"
          onClick={() => navigate('/admin/users')}
        />
        <QuickNavCard
          label="FAQ Quality"
          subtitle="Review and improve FAQs"
          icon={BarChart3}
          iconColor="var(--color-purple)"
          iconBg="var(--color-purple-bg)"
          cardBg="var(--color-purple-bg)"
          onClick={() => navigate('/admin/faq-quality')}
        />
        <QuickNavCard
          label="Moderation Load"
          subtitle="View workload and queues"
          icon={Shield}
          iconColor="var(--color-success)"
          iconBg="var(--color-success-bg)"
          cardBg="var(--color-success-bg)"
          onClick={() => navigate('/admin/moderation-load')}
        />
        <QuickNavCard
          label="Audit Logs"
          subtitle="Track actions and history"
          icon={Clock}
          iconColor="var(--color-warning)"
          iconBg="var(--color-warning-bg)"
          cardBg="var(--color-warning-bg)"
          onClick={() => navigate('/admin/audit-logs')}
        />
      </div>

      {/* 3. FAQ Quality Alerts */}
      {data?.qualityAlerts && data.qualityAlerts.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '28px 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
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

      {/* 4. Idle Bucket Cards */}
      <div style={{ marginTop: 28 }}>
        <IdleBucketCards />
      </div>
    </div>
  );
}

function QuickNavCard({ label, subtitle, icon: Icon, iconColor, iconBg, cardBg, onClick }: {
  label: string;
  subtitle: string;
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
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
      <div style={{
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
      }}>
        <Icon size={22} color={iconColor} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>{subtitle}</div>
      </div>

      <ChevronRight size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
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
