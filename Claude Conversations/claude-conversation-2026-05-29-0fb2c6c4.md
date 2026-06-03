# Claude Conversation Log

Session ID: 0fb2c6c4-bc5d-403e-a099-9a6350da37f5
Date: 2026-05-29 15:36:51

---

## 👤 User

Read AdminOverviewPage.tsx
Bash
IN
cat "/Users/ravikumark/Desktop/Samagama final/apps/client/src/features/admin/queries.ts"

OUT
// TanStack Query hooks for admin features.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './api';

// ─── Query keys ──────────────────────────────────────────────────────────────
export const adminKeys = {
  users: (params?: Record<string, unknown>) => ['admin', 'users', params ?? {}] as const,
  auditLogs: (params?: Record<string, unknown>) => ['admin', 'audit-logs', params ?? {}] as const,
  intelligence: ['admin', 'intelligence'] as const,
  moderationLoad: ['admin', 'moderation-load'] as const,
  moderatorPersonal: ['admin', 'moderator-personal'] as const,
  faqQuality: (filter?: string) => ['admin', 'faq-quality', filter ?? 'all'] as const,
  faqCandidates: ['admin', 'faq-candidates'] as const,
};

// ─── User Management ─────────────────────────────────────────────────────────

export function useUsers(params: {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
  q?: string;
} = {}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.listUsers(params),
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.changeRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.suspendUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.activateUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export function useAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
} = {}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminApi.listAuditLogs(params),
  });
}

// ─── Admin Intelligence ──────────────────────────────────────────────────────

export function useAdminIntelligence() {
  return useQuery({
    queryKey: adminKeys.intelligence,
    queryFn: adminApi.getIntelligenceStats,
    refetchInterval: 60_000, // Auto-refresh every minute
  });
}

// ─── Moderation Load ─────────────────────────────────────────────────────────

export function useModerationLoad() {
  return useQuery({
    queryKey: adminKeys.moderationLoad,
    queryFn: adminApi.getModerationLoad,
  });
}

// ─── Moderator Personal ──────────────────────────────────────────────────────

export function useModeratorPersonalStats() {
  return useQuery({
    queryKey: adminKeys.moderatorPersonal,
    queryFn: adminApi.getModeratorPersonalStats,
  });
}

// ─── FAQ Quality ─────────────────────────────────────────────────────────────

export function useFaqQuality(filter: string = 'all') {
  return useQuery({
    queryKey: adminKeys.faqQuality(filter),
    queryFn: () => adminApi.getFaqQuality(filter),
  });
}

// ─── FAQ Candidates ──────────────────────────────────────────────────────────

export function useFaqCandidates() {
  return useQuery({
    queryKey: adminKeys.faqCandidates,
    queryFn: adminApi.listFaqCandidates,
  });
}

export function useConvertToFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answerId: string) => adminApi.convertToFaq(answerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.faqCandidates });
      void qc.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
}

