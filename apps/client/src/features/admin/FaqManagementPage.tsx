// Shared FAQ Management — admins and moderators see exactly the same surface (Dashboard Spec).
// Tabs: FAQs (default) | Categories | Tags.
import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flag, AlertOctagon, AlertTriangle, Clock } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { useFaqStats, useModeratorStats } from '../faq/queries';
import { FaqsAdminTab } from './tabs/FaqsAdminTab';
import { CategoriesAdminTab } from './tabs/CategoriesAdminTab';
import { TagsAdminTab } from './tabs/TagsAdminTab';

type Tab = 'faqs' | 'categories' | 'tags';

export function FaqManagementPage() {
  const [tab, setTab] = useState<Tab>('faqs');
  const { data: stats } = useFaqStats();
  const { data: modStats, isLoading: modLoading } = useModeratorStats();

  const sv = (n: number | undefined) => (modLoading ? '…' : (n ?? 0));

  return (
    <div>
      <SectionHeader title="FAQ Management" sub="Shared knowledge base — admins and moderators." />

      {/* ── 3 summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {/* Helpful FAQs */}
        <FaqSummaryCard
          title="Helpful FAQs"
          titleColor="#16a34a"
          icon={<ThumbsUp size={18} color="#16a34a" />}
          rows={[
            {
              icon: <ThumbsUp size={16} color="#16a34a" />,
              iconBg: '#dcfce7',
              value: modLoading ? '…' : `${modStats?.helpfulFaqs.percentage ?? 0}%`,
              label: 'Helpful rate',
              sub: `Across ${sv(modStats?.helpfulFaqs.publishedTotal)} published FAQs`,
              subColor: '#16a34a',
            },
          ]}
        />

        {/* Unhelpful FAQs */}
        <FaqSummaryCard
          title="Unhelpful FAQs"
          titleColor="#dc2626"
          icon={<ThumbsDown size={18} color="#dc2626" />}
          rows={[
            {
              icon: <ThumbsDown size={16} color="#dc2626" />,
              iconBg: '#fee2e2',
              value: modLoading ? '…' : `${modStats?.unhelpfulFaqs.percentage ?? 0}%`,
              label: 'Unhelpful rate',
              sub: `Across ${sv(modStats?.unhelpfulFaqs.publishedTotal)} published FAQs`,
              subColor: '#dc2626',
            },
          ]}
        />

        {/* Flagged FAQs */}
        <FaqSummaryCard
          title="Flagged FAQs"
          titleColor="#dc2626"
          icon={<Flag size={18} color="#dc2626" />}
          rows={[
            {
              icon: <AlertOctagon size={16} color="#dc2626" />,
              iconBg: '#fee2e2',
              value: sv(modStats?.flaggedFaqs.total),
              label: 'Total flagged',
              sub: 'Open or under review flags',
              subColor: '#dc2626',
            },
            {
              icon: <AlertTriangle size={16} color="#d97706" />,
              iconBg: '#fef9c3',
              value: sv(modStats?.flaggedFaqs.today),
              label: 'Flagged today',
              sub: 'New flags since midnight',
              subColor: '#d97706',
            },
            {
              icon: <Clock size={16} color="#d97706" />,
              iconBg: '#fef9c3',
              value: sv(modStats?.flaggedFaqs.thisWeek),
              label: 'Flagged this week',
              sub: 'Flags in the last 7 days',
              subColor: '#d97706',
            },
          ]}
        />
      </div>

      {/* ── Tab bar ── */}
      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <TabButton active={tab === 'faqs'} onClick={() => setTab('faqs')}>FAQs</TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>Categories</TabButton>
        <TabButton active={tab === 'tags'} onClick={() => setTab('tags')}>Tags</TabButton>
      </div>

      {tab === 'faqs' && <FaqsAdminTab flaggedCount={stats?.flaggedCount ?? 0} />}
      {tab === 'categories' && <CategoriesAdminTab />}
      {tab === 'tags' && <TagsAdminTab />}
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryRow {
  icon: React.ReactNode;
  iconBg: string;
  value: number | string;
  label: string;
  sub: string;
  subColor: string;
}

function FaqSummaryCard({
  title,
  titleColor,
  icon,
  rows,
}: {
  title: string;
  titleColor: string;
  icon: React.ReactNode;
  rows: SummaryRow[];
}) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px',
          background: `${titleColor}14`,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: `${titleColor}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
      </div>

      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: row.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {row.icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{row.value}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: row.subColor, marginTop: 1 }}>{row.sub}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        fontSize: 13, fontWeight: 500, padding: '6px 16px', borderRadius: 8,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}
