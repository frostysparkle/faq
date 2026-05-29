// Moderator Analytics — personal performance dashboard for moderators.
import { CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useModeratorPersonalStats } from '../admin/queries';

export function ModeratorAnalyticsPage() {
  const { data, isLoading } = useModeratorPersonalStats();

  if (isLoading) {
    return (
      <div>
        <SectionHeader title="My Analytics" sub="Your moderation performance." />
        <Card>Loading…</Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="My Analytics" sub="Your moderation performance at a glance." />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Approvals Today"
          value={data?.approvalsToday ?? 0}
          icon={CheckCircle}
          color="var(--color-success)"
        />
        <StatCard
          label="Approvals This Week"
          value={data?.approvalsThisWeek ?? 0}
          icon={CheckCircle}
          color="var(--color-primary)"
        />
        <StatCard
          label="Total Approvals"
          value={data?.totalApprovals ?? 0}
          icon={BarChart3}
          color="var(--color-primary)"
        />
        <StatCard
          label="Avg Response Time"
          value={`${data?.avgResponseTimeHours ?? 0}h`}
          icon={Clock}
          color="var(--color-warning)"
        />
      </div>

      {/* Approval vs Rejection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Resolution Breakdown</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-success)' }}>
                {data?.totalApprovals ?? 0}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Approved</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-danger)' }}>
                {data?.totalRejections ?? 0}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Rejected</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>
                {(data?.totalApprovals ?? 0) + (data?.totalRejections ?? 0)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Total Handled</div>
            </div>
          </div>

          {/* Approval ratio bar */}
          {((data?.totalApprovals ?? 0) + (data?.totalRejections ?? 0)) > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8 }}>
                <div
                  style={{
                    width: `${((data?.totalApprovals ?? 0) / ((data?.totalApprovals ?? 0) + (data?.totalRejections ?? 0))) * 100}%`,
                    background: 'var(--color-success)',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    background: 'var(--color-danger)',
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {Math.round(((data?.totalApprovals ?? 0) / ((data?.totalApprovals ?? 0) + (data?.totalRejections ?? 0))) * 100)}% approval rate
              </div>
            </div>
          )}
        </Card>

        {/* Category breakdown */}
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Category Breakdown</div>
          {(!data?.categoryBreakdown || data.categoryBreakdown.length === 0) ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '16px 0' }}>
              No category data yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.categoryBreakdown.map((cat) => {
                const maxCount = data.categoryBreakdown[0]?.count ?? 1;
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{cat.category}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{cat.count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(cat.count / maxCount) * 100}%`,
                          height: '100%',
                          background: 'var(--color-primary)',
                          borderRadius: 3,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Insight card */}
      {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
        <Card style={{ padding: '14px 18px', borderLeft: '3px solid var(--color-primary)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 4 }}>
            💡 Insight
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            You've handled the most items in <strong>{data.categoryBreakdown[0]?.category}</strong> ({data.categoryBreakdown[0]?.count} reviews).
            {data.categoryBreakdown.length > 1 && ` Consider focusing on ${data.categoryBreakdown[data.categoryBreakdown.length - 1]?.category} to balance your workload.`}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number | string;
  icon: typeof CheckCircle;
  color: string;
}) {
  return (
    <Card style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}