// ─── Bulk Operations ─────────────────────────────────────────────────────────

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => adminApi.bulkApprove(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['moderation'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, note }: { ids: string[]; note?: string }) =>
      adminApi.bulkReject(ids, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['moderation'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
Bash
IN
cat "/Users/ravikumark/Desktop/Samagama final/apps/client/src/features/admin/api.ts" | grep -A 60 "getIntelligenceStats\|IntelligenceStat\|QualityAlert"

OUT
export interface AdminIntelligenceStats {
  unresolvedQuestions: number;
  pendingModerationItems: number;
  faqsNeedingReview: number;
  avgResolutionTimeHours: number;
  publishedFaqs: number;
  totalFaqs: number;
  helpfulPercentage: number;
  flaggedCount: number;
  qualityAlerts: QualityAlert[];
}

export interface QualityAlert {
  id: string;
  title: string;
  qualityScore: number;
  helpfulRatio: number;
  flagCount: number;
  viewCount: number;
  updatedAt: string;
}

export interface ModerationLoadStats {
  pendingQueueDepth: number;
  moderators: ModeratorMetric[];
  categoryBacklog: { category: string; count: number }[];
}

export interface ModeratorMetric {
  moderatorId: string;
  name: string;
  email: string;
  totalApprovals: number;
  totalRejections: number;
  approvalsThisWeek: number;
  avgResponseTimeHours: number;
}

export interface ModeratorPersonalStats {
  approvalsToday: number;
  approvalsThisWeek: number;
  totalApprovals: number;
  totalRejections: number;
  avgResponseTimeHours: number;
  categoryBreakdown: { category: string; count: number }[];
}

export interface FaqQualityRow {
  id: string;
  title: string;
  qualityScore: number;
  helpfulRatio: number;
  flagCount: number;
  viewCount: number;
  status: string;
  classification: 'good' | 'rewrite' | 'archive';
  category: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: { id: string; name: string; email: string };
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

export interface FaqCandidateRow {
--
  async getIntelligenceStats(): Promise<AdminIntelligenceStats> {
    const res = await apiClient.get<ApiSuccess<AdminIntelligenceStats>>('/api/stats/admin-intelligence');
    return res.data.data;
  },

  // Moderation load
  async getModerationLoad(): Promise<ModerationLoadStats> {
    const res = await apiClient.get<ApiSuccess<ModerationLoadStats>>('/api/stats/moderation-load');
    return res.data.data;
  },

  // Moderator personal stats
  async getModeratorPersonalStats(): Promise<ModeratorPersonalStats> {
    const res = await apiClient.get<ApiSuccess<ModeratorPersonalStats>>('/api/stats/moderator-personal');
    return res.data.data;
  },

  // FAQ quality
  async getFaqQuality(filter?: string): Promise<FaqQualityRow[]> {
    const res = await apiClient.get<ApiSuccess<FaqQualityRow[]>>('/api/stats/faq-quality', {
      params: filter && filter !== 'all' ? { filter } : {},
    });
    return res.data.data;
  },

  // FAQ candidates
  async listFaqCandidates(): Promise<FaqCandidateRow[]> {
    const res = await apiClient.get<ApiSuccess<FaqCandidateRow[]>>('/api/moderation/faq-candidates');
    return res.data.data;
  },
  async convertToFaq(answerId: string): Promise<{ faqId: string }> {
    const res = await apiClient.post<ApiSuccess<{ faqId: string }>>(`/api/moderation/faq-candidates/${answerId}/convert`);
    return res.data.data;
  },

  // Bulk moderation
  async bulkApprove(ids: string[]): Promise<{ approved: number }> {
    const res = await apiClient.post<ApiSuccess<{ approved: number }>>('/api/moderation/bulk-approve', { ids });
    return res.data.data;
  },
  async bulkReject(ids: string[], note?: string): Promise<{ rejected: number }> {
    const res = await apiClient.post<ApiSuccess<{ rejected: number }>>('/api/moderation/bulk-reject', { ids, note });
    return res.data.data;
  },

  // Mark for FAQ
  async markForFaq(answerId: string): Promise<void> {
    await apiClient.patch(`/api/moderation/answers/${answerId}/mark-for-faq`);
  },
};
Bash
IN
cat "/Users/ravikumark/Desktop/Samagama final/apps/client/src/features/stats/IdleBucketCards.tsx" 2>/dev/null | head -60

OUT
// Single card showing how many open community questions fall into each idle bucket.
// Three buckets are stacked vertically with dividers, each row is clickable.
// Reused on Student Home (inline with stat cards), Moderator Overview, and Admin Overview.
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Flame, Activity } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useCommunityIdleBuckets } from './queries';
import type { IdleBucket } from './api';

export function IdleBucketCards({ style }: { style?: React.CSSProperties }) {
  const { data, isLoading } = useCommunityIdleBuckets();
  const navigate = useNavigate();

  const goToBucket = (bucket: IdleBucket) => navigate(`/community?idle=${bucket}`);

  const buckets = [
    {
      label: 'Active in last 24h',
      sub: 'Open Q&A with recent activity',
      value: data?.last24h ?? (isLoading ? '…' : 0),
      icon: Flame,
      color: 'var(--color-success)',
      bucket: 'last24h' as IdleBucket,
    },
    {
      label: 'Idle > 3 days',
      sub: 'Needs a nudge',
      value: data?.over3days ?? (isLoading ? '…' : 0),
      icon: Clock,
      color: 'var(--color-warning)',
      bucket: 'over3days' as IdleBucket,
    },
    {
      label: 'Idle > 1 week',
      sub: 'Stalled — review or close',
      value: data?.over1week ?? (isLoading ? '…' : 0),
      icon: AlertTriangle,
      color: 'var(--color-danger)',
      bucket: 'over1week' as IdleBucket,
    },
  ];

  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24, ...style }}>
      {/* Header — matches StatCard header style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          background: 'var(--color-primary)14',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
Now I have a complete picture. Let me do a proper audit before touching any code.

Audit: What's wrong with the current layout
Duplications (same data shown twice):

Data point	Where #1	Where #2
Flagged FAQs count	KPI card (secondary row)	Moderation Queue → "Flagged FAQs" StatCard
Total FAQs count	KPI card (secondary row)	Moderation Queue → "FAQs" StatCard (row 1)
Community questions idle/activity	IdleBucketCards (active 24h, idle 3d, 1wk)	Moderation Queue → "Community Questions Today" StatCard
Unresolved/unanswered questions	"Unresolved Questions" KPI	Community Questions StatCard "Unanswered" row
Structural problems:

Three FAQ-related KPIs crammed into the secondary row (Published, Flagged, Total) with no clear grouping
"Pending Moderation" and the entire Moderation Queue section below say the same thing at different granularities with no hierarchy
IdleBucketCards sits at the very top before any KPIs — context-wise it makes more sense after the action items
No section labels on KPI rows — hard to scan
What's missing:

Open Flags as a primary action item (currently buried as "Flagged FAQs" in a secondary row)
Platform health stats are split across two rows with no logical grouping
Proposed new structure:

Section 1 — "Action Required" (4 KPIs, red/orange tones — things needing immediate attention)
  Unresolved Questions | Pending Answers | FAQs Needing Review | Open Flags

Section 2 — "Platform Health" (3 KPIs, blue/green tones — read-only indicators)
  Published FAQs (helpful %) | Total FAQs | Avg Resolution Time

Section 3 — Quick Actions (unchanged)

Section 4 — Community Idle Buckets (IdleBucketCards moved here, makes sense after KPIs)

Section 5 — Moderation Queue (2 StatCards, trimmed from 5)
  Personal Questions | Community Questions  ← only these two, others removed as duplicates

Section 6 — FAQ Quality Alerts (unchanged, stays at bottom)
Removed: Secondary stats row (3 KPIs) · FAQs StatCard · Community Questions Today StatCard · Flagged FAQs StatCard

Implementing now.

Edit AdminOverviewPage.tsx
Removed 29 lines
Now add the SectionLabel helper component and clean up unused imports:

Edit AdminOverviewPage.tsx
Removed 1 line
Now add the SectionLabel component just before KPICard:

Edit AdminOverviewPage.tsx
Added 17 lines
Also remove unused imports AlertOctagon and CalendarCheck that were only used in the removed StatCards:

Bash
IN
cd "/Users/ravikumark/Desktop/Samagama final/apps/client" && npx tsc --noEmit 2>&1

OUT
(Bash completed with no output)
Zero TypeScript errors. Here's the full summary of every change made:

What was removed (duplicates)
Removed	Why
"Flagged FAQs" KPI (secondary row)	Duplicate of Moderation Queue → Flagged FAQs StatCard — kept as "Open Flags" in Action Required row instead
"Total FAQs" KPI (secondary row)	Duplicate of Moderation Queue → FAQs StatCard total row — moved to Platform Health
Moderation Queue → FAQs StatCard (total/today/week)	Total FAQs now in Platform Health KPI; today/week granularity is FAQ management detail, not an overview metric
Moderation Queue → Community Questions Today StatCard	Covered by IdleBucketCards "Active in last 24h" — same intent, two representations
Moderation Queue → Flagged FAQs StatCard	Consolidated into "Open Flags" KPI in Action Required
New structure (6 labelled sections)
Section	Content
Action Required	Unresolved Questions · Pending Answers · FAQs Needing Review · Open Flags
Platform Health	Published FAQs (helpful %) · Total FAQs · Avg Resolution Time
Quick Actions	User Management · FAQ Quality · Moderation Load · Audit Logs
Community Activity	IdleBucketCards (moved down from top — makes sense after KPIs)
Moderation Queue	Personal Questions StatCard · Community Questions StatCard
FAQ Quality Alerts	Conditional alert list (unchanged)

image.jpeg
1254×1254
In the moderator dashboard, under the dashboard section, I want the card layout to be updated so that it matches exactly the design and view shown in the provided image.
Let me read the current ModerationOverviewPage and study the image carefully before writing anything.

Read ModerationOverviewPage.tsx
I have the full file in context. Now let me closely study the image design:

Personal Questions & Community Questions — two-column cards with a large decorative circle on the left + metric rows on the right
Community Questions Today — same two-col layout with calendar/clock illustration
FAQs — header + 3 horizontal sub-columns at the bottom with an illustration decoration top-right
Flagged FAQs — full-width, header + 3 horizontal sub-columns
Write ModerationOverviewPage.tsx
488 lines
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
  type LucideIcon,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <IdleBucketCards style={{ marginBottom: 0 }} />

        {/* Personal Questions */}
        <IllustrationStatCard
          title="Personal Questions"
          titleIcon={MessageCircle}
          titleColor="var(--color-primary)"
          decorIcon={Users}
          rows={[
            { label: 'Total personal questions', sub: 'All time, all students', value: v(data?.personal.total), icon: Users, color: 'var(--color-primary)' },
            { label: 'Unanswered', sub: 'Awaiting moderator response', value: v(data?.personal.unanswered), icon: HelpCircle, color: 'var(--color-danger)' },
            { label: 'Posted today', sub: 'New questions since midnight', value: v(data?.personal.today), icon: CalendarDays, color: 'var(--color-primary)' },
          ]}
        />

        {/* Community Questions */}
        <IllustrationStatCard
          title="Community Questions"
          titleIcon={MessageSquare}
          titleColor="var(--color-success)"
          decorIcon={MessageSquare}
          decorVariant="ring"
          rows={[
            { label: 'Total (all-time)', sub: 'Answered + unanswered', value: v(data?.community.total), icon: BarChart2, color: 'var(--color-success)' },
            { label: 'Answered by peers', sub: 'Has at least one answer', value: v(data?.community.answered), icon: CheckCircle, color: 'var(--color-success)' },
            { label: 'Unanswered', sub: 'No peer answer yet', value: v(data?.community.unanswered), icon: HelpCircle, color: 'var(--color-danger)' },
          ]}
        />

        {/* Community Questions Today */}
        <IllustrationStatCard
          title="Community Questions Today"
          titleIcon={CalendarCheck}
          titleColor="var(--color-warning)"
          decorIcon={CalendarDays}
          decorVariant="calendar"
          rows={[
            { label: 'Posted today', sub: 'Total since midnight', value: v(data?.communityToday.total), icon: CalendarDays, color: 'var(--color-warning)' },
            { label: 'Answered today', sub: 'Received a peer answer today', value: v(data?.communityToday.answered), icon: CheckCircle, color: 'var(--color-success)' },
            { label: 'Unanswered today', sub: 'Still waiting for a reply', value: v(data?.communityToday.unanswered), icon: Clock, color: 'var(--color-danger)' },
          ]}
        />

        {/* FAQs */}
        <ColumnMetricCard
          title="FAQs"
          titleIcon={BookOpen}
          titleColor="#7c3aed"
          columns={[
            { label: 'Total FAQs', sub: 'All statuses in the system', value: v(data?.faqs.total), icon: BookOpen, color: '#7c3aed' },
            { label: 'Added today', sub: 'Created since midnight', value: v(data?.faqs.today), icon: CalendarDays, color: '#7c3aed' },
            { label: 'Added this week', sub: 'Created in the last 7 days', value: v(data?.faqs.thisWeek), icon: CalendarCheck, color: '#7c3aed' },
          ]}
        />
      </div>

      {/* Flagged FAQs — full width */}
      <div style={{ marginTop: 14 }}>
        <ColumnMetricCard
          title="Flagged FAQs"
          titleIcon={Flag}
          titleColor="var(--color-danger)"
          fullWidth
          columns={[
            { label: 'Total flagged', sub: 'Open or under review flags', value: v(data?.flaggedFaqs.total), icon: AlertOctagon, color: 'var(--color-danger)' },
            { label: 'Flagged today', sub: 'New flags since midnight', value: v(data?.flaggedFaqs.today), icon: AlertTriangle, color: 'var(--color-warning)' },
            { label: 'Flagged this week', sub: 'Flags in the last 7 days', value: v(data?.flaggedFaqs.thisWeek), icon: Clock, color: 'var(--color-warning)' },
          ]}
        />
      </div>
    </div>
  );
}

