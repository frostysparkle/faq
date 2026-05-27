import {
  Flag,
  MessageSquare,
  MessageCircle,
  BookOpen,
  Users,
  CheckCircle,
  HelpCircle,
  CalendarDays,
  CalendarCheck,
  BarChart2,
  AlertOctagon,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../auth/AuthProvider';
import { useModeratorStats } from '../faq/queries';
import { IdleBucketCards } from '../stats/IdleBucketCards';

export function ModerationOverviewPage() {
  const { user } = useAuth();
  const { data, isLoading } = useModeratorStats();

  const v = (n: number | undefined) => (isLoading ? '…' : (n ?? 0));

  return (
    <div>
      {/* Welcome banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0891b2, #0f2744)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>Welcome back,</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{user?.name} 👋</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          Samagama Internship Portal · Signed in as <strong>moderator</strong>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
        }}
      >
        <IdleBucketCards style={{ marginBottom: 0 }} />

        {/* Personal Questions */}
        <StatCard
          title="Personal Questions"
          titleIcon={MessageCircle}
          titleColor="var(--color-primary)"
          rows={[
            {
              label: 'Total personal questions',
              sub: 'All time, all students',
              value: v(data?.personal.total),
              icon: Users,
              color: 'var(--color-primary)',
            },
            {
              label: 'Unanswered',
              sub: 'Awaiting moderator response',
              value: v(data?.personal.unanswered),
              icon: HelpCircle,
              color: 'var(--color-danger)',
            },
            {
              label: 'Posted today',
              sub: 'New questions since midnight',
              value: v(data?.personal.today),
              icon: CalendarDays,
              color: 'var(--color-primary)',
            },
          ]}
        />

        {/* Community Questions */}
        <StatCard
          title="Community Questions"
          titleIcon={MessageSquare}
          titleColor="var(--color-success)"
          rows={[
            {
              label: 'Total (all-time)',
              sub: 'Answered + unanswered',
              value: v(data?.community.total),
              icon: BarChart2,
              color: 'var(--color-success)',
            },
            {
              label: 'Answered by peers',
              sub: 'Has at least one answer',
              value: v(data?.community.answered),
              icon: CheckCircle,
              color: 'var(--color-success)',
            },
            {
              label: 'Unanswered',
              sub: 'No peer answer yet',
              value: v(data?.community.unanswered),
              icon: HelpCircle,
              color: 'var(--color-danger)',
            },
          ]}
        />

        {/* Community Questions Today */}
        <StatCard
          title="Community Questions Today"
          titleIcon={CalendarCheck}
          titleColor="var(--color-warning)"
          rows={[
            {
              label: 'Posted today',
              sub: 'Total since midnight',
              value: v(data?.communityToday.total),
              icon: CalendarDays,
              color: 'var(--color-warning)',
            },
            {
              label: 'Answered today',
              sub: 'Received a peer answer today',
              value: v(data?.communityToday.answered),
              icon: CheckCircle,
              color: 'var(--color-success)',
            },
            {
              label: 'Unanswered today',
              sub: 'Still waiting for a reply',
              value: v(data?.communityToday.unanswered),
              icon: Clock,
              color: 'var(--color-danger)',
            },
          ]}
        />

        {/* FAQs */}
        <StatCard
          title="FAQs"
          titleIcon={BookOpen}
          titleColor="#7c3aed"
          rows={[
            {
              label: 'Total FAQs',
              sub: 'All statuses in the system',
              value: v(data?.faqs.total),
              icon: BookOpen,
              color: '#7c3aed',
            },
            {
              label: 'Added today',
              sub: 'Created since midnight',
              value: v(data?.faqs.today),
              icon: CalendarDays,
              color: '#7c3aed',
            },
            {
              label: 'Added this week',
              sub: 'Created in the last 7 days',
              value: v(data?.faqs.thisWeek),
              icon: CalendarCheck,
              color: '#7c3aed',
            },
          ]}
        />

        {/* Flagged FAQs */}
        <StatCard
          title="Flagged FAQs"
          titleIcon={Flag}
          titleColor="var(--color-danger)"
          rows={[
            {
              label: 'Total flagged',
              sub: 'Open or under review flags',
              value: v(data?.flaggedFaqs.total),
              icon: AlertOctagon,
              color: 'var(--color-danger)',
            },
            {
              label: 'Flagged today',
              sub: 'New flags since midnight',
              value: v(data?.flaggedFaqs.today),
              icon: AlertTriangle,
              color: 'var(--color-warning)',
            },
            {
              label: 'Flagged this week',
              sub: 'Flags in the last 7 days',
              value: v(data?.flaggedFaqs.thisWeek),
              icon: Clock,
              color: 'var(--color-warning)',
            },
          ]}
        />
      </div>
    </div>
  );
}

interface Row {
  label: string;
  sub: string;
  value: number | string;
  icon: typeof MessageSquare;
  color: string;
}

function StatCard({
  title,
  titleIcon: TitleIcon,
  titleColor,
  rows,
}: {
  title: string;
  titleIcon: typeof MessageSquare;
  titleColor: string;
  rows: Row[];
}) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          background: `${titleColor}14`,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: `${titleColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TitleIcon size={17} color={titleColor} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
      </div>

      {/* Metric rows — same layout as IdleBucketCards rows */}
      {rows.map((row, i) => {
        const Icon = row.icon;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: `${row.color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={17} color={row.color} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                  {row.value}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: row.color, marginTop: 1 }}>{row.sub}</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
