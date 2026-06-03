// FAQ Management — redesigned to match Browse FAQs layout.
//
// Structure mirrors FaqsPage:
//   - Icon heading + subtitle
//   - Single chip row: section (FAQs | Categories | Tags) + FAQ sub-filters (All | Helpful | Flagged)
//   - Content rendered by the active tab component
import { useState } from 'react';
import { BookOpen, Check, Flag, Folder, Tag, ThumbsUp } from 'lucide-react';
import { useFaqStats } from '../faq/queries';
import { FaqsAdminTab } from './tabs/FaqsAdminTab';
import { CategoriesAdminTab } from './tabs/CategoriesAdminTab';
import { TagsAdminTab } from './tabs/TagsAdminTab';

type Tab = 'faqs' | 'categories' | 'tags';
type FaqFilter = 'all' | 'helpful' | 'flagged';

export function FaqManagementPage() {
  const [tab, setTab]             = useState<Tab>('faqs');
  const [faqFilter, setFaqFilter] = useState<FaqFilter>('all');
  const { data: stats }           = useFaqStats();
  const flaggedCount              = stats?.flaggedCount ?? 0;

  const switchTab = (t: Tab) => setTab(t);

  const SECTION_CHIPS: Array<{
    key: Tab;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
  }> = [
    { key: 'faqs',       label: 'FAQs',       Icon: BookOpen },
    { key: 'categories', label: 'Categories', Icon: Folder   },
    { key: 'tags',       label: 'Tags',       Icon: Tag      },
  ];

  const FAQ_FILTER_CHIPS: Array<{
    key: FaqFilter;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
    badge?: number;
  }> = [
    { key: 'all',     label: 'All',          Icon: Check    },
    { key: 'helpful', label: 'Helpful FAQs', Icon: ThumbsUp },
    { key: 'flagged', label: 'Flagged FAQs', Icon: Flag, badge: flaggedCount },
  ];

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--color-card)',
          boxShadow: '0 2px 8px rgba(59,130,246,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <BookOpen size={18} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          FAQ Management
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: 8 }}>
            Shared knowledge base · admins and moderators
          </span>
        </span>
      </div>

      {/* ── Navigation row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>

        {/* Section chips: FAQs | Categories | Tags */}
        {SECTION_CHIPS.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 36, padding: '0 14px', borderRadius: 8, flexShrink: 0,
                border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-purple-bg)' : 'var(--color-input)',
                color: active ? 'var(--color-purple)' : 'var(--color-text-muted)',
                fontSize: 13, fontWeight: active ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          );
        })}

        {/* Vertical separator — only when FAQs tab is active */}
        {tab === 'faqs' && (
          <span style={{ width: 1, height: 24, background: 'var(--color-border)', flexShrink: 0 }} />
        )}

        {/* FAQ sub-filter chips: All | Helpful FAQs | Flagged FAQs */}
        {tab === 'faqs' && FAQ_FILTER_CHIPS.map(({ key, label, Icon, badge }) => {
          const active = faqFilter === key;
          return (
            <button
              key={key}
              onClick={() => setFaqFilter(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 36, padding: '0 14px', borderRadius: 8, flexShrink: 0,
                border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-purple-bg)' : 'var(--color-input)',
                color: active ? 'var(--color-purple)' : 'var(--color-text-muted)',
                fontSize: 13, fontWeight: active ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={13} />
              {label}
              {badge !== undefined && badge > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, lineHeight: '18px',
                  background: active ? 'var(--color-purple)' : 'var(--color-danger)',
                  color: 'white',
                  borderRadius: 10, padding: '0 6px', minWidth: 18, textAlign: 'center' as const,
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {tab === 'faqs'       && <FaqsAdminTab filter={faqFilter} />}
      {tab === 'categories' && <CategoriesAdminTab />}
      {tab === 'tags'       && <TagsAdminTab />}
    </div>
  );
}