// ─── IllustrationStatCard ─────────────────────────────────────────────────────
// Card with a large decorative circle/illustration on the left and metric rows on the right.

interface StatRow {
  label: string;
  sub: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

function IllustrationStatCard({
  title,
  titleIcon: TitleIcon,
  titleColor,
  decorIcon: DecorIcon,
  decorVariant = 'circle',
  rows,
}: {
  title: string;
  titleIcon: LucideIcon;
  titleColor: string;
  decorIcon: LucideIcon;
  decorVariant?: 'circle' | 'ring' | 'calendar';
  rows: StatRow[];
}) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '13px 18px',
          background: `${titleColor}12`,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${titleColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TitleIcon size={16} color={titleColor} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
      </div>

      {/* Body: decorative illustration + metric rows */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', gap: 16 }}>
        {/* Decorative illustration */}
        <DecorativeIcon icon={DecorIcon} color={titleColor} variant={decorVariant} />

        {/* Metric rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {rows.map((row, i) => {
            const Icon = row.icon;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: `${row.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} color={row.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                      {row.value}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: row.color }}>{row.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── DecorativeIcon ───────────────────────────────────────────────────────────

function DecorativeIcon({
  icon: Icon,
  color,
  variant,
}: {
  icon: LucideIcon;
  color: string;
  variant: 'circle' | 'ring' | 'calendar';
}) {
  if (variant === 'ring') {
    return (
      <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
        {/* Outer ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `8px solid ${color}30`,
          }}
        />
        {/* Inner arc — simulated with a partial border */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            border: `6px solid ${color}`,
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: 'rotate(-45deg)',
          }}
        />
        {/* Center icon */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color={color} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'calendar') {
    return (
      <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
        {/* Calendar body */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 4,
            width: 62,
            height: 62,
            borderRadius: 12,
            background: `${color}18`,
            border: `2px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={26} color={color} />
        </div>
        {/* Clock badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--color-surface)',
            border: `2px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <Clock size={16} color={color} />
        </div>
      </div>
    );
  }

  // Default 'circle' variant
  return (
    <div
      style={{
        width: 90,
        height: 90,
        borderRadius: '50%',
        background: `${color}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} color={color} />
      </div>
    </div>
  );
}

// ─── ColumnMetricCard ─────────────────────────────────────────────────────────
// Card with a header and 3 horizontal sub-columns (used for FAQs and Flagged FAQs).

interface ColumnMetric {
  label: string;
  sub: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

function ColumnMetricCard({
  title,
  titleIcon: TitleIcon,
  titleColor,
  columns,
  fullWidth = false,
}: {
  title: string;
  titleIcon: LucideIcon;
  titleColor: string;
  columns: ColumnMetric[];
  fullWidth?: boolean;
}) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '13px 18px',
          background: `${titleColor}12`,
          borderBottom: '1px solid var(--color-border)',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${titleColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TitleIcon size={16} color={titleColor} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>

        {/* Decorative sparkle dots for full-width cards */}
        {fullWidth && (
          <div style={{ position: 'absolute', right: 24, display: 'flex', gap: 4 }}>
            {[8, 5, 8].map((size, i) => (
              <div
                key={i}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: `${titleColor}40`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3-column metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {columns.map((col, i) => {
          const Icon = col.icon;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 12px',
                borderLeft: i > 0 ? '1px solid var(--color-border)' : 'none',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${col.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Icon size={18} color={col.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                {col.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {col.label}
              </div>
              <div style={{ fontSize: 11, color: col.color, marginTop: 2 }}>{col.sub}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
Bash
IN
cd "/Users/ravikumark/Desktop/Samagama final/apps/client" && npx tsc --noEmit 2>&1

OUT
(Bash completed with no output)
Zero errors. Here's exactly what changed and how it maps to the image:

Image card	What was built
Personal Questions	IllustrationStatCard with variant="circle" — large concentric circle on the left with Users icon, metric rows on the right
Community Questions	IllustrationStatCard with variant="ring" — partial arc/donut ring with MessageSquare icon centered, metric rows on the right
Community Questions Today	IllustrationStatCard with variant="calendar" — calendar box + clock badge overlay, metric rows on the right
FAQs	ColumnMetricCard — coloured header, then 3 vertical sub-columns (icon → big number → label → sub) matching the image layout
Flagged FAQs	ColumnMetricCard full-width — same 3-column layout with decorative dots in the header
The two new components (IllustrationStatCard and ColumnMetricCard) replace the old flat StatCard entirely, with no data or query changes.

I still didn't like I want you to match the exact view of the image I provided.

Design a world-class SaaS admin dashboard called “Moderation Queue” with an ultra-modern UI inspired by Linear, Stripe, Notion, Vercel, and Framer.

Create large premium analytics cards arranged in a clean responsive grid.

Use a soft light background (#F5F8FC), floating glassmorphism cards, smooth shadows, rounded corners (24-32px), subtle gradients, and spacious layouts.

Each card should have:

* A colored gradient header section
* Large 3D illustration related to the card topic
* Glass icon container
* Large metric numbers
* Clean typography
* Soft glowing effects
* Premium depth and layering
* Subtle floating decorative elements

Dashboard Sections:

Personal Questions Card

* Blue gradient theme
* 3D people/team illustration
* Metrics:
    * Total personal questions: 1
    * Unanswered: 0
    * Posted today: 0

Community Questions Card

* Emerald green gradient theme
* Circular progress visualization
* 3D chat bubble illustration
* Metrics:
    * Total (all-time): 3
    * Answered by peers: 0
    * Unanswered: 3

Community Questions Today Card

* Warm orange gradient theme
* Large 3D calendar illustration
* Metrics:
    * Posted today: 0
    * Answered today: 0
    * Unanswered today: 0

FAQs Card

* Purple gradient theme
* Large 3D FAQ document illustration
* Display three mini statistic cards inside
* Metrics:
    * Total FAQs: 130
    * Added today: 0
    * Added this week: 130

Flagged FAQs Card

* Soft red/pink gradient theme
* Wide horizontal card
* 3 separate metric panels
* Alert and warning illustrations
* Metrics:
    * Total flagged: 0
    * Flagged today: 0
    * Flagged this week: 0

Visual Style:

* Premium enterprise SaaS
* Dribbble award-winning quality
* Modern fintech aesthetics
* Beautiful gradients
* Soft neumorphic shadows
* Glassmorphism highlights
* Floating 3D illustrations
* Apple-level visual polish
* High-end startup dashboard
* Clean white space
* Elegant iconography
* Professional yet delightful

Render as a complete dashboard UI mockup, 16:9 aspect ratio, ultra detailed, Figma-quality design system, realistic product design presentation.
Write ModerationOverviewPage.tsx
479 lines
import { useAuth } from '../auth/AuthProvider';
import { useModeratorStats } from '../faq/queries';

export function ModerationOverviewPage() {
  const { user } = useAuth();
  const { data, isLoading } = useModeratorStats();
  const v = (n: number | undefined) => (isLoading ? '…' : (n ?? 0));

  return (
    <div style={{ minHeight: '100vh', background: '#F5F8FC', padding: '0 0 48px' }}>

      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #0f2744 100%)',
        borderRadius: 24,
        padding: '32px 36px',
        marginBottom: 28,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(8,145,178,0.25)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Welcome back</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>{user?.name} 👋</div>
          <div style={{ fontSize: 13, opacity: 0.65 }}>Samagama Internship Portal · <strong>Moderator Dashboard</strong></div>
        </div>
      </div>

      {/* ── Section Title ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Moderation Queue</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Live portal health · auto-refreshes every 60s</div>
        </div>
      </div>

      {/* ── Top Row: Personal + Community ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Personal Questions */}
        <PremiumCard
          gradient="linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)"
          glowColor="rgba(59,130,246,0.3)"
          illustration={<PersonalIllustration />}
          title="Personal Questions"
          subtitle="Direct student inquiries"
          metrics={[
            { label: 'Total personal questions', sub: 'All time, all students', value: v(data?.personal.total), accent: '#93c5fd' },
            { label: 'Unanswered', sub: 'Awaiting moderator response', value: v(data?.personal.unanswered), accent: '#fca5a5' },
            { label: 'Posted today', sub: 'New questions since midnight', value: v(data?.personal.today), accent: '#93c5fd' },
          ]}
        />

        {/* Community Questions */}
        <PremiumCard
          gradient="linear-gradient(135deg, #065f46 0%, #10b981 50%, #34d399 100%)"
          glowColor="rgba(16,185,129,0.3)"
          illustration={<CommunityIllustration answered={v(data?.community.answered)} total={v(data?.community.total)} />}
          title="Community Questions"
          subtitle="Peer-answered Q&A forum"
          metrics={[
            { label: 'Total (all-time)', sub: 'Answered + unanswered', value: v(data?.community.total), accent: '#6ee7b7' },
            { label: 'Answered by peers', sub: 'Has at least one answer', value: v(data?.community.answered), accent: '#6ee7b7' },
            { label: 'Unanswered', sub: 'No peer answer yet', value: v(data?.community.unanswered), accent: '#fca5a5' },
          ]}
        />
      </div>

      {/* ── Middle Row: Today + FAQs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Community Questions Today */}
        <PremiumCard
          gradient="linear-gradient(135deg, #92400e 0%, #f59e0b 50%, #fbbf24 100%)"
          glowColor="rgba(245,158,11,0.3)"
          illustration={<CalendarIllustration />}
          title="Community Questions Today"
          subtitle="Activity since midnight"
          metrics={[
            { label: 'Posted today', sub: 'Total since midnight', value: v(data?.communityToday.total), accent: '#fde68a' },
            { label: 'Answered today', sub: 'Received a peer answer today', value: v(data?.communityToday.answered), accent: '#6ee7b7' },
            { label: 'Unanswered today', sub: 'Still waiting for a reply', value: v(data?.communityToday.unanswered), accent: '#fca5a5' },
          ]}
        />

        {/* FAQs */}
        <FaqCard
          total={v(data?.faqs.total)}
          today={v(data?.faqs.today)}
          thisWeek={v(data?.faqs.thisWeek)}
        />
      </div>

      {/* ── Flagged FAQs — Full Width ── */}
      <FlaggedCard
        total={v(data?.flaggedFaqs.total)}
        today={v(data?.flaggedFaqs.today)}
        thisWeek={v(data?.flaggedFaqs.thisWeek)}
      />
    </div>
  );
}

// ─── PremiumCard ──────────────────────────────────────────────────────────────

interface MetricRow { label: string; sub: string; value: number | string; accent: string; }

function PremiumCard({
  gradient, glowColor, illustration, title, subtitle, metrics,
}: {
  gradient: string; glowColor: string; illustration: React.ReactNode;
  title: string; subtitle: string; metrics: MetricRow[];
}) {
  return (
    <div style={{
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: `0 4px 6px rgba(0,0,0,0.04), 0 20px 40px ${glowColor}, 0 1px 0 rgba(255,255,255,0.8)`,
      background: 'white',
    }}>
      {/* Gradient header with illustration */}
      <div style={{
        background: gradient,
        padding: '24px 24px 20px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 160,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', top: 20, right: 40, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />

        {/* Text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.01em' }}>{subtitle}</div>
        </div>

        {/* Illustration */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          {illustration}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: '4px 0 8px' }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            borderBottom: i < metrics.length - 1 ? '1px solid #f1f5f9' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{m.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{m.sub}</div>
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.04em',
              minWidth: 40,
              textAlign: 'right',
              textShadow: `0 0 20px ${m.accent}60`,
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FaqCard ──────────────────────────────────────────────────────────────────

function FaqCard({ total, today, thisWeek }: { total: number | string; today: number | string; thisWeek: number | string }) {
  const cols = [
    { label: 'Total FAQs', sub: 'All statuses in the system', value: total, icon: <BookIcon />, color: '#7c3aed', bg: '#ede9fe' },
    { label: 'Added today', sub: 'Created since midnight', value: today, icon: <CalDayIcon />, color: '#7c3aed', bg: '#ede9fe' },
    { label: 'Added this week', sub: 'In the last 7 days', value: thisWeek, icon: <CalWeekIcon />, color: '#7c3aed', bg: '#ede9fe' },
  ];

  return (
    <div style={{
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 40px rgba(124,58,237,0.18), 0 1px 0 rgba(255,255,255,0.8)',
      background: 'white',
    }}>
      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)',
        padding: '24px 24px 20px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 130,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 100, width: 90, height: 90, borderRadius: '50%', background: 'rgba(0,0,0,0.08)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 3 }}>FAQs</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Knowledge base articles</div>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FaqIllustration />
        </div>
      </div>

      {/* 3 column metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid #f1f5f9' }}>
        {cols.map((col, i) => (
          <div key={i} style={{
            padding: '20px 12px',
            textAlign: 'center',
            borderRight: i < 2 ? '1px solid #f1f5f9' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: col.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {col.icon}
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>{col.value}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{col.label}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{col.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FlaggedCard ──────────────────────────────────────────────────────────────

function FlaggedCard({ total, today, thisWeek }: { total: number | string; today: number | string; thisWeek: number | string }) {
  const cols = [
    { label: 'Total flagged', sub: 'Open or under review flags', value: total, icon: <FlagIcon_ />, accentColor: '#ef4444', bgColor: '#fee2e2' },
    { label: 'Flagged today', sub: 'New flags since midnight', icon: <AlertIcon />, value: today, accentColor: '#f59e0b', bgColor: '#fef3c7' },
    { label: 'Flagged this week', sub: 'Flags in the last 7 days', icon: <ClockIcon_ />, value: thisWeek, accentColor: '#f59e0b', bgColor: '#fef3c7' },
  ];

  return (
    <div style={{
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 40px rgba(239,68,68,0.14), 0 1px 0 rgba(255,255,255,0.8)',
      background: 'white',
    }}>
      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 55%, #f87171 100%)',
        padding: '22px 28px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ position: 'absolute', top: -30, right: 200, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: -10, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 300, width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 3 }}>Flagged FAQs</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Content reported by students</div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8 }}>
          <FlaggedIllustration />
        </div>
      </div>

      {/* 3 metric panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
        {cols.map((col, i) => (
          <div key={i} style={{
            padding: '24px 20px',
            textAlign: 'center',
            borderRight: i < 2 ? '1px solid #f1f5f9' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: col.bgColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${col.accentColor}25`,
            }}>
              {col.icon}
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.05em', lineHeight: 1 }}>{col.value}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{col.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{col.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Illustrations ────────────────────────────────────────────────────────────

function PersonalIllustration() {
  return (
    <svg width="110" height="90" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back person */}
      <circle cx="75" cy="28" r="16" fill="rgba(255,255,255,0.25)" />
      <circle cx="75" cy="22" r="9" fill="rgba(255,255,255,0.4)" />
      <path d="M59 58c0-8.8 7.2-16 16-16s16 7.2 16 16" fill="rgba(255,255,255,0.2)" />
      {/* Front person */}
      <circle cx="42" cy="32" r="20" fill="rgba(255,255,255,0.35)" />
      <circle cx="42" cy="24" r="12" fill="rgba(255,255,255,0.6)" />
      <path d="M22 68c0-11 9-20 20-20s20 9 20 20" fill="rgba(255,255,255,0.3)" />
      {/* Chat bubble */}
      <rect x="60" y="8" width="44" height="28" rx="8" fill="rgba(255,255,255,0.9)" />
      <circle cx="71" cy="22" r="3" fill="#3b82f6" />
      <circle cx="82" cy="22" r="3" fill="#3b82f6" />
      <circle cx="93" cy="22" r="3" fill="#3b82f6" />
      <path d="M68 36l-4 6 8-2" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

function CommunityIllustration({ answered, total }: { answered: number | string; total: number | string }) {
  const pct = typeof answered === 'number' && typeof total === 'number' && total > 0
    ? Math.round((answered / total) * 100) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;


[Message truncated - exceeded 50,000 character limit]

---

## 🤖 Claude

Let me read the current AdminOverviewPage.tsx to understand its current state.

---

## 🤖 Claude

Now let me check ModerationQueueCards:

---

## 🤖 Claude

I can see the current state. `AdminOverviewPage` uses `ModerationQueueCards` which has the older flat design, while `ModerationOverviewPage` was rewritten with the premium gradient/illustration cards. I'll update `ModerationQueueCards.tsx` to the same premium design so the Admin dashboard matches.

---

## 🤖 Claude

Zero errors. `ModerationQueueCards.tsx` has been fully rewritten with the premium design — gradient headers, floating illustrations, large metric numbers with glow, and the same card vocabulary used in `ModerationOverviewPage`. Since `AdminOverviewPage` imports `ModerationQueueCards` directly, the admin dashboard now shows the same premium card layout with no other changes needed.

---

