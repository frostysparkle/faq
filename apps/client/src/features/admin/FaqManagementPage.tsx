// Shared FAQ Management — admins and moderators see exactly the same surface (Dashboard Spec).
// Tabs: FAQs (default) | Categories | Tags. The two metric cards (Helpful% / Flagged%) sit
// above the tabs so they apply regardless of which tab is active.
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useFaqStats } from '../faq/queries';
import { ThumbsUp, Flag } from 'lucide-react';
import { FaqsAdminTab } from './tabs/FaqsAdminTab';
import { CategoriesAdminTab } from './tabs/CategoriesAdminTab';
import { TagsAdminTab } from './tabs/TagsAdminTab';

type Tab = 'faqs' | 'categories' | 'tags';

export function FaqManagementPage() {
  const [tab, setTab] = useState<Tab>('faqs');
  const { data: stats } = useFaqStats();

  return (
    <div>
      <SectionHeader title="FAQ Management" sub="Shared knowledge base — admins and moderators." />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Helpful FAQs"
          value={stats ? `${stats.helpfulPercentage.toFixed(1)}%` : '—'}
          sub={
            stats
              ? `Across ${stats.publishedFaqs} published FAQ${stats.publishedFaqs === 1 ? '' : 's'}`
              : 'Loading…'
          }
          icon={ThumbsUp}
          color="var(--color-success)"
        />
        <StatCard
          label="Flagged FAQs"
          value={stats ? `${stats.flaggedPercentage.toFixed(1)}%` : '—'}
          sub={
            stats
              ? `${stats.flaggedCount} item${stats.flaggedCount === 1 ? '' : 's'} flagged`
              : 'Loading…'
          }
          icon={Flag}
          color="var(--color-danger)"
        />
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <TabButton active={tab === 'faqs'} onClick={() => setTab('faqs')}>
          FAQs
        </TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>
          Categories
        </TabButton>
        <TabButton active={tab === 'tags'} onClick={() => setTab('tags')}>
          Tags
        </TabButton>
      </div>

      {tab === 'faqs' && <FaqsAdminTab flaggedCount={stats?.flaggedCount ?? 0} />}
      {tab === 'categories' && <CategoriesAdminTab />}
      {tab === 'tags' && <TagsAdminTab />}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof ThumbsUp;
  color: string;
}) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
          <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </Card>
  );
}

function TabButton({
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: 500,
        padding: '6px 16px',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}
